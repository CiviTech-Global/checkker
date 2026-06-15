# Crypto Betting on BSC Testnet — Setup & Test Guide

Checkker's paid (ranked) games escrow each player's stake in the **`CheckkerEscrow`**
smart contract on BNB Smart Chain. Both players deposit before the game starts;
when the game ends the server (acting as a trusted *referee*) reports the result
on-chain and the contract pays the winner automatically — minus a house cut — or
refunds both players on a draw / timeout.

Free games (casual + beginner) and **any** game when the blockchain env vars are
unset skip all of this and start immediately, so the app is fully playable
without a wallet or any money.

This guide gets the on-chain path working **end-to-end on the BSC testnet**, so
you can play paid games across machines with **no real money at risk**.

> **TL;DR**
> 1. Get a free WalletConnect (Reown) Project ID.
> 2. Fund 3 testnet wallets with faucet tBNB (2 players + 1 referee).
> 3. `npm run deploy:testnet` in `packages/contracts` → copy the contract address.
> 4. Put the 3 server env vars in root `.env`, start the server.
> 5. Run two Flutter clients with `--dart-define=CHECKKER_WC_PROJECT_ID=… --dart-define=SERVER_URL=…`.
> 6. Both connect WalletConnect on **BSC Testnet (chain 97)**, queue the same ranked tier, deposit, play. Settlement is automatic.

---

## How it works (the moving parts)

| Layer | File | Role |
|---|---|---|
| **Contract** | `packages/contracts/contracts/CheckkerEscrow.sol` | Holds stakes; `createGame` / `deposit` / `reportWinner` / `reportDraw` / `cancelGame`. Only the `referee` can create/resolve. 10% house cut (max 20%, owner-settable). |
| **Server escrow driver** | `apps/server/src/blockchain/ContractService.ts` | Signs `createGame` / `reportWinner` / `reportDraw` / `cancelGame` with the referee key; listens for `DepositMade` events. |
| **Bet orchestration** | `apps/server/src/betting/BetManager.ts` | Decides bet amount (`usdToWei`), creates the escrow, persists `Bet` rows, settles after the game. |
| **Price oracle** | `apps/server/src/blockchain/PriceOracle.ts` | CoinGecko BNB/USD → wei (cached 60 s). Converts the USD tier into the exact wei stake. |
| **Match flow** | `apps/server/src/GameServer.ts` (`startGame` → `launchGame`) | On a paid match: create escrow → emit `awaiting_deposits` → wait for both `DepositMade` → start the game → on game-over call `settleBet`. |
| **Client wallet** | `checkker_mobile/lib/services/wallet_service.dart` | WalletConnect session via Reown AppKit; `sign()` (auth) and `deposit()` (`eth_sendTransaction` → `deposit(bytes32)`). |
| **Client deposit UI** | `checkker_mobile/lib/screens/game/queue_screen.dart` | Renders the **Confirm Bet** view from `awaiting_deposits`, sends the deposit, and reacts to `deposit_confirmed` / `bet_settled` / `bet_cancelled`. |

**Bet tiers** (`packages/shared/src/betting.ts`, per ranked difficulty tier):

| Tier | Stake (USD) | House cut |
|---|---|---|
| Beginner | $10 | 10% |
| Intermediate | $25 | 10% |
| Advanced | $100 | 10% |
| Master | $500 | 10% |

The USD amount is converted to wei **once**, when the escrow is created, and the
server sends that exact `betAmountWei` to both clients. The contract enforces
`msg.value == betAmount`, so both players always deposit the identical amount and
price drift between deposits is irrelevant.

---

## 1. Prerequisites

- **Node 18+** and the repo bootstrapped: `npm install` at the repo root.
- **Flutter 3.38.x** (matches CI) for the mobile/desktop client.
- **Three wallets** (e.g. MetaMask mobile, Trust Wallet, or MetaMask extension):
  - **Player A** and **Player B** — each pays its own stake + a little gas.
  - **Referee** — the server's wallet. Pays **gas only** to create/resolve games.
    The referee can also be the contract **owner** and **house wallet** for testing.
- **Faucet tBNB** in all three wallets — see step 3.
- A **WalletConnect / Reown Project ID** — see step 2.

> You can run both players on one machine using two different wallets (e.g.
> MetaMask extension for Player A in one browser/desktop build, MetaMask mobile
> for Player B), or two phones, or two desktops. Each *player identity* is a
> distinct wallet address.

---

## 2. Get a WalletConnect (Reown) Project ID

The Flutter client uses Reown AppKit for WalletConnect. Without a Project ID the
**Connect Wallet** button is disabled and only the identity-only "manual address"
fallback is shown — which **cannot deposit** (no signing session).

