import { Contract, JsonRpcProvider, Wallet, id as solidityId } from "ethers";
import {
  BLOCKCHAIN_ENABLED,
  BSC_RPC_URL,
  CONTRACT_ADDRESS,
  REFEREE_PRIVATE_KEY,
  ESCROW_ABI,
} from "./config";

let contract: Contract | null = null;
let provider: JsonRpcProvider | null = null;
let refereeSigner: Wallet | null = null;

function init(): Contract {
  if (contract) return contract;
  if (!BLOCKCHAIN_ENABLED) throw new Error("Blockchain not enabled");

  provider = new JsonRpcProvider(BSC_RPC_URL);
  refereeSigner = new Wallet(REFEREE_PRIVATE_KEY, provider);
  contract = new Contract(CONTRACT_ADDRESS, ESCROW_ABI, refereeSigner);
  return contract;
}

/** Convert a UUID string to bytes32 for the contract */
export function uuidToBytes32(uuid: string): string {
  // Remove hyphens and pad/truncate to 32 bytes
  const hex = uuid.replace(/-/g, "");
  return "0x" + hex.padEnd(64, "0");
}

export const ContractService = {
  get enabled() {
    return BLOCKCHAIN_ENABLED;
  },

  /**
   * Create a game on the escrow contract.
   * @returns Transaction hash
   */
  async createGame(
    gameId: string,
    whiteAddress: string,
    blackAddress: string,
    betAmountWei: string
  ): Promise<string> {
    const c = init();
    const gameIdBytes = uuidToBytes32(gameId);
    const tx = await c.createGame(gameIdBytes, whiteAddress, blackAddress, betAmountWei);
    await tx.wait();
    return tx.hash;
  },

  /**
   * Report the winner. Contract auto-pays winner and house.
   * @returns Transaction hash
   */
  async reportWinner(gameId: string, winnerAddress: string): Promise<string> {
    const c = init();
    const gameIdBytes = uuidToBytes32(gameId);
    const tx = await c.reportWinner(gameIdBytes, winnerAddress);
    await tx.wait();
    return tx.hash;
  },

  /**
   * Report a draw. Contract refunds both players.
   * @returns Transaction hash
   */
  async reportDraw(gameId: string): Promise<string> {
    const c = init();
    const gameIdBytes = uuidToBytes32(gameId);
    const tx = await c.reportDraw(gameIdBytes);
    await tx.wait();
    return tx.hash;
  },

  /**
   * Cancel a game. Refunds any deposits.
   * @returns Transaction hash
   */
  async cancelGame(gameId: string): Promise<string> {
    const c = init();
    const gameIdBytes = uuidToBytes32(gameId);
    const tx = await c.cancelGame(gameIdBytes);
    await tx.wait();
    return tx.hash;
  },

  /**
   * Check if both players have deposited and the game is ready.
   */
  async isGameReady(gameId: string): Promise<boolean> {
    const c = init();
    const gameIdBytes = uuidToBytes32(gameId);
    return await c.isGameReady(gameIdBytes);
  },

  /**
   * Listen for a DepositMade event for a specific game and player.
   * Returns a promise that resolves when the deposit is detected.
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
};
