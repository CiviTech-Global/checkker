<p align="center">
  <img src="Logo.png" alt="Checkker" width="300" />
</p>

<h1 align="center">Checkker</h1>
<h3 align="center">Chess&nbsp;+&nbsp;Poker. A new kind of strategy game.</h3>

<p align="center">
  <strong>Play chess where every move is dictated by playing cards.</strong><br/>
  Build poker hands from the pieces you capture. Bet crypto on ranked matches.<br/>
  Challenge adaptive AI bots or compete against real opponents worldwide.
</p>

<p align="center">
  <img alt="Platforms" src="https://img.shields.io/badge/platforms-web%20%7C%20desktop%20%7C%20iOS%20%7C%20Android-A855F7" />
  <img alt="Server" src="https://img.shields.io/badge/server-Node.js%20%2B%20Socket.IO-7C3AED" />
  <img alt="Clients" src="https://img.shields.io/badge/clients-React%20Native%20%26%20Flutter-A855F7" />
  <img alt="License" src="https://img.shields.io/badge/license-All%20rights%20reserved-555" />
</p>

<p align="center">
  <a href="#what-is-checkker">Overview</a> &bull;
  <a href="#how-to-play">How to Play</a> &bull;
  <a href="#the-deck">The Deck</a> &bull;
  <a href="#features">Features</a> &bull;
  <a href="#screenshots">Screenshots</a> &bull;
  <a href="#architecture">Architecture</a> &bull;
  <a href="#codebase-guide">Codebase</a> &bull;
  <a href="#getting-started">Getting Started</a> &bull;
  <a href="#configuration--server-address">Config</a> &bull;
  <a href="#support-the-project">Donate</a>
</p>

---

## What is Checkker?

Checkker is a hybrid strategy game that fuses **chess** and **poker** into one board. You play on a standard 8×8 chessboard, but you don't move pieces freely — instead you hold a small hand of playing cards, and **each card unlocks a specific piece type**. Every capture you make sends the captured piece's card to your **score pile**, which is scored as poker hands at the end of the game.

The result is a game with two simultaneous win paths and constant tension between them:

- **Win the chess game** by delivering checkmate, or forcing a resignation/timeout.
- **Win the poker game** by capturing the right pieces to build powerful poker hands.

The final winner is decided by **total score = chess points + poker points** — so a player who gets checkmated can still win the match overall if their score pile is strong enough. That single rule is what makes Checkker feel new every game.

It ships as a single codebase that runs on **web, desktop (Windows), iOS, and Android**, backed by an authoritative real‑time game server, an adaptive AI brain, optional crypto betting, ELO ranking, puzzles, tutorials, spectating, and friends.

---

## How to Play

1. **Draw cards.** You hold a hand of **3 cards** drawn from a shared 52‑card deck.
2. **Each card controls a piece type** — King, Queen, Knight, Rook, Bishop, Pawn, or Ace (wild = any piece).
3. **Play a card to move that piece** using normal chess rules. Castling, en passant, and promotion all work.
4. **Captured pieces become cards in your score pile.**
5. **Refill** your hand from the draw pile and pass the turn.
6. **The game ends** on checkmate, resignation, timeout, an agreed draw, or when the deck is exhausted.
7. **The higher total score wins** — chess points plus poker points.

### Card → Piece mapping

| Card | Piece | Copies in deck |
|:----:|:------|:--------------:|
| **K** | King | 4 |
| **Q** | Queen | 4 |
| **J** | Knight | 4 |
| **10** | Rook | 4 |
| **2** | Bishop | 4 |
| **3 – 9** | Pawn | 28 |
| **A** | **Wild** — move any piece | 4 |

> Defined in [`packages/shared/src/cards.ts`](packages/shared/src/cards.ts) as `CARD_TO_PIECE`.

### Scoring

**Chess points** are awarded for the board result ([`CHESS_SCORES`](packages/shared/src/game.ts)):

