import { Contract, JsonRpcProvider, WebSocketProvider, Wallet } from "ethers";
import {
  BLOCKCHAIN_ENABLED,
  BSC_RPC_URL,
  CONTRACT_ADDRESS,
  REFEREE_PRIVATE_KEY,
  ESCROW_ABI,
} from "./config";

const MAX_RETRIES = 3;
const BASE_RETRY_MS = 1000;

let provider: JsonRpcProvider | WebSocketProvider | null = null;
let contract: Contract | null = null;
let refereeSigner: Wallet | null = null;

/** Sequential nonce manager to prevent concurrent-settlement collisions. */
class NonceManager {
  private _next: number | null = null;
  private _lock = false;

  async acquire(): Promise<number> {
    while (this._lock) {
      await new Promise((r) => setTimeout(r, 10));
    }
    this._lock = true;
    try {
      if (this._next === null) {
        this._next = await provider!.getTransactionCount(refereeSigner!.address);
      }
      const nonce = this._next;
      this._next++;
      return nonce;
    } finally {
      this._lock = false;
    }
  }

  reset() {
    this._next = null;
  }
}

const nonceManager = new NonceManager();

function init(): Contract {
  if (contract) return contract;
  if (!BLOCKCHAIN_ENABLED) throw new Error("Blockchain not enabled");

  const wsUrl = process.env.BSC_WS_URL;
  provider = wsUrl
    ? new WebSocketProvider(wsUrl)
    : new JsonRpcProvider(BSC_RPC_URL);

  refereeSigner = new Wallet(REFEREE_PRIVATE_KEY, provider);
  contract = new Contract(CONTRACT_ADDRESS, ESCROW_ABI, refereeSigner);
  return contract;
}

/** Convert a UUID string to bytes32 for the contract */
export function uuidToBytes32(uuid: string): string {
  const hex = uuid.replace(/-/g, "");
  return "0x" + hex.padEnd(64, "0");
}

/**
 * Execute a contract write with retry and sequential nonce management.
 * On nonce failures it re-fetches and retries immediately;
 * on RPC errors it uses exponential backoff.
 * Contract reverts are not retried (they indicate a logic error).
 */
async function retryWrite(
  call: (nonce: number) => Promise<{ hash: string; wait: () => Promise<any> }>,
  label: string,
  retries = MAX_RETRIES,
): Promise<string> {
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const nonce = await nonceManager.acquire();
      const tx = await call(nonce);
      const receipt = await tx.wait();
      console.log(`[ContractService] ${label} OK (attempt ${attempt}): ${tx.hash}`);
      return tx.hash;
    } catch (err: any) {
      lastError = err;
      const msg = err?.message ?? String(err);

      if (
        msg.includes("nonce") ||
        msg.includes("replacement fee") ||
        msg.includes("already known")
      ) {
        nonceManager.reset();
        console.warn(`[ContractService] ${label} nonce issue (attempt ${attempt}), resetting nonce`);
        await new Promise((r) => setTimeout(r, 200));
        continue;
      }

      if (msg.includes("revert") || msg.includes("execution reverted")) {
        console.error(`[ContractService] ${label} reverted: ${msg}`);
        throw err;
      }

      if (attempt < retries) {
        const delay = BASE_RETRY_MS * Math.pow(2, attempt - 1);
        console.warn(`[ContractService] ${label} failed (attempt ${attempt}), retrying in ${delay}ms: ${msg}`);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw lastError ?? new Error(`${label} failed after ${retries} retries`);
}

export const ContractService = {
  get enabled() {
    return BLOCKCHAIN_ENABLED;
  },

  /**
   * Reconcile an unsettled game on startup by checking on-chain status.
   * Returns the resolved state so BetManager can re-process it.
   */
  async reconcileGame(gameId: string): Promise<{
    status: number;
    winner: string;
    whiteDeposit: string;
    blackDeposit: string;
  } | null> {
    if (!BLOCKCHAIN_ENABLED) return null;
    try {
      const c = init();
      const gameIdBytes = uuidToBytes32(gameId);
      const game = await c.getGame(gameIdBytes);
      if (game.status === 2n || game.status === 3n || game.status === 4n) {
        return {
          status: Number(game.status),
          winner: game.winner,
          whiteDeposit: game.whiteDeposit.toString(),
          blackDeposit: game.blackDeposit.toString(),
        };
      }
      return null;
    } catch (err) {
      console.error(`[ContractService] reconcileGame failed for ${gameId}:`, err);
      return null;
    }
  },

  async createGame(
    gameId: string,
    whiteAddress: string,
    blackAddress: string,
    betAmountWei: string,
  ): Promise<string> {
    const c = init();
    const gameIdBytes = uuidToBytes32(gameId);
    return retryWrite(
      (n) => c.createGame(gameIdBytes, whiteAddress, blackAddress, betAmountWei, { nonce: n }),
      `createGame(${gameId})`,
    );
  },

  async reportWinner(gameId: string, winnerAddress: string): Promise<string> {
    const c = init();
    const gameIdBytes = uuidToBytes32(gameId);
    return retryWrite(
      (n) => c.reportWinner(gameIdBytes, winnerAddress, { nonce: n }),
      `reportWinner(${gameId})`,
    );
  },

  async reportDraw(gameId: string): Promise<string> {
    const c = init();
    const gameIdBytes = uuidToBytes32(gameId);
    return retryWrite(
      (n) => c.reportDraw(gameIdBytes, { nonce: n }),
      `reportDraw(${gameId})`,
    );
  },

  async cancelGame(gameId: string): Promise<string> {
    const c = init();
    const gameIdBytes = uuidToBytes32(gameId);
    return retryWrite(
      (n) => c.cancelGame(gameIdBytes, { nonce: n }),
      `cancelGame(${gameId})`,
    );
  },

  async isGameReady(gameId: string): Promise<boolean> {
    const c = init();
    const gameIdBytes = uuidToBytes32(gameId);
    return await c.isGameReady(gameIdBytes);
  },

  /**
   * Listen for a DepositMade event. Uses the provider's event system;
   * WebSocket provider is preferred for reliable real-time detection.
   */
  listenForDeposit(gameId: string, playerAddress: string, timeoutMs = 120_000): Promise<boolean> {
    return new Promise((resolve) => {
      if (!BLOCKCHAIN_ENABLED || !contract) {
        resolve(false);
        return;
      }

      const gameIdBytes = uuidToBytes32(gameId);
      const timeout = setTimeout(() => {
        contract?.removeAllListeners("DepositMade");
        resolve(false);
      }, timeoutMs);

      contract.on("DepositMade", (eventGameId: string, player: string) => {
        if (
          eventGameId === gameIdBytes &&
          player.toLowerCase() === playerAddress.toLowerCase()
        ) {
          clearTimeout(timeout);
          contract?.removeAllListeners("DepositMade");
          resolve(true);
        }
      });
    });
  },

  /** Check if the deposit deadline has passed for a game. */
  async isPastDepositDeadline(gameId: string): Promise<boolean> {
    if (!BLOCKCHAIN_ENABLED) return false;
    try {
      const c = init();
      const gameIdBytes = uuidToBytes32(gameId);
      const game = await c.getGame(gameIdBytes);
      if (Number(game.status) !== 0) return false;
      const now = Math.floor(Date.now() / 1000);
      return now > Number(game.depositDeadline);
    } catch {
      return false;
    }
  },

  async dispose(): Promise<void> {
    if (provider && "destroy" in provider) {
      await (provider as WebSocketProvider).destroy();
    }
    contract = null;
    refereeSigner = null;
    provider = null;
    nonceManager.reset();
  },
};
