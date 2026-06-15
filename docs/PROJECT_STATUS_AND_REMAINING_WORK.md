# Checkker — Project Status & Remaining Work

> **Updated:** 2026-06-15
> **Scope:** What is complete, and what remains to ship (1) a complete functioning
> game and (2) a complete crypto-betting implementation.
> **Companion docs:** `docs/TESTNET_BETTING.md` (hands-on setup/test),
> `plans/V1_GAP_ANALYSIS.md`, `plans/V1_ROADMAP.md`, `plans/SERVER_REMAINING_WORK.md`,
> `plans/FLUTTER_REMAINING_WORK.md`, `plans/INFRASTRUCTURE_PLAN.md`.

This document supersedes the dated `plans/*` files where they disagree; the
`plans/*` files remain the detailed engineering breakdown.

---

## 1. Where the project stands

The **core game loop is complete and production-quality** on the Flutter client
(`checkker_mobile`, the lead client) and the authoritative Node/Socket.IO server:

- Chess + poker hybrid rules, card-driven moves, capture→score-pile, poker & chess
  scoring, mulligan redraw, all four time controls.
- Ranked / casual / bot / offline / LAN play, matchmaking + bot fallback.
- Replays, puzzles (daily + library), tutorials (16 lessons), spectating, friends,
  notifications, cosmetics shop with equipped-in-game themes.
- Adaptive AI brain (minimax + alpha-beta, optional Stockfish, optional LLM coach),
  live win-probability + clocks, ELO ratings.
- Wallet auth (WalletConnect + manual address), 7-day session tokens, settings,
  analytics/crash hooks, sound + music.
- **Crypto betting works end-to-end on BSC testnet** (contract + server referee +
  Flutter deposit UI + automatic settlement).

CI builds all Flutter platforms (Android/iOS/Linux/macOS/Windows) and the desktop
Electron `.exe`; the monorepo typechecks and tests are green.

**The remaining work is therefore "completion & hardening," not "build the game."**

---

## 2. Remaining work — complete functioning game

Ordered by impact. Items marked **(deferred)** are intentional v2/post-launch cuts
per the roadmap; they are not required for a complete v1.

### 2.1 Quality / correctness (should do before a real launch)

1. **Cross-platform audio verification.** Sound was hardened (`PlayerMode.lowLatency`,
   lazy re-init) but not confirmed on every target. Verify SFX + BGM on a physical
   Android device, iOS, web (needs a user gesture to start audio), and Windows
   desktop. *Files:* `checkker_mobile/lib/services/sound_service.dart`,
   `music_service.dart`.
2. **Piece-color rendering verification.** The glyph recolor fix
   (`ColorFilter.mode(fill, srcIn)`) makes piece color font-independent; confirm on
   the same matrix of platforms that both armies render correctly.
   *File:* `checkker_mobile/lib/widgets/piece_glyph.dart`.
3. **Profile "Recent Games" list.** The server streams game history and the replay
   viewer exists, but the profile screen doesn't yet render the recent-games list
   that links into replays. *File:* `checkker_mobile/lib/screens/profile/`.
4. **Runtime theme application polish.** Cosmetics equip works; confirm board/card-back
   themes apply live across all game surfaces (some surfaces still read defaults).
5. **Reconnection UX during active games & deposits.** Verify a dropped socket
   re-joins an in-progress game and re-syncs odds/clocks; the deposit window does
   not currently re-sync on reconnect (see §3).

### 2.2 Engagement & store-readiness

6. **Push notification delivery (FCM/APNs).** In-app notifications + token
   scaffolding exist; real delivery needs Firebase/APNs credentials + server send
   via Firebase Admin SDK. *Files:* `checkker_mobile/lib/services/push_service.dart`,
   server `register_fcm_token` handler.
7. **Daily-puzzle freshness & volume.** Daily rotation exists; scale curated puzzle
   content and confirm the rotation cron in production.
8. **App-store assets & legal.** Screenshots per device size, store copy, privacy
   policy, terms, age-rating questionnaire, skill-game classification.
9. **Hosted analytics/crash backend.** Hooks are pluggable; wire a real
   Sentry/Firebase/Amplitude project via the documented env vars.

### 2.3 Testing & infra hardening

10. **E2E tests** (Maestro/Detox/Playwright) for the full game flow on device/web.
11. **Server load test** (e.g. 100 concurrent games) + request-timing logs.
12. **Flutter release artifacts in CI** — analyze/test run today; add signed
    APK/AppBundle + iOS archive build-and-upload.
13. **Performance pass** — `ChessBoard` repaint boundaries, selective `Consumer`
    rebuilds on `GameScreen`, low-end Android profiling.

### 2.4 Deferred (v2 / post-launch)

- Tournaments · language/localization · production 3D board · real-money/mainnet
  betting (see §3.4) · full P2P LAN host (currently "connect to any LAN server").

---

## 3. Remaining work — complete crypto-betting implementation

**Current state: functional on testnet.** The contract, server escrow driver, bet
orchestration, price oracle, Flutter deposit UI, and automatic settlement are all
implemented and wired. The items below take it from "works on testnet" to
"complete & production-ready."

### 3.1 Small gaps — ✅ DONE (2026-06-15)

All five shipped and verified (Flutter analyze clean; Flutter 43 + server 57 tests pass;
server/database typecheck green):