| Result | Winner | Loser |
|:-------|:------:|:-----:|
| Checkmate | 30 | 0 |
| Resignation | 25 | 0 |
| Timeout | 25 | 0 |
| Draw | 10 each | — |
| Deck exhausted | 0 | 0 (decided purely on poker) |

**Poker points** come from your score pile, which is greedily split into the best 5‑card hands ([`POKER_SCORES`](packages/shared/src/poker.ts)):

| Hand | Points |
|:-----|:------:|
| Royal Flush | 25 |
| Straight Flush | 18 |
| Four of a Kind | 14 |
| Full House | 10 |
| Flush | 8 |
| Straight | 6 |
| Three of a Kind | 4 |
| Two Pair | 3 |
| One Pair | 1 |
| High Card | 0 |

> **The twist:** because the winner is decided on `chess + poker`, capturing pieces to complete a Four‑of‑a‑Kind (+14) or Full House (+10) can outweigh a checkmate (+30). Every card you play is a choice between board control and score‑pile value.

---

## The Deck

Each rank is illustrated with bespoke card art used across the apps (tutorial book, card hand, and the gallery).

<table>
  <tr>
    <td align="center"><img src="apps/mobile/assets/gallery/king.png" width="150"/><br/><strong>King</strong><br/><code>K</code></td>
    <td align="center"><img src="apps/mobile/assets/gallery/queen.png" width="150"/><br/><strong>Queen</strong><br/><code>Q</code></td>
    <td align="center"><img src="apps/mobile/assets/gallery/knight.png" width="150"/><br/><strong>Knight</strong><br/><code>J</code></td>
    <td align="center"><img src="apps/mobile/assets/gallery/rook.png" width="150"/><br/><strong>Rook</strong><br/><code>10</code></td>
  </tr>
  <tr>
    <td align="center"><img src="apps/mobile/assets/gallery/bishop.png" width="150"/><br/><strong>Bishop</strong><br/><code>2</code></td>
    <td align="center"><img src="apps/mobile/assets/gallery/pawns.png" width="150"/><br/><strong>Pawn</strong><br/><code>3–9</code></td>
    <td align="center"><img src="apps/mobile/assets/gallery/ace-wild.png" width="150"/><br/><strong>Wild</strong><br/><code>A</code></td>
    <td align="center" valign="middle"><em>Each card<br/>is a move<br/>and a bet.</em></td>
  </tr>
</table>

---

## Features

### Game modes

- **Ranked Play** — competitive matchmaking with ELO ratings and optional crypto bets.
- **Casual Play** — relaxed matches with configurable difficulty (beginner is free).
- **Play vs Bot** — four difficulty tiers, each with four personality styles.
- **Local Network (LAN)** — host or join a game against a friend on the same Wi‑Fi, with UDP auto‑discovery.
- **Spectate** — watch bot‑vs‑bot games at any difficulty pairing, with pause / step / resume controls.
- **Offline** — play fully on‑device against a local engine, no server required.
- **Tutorials** — a card "book" plus structured interactive lessons from basics to advanced strategy.
- **Puzzles** — tactics, card‑management, endgame, and weakness‑targeted puzzles with daily rotation and streaks.
- **Replays** — review any finished game move by move.

### Adaptive AI

The AI lives in the [`@checkker/ai-brain`](packages/ai-brain) package and evaluates both halves of the game at once with a **hybrid chess‑poker evaluator**:

```
hybridScore ≈ (chessCentipawns / 100) + (pokerPotential × weight)
```

- **4 difficulty levels** — Beginner, Intermediate, Advanced, Master (search depth + noise per tier).
- **4 personality styles** — The Strategist (classical), The Gambler (aggressive), The Fortress (defensive), The Trickster (tricky).
- **Adaptive difficulty** — the bot profiles your play (aggression, card conservation, weaknesses) and adjusts.
- **Player modeling & clustering** — `PlayerClusterer` groups play styles for smarter matchmaking.
- **Coaching & commentary** — optional LLM‑powered move explanations, post‑game analysis, and spectator commentary.
- **Pluggable engines** — a built‑in `HeuristicEngine` (minimax + alpha‑beta) with optional **Stockfish** integration.

