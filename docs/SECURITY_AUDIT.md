# Security Audit — Checkker

**Scope:** Checkker monorepo — authoritative game server (`apps/server`), shared game logic packages (`packages/chess`, `packages/ai-brain`, `packages/poker`, `packages/shared`), blockchain escrow (`packages/contracts`), desktop shell (`apps/desktop`), and clients (`apps/mobile`, `checkker_mobile`).
**Audit focus:** server-side authorization, input validation, cryptographic checks, and authoritative game-state integrity for money-backed (on-chain escrow) gameplay.

---

## Summary

A security-focused code review was performed. Four concrete vulnerabilities were found and **fixed** in this change set; several additional hardening gaps were identified and documented below (not changed in this pass).

| ID   | Severity | Title                                                                              | Status             |
| ---- | -------- | ---------------------------------------------------------------------------------- | ------------------ |
| F-01 | Critical | Authoritative game engine accepted illegal chess moves / bypassed move legality    | **Fixed**          |
| F-02 | High     | Wallet linking performed without signature verification                            | **Fixed**          |
| F-03 | Medium   | Admin API key compared with non-timing-safe equality                               | **Fixed**          |
| F-04 | Low      | Socket.IO `auth_token` event not rate limited                                      | **Fixed**          |
| F-05 | Medium   | No Content Security Policy enforced (helmet CSP disabled; web client ships no CSP) | Open (recommended) |
| F-06 | Medium   | Session token persisted in plaintext on mobile clients                             | Open (recommended) |
| F-07 | Low      | Avatar upload trusts client-declared MIME type                                     | Open (recommended) |
| F-08 | Info     | Escrow contract uses `.sendValue` (2300 gas) for payouts                           | Open (recommended) |

---

## F-01 — Authoritative game engine accepted illegal moves (Critical) ✅ FIXED

### Affected code

- `packages/chess/src/index.ts` — `getLegalMovesForCard`
- `apps/server/src/GameEngine.ts` — `playCard`, `checkGameEnd`
- `apps/mobile/src/offline/LocalGameEngine.ts` — `playCard`, `checkGameEnd`

### Root cause

The TypeScript game engines validated and applied chess moves using **pseudo-legal** move generation (`pseudoLegalMoves`, backed by chess.js internal `_moves({ legal: false })`), which deliberately ignores king safety. Consequences:

1. Move validation for normal (non-wild) cards used piece-filtered pseudo-legal move lists — moves that leave the mover's king in check were accepted.
2. Wild ("A"/Ace) cards **skipped validation entirely** and accepted any pseudo-legal move.
3. Moves were applied via `applyPseudoLegalMove` → internal `_makeMove`, which bypasses chess.js's legal-move enforcement.
4. Game-over / checkmate detection (`checkGameEnd`) used the pseudo-legal move count, so positions that are actually over could be treated as playable.

Because the server is authoritative for board state (and drives on-chain escrow settlement from that state), accepting illegal moves in real-money games undermines game integrity and can produce invalid results/settlements.

### Fix

- Move legality is now derived from chess.js **legal** move generation:
  - `getLegalMovesForCard` now uses `chess.moves({ verbose: true })` (legal moves, king safety enforced), filtering by piece type; the wild card now returns the full set of **legal** moves.
  - `GameEngine.playCard` validates the submitted move against the legal move list for the played card (wild cards included) and resolves the move from the legal-move set before applying.
  - `checkGameEnd` uses `chess.moves()` (legal moves) for game-over detection.
- The same corrections were applied to the Expo offline/local game engine (`apps/mobile/src/offline/LocalGameEngine.ts`) so client-side local play matches authoritative behavior.

### Verification

- `npx tsc --noEmit` passes for `packages/chess`, `apps/server`, and `apps/mobile`.
- Behavior now matches the independent Dart client implementation (`checkker_mobile/lib/services/chess_service.dart`), which uses `package:chess` `generateMoves()` (legal moves).

---

## F-02 — Wallet linking accepted unverified signatures (High) ✅ FIXED

