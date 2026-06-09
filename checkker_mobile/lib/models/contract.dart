const List<String> escrowDepositAbi = [
  'function deposit(bytes32 gameId) external payable',
];

const bscTestnetConfig = {
  'chainId': 97,
  'chainIdHex': '0x61',
  'rpcUrl': 'https://data-seed-prebsc-1-s1.binance.org:8545/',
  'name': 'BSC Testnet',
  'nativeCurrency': {
    'name': 'tBNB',
    'symbol': 'tBNB',
    'decimals': 18,
  },
  'blockExplorerUrl': 'https://testnet.bscscan.com',
};