### Live win‑probability & clocks

The server is the single source of truth for **odds, scores, and clocks**. After every move it recomputes a poker‑aware win/draw/loss probability ([`apps/server/src/odds.ts`](apps/server/src/odds.ts)) and broadcasts live poker scores, while the clients tick the chess clocks down locally between updates for a smooth display.

### Crypto betting (BNB on BSC)

Stake real crypto on competitive matches through a trustless smart‑contract escrow ([`packages/contracts/contracts/CheckkerEscrow.sol`](packages/contracts/contracts/CheckkerEscrow.sol)):

| Tier | Bet | House cut |
|:-----|:---:|:---------:|
| Beginner | $10 | 10% |
| Intermediate | $25 | 10% |
| Advanced | $100 | 10% |
| Master | $500 | 10% |

- **Wallet‑only auth** — connect a wallet and sign a challenge; no passwords.
- **Smart‑contract escrow** — both stakes are locked on‑chain until the game ends.
- **Automatic payouts** — the winner is paid instantly; draws refund both players in full (no house cut).
- **BSC Testnet** first; mainnet after audit. Without blockchain env vars the app runs in **free mode**.

### ELO rating tiers

| Tier | Rating | Rank |
|:-----|:------:|:-----|
| Pawn | 0–999 | Novice |
| Knight | 1000–1399 | Intermediate |
| Bishop | 1400–1699 | Advanced |
| Rook | 1700–1999 | Expert |
| Queen | 2000–2299 | Master |
| King | 2300+ | Grandmaster |

### Social & profile

- **Friends** — send/accept requests, see who's online, and invite friends directly to a game.
- **Notifications** — friend requests, invites, and system messages with an unread badge.
- **Profiles & leaderboard** — global ELO leaderboard, per‑player stats, recent games, and puzzle stats.
- **Cosmetics shop** — earn coins and equip board/piece/card themes that apply app‑wide.

### Procedural sound

All game audio is **synthesized in real time** from oscillators — no audio files to ship: wooden move taps, heavy capture thuds, sharp check alerts, castling clicks, promotion sparkles, a game‑start fanfare, and a checkmate power chord.

### Design system

A single **"Dark Violet Esports"** design language (background `#14101F`, accent `#A855F7`, amber for points/ratings) is centralized in design tokens on both clients ([`apps/mobile/src/theme/tokens.ts`](apps/mobile/src/theme/tokens.ts) and [`checkker_mobile/lib/theme/tokens.dart`](checkker_mobile/lib/theme/tokens.dart)), so the whole palette can be re‑skinned from one place.

---

## Screenshots

<p align="center">
  <img src="docs/screenshots/main-menu.png" alt="Main menu" width="700" />
</p>

<details>
<summary><strong>Ranked mode — bet tiers</strong></summary>
<img src="docs/screenshots/ranked-mode.png" alt="Ranked mode" width="700" />
</details>

<details>
<summary><strong>Casual mode — free beginner, bets for higher tiers</strong></summary>
<img src="docs/screenshots/casual-mode.png" alt="Casual mode" width="700" />
</details>

<details>
<summary><strong>AI opponent personalities</strong></summary>
<img src="docs/screenshots/ai-opponent-style.png" alt="AI opponent style" width="700" />
</details>

<details>
<summary><strong>Bot vs bot spectate</strong></summary>
<img src="docs/screenshots/bot-vs-bot.png" alt="Bot vs bot" width="700" />
</details>

<details>
<summary><strong>Tutorials</strong></summary>
<img src="docs/screenshots/tutorials.png" alt="Tutorials" width="700" />
</details>

<details>
<summary><strong>Puzzles</strong></summary>
<img src="docs/screenshots/puzzles.png" alt="Puzzles" width="700" />
</details>

