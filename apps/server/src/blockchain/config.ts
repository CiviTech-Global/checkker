/** Whether blockchain features are enabled (requires env vars) */
export const BLOCKCHAIN_ENABLED = !!(
  process.env.BSC_RPC_URL &&
  process.env.CHECKKER_CONTRACT_ADDRESS &&
  process.env.REFEREE_PRIVATE_KEY
);

export const BSC_RPC_URL = process.env.BSC_RPC_URL ?? "https://data-seed-prebsc-1-s1.binance.org:8545/";
export const CONTRACT_ADDRESS = process.env.CHECKKER_CONTRACT_ADDRESS ?? "";
export const REFEREE_PRIVATE_KEY = process.env.REFEREE_PRIVATE_KEY ?? "";
export const HOUSE_WALLET = process.env.HOUSE_WALLET_ADDRESS ?? "";
export const CHAIN_ID = parseInt(process.env.BSC_CHAIN_ID ?? "97", 10); // 97=testnet, 56=mainnet

/** Minimal ABI for the CheckkerEscrow contract (only functions we call from the server) */
export const ESCROW_ABI = [
  "function createGame(bytes32 gameId, address white, address black, uint256 betAmount) external",
  "function reportWinner(bytes32 gameId, address winner) external",
  "function reportDraw(bytes32 gameId) external",
  "function cancelGame(bytes32 gameId) external",
  "function getGame(bytes32 gameId) external view returns (tuple(bytes32 gameId, address white, address black, uint256 betAmount, uint256 whiteDeposit, uint256 blackDeposit, uint8 status, address winner, uint256 createdAt))",
  "function isGameReady(bytes32 gameId) external view returns (bool)",
  "event GameCreated(bytes32 indexed gameId, address white, address black, uint256 betAmount)",
  "event DepositMade(bytes32 indexed gameId, address player, uint256 amount)",
  "event GameStarted(bytes32 indexed gameId)",
  "event GameResolved(bytes32 indexed gameId, address winner, uint256 payout, uint256 houseCut)",
  "event GameDrawn(bytes32 indexed gameId, uint256 refundEach)",
  "event GameCancelled(bytes32 indexed gameId)",
];