### Affected code

- `apps/server/src/handlers/profile.ts` — `link_wallet` socket handler
- `apps/server/src/auth/WalletAuth.ts` — added ownership-proof bookkeeping
- `apps/server/src/handlers/auth.ts` — `auth_verify` success path

### Root cause

The `link_wallet` handler accepted `{ walletAddress, signature? }` and never verified the signature (the code contained a `// TODO: verify signature with WalletAuth challenge before linking`).

### Fix

- Successful wallet-challenge verification (`auth_verify`) now marks the wallet as recently verified (`markWalletVerified`).
- The `link_wallet` handler now requires a signature and that the target wallet was verified within the recent window (`wasWalletVerifiedRecently`), before attaching it to the account.

### Verification

- `apps/server` typecheck and lint pass.

---

## F-03 — Admin API key comparison not constant-time (Medium) ✅ FIXED

### Affected code

- `apps/server/src/index.ts` — `adminGate`

### Root cause

Admin key check used `key !== ADMIN_API_KEY` (string equality), which is vulnerable to timing side-channel analysis.

### Fix

- Replaced with `crypto.timingSafeEqual` over equal-length buffers (length-mismatch short-circuits safely).

---

## F-04 — Missing rate limit on Socket.IO `auth_token` (Low) ✅ FIXED

### Affected code

- `apps/server/src/handlers/auth.ts` — `auth_token` handler

### Root cause

The `auth_request` and `auth_verify` events were rate limited; the `auth_token` (session-based reconnect) event was not.

### Fix

- Added the same socket rate limiter check (`rateLimiter.allow(socket.id, "auth_token")`).

---

## Open / Recommended Hardening (not changed in this pass)

1. **Content Security Policy (F-05, Medium).** `apps/server/src/index.ts` disables helmet's CSP (`contentSecurityPolicy: false`) based on the assumption that the web export supplies its own CSP via meta tags; `checkker_mobile/web/index.html` contains no CSP meta tag. Recommend either supplying a CSP or re-enabling helmet CSP with a policy appropriate for the web client.
2. **Session token storage (F-06, Medium).** Mobile clients persist the session token via `SharedPreferences` (Flutter) / `AsyncStorage` (Expo). Recommend platform secure storage (`flutter_secure_storage` / Keychain/Keystore).
3. **Avatar upload validation (F-07, Low).** `AvatarService` validates client-declared MIME type and size, but not file magic bytes. Recommend content-type sniffing.
4. **Escrow payouts (F-08, Info).** `CheckkerEscrow` uses `sendValue` (2300 gas forwarded) for payouts/refunds; mitigated by checks-effects-interactions + `nonReentrant`, but recommend `call{value: ...}` for production hardening.

---

## How to verify the fixes

- Server: `npx tsc --noEmit -p apps/server` and `npm run typecheck -w apps/server`.
- Shared chess package: `npx tsc --noEmit -p packages/chess`.
- Client (Expo): `npx tsc --noEmit -p apps/mobile`.
- Lint: `npx eslint <changed files>`.

## Change log (this fix set)

| File                                         | Change                                                                                                 |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `packages/chess/src/index.ts`                | `getLegalMovesForCard` now uses chess.js legal moves.                                                  |
| `apps/server/src/GameEngine.ts`              | `playCard` validates via legal moves and applies via legal candidate; `checkGameEnd` uses legal moves. |
| `apps/mobile/src/offline/LocalGameEngine.ts` | Same legality corrections for local/offline play.                                                      |
| `apps/server/src/auth/WalletAuth.ts`         | Added `markWalletVerified` / `wasWalletVerifiedRecently`.                                              |
| `apps/server/src/handlers/auth.ts`           | Mark wallet verified on successful auth; rate-limit `auth_token`.                                      |
| `apps/server/src/handlers/profile.ts`        | `link_wallet` requires signature + recent verification.                                                |
| `apps/server/src/index.ts`                   | Admin key comparison via `crypto.timingSafeEqual`.                                                     |
