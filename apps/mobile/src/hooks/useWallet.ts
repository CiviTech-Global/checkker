import { useState, useCallback, useRef, useEffect } from "react";

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

  return {
    ...state,
    connect,
    disconnect,
    sign,
    sendTransaction,
  };
}
