import { useState, useCallback, useEffect } from "react";
import { BSC_TESTNET_CONFIG, ESCROW_DEPOSIT_ABI } from "@checkker/shared";

/**
 * Wallet connection hook.
 *
 * State is a module-level singleton shared by every hook instance, so the
 * connection survives navigation between screens. On startup the last
 * connection is silently restored via `eth_accounts` (no popup).
 *
 * Providers, in order of preference:
 * 1. Injected (`window.ethereum`) — MetaMask extension, and the in-app dApp
 *    browsers of Trust Wallet / MetaMask Mobile / Coinbase Wallet etc.
 * 2. WalletConnect v2 — any external mobile wallet via QR code / deep link.
 *    Requires `EXPO_PUBLIC_WC_PROJECT_ID` and the optional
 *    `@walletconnect/ethereum-provider` package.
 */

export interface WalletState {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  chainId: number | null;
  balance: string | null; // BNB balance as string
  error: string | null;
}

const INITIAL_STATE: WalletState = {
  address: null,
  isConnected: false,
  isConnecting: false,
  chainId: null,
  balance: null,
  error: null,
};

const RECONNECT_KEY = "checkker:walletConnected";

/* ── Module-level singleton store ───────────────────────────────────── */

let walletState: WalletState = { ...INITIAL_STATE };
const listeners = new Set<(s: WalletState) => void>();

function setWalletState(patch: Partial<WalletState>): void {
  walletState = { ...walletState, ...patch };
  listeners.forEach((fn) => fn(walletState));
}

/** The EIP-1193 provider currently in use (injected or WalletConnect). */
let eip1193: any = null;
let _provider: any = null;
let _signer: any = null;
let providerEventsAttached = false;