1. Go to <https://cloud.reown.com> (formerly WalletConnect Cloud) and sign in.
2. Create a project → copy the **Project ID**.
3. You'll pass it to the client as `CHECKKER_WC_PROJECT_ID` (Flutter) /
   `EXPO_PUBLIC_WC_PROJECT_ID` (web/Expo) in step 5.

---

## 3. Fund the wallets with testnet BNB

Use the official faucet for each wallet address:

- <https://www.bnbchain.org/en/testnet-faucet> (or `https://testnet.bnb.chain.org/faucet-smart`)

Add **BSC Testnet** to your wallet if it isn't already (most wallets have it
built-in; the Reown modal also lists it):

| Field | Value |
|---|---|
| Network name | BNB Smart Chain Testnet |
| RPC URL | `https://data-seed-prebsc-1-s1.binance.org:8545/` |
| Chain ID | `97` |
| Currency | `tBNB` |
| Explorer | `https://testnet.bscscan.com` |

Confirm each wallet shows a tBNB balance before continuing.

---

## 4. Deploy the escrow contract

```bash
cd packages/contracts
npm install

# Funded testnet deployer key (this account becomes the contract owner).
# It can be the same as the referee wallet for testing.
export DEPLOYER_PRIVATE_KEY=0x<deployer-private-key>

# Optional — both default to the deployer address if unset:
export REFEREE_ADDRESS=0x<referee-wallet-address>   # MUST match the server's key in step 5
export HOUSE_WALLET=0x<house-wallet-address>        # receives the house cut

npm run compile
npm test            # optional: runs the CheckkerEscrow unit tests
npm run deploy:testnet
```

The script prints:

```
CheckkerEscrow deployed to: 0xABC...
Add to your .env:
CHECKKER_CONTRACT_ADDRESS=0xABC...
```

> **Critical:** the address you pass as `REFEREE_ADDRESS` at deploy time must be
> the wallet whose **private key** the server runs with (`REFEREE_PRIVATE_KEY`,
> step 5). Only that account can call `createGame` / `reportWinner` / `reportDraw`.
> If they don't match, deposits will work but **nobody gets paid**.

---

## 5. Configure & run the server

Copy `.env.example` → `.env` at the repo root and set the blockchain block:

```bash
BSC_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545/
BSC_CHAIN_ID=97
CHECKKER_CONTRACT_ADDRESS=0xABC...           # from step 4
REFEREE_PRIVATE_KEY=0x<referee-private-key>  # the key for REFEREE_ADDRESS above
HOUSE_WALLET_ADDRESS=0x<house-wallet-address>
```

Blockchain features turn on **only** when `BSC_RPC_URL`,
`CHECKKER_CONTRACT_ADDRESS`, **and** `REFEREE_PRIVATE_KEY` are all present
(`apps/server/src/blockchain/config.ts`). If any is missing, paid games silently
fall back to free play.

Start it:

```bash
npm run dev -w apps/server
```

You should see the server bind to `0.0.0.0:3001`. When a paid match begins it
logs `[BetManager] Created escrow for game …`.

> **Recommended for reliable deposit detection:** the server watches for
> `DepositMade` events. Over a plain **HTTP** RPC, ethers v6 detects events by
> *polling*, which can be slow or rate-limited on the public endpoint and may
> miss the 120 s deposit window under load. For smooth testing, point
> `BSC_RPC_URL` at a **WebSocket** endpoint or a dedicated provider
> (e.g. a free QuickNode/Ankr/Nodereal BSC-testnet RPC). The public seed node
> works but is the most common cause of "deposit never confirms."

---

## 6. Configure & run the clients

Both players must be on **BSC Testnet (chain 97)** with a signing WalletConnect
session. Manual-address entry is identity-only and **cannot deposit**.

### Flutter (`checkker_mobile`) — primary client

```bash
cd checkker_mobile
flutter pub get
flutter run \
  --dart-define=SERVER_URL=http://<host-ip>:3001 \
  --dart-define=CHECKKER_WC_PROJECT_ID=<reown-project-id>
```

- `<host-ip>` is the machine running the server (use the LAN IP, e.g.
  `192.168.1.105`, not `localhost`, when the client is on another device).
  You can also set/override this at runtime in **Settings → Network → Game Server**.
- On first launch the app shows the **server URL gate** — enter the same address.
- Open **Connect Wallet**, scan/approve in your wallet, and **select BSC Testnet**
  in the network picker before playing.

Build installable artifacts (CI also produces these per-platform):

```bash
flutter build apk   --dart-define=CHECKKER_WC_PROJECT_ID=<id> --dart-define=SERVER_URL=http://<host-ip>:3001
flutter build ipa   --dart-define=...        # iOS (needs signing)
flutter build windows --dart-define=...      # desktop
```

