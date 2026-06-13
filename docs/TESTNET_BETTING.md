# Testing Crypto Betting on BSC Testnet

Checkker's paid (ranked) games hold each player's stake in the `CheckkerEscrow`
smart contract until the game ends, then the server (acting as referee) reports
the result and the contract pays the winner automatically (minus a house cut) or
refunds both players on a draw / timeout.

Free games (and any game when blockchain env vars are unset) skip all of this
and start immediately — so the app is fully playable without a wallet.

This guide gets the on-chain path working end-to-end on the BSC **testnet**, so
you can play paid games across machines with no real money at risk.

## 1. Prerequisites

- Two wallets (e.g. MetaMask) — one per player — plus a third "referee" wallet
  for the server. Each needs testnet BNB from the faucet:
  https://testnet.bnb.chain.org/faucet-smart
- The referee wallet only pays gas to report results; players' wallets pay gas +
  their stake.

## 2. Deploy the escrow contract

```bash
cd packages/contracts
npm install
# Funded testnet deployer key (can be the referee wallet):
export DEPLOYER_PRIVATE_KEY=0x<deployer-private-key>
# Optional — defaults to the deployer address for both:
export REFEREE_ADDRESS=0x<referee-wallet-address>
export HOUSE_WALLET=0x<house-wallet-address>

npm run compile
npm run deploy:testnet
```

The script prints the deployed address:

```
CheckkerEscrow deployed to: 0xABC...
Add to your .env:
CHECKKER_CONTRACT_ADDRESS=0xABC...
```

## 3. Configure the server

In the repo root `.env` (copy from `.env.example`):

```bash
BSC_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545/
BSC_CHAIN_ID=97
CHECKKER_CONTRACT_ADDRESS=0xABC...          # from step 2
REFEREE_PRIVATE_KEY=0x<referee-private-key> # must match the contract's referee
HOUSE_WALLET_ADDRESS=0x<house-wallet-address>
```

Blockchain features turn on only when `BSC_RPC_URL`, `CHECKKER_CONTRACT_ADDRESS`
and `REFEREE_PRIVATE_KEY` are all present (see `apps/server/src/blockchain/config.ts`).
With any of them missing, paid games silently fall back to free play.

Start the server: `npm run dev -w apps/server` (it logs `[BetManager] Created
escrow…` when a paid match begins).

## 4. Configure the clients

Both players must connect a wallet on BSC Testnet (chain id 97). The apps
auto-prompt the wallet to add/switch to the testnet chain.

- **Web / desktop (`apps/mobile` web build):** set `EXPO_PUBLIC_WC_PROJECT_ID`
  for external wallets, and point clients at the host with
  `EXPO_PUBLIC_SERVER_URL=http://<host-ip>:3001` (or just open
  `http://<host-ip>:3001`, which serves the bundled web client).
- **Flutter (`checkker_mobile`):**
  `flutter run --dart-define=SERVER_URL=http://<host-ip>:3001 --dart-define=CHECKKER_WC_PROJECT_ID=<id>`
  — or set the server address at runtime in Settings → Network.

## 5. Play a paid game

1. Both players sign in with their wallets and pick the same ranked tier.
2. When matched, each sees a **Confirm Bet** screen and taps **Deposit** — the
   wallet prompts an `eth_sendTransaction` calling `deposit(bytes32 gameId)`
   with the stake as `value`.
3. The server watches for both `DepositMade` events, then starts the game.
   (If either deposit doesn't arrive within the timeout, the bet is cancelled
   and any deposit is refunded.)
4. On game end the server calls `reportWinner` (winner paid, house cut taken) or
   `reportDraw` (both refunded). Clients receive `bet_settled` with the tx hash.

## Troubleshooting

- **Deposit screen never appears:** the game is free, or a server env var is
  missing — check the server log for `[BetManager] Blockchain not enabled`.
- **"Wrong deposit amount":** the wallet isn't on BSC Testnet, or its BNB price
  feed produced a different wei amount — both players must be on chain id 97.
- **Winner not paid:** confirm `REFEREE_PRIVATE_KEY` matches the address passed
  as referee at deploy time and that the referee wallet has testnet BNB for gas.