function getStorage(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

function getInjected(): any {
  return typeof window !== "undefined" ? (window as any).ethereum : null;
}

async function getEthersProvider() {
  if (_provider && _signer) return { provider: _provider, signer: _signer };
  const source = eip1193 ?? getInjected();
  if (source) {
    const { BrowserProvider } = await import("ethers");
    _provider = new BrowserProvider(source);
    _signer = await _provider.getSigner();
    return { provider: _provider, signer: _signer };
  }
  return { provider: null, signer: null };
}

function resetProviderCache(): void {
  _provider = null;
  _signer = null;
}

/** Keep state in sync when the wallet changes accounts/chain or disconnects. */
function attachProviderEvents(source: any): void {
  if (providerEventsAttached || !source?.on) return;
  providerEventsAttached = true;

  source.on("accountsChanged", (accounts: string[]) => {
    resetProviderCache();
    if (!accounts || accounts.length === 0) {
      doDisconnect();
    } else {
      setWalletState({ address: accounts[0], isConnected: true });
      void refreshBalance(accounts[0]);
    }
  });

  source.on("chainChanged", (chainIdHex: string) => {
    resetProviderCache();
    setWalletState({ chainId: parseInt(chainIdHex, 16) });
    if (walletState.address) void refreshBalance(walletState.address);
  });

  source.on("disconnect", () => {
    doDisconnect();
  });
}

async function refreshBalance(address: string): Promise<void> {
  try {
    const { provider } = await getEthersProvider();
    if (!provider) return;
    const { formatEther } = await import("ethers");
    const rawBalance = await provider.getBalance(address);
    setWalletState({ balance: formatEther(rawBalance) });
  } catch {
    // Balance is cosmetic — never fail the connection over it.
  }
}

async function finishConnect(source: any, accounts: string[]): Promise<void> {
  eip1193 = source;
  resetProviderCache();
  attachProviderEvents(source);

  const address = accounts[0];
  let chainId: number | null = null;
  try {
    chainId = parseInt(await source.request({ method: "eth_chainId" }), 16);
  } catch {
    // optional
  }

  setWalletState({ address, isConnected: true, isConnecting: false, chainId, error: null });
  getStorage()?.setItem(RECONNECT_KEY, "1");
  void refreshBalance(address);

  if (chainId !== null && chainId !== BSC_TESTNET_CONFIG.chainId) {
    try {
      await switchToBscTestnet();
    } catch {
      // Non-fatal: user can switch manually
    }
  }
}

/** Silently restore a previous session without prompting the user. */
async function restoreConnection(): Promise<void> {
  if (walletState.isConnected || walletState.isConnecting) return;
  if (getStorage()?.getItem(RECONNECT_KEY) !== "1") return;

  const injected = getInjected();
  if (!injected) return;
  try {
    // eth_accounts (unlike eth_requestAccounts) never opens a popup.
    const accounts: string[] = await injected.request({ method: "eth_accounts" });
    if (accounts && accounts.length > 0) {
      await finishConnect(injected, accounts);
    }
  } catch {
    // Stay disconnected; the user can connect manually.
  }
}

let restoreAttempted = false;

async function connectWalletConnect(): Promise<boolean> {
  const projectId = process.env.EXPO_PUBLIC_WC_PROJECT_ID;
  if (!projectId) return false;
  try {
    // Optional dependency — only present when WalletConnect is configured.
    const { EthereumProvider } = require("@walletconnect/ethereum-provider");
    const wcProvider = await EthereumProvider.init({
      projectId,
      chains: [BSC_TESTNET_CONFIG.chainId],
      showQrModal: true,
      metadata: {
        name: "Checkker",
        description: "Chess + Poker hybrid strategy game",
        url: "https://checkker.game",
        icons: [],
      },
    });
    await wcProvider.connect();
    const accounts: string[] = wcProvider.accounts;
    if (accounts && accounts.length > 0) {
      await finishConnect(wcProvider, accounts);
      return true;
    }
  } catch {
    // Fall through to error state below.
  }
  return false;
}

async function doConnect(): Promise<void> {
  setWalletState({ isConnecting: true, error: null });

  try {
    const injected = getInjected();
    if (injected) {
      const accounts: string[] = await injected.request({ method: "eth_requestAccounts" });
      if (!accounts || accounts.length === 0) {
        setWalletState({ isConnecting: false, error: "No accounts returned" });
        return;
      }
      await finishConnect(injected, accounts);
      return;
    }

    // No injected wallet — try WalletConnect (Trust Wallet, MetaMask Mobile, ...)
    if (await connectWalletConnect()) return;

    setWalletState({
      isConnecting: false,
      error:
        "No wallet detected. Install MetaMask, or open this page inside your wallet's browser (Trust Wallet → Browser).",
    });
  } catch (err: any) {
    setWalletState({ isConnecting: false, error: err?.message ?? "Failed to connect wallet" });
  }
}

function doDisconnect(): void {
  try {
    if (eip1193?.disconnect) eip1193.disconnect();
  } catch {
    // best effort
  }
  eip1193 = null;
  resetProviderCache();
  getStorage()?.removeItem(RECONNECT_KEY);
  setWalletState({ ...INITIAL_STATE });
}

export function useWallet() {
  const [state, setState] = useState<WalletState>(walletState);

  useEffect(() => {
    listeners.add(setState);
    if (!restoreAttempted) {
      restoreAttempted = true;
      void restoreConnection();
    }
    return () => {
      listeners.delete(setState);
    };
  }, []);

  const connect = useCallback(() => doConnect(), []);
  const disconnect = useCallback(() => doDisconnect(), []);

  const sign = useCallback(async (message: string): Promise<string | null> => {
    try {
      const { signer } = await getEthersProvider();
      if (!signer) throw new Error("No signer available");
      return await signer.signMessage(message);
    } catch (err: any) {
      setWalletState({ error: err?.message ?? "Signing failed" });
      return null;
    }
  }, []);

  const sendTransaction = useCallback(async (tx: { to: string; value: string; data?: string }): Promise<string | null> => {
    try {
      const { signer } = await getEthersProvider();
      if (!signer) throw new Error("No signer available");
      const response = await signer.sendTransaction(tx);
      return response.hash;
    } catch (err: any) {
      setWalletState({ error: err?.message ?? "Transaction failed" });
      return null;
    }
  }, []);

  /**
   * Deposit BNB to the escrow contract for a specific game.
   * Encodes the deposit(bytes32) call and sends the transaction.
   * @returns Transaction hash, or null on failure
   */
  const depositToEscrow = useCallback(async (
    contractAddress: string,
    gameId: string,
    amountWei: string
  ): Promise<string | null> => {
    try {
      const { Interface } = await import("ethers");
      const iface = new Interface(ESCROW_DEPOSIT_ABI);

      // Convert gameId (UUID) to bytes32: remove hyphens, pad to 64 hex chars
      const gameIdHex = "0x" + gameId.replace(/-/g, "").padEnd(64, "0");
      const data = iface.encodeFunctionData("deposit", [gameIdHex]);

      return await sendTransaction({
        to: contractAddress,
        value: amountWei,
        data,
      });
    } catch (err: any) {
      setWalletState({ error: err?.message ?? "Deposit failed" });
      return null;
    }
  }, [sendTransaction]);

  return {
    ...state,
    connect,
    disconnect,
    sign,
    sendTransaction,
    depositToEscrow,
    switchToBscTestnet,
  };
}

/**
 * Switch the wallet to BSC Testnet (chain ID 97).
 * Falls back to adding the chain if it's not configured.
 */
async function switchToBscTestnet(): Promise<void> {
  const source = eip1193 ?? getInjected();
  if (!source) return;

  try {
    await source.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: BSC_TESTNET_CONFIG.chainIdHex }],
    });
  } catch (switchError: any) {
    // Error code 4902 = chain not added yet
    if (switchError?.code === 4902) {
      await source.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: BSC_TESTNET_CONFIG.chainIdHex,
            chainName: BSC_TESTNET_CONFIG.name,
            nativeCurrency: BSC_TESTNET_CONFIG.nativeCurrency,
            rpcUrls: [BSC_TESTNET_CONFIG.rpcUrl],
            blockExplorerUrls: [BSC_TESTNET_CONFIG.blockExplorerUrl],
          },
        ],
      });
    } else {
      throw switchError;
    }
  }

  // Reset provider after chain switch so it re-initializes
  resetProviderCache();
}
