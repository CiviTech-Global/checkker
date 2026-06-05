export interface WalletInfo {
  network: string;
  symbol: string;
  address: string;
  icon: string;
}

export const DONATION_WALLETS: WalletInfo[] = [
  { network: "Bitcoin", symbol: "BTC", address: "bc1q209xk5qutfyr9eqvwyje22wavw6yr6sdxuzcmj", icon: "\u20BF" },
  { network: "Cardano", symbol: "ADA", address: "addr1q8xv0453z20psvfrdtrwmjflwspfdmef6vfm8540ufsmctzp6adj7slsvhn0md8x9wppkz6l0249ms4lxhtk69ucncnqaxw70f", icon: "\u2B21" },
  { network: "Dogecoin", symbol: "DOGE", address: "D9VdaGDPD56645fRY2PYJoijniqrDUR5uS", icon: "\u00D0" },
  { network: "XRP", symbol: "XRP", address: "rnGvcmWAJesxrhgeULDeqvZzMMsDidHYG9", icon: "\u2726" },
  { network: "BNB (BSC)", symbol: "BNB", address: "0x86EF35e6fe773fF461FCC367d48D6789F94E4b12", icon: "\u25C6" },
  { network: "Solana", symbol: "SOL", address: "AqoFb34GbWUYhxKqX3kmwLLuzp56FbPT3L9q8nzaArmX", icon: "\u2600" },
  { network: "Stellar", symbol: "XLM", address: "GABGTWG4C3FXUTCS4KLEI26O24OVRCCLFXW7AVJIOVEGI2WVQ2OTK2ET", icon: "\u2606" },
  { network: "Sui", symbol: "SUI", address: "0x1104f84617deeeb64a608e105649066b3c633d6636564e1c6dba817b0c541db5", icon: "\u27A4" },
  { network: "Tron", symbol: "TRX", address: "TFzgvBcp3jhFA4FZbcvsHYLNmeicHVY9wj", icon: "\u25B2" },
];