<details>
<summary><strong>Local network play</strong></summary>
<img src="docs/screenshots/local-network.png" alt="Local network" width="700" />
</details>

---

## Architecture

Checkker is a **Turborepo monorepo** with an authoritative Node.js server, shared TypeScript game logic, and two independent client implementations (React Native and Flutter) that speak the same Socket.IO protocol.

```
checkker/
├── apps/
│   ├── server/         Authoritative game server (Node.js + Express + Socket.IO)
│   ├── mobile/         React Native + Expo client (web, iOS, Android)
│   └── desktop/        Electron shell that bundles the server + web export into a portable .exe
├── packages/
│   ├── shared/         Cross-cutting types, constants & rules (cards, poker, scoring, ratings, betting…)
│   ├── chess/          Legal-move generation constrained by the played card
│   ├── poker/          Score-pile → best-hands evaluator
│   ├── ai-brain/       Hybrid evaluator, engines, adaptive bot, coaching, puzzle generation
│   ├── contracts/      Solidity escrow contract + Hardhat tooling
│   └── database/       Prisma schema + repositories (PostgreSQL)
├── checkker_mobile/    Flutter client (web, iOS, Android, desktop) — full feature parity
└── docs/               Screenshots & assets
```

### Tech stack

| Layer | Technology |
|:------|:-----------|
| Server | Node.js, Express, Socket.IO, TypeScript |
| Client A | React Native, Expo, Expo Router, Reanimated |
| Client B | Flutter, Riverpod, go_router |
| Desktop | Electron + electron‑builder (wraps the RN web export) |
| Chess | `chess.js` constrained by card‑legal moves |
| Poker | Custom greedy best‑hand evaluator |
| AI | Minimax + alpha‑beta, hybrid chess‑poker scoring, optional Stockfish & LLM coach |
| Blockchain | Solidity (OpenZeppelin), ethers.js, Hardhat, BSC |
| Database | PostgreSQL + Prisma ORM |
| Build | Turborepo, esbuild, TypeScript, Jest |

### Runtime data flow

```
        ┌──────────────────────────────────────────────┐
        │            apps/server (authoritative)         │
        │  GameServer ── routes Socket.IO events          │
        │     │                                           │
        │     ├── GameEngine   per-game state, rules,     │
        │     │                 clock, scoring, odds      │
        │     ├── BotManager    AI moves via ai-brain     │
        │     ├── SpectateManager  bot-vs-bot streams     │
        │     ├── BetManager + ContractService  escrow    │
        │     └── PlayerStore / database  persistence     │
        └───────────────▲───────────────▲────────────────┘
                        │ Socket.IO       │ Socket.IO
                        │ (game_start /    │
                        │  game_update /   │
                        │  game_over …)    │
              ┌─────────┴───────┐ ┌───────┴──────────┐
              │ apps/mobile (RN) │ │ checkker_mobile  │
              │ web / iOS / Andr │ │ (Flutter)        │
              └──────────────────┘ └──────────────────┘
```

The **server owns the truth** — board state, legal moves, clocks, odds, score, and settlement — and broadcasts `game_start` / `game_update` / `game_over` (plus `spectate_*`, auth, friends, puzzles, cosmetics, betting events). Clients render state and send intents (`play_move`, `resign`, `join_queue`, …); they never compute authoritative results, which keeps the two clients perfectly consistent.

### Socket protocol (high level)

The full client→server surface is registered in [`apps/server/src/GameServer.ts`](apps/server/src/GameServer.ts). Grouped:

