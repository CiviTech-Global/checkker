// Web stub for @walletconnect/ethereum-provider.
//
// On web the app connects through the injected EIP-1193 provider (the MetaMask
// browser extension, or the in-app dApp browser of Trust Wallet / MetaMask
// Mobile / Coinbase Wallet). WalletConnect's QR flow pulls in @reown/appkit,
// whose internal packages expose their entry points only through package.json
// "exports" subpaths that Metro's web bundler can't resolve — bundling them
// breaks the web build. We never need that flow on web, so this stub stands in.
//
// Native builds resolve the real package (see metro.config.js — the alias is
// scoped to platform === "web").

export const EthereumProvider = {
  async init() {
    throw new Error(
      "WalletConnect is unavailable on web. Use a wallet browser extension " +
        "(e.g. MetaMask) or open this page inside your wallet's in-app browser."
    );
  },
};

export default { EthereumProvider };
