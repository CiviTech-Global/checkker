import { useState, useCallback, useRef, useEffect } from "react";
import { BSC_TESTNET_CONFIG, ESCROW_DEPOSIT_ABI } from "@checkker/shared";

/**
 * Wallet connection hook.
 *
 * In production this would integrate with @reown/appkit-wagmi-react-native
 * (WalletConnect v2) for real wallet connections. For now this provides the
 * interface contract that all UI components program against, with a simple
 * browser-based ethers provider fallback for Electron/web.
 */

export interface WalletState {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  chainId: number | null;
  balance: string | null; // BNB balance as string
  error: string | null;
}

let _provider: any = null;
let _signer: any = null;

async function getEthersProvider() {
  if (_provider) return { provider: _provider, signer: _signer };

  // Check for injected wallet (MetaMask in browser/Electron)
  const win = typeof window !== "undefined" ? (window as any) : null;
  if (win?.ethereum) {
    const { BrowserProvider } = await import("ethers");
    _provider = new BrowserProvider(win.ethereum);
    _signer = await _provider.getSigner();
    return { provider: _provider, signer: _signer };
  }
  return { provider: null, signer: null };
}

export function useWallet() {
  const [state, setState] = useState<WalletState>({
    address: null,
    isConnected: false,
    isConnecting: false,
    chainId: null,
    balance: null,
    error: null,
  });

  const mountedRef = useRef(true);
  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  const connect = useCallback(async () => {
    setState((s) => ({ ...s, isConnecting: true, error: null }));

    try {
      const win = typeof window !== "undefined" ? (window as any) : null;
      if (!win?.ethereum) {
        setState((s) => ({
          ...s,
          isConnecting: false,
          error: "No wallet detected. Install MetaMask or use WalletConnect.",
        }));
        return;
      }

      // Request account access
      const accounts: string[] = await win.ethereum.request({
        method: "eth_requestAccounts",
      });

      if (!accounts || accounts.length === 0) {
        setState((s) => ({ ...s, isConnecting: false, error: "No accounts returned" }));
        return;
      }

      const address = accounts[0];
      const chainId = parseInt(await win.ethereum.request({ method: "eth_chainId" }), 16);

      // Get balance
      const { provider } = await getEthersProvider();
      let balance: string | null = null;
      if (provider) {
        const { formatEther } = await import("ethers");
        const rawBalance = await provider.getBalance(address);
        balance = formatEther(rawBalance);
      }

      if (mountedRef.current) {
        setState({
          address,
          isConnected: true,
          isConnecting: false,
          chainId,
          balance,
          error: null,
        });
      }

      // Auto-switch to BSC Testnet if on wrong chain
      if (chainId !== BSC_TESTNET_CONFIG.chainId) {
        try {
          await switchToBscTestnet();
        } catch {
          // Non-fatal: user can switch manually
        }
      }
    } catch (err: any) {
      if (mountedRef.current) {
        setState((s) => ({
          ...s,
          isConnecting: false,
          error: err?.message ?? "Failed to connect wallet",
        }));
      }
    }
  }, []);

  const disconnect = useCallback(() => {
    _provider = null;
    _signer = null;
    setState({
      address: null,
      isConnected: false,
      isConnecting: false,
      chainId: null,
      balance: null,
      error: null,
    });
  }, []);

  const sign = useCallback(async (message: string): Promise<string | null> => {
    try {
      const { signer } = await getEthersProvider();
      if (!signer) throw new Error("No signer available");
      return await signer.signMessage(message);
    } catch (err: any) {
      setState((s) => ({ ...s, error: err?.message ?? "Signing failed" }));
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
      setState((s) => ({ ...s, error: err?.message ?? "Transaction failed" }));
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
      setState((s) => ({ ...s, error: err?.message ?? "Deposit failed" }));
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
  const win = typeof window !== "undefined" ? (window as any) : null;
  if (!win?.ethereum) return;

  try {
    await win.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: BSC_TESTNET_CONFIG.chainIdHex }],
    });
  } catch (switchError: any) {
    // Error code 4902 = chain not added yet
    if (switchError?.code === 4902) {
      await win.ethereum.request({
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
  _provider = null;
  _signer = null;
}