- **Auth** — `auth_request`, `auth_verify`, `auth_token`, `auth_logout`, `set_username`, `update_avatar`
- **Matchmaking & play** — `join_queue`, `join_casual`, `join_ranked`, `find_match`, `play_move`, `resign`, `rematch_request`, `undo_move`, `chat_message`
- **Bots & spectating** — `start_bot_game`, `request_bot`, `request_adaptive_bot`, `start_spectate_bot_game`, `spectate_pause/resume/step_forward/step_backward/leave`
- **AI brain** — `request_coaching_tip`, `explain_move`, `generate_puzzle`, `get_player_dashboard`, `get_adaptive_difficulty`, `get_cluster_stats`
- **Progression** — `get_leaderboard`, `get_profile`, `get_daily_puzzle`, `get_puzzles`, `submit_puzzle`, `get_game_moves`
- **Social** — `get_friends`, `send_friend_request`, `respond_friend_request`, `remove_friend`, `invite_friend`, `respond_invite`, `get_notifications`, `mark_notifications_read`
- **LAN** — `host_lan_game`, `cancel_lan_host`, `join_lan_game`
- **Cosmetics** — `get_cosmetics`, `purchase_cosmetic`, `equip_cosmetic`

---

## Codebase guide

### `packages/shared` — rules & types

The contract every other package depends on. Pure TypeScript, no runtime deps.

| File | Responsibility |
|:-----|:---------------|
| `cards.ts` | Suits, ranks, the `CARD_TO_PIECE` mapping, deck creation. |
| `poker.ts` | `PokerHand` enum and `POKER_SCORES` point table. |
| `game.ts` | `GameState`, `MoveRecord`, `GameResult`, and `CHESS_SCORES`; final score calculation. |
| `rating.ts` | ELO update math and tier/badge thresholds. |
| `betting.ts` | Bet tiers, USD amounts, house cut. |
| `contract.ts` | Escrow ABI/addresses and on‑chain types shared with clients. |
| `cosmetics.ts` / `avatars.ts` | Cosmetic catalog and avatar definitions. |
| `donations.ts` | Donation wallet addresses surfaced in‑app. |
| `replay.ts` | Replay record types. |

### `packages/chess` & `packages/poker`

- **chess** — wraps `chess.js` to generate only the moves that are **legal for the played card's piece type** (and handles wild/Ace, castling, promotion).
- **poker** — `evaluator.ts` greedily extracts the highest‑value 5‑card hands from a score pile and returns `{ hands, leftover, total }`.

### `packages/ai-brain` — the AI

| Area | Files |
|:-----|:------|
| Engines | `engine/HeuristicEngine.ts`, `engine/StockfishEngine.ts`, `engine/Engine.ts`, `engine/factory.ts` |
| Evaluation | `evaluator/HybridEvaluator.ts`, `evaluator/PokerPotential.ts` |
| Adaptive | `adaptive/AdaptiveBot.ts`, `adaptive/PlayerClusterer.ts`, `adaptive/PlayerRepository.ts` |
| Analysis | `analysis/PostGameAnalysis.ts`, `analysis/PuzzleGenerator.ts` |
| Coaching | `coaching/LLMCoach.ts`, `coaching/MoveExplainer.ts` |
| Entry | `orchestrator.ts`, `types.ts`, `index.ts` |

### `packages/contracts` — escrow

`CheckkerEscrow.sol` (OpenZeppelin `Ownable` + `ReentrancyGuard`) locks both stakes, pays the winner 90% / house 10%, and refunds draws in full. Hardhat config, deploy script, tests, and generated TypeChain types are included.

### `packages/database` — persistence

Prisma schema (`prisma/schema.prisma`) plus a repository per aggregate: `UserRepository`, `GameRepository`, `GameMoveRepository`, `BetRepository`, `FriendshipRepository`, `NotificationRepository`, `PuzzleRepository`, `CosmeticRepository`. `prisma generate` runs automatically via the package's `postinstall`/`typecheck` scripts so types are always available in CI.

### `apps/server` — authoritative game server