1. ✅ **Deposit tx hash reported to the server.** Client emits
   `deposit_submitted { gameId, txHash }` after the wallet broadcasts; the server
   threads it into `BetManager.confirmDeposit` → `BetRepository.confirmDeposit(betId, txHash)`
   (the on-chain event path no longer blanks an existing hash).
   *Files:* `queue_screen.dart` (`_submitDeposit`), `socket_service.dart`
   (`depositSubmitted`), `GameServer.ts` (`deposit_submitted` handler),
   `BetManager.ts`, `BetRepository.ts`.
2. ✅ **Wallet network picker restricted to BSC.** `connect_screen._restrictToBscNetworks()`
   removes all default EVM/Solana networks and re-adds **BSC testnet (97)** only,
   before `modal.init()`. Mainnet (56) is intentionally left out of this build until
   an audited mainnet escrow ships (see §3.4) — registering it would risk a
   real-funds deposit on a testnet build.
3. ✅ **Deposit-window countdown.** The Confirm Bet view ticks the
   `DEPOSIT_TIMEOUT_MS` window (sent as `timeoutMs` in `awaiting_deposits`),
   turning red under 30 s and showing "expired" at zero.
4. ✅ **Reconnect re-sync.** On (re)connect the client emits
   `request_deposit_status { walletAddress }`; the server re-points the stored
   socket and replays `awaiting_deposits` + per-side `deposit_confirmed` for any
   bet still awaiting that wallet's deposit.
5. ✅ **Clearer client errors.** `WalletService.deposit()` sets `lastDepositError`
   (rejection / insufficient funds / wrong network / no-hash) and pre-checks that
   the selected chain is BSC before sending; the deposit view shows the specific
   message.

### 3.2 Robustness (recommended before mainnet)

6. **WebSocket RPC for event detection.** Server deposit detection polls over HTTP;
   use a WebSocket/dedicated provider so `DepositMade` is caught reliably within the
   window. (Documented as the #1 testnet gotcha.)
   *File:* `apps/server/src/blockchain/ContractService.ts`.
7. **Settlement retry + idempotency.** If `reportWinner`/`reportDraw` fails (RPC
   blip, gas spike), retry with backoff and reconcile from chain state on restart so
   a finished game is never left unsettled. Persist settlement status in the `Bet`
   row.
8. **Referee key management.** Move `REFEREE_PRIVATE_KEY` to a secret manager / KMS;
   monitor the referee wallet's gas balance and alert on low funds.
9. **Nonce / concurrency handling.** Under many simultaneous settlements the single
   referee signer can collide on nonces; add a sequenced signer or nonce manager.
10. **Abandonment/disconnect rules.** Confirm every game-ending path (resign,
    timeout, disconnect-forfeit, deck-exhausted) maps to exactly one of
    `reportWinner` / `reportDraw` / `cancelGame` and that a mid-game disconnect can't
    strand funds.

### 3.3 Contract & test coverage

11. **On-chain deposit deadline.** Add a per-game deadline so either player (not just
    the referee) can reclaim a deposit if the counterparty never deposits and the
    server is unavailable.
12. **Dispute / safety mechanism for mainnet.** A challenge window, multi-sig referee,
    or commit-reveal of the result before payout removes the "trust the server"
    assumption.
13. **Integration tests.** `CheckkerEscrow.test.ts` covers the contract in isolation;
    add a server↔contract integration test against a local Hardhat node exercising
    `ContractService` (create → deposit → report → payout/refund/cancel).

### 3.4 Mainnet path (explicitly deferred to v2)

- **Security audit** of `CheckkerEscrow.sol` before any real funds.
- **Regulatory/skill-game classification** and store-policy review for real-money
  wagering (app stores prohibit unlicensed real-money gambling).
- **Mainnet config** (`BSC_CHAIN_ID=56`, mainnet RPC, audited contract address) and
  a tested house-cut withdrawal flow.
- Keep the safe default: with blockchain env vars unset, the whole app runs
  **free-to-play**.

---

## 4. Suggested order of execution

1. ~~**§3.1 (1–5)** — finish the betting UX/data loop.~~ ✅ Done — clean testnet demo
   with full DB records, a deposit countdown, reconnect re-sync, and precise errors.
2. **§2.1 (1–5)** — verify audio/pieces/reconnect across platforms; add the profile
   recent-games list. Removes the last "feels unfinished" rough edges.
3. **§3.2 + §3.3** — betting robustness + integration tests. Required before anyone
   touches mainnet.
4. **§2.2 / §2.3** — push delivery, hosted analytics, E2E + load tests, store assets.
5. **§3.4 / §2.4 (deferred)** — audit + mainnet + tournaments, post-launch.

---

## 5. Quick reference — betting code map

```
packages/contracts/contracts/CheckkerEscrow.sol     escrow + payout logic
packages/contracts/scripts/deploy.ts                deploy:testnet / deploy:mainnet
packages/shared/src/betting.ts                      tiers, house cut, isFreeGame, timeout
apps/server/src/blockchain/config.ts                BLOCKCHAIN_ENABLED gate + ABI
apps/server/src/blockchain/ContractService.ts       referee-signed calls + event listen
apps/server/src/blockchain/PriceOracle.ts           USD → wei (CoinGecko, cached)
apps/server/src/betting/BetManager.ts               orchestration + DB persistence
apps/server/src/GameServer.ts  (startGame/launchGame/onGameOver)  match→deposit→settle
checkker_mobile/lib/services/wallet_service.dart    sign() + deposit() via Reown AppKit
checkker_mobile/lib/screens/game/queue_screen.dart  Confirm Bet view + deposit handlers
checkker_mobile/lib/models/betting.dart             BetInfo / settlement models
packages/database/prisma/schema.prisma  (model Bet) bet records
packages/database/src/repositories/BetRepository.ts CRUD + status transitions
```