### Web / desktop (`apps/mobile` Expo web build, bundled in the `.exe`)

```bash
EXPO_PUBLIC_SERVER_URL=http://<host-ip>:3001
EXPO_PUBLIC_WC_PROJECT_ID=<reown-project-id>
```

Or just open `http://<host-ip>:3001` in a browser — the server serves the bundled
web client, which derives its server URL from the page origin.

---

## 7. Play a paid game end-to-end

1. **Both players sign in** with their wallets (WalletConnect → approve →
   `personal_sign` the auth challenge). The home screen should show them connected.
2. **Both pick the same ranked tier** (e.g. Intermediate = $25) and queue.
3. On match, each player sees the **Confirm Bet** view with the stake. Tap
   **Deposit** — the wallet prompts an `eth_sendTransaction` calling
   `deposit(bytes32 gameId)` with the stake as `value`. Approve it.
4. The server detects both `DepositMade` events (each client shows
   *your deposit confirmed* / *opponent deposited*), then the game starts.
   - If either deposit doesn't arrive within **120 s** (`DEPOSIT_TIMEOUT_MS`),
     the server calls `cancelGame` and any deposit is refunded (`bet_cancelled`).
5. **Play to a result.** On game-over the server calls:
   - `reportWinner(gameId, winner)` → winner receives `pot − 10%`, house gets 10%, **or**
   - `reportDraw(gameId)` → both players fully refunded.
   Clients receive `bet_settled` with the transaction hash.

### Verify on-chain

Open `https://testnet.bscscan.com/address/<CHECKKER_CONTRACT_ADDRESS>` and watch:

- `GameCreated` → `DepositMade` ×2 → `GameStarted` → `GameResolved` (or `GameDrawn`).
- The winner's wallet balance increases by the payout; the house wallet receives
  the cut. Cross-check the `txHash` from the `bet_settled` event.

---

## Verification checklist

- [ ] Server log prints `[BetManager] Created escrow …` on a paid match.
- [ ] Both clients show the Confirm Bet view with the correct USD/wei amount.
- [ ] Two `DepositMade` events appear on BscScan; both clients show confirmed.
- [ ] `GameStarted` fires and the board appears for both players.
- [ ] On checkmate/timeout: `GameResolved`, winner paid, house cut sent.
- [ ] On draw/deck-exhausted: `GameDrawn`, both refunded.
- [ ] On deposit timeout: `GameCancelled`, deposits refunded, `bet_cancelled` shown.

---

## Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| **Deposit screen never appears** | The match is free (casual + beginner), or a server env var is missing → check the log for `[BetManager] Blockchain not enabled`. Both players must have a **signing** wallet session (not manual address). |
| **Connect Wallet button disabled** | `CHECKKER_WC_PROJECT_ID` not passed to the Flutter build (step 2/6). |
| **Deposit confirms in the wallet but the game never starts** | The server isn't seeing the `DepositMade` event — almost always the public HTTP RPC polling. Switch `BSC_RPC_URL` to a WebSocket/dedicated provider (see step 5 note). |
| **`Wrong deposit amount` revert** | Wallet isn't on chain 97, or it's depositing a stale amount. Both players must be on **BSC Testnet**; always deposit the amount the app shows. |
| **Winner not paid / `Not referee` revert** | `REFEREE_PRIVATE_KEY` doesn't match the `REFEREE_ADDRESS` used at deploy time, or the referee wallet is out of gas tBNB. |
| **`insufficient funds`** | The player wallet lacks tBNB for stake + gas. Re-fund from the faucet. |
| **CoinGecko price fetch fails** | The oracle falls back to a cached/default ~$300/BNB; deposits still match because the server sends the exact wei. No action needed for testing. |

---

## Known limitations (testnet scope)

These do **not** block testing but are tracked in
`docs/PROJECT_STATUS_AND_REMAINING_WORK.md` for a production/mainnet release:

- **Single trusted referee.** The server unilaterally reports results. Acceptable
  for testnet; mainnet needs a dispute window / multi-sig / on-chain timeout.
- **No on-chain deposit deadline.** Cancellation relies on the server; if the
  server is down mid-deposit, a manual `cancelGame` by the owner is required.
- **Event detection over HTTP RPC** can lag (see step 5) — use a WebSocket RPC.
- **Mainnet is intentionally gated** behind a contract audit (see the status doc).
  This build registers **only BSC testnet (chain 97)** in the wallet picker.

> **Already handled (2026-06-15):** the deposit tx hash is now recorded on the
> `Bet` row, the Confirm Bet view shows a countdown of the deposit window,
> reconnecting during the window re-syncs the prompt, and deposit failures show a
> specific reason (rejection / insufficient funds / wrong network).