| File | Responsibility |
|:-----|:---------------|
| `index.ts` | Express + Socket.IO bootstrap, `/health` route, daily‑puzzle rotation, cosmetic seeding. |
| `GameServer.ts` | Connection handler; routes every Socket.IO event to the right subsystem. |
| `GameEngine.ts` | Per‑game state machine — card‑legal moves, clocks, scoring, odds input, live scores. |
| `odds.ts` | Poker‑aware win/draw/loss probability model. |
| `bot/` | `BotManager`, `BotPlayer`, `evaluators`, `SpectateManager` for AI & bot‑vs‑bot. |
| `auth/WalletAuth.ts` | Wallet signature challenge/verify + session tokens. |
| `betting/BetManager.ts` | Bet lifecycle on top of the contract service. |
| `blockchain/` | `ContractService`, `PriceOracle`, network `config`. |
| `PlayerStore.ts` | In‑memory + DB‑backed player state. |
| `monitoring.ts` | Lightweight metrics/error hooks. |

### `apps/mobile` — React Native + Expo client

Expo Router file‑based routes under `app/` cover the whole product: `index` (home), `auth/{connect,setup}`, `game/{ranked,casual,queue,[id]}`, `bot/difficulty`, `spectate/{index,[id]}`, `lan`, `puzzles/{index,play/[category]}`, `tutorial/{index,book,[id]}`, `leaderboard`, `profile`, `friends`, `notifications`, `shop`, `replay/[gameId]`, `donate`, `settings`, `offline`, `dev`. Socket logic lives in `src/hooks/useSocket.ts`; the server address is the `ADDRESS_OF_SERVER` constant in `src/config/features.ts`.

### `apps/desktop` — Electron shell

`main.js` spawns the bundled game server on a free port, injects `window.__CHECKKER_SERVER_URL__`, and loads the RN **web export** — producing a single portable `Checkker-*-portable.exe` with no installer and no external server.

### `checkker_mobile` — Flutter client (feature parity)

A complete second client with the same features, organized as `models/` (data), `providers/` (Riverpod state), `services/` (`socket_service`, `local_game_engine` for offline, `chess_service`, `poker_evaluator`, procedural `sound_service`, `lan_service`, `wallet_service`, …), `screens/` (one per route), `widgets/` (board, clock, card hand, odds, score pile, …), and `theme/`. The server address is the `ADDRESS_OF_SERVER` constant in `lib/services/socket_service.dart`.

---

## Getting Started

### Prerequisites

- **Node.js** 20+ and **npm** 11+
- **Flutter** 3.10+ (only for the Flutter client `checkker_mobile`)

### Install

```bash
git clone https://github.com/civitechglobal/checkker.git
cd checkker
npm install
```

### Develop (web + server)

```bash
# Server + RN web client
npm run dev

# Flutter client (separate)
cd checkker_mobile
flutter run            # add -d chrome for web
```

### Build the desktop `.exe`

```bash
npm run export:web -w apps/mobile     # RN web export
npm run bundle -w apps/server         # server bundle
npm run build -w apps/desktop         # → apps/desktop/dist/Checkker-*-portable.exe
```

### Smart contract (optional)

```bash
cd packages/contracts
npx hardhat compile
npx hardhat test
# Deploy to BSC Testnet
REFEREE_ADDRESS=0x... HOUSE_WALLET=0x... npx hardhat run scripts/deploy.ts --network bscTestnet
```

### Database (optional — persistent profiles)

```bash
cd packages/database
# set DATABASE_URL in .env
npx prisma generate
npx prisma db push
```

### Environment variables

| Variable | Description | Required for |
|:---------|:------------|:-------------|
| `DATABASE_URL` | PostgreSQL connection string | Profiles / persistence |
| `BSC_RPC_URL` | BSC RPC endpoint | Betting |
| `CHECKKER_CONTRACT_ADDRESS` | Deployed escrow contract | Betting |
| `REFEREE_PRIVATE_KEY` | Server hot‑wallet key | Betting |
| `HOUSE_WALLET_ADDRESS` | House wallet for fees | Betting |
| `BSC_CHAIN_ID` | `97` (testnet) or `56` (mainnet) | Betting |
| `STOCKFISH_PATH` | Path to a Stockfish binary | Stronger AI |
| `AI_COACH_PROVIDER` + `AI_COACH_API_KEY` | LLM provider/key | Coaching & commentary |

