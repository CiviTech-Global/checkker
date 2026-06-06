/**
 * Minimal ABI fragment for the CheckkerEscrow deposit function.
 * Just enough for ethers to encode the call data on the client.
 */
export const ESCROW_DEPOSIT_ABI = [
  "function deposit(bytes32 gameId) external payable",
] as const;

/** BSC Testnet chain configuration */
export const BSC_TESTNET_CONFIG = {
  chainId: 97,
  chainIdHex: "0x61",
  rpcUrl: "https://data-seed-prebsc-1-s1.binance.org:8545/",
  name: "BSC Testnet",
  nativeCurrency: {
    name: "tBNB",
    symbol: "tBNB",
    decimals: 18,
  },
  blockExplorerUrl: "https://testnet.bscscan.com",
} as const;