Without the blockchain variables, the app runs in **free mode** — every game mode works without betting.

---

## Configuration — Server Address

Both clients connect to the game server through a single, clearly named constant: **`ADDRESS_OF_SERVER`**.

- **React Native** — [`apps/mobile/src/config/features.ts`](apps/mobile/src/config/features.ts)
  Resolves in order: desktop‑injected `window.__CHECKKER_SERVER_URL__` → `EXPO_PUBLIC_SERVER_URL` → page origin (web) → `http://localhost:3001`.
- **Flutter** — [`checkker_mobile/lib/services/socket_service.dart`](checkker_mobile/lib/services/socket_service.dart)
  Resolves in order: `--dart-define=SERVER_URL=...` → web origin → Android emulator `http://10.0.2.2:3001` → `http://localhost:3001`. It can also be overridden at runtime in **Settings → Game Server**, which persists and reconnects.

### Connecting a physical phone to a LAN server

1. Find your host machine's LAN IP (e.g. `192.168.1.105`) and confirm the server is reachable: open `http://<host-ip>:3001/health` in the phone's browser — it should return `{"status":"ok"}`.
2. In the Flutter app, set **Settings → Game Server** to `http://<host-ip>:3001` (the `10.0.2.2` default only works on the Android **emulator**).
3. Make sure both devices are on the same Wi‑Fi and that inbound TCP `3001` is allowed through the host firewall.

> Android blocks plain‑HTTP (cleartext) traffic by default on API 28+. Checkker's Android manifest enables cleartext via `usesCleartextTraffic` + a `network_security_config` so LAN/self‑hosted HTTP servers work out of the box. Tighten this to a per‑domain rule once your server is behind HTTPS.

---

## Testing & quality

```bash
npm run typecheck     # turbo typecheck across all packages & the RN client
npm run lint          # turbo lint
npm test -w apps/server   # server Jest suite
cd checkker_mobile && flutter analyze && flutter test
```

CI runs `turbo typecheck` on Windows, Ubuntu, and macOS. The full suite covers the shared rules, poker evaluator, odds model, game engine, socket integration, bots, and both clients' unit/widget tests.

---

## Support the Project

Checkker is built with passion. If you enjoy the game, consider supporting development with a donation — or tap the heart button on the home screen in‑app.

| Network | Address |
|:--------|:--------|
| **Bitcoin (BTC)** | `bc1q209xk5qutfyr9eqvwyje22wavw6yr6sdxuzcmj` |
| **Cardano (ADA)** | `addr1q8xv0453z20psvfrdtrwmjflwspfdmef6vfm8540ufsmctzp6adj7slsvhn0md8x9wppkz6l0249ms4lxhtk69ucncnqaxw70f` |
| **Dogecoin (DOGE)** | `D9VdaGDPD56645fRY2PYJoijniqrDUR5uS` |
| **XRP** | `rnGvcmWAJesxrhgeULDeqvZzMMsDidHYG9` |
| **BNB (BSC)** | `0x86EF35e6fe773fF461FCC367d48D6789F94E4b12` |
| **Solana (SOL)** | `AqoFb34GbWUYhxKqX3kmwLLuzp56FbPT3L9q8nzaArmX` |
| **Stellar (XLM)** | `GABGTWG4C3FXUTCS4KLEI26O24OVRCCLFXW7AVJIOVEGI2WVQ2OTK2ET` |
| **Sui (SUI)** | `0x1104f84617deeeb64a608e105649066b3c633d6636564e1c6dba817b0c541db5` |
| **Tron (TRX)** | `TFzgvBcp3jhFA4FZbcvsHYLNmeicHVY9wj` |

---

## License

All rights reserved. See [LICENSE](LICENSE) for details.
