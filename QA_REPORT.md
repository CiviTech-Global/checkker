# QA Report — Gambit Bot AI + Tutorial

**Date:** 2026-05-24
**Tester:** QA Agent
**Build:** All 15 tasks from Bot AI + Tutorial epic

---

## Summary

| Flow | Status | Notes |
|------|--------|-------|
| 1. Home Screen | ⬜ | |
| 2. Play vs Bot Full Game | ⬜ | |
| 3. Tutorial Lessons | ⬜ | |
| 4. Bot Difficulty Levels | ⬜ | |
| 5. Queue Bot Fallback (Ranked) | ⬜ | |
| 6. Queue Bot Fallback (Casual) | ⬜ | |
| 7. Regression: PvP Mode | ⬜ | |

**Pass rate:** 0/7
**Blocking issues:** none yet

---

## Flow 1: Home Screen

### Prerequisites
- App running (expo start --web)
- Server running (npm run dev in server)

### Test Steps

| # | Action | Expected Result | Pass/Fail |
|---|--------|-----------------|-----------|
| 1 | Open app | Home screen loads within 3s | ⬜ |
| 2 | Check screen title | "Gambit" shown in large text (48px bold, `#e0e0e0`), "Chess + Poker" subtitle below (18px, `#b0b0b0`) | ⬜ |
| 3 | Check button 1 | "⚔️  Play Ranked" visible, navigates to `/queue?mode=ranked` | ⬜ |
| 4 | Check button 2 | "♟️  Play Casual" visible, navigates to `/queue?mode=casual` | ⬜ |
| 5 | Check button 3 | "🤖  Play vs Bot" visible with gold left border (`#ffd700`) | ⬜ |
| 6 | Check button 4 | "📖  Tutorial" visible, background `#3a3a5a` | ⬜ |
| 7 | Tap "Tutorial" | Navigates to `/tutorial` with lesson list | ⬜ |
| 8 | Tap back | Returns to home screen | ⬜ |
| 9 | Tap "Play vs Bot" | Navigates to `/bot/difficulty` with 4 difficulty cards | ⬜ |
| 10 | Tap back | Returns to home screen | ⬜ |

### Known Issues
- ⚠️ Routing mismatch: `index.tsx` pushes `/queue?mode=ranked` and `/queue?mode=casual`, but the actual files are at `game/queue.tsx` (route `/game/queue`) and `game/casual.tsx` (route `/game/casual`). Unless a route remap exists, these buttons will 404. Expected routes should be `/game/queue` and `/game/casual`.

---

## Flow 2: Play vs Bot — Full Game

### Prerequisites
- Server running

### Test Steps

| # | Action | Expected Result | Pass/Fail |
|---|--------|-----------------|-----------|
| 1 | Navigate to `/bot/difficulty` | Difficulty screen loads with header "Choose Difficulty" and back arrow | ⬜ |
| 2 | Verify 4 cards shown | Beginner (🟢, 1 star, "The bot blunders."), Intermediate (🟡, 2 stars, "Plays solid chess."), Advanced (🟠, 3 stars, "Strong play."), Master (🔴, 4 stars, "Near-perfect play.") | ⬜ |
| 3 | Tap "Beginner" | Loading overlay appears ("Starting game..."), then navigate to `/game/{id}?mode=bot` | ⬜ |
| 4 | Check game screen | Chess board, 3 cards in hand, clock, opponent area, score piles | ⬜ |
| 5 | Check opponent label | Shows "🤖 Bot" in opponent section (game recognizes `id.startsWith("bot-")`) | ⬜ |
| 6 | Wait for bot's turn (white moves first, human is white) | After human's first move, bot responds after ~3s delay with Beginner difficulty | ⬜ |
| 7 | Select a card from hand | Card highlights, legal squares highlight on board | ⬜ |
| 8 | Tap a highlighted square | Move executes, `play_move` socket event fires, board updates | ⬜ |
| 9 | Wait for bot response | Bot moves on its turn with appropriate delay, "🤖 Bot is thinking..." shown during wait | ⬜ |
| 10 | Continue playing until game ends | Game ends via checkmate, draw, resignation, or timeout | ⬜ |
| 11 | Check game over overlay | Modal appears with result (You Win / You Lose / Draw), scores, "Return Home" button | ⬜ |
| 12 | Tap "Return Home" | Returns to home screen | ⬜ |

### Notes
- `GameResultOverlay` supports `onRematch` prop but `game/[id].tsx` does NOT pass it — no "Rematch" button is rendered during bot games.
- Bot game always starts as human=white, bot=black, blitz time control.
- Bot is created with `Human_RATING=1000` and bot rating based on difficulty (beginner=400, intermediate=900, advanced=1400, master=1900).

---

## Flow 3: Tutorial Lessons

### Prerequisites
- App running (no server needed for tutorial)

### Test Steps

| # | Action | Expected Result | Pass/Fail |
|---|--------|-----------------|-----------|
| 1 | Navigate to `/tutorial` | Lesson list loads with progress bar showing "0/8 completed" | ⬜ |
| 2 | Verify all 8 lessons | 8 items listed (The Board, Pieces & Cards, ... free play), lesson 1 unlocked (▶️), others locked (🔒) | ⬜ |
| 3 | Tap a locked lesson (lesson 2) | Alert: "Locked" — "Complete the previous lesson first" | ⬜ |
| 4 | Tap lesson 1 | Navigates to `/tutorial/1` | ⬜ |
| 5 | Verify lesson 1 layout | Header shows lesson title + "Step 1/2", instruction card with text, chess board, card hand with one card (4♥), step counter | ⬜ |
| 6 | Step through lesson 1: Step 1 (info) | Instruction about the board, "Next →" button visible | ⬜ |
| 7 | Tap "Next →" | Advances to Step 2: "Move the e2 pawn to e4" | ⬜ |
| 8 | Tap the 4♥ card | Card highlights, e2-e4 highlighted on board | ⬜ |
| 9 | Tap e4 square | Move executes, correct feedback shown (✅ "Great move!"), board updates to new FEN | ⬜ |
| 10 | Check "Lesson complete" | Overlay shows "Lesson Complete!" + success message + "Next Lesson →" and "Back to List" | ⬜ |
| 11 | Return to lesson list | Lesson 1 shows ✅, lesson 2 is now unlocked (▶️) | ⬜ |
| 12 | Complete lessons 2-8 | Each lesson: load, follow instructions, validate moves, success overlay | ⬜ |
| 13 | Check final progress | Progress bar shows "8/8", all lessons ✅ | ⬜ |
| 14 | Tap "Reset Progress" | Confirmation dialog: "Reset Progress" — "Are you sure you want to reset all tutorial progress?" with Cancel + Reset buttons | ⬜ |
| 15 | Tap "Reset" | All progress cleared, lessons reset to locked (lesson 1 unlocked, 2-8 locked) | ⬜ |

### Edge Cases
| # | Action | Expected Result | Pass/Fail |
|---|--------|-----------------|-----------|
| 16 | Navigate to `/tutorial/99` | "Lesson not found" error screen with "← Back" button | ⬜ |
| 17 | Navigate to `/tutorial/abc` | "Invalid lesson" error screen with "← Back" button | ⬜ |
| 18 | Make wrong move during lesson | ❌ feedback shown, hint card highlights for 3s, user can retry | ⬜ |

---

## Flow 4: Bot Difficulty Levels

### Prerequisites
- Server running

### Test Steps

| # | Action | Expected Result | Pass/Fail |
|---|--------|-----------------|-----------|
| 1 | Start bot game at Beginner | Game starts, bot makes random/blunder moves (70% random, prefers pawn non-captures) | ⬜ |
| 2 | Start bot game at Intermediate | Bot plays solidly: captures highest-value pieces, develops knights/bishops to center, castles | ⬜ |
| 3 | Start bot game at Advanced | Bot plays strong positional chess: evaluates piece-square tables, avoids hanging pieces, penalizes giving check | ⬜ |
| 4 | Start bot game at Master | Bot plays near-perfect: 1-ply minimax with opponent reply evaluation, finds tactics, avoids blunders | ⬜ |
| 5 | Verify bot thinking delay | Beginner ~3s, Intermediate ~2s, Advanced ~1.5s, Master ~1s (measured from move submission to bot response) | ⬜ |
| 6 | Verify bot uses card rules | Bot only plays moves matching its hand cards (uses `getLegalMovesForHand` constraint) | ⬜ |
| 7 | Verify bot respects stuck rule | If bot has no legal moves with its hand, it resigns (logs error) | ⬜ |

### Verifying Bot Behavior Per Level

**Beginner (`beginnerEvaluator`):**
- 70% chance: completely random move from legal options
- 30% chance: picks a random non-capture move (prefers pawn moves)
- Never considers material, position, or tactics

**Intermediate (`intermediateEvaluator`):**
- Prioritizes captures (highest-value target first, using lowest-value card)
- Then development moves (N/B to center squares)
- Then castling (prefers kingside)
- Falls back to cheapest card move

**Advanced (`advancedEvaluator`):**
- Full static evaluation of each candidate move (material + piece-square tables)
- Bonus for giving check
- Bonus for safe captures (not on attacked square)
- Penalty for moving to attacked square
- Penalty for using high-value cards (J/Q/K) on low-value outcomes

**Master (`masterEvaluator`):**
- Full static evaluation + 1-ply opponent response analysis
- Simulates each opponent reply, takes worst-case score
- Same capture/check/card-value bonuses as Advanced
- Near-optimal single-ply decision making

---

## Flow 5: Ranked Queue → Bot Fallback

### Prerequisites
- Server running
- Only 1 client connected (no other players to match)

### Test Steps

| # | Action | Expected Result | Pass/Fail |
|---|--------|-----------------|-----------|
| 1 | Tap "Play Ranked" | Navigates to `/queue?mode=ranked` (⚠️ note: actual file at `game/queue.tsx`, route `/game/queue`) | ⬜ |
| 2 | Check queue screen | Title "Gambit", subtitle "Ranked Match", "Searching for opponent..." with spinner, "Blitz • 7 min" | ⬜ |
| 3 | Wait 30 seconds | "Searching..." shows for 30s continuously | ⬜ |
| 4 | After 30s | Bot fallback modal appears with "No opponent found" title | ⬜ |
| 5 | Check modal content | Body text: "Would you like to play against a bot instead?" + two buttons: "Play vs Bot (Intermediate)" + "Keep Searching" | ⬜ |
| 6 | Tap "Keep Searching" | Modal dismisses, spinner continues, re-enters queue | ⬜ |
| 7 | Wait another 30s | Bot fallback modal appears again | ⬜ |
| 8 | Tap "Play vs Bot (Intermediate)" | Bot game starts at Intermediate difficulty, modal dismisses | ⬜ |
| 9 | Verify game works | Game loads, human plays as white, bot as black at Intermediate skill | ⬜ |
| 10 | Tap "Cancel Search" (below search area) | Returns to home screen, removed from queue | ⬜ |

### Notes
- Queue timeout is 30 seconds for ranked players (from `GameServer.addToQueue`: `player.casual ? 15000 : 30000`)
- "Keep Searching" re-calls `joinQueue(1200, "blitz")` so the timeout resets
- The bot fallback modal does NOT have a "Cancel" button within the modal itself — only "Play vs Bot" and "Keep Searching"

---

## Flow 6: Casual Queue → Bot Fallback

### Prerequisites
- Server running
- Only 1 client connected

### Test Steps

| # | Action | Expected Result | Pass/Fail |
|---|--------|-----------------|-----------|
| 1 | Tap "Play Casual" | Navigates to `/queue?mode=casual` (⚠️ note: actual file at `game/casual.tsx`, route `/game/casual`) | ⬜ |
| 2 | Check casual screen | Title "Gambit", subtitle "Casual Match", "Searching for opponent...", "Unranked • Blitz 7 min" | ⬜ |
| 3 | Wait 15 seconds | Bot fallback modal appears ("No opponent found") | ⬜ |
| 4 | Check modal content | Same modal as ranked: "Play vs Bot (Intermediate)" + "Keep Searching" | ⬜ |
| 5 | Tap "Keep Searching" | Stays in queue, spinner continues | ⬜ |
| 6 | Tap "Cancel Search" | Returns to home screen, removed from queue | ⬜ |

### Key Difference vs Ranked
- Casual queue timeout is **15 seconds** (half of ranked's 30s), set in `GameServer.addToQueue`

---

## Flow 7: Regression — PvP Mode

### Prerequisites
- Server running
- 2 clients connected (e.g., two browser tabs, or two devices)

### Test Steps

| # | Action | Expected Result | Pass/Fail |
|---|--------|-----------------|-----------|
| 1 | Client A: Tap "Play Ranked" | Client A enters queue, "Searching for opponent..." | ⬜ |
| 2 | Client B: Tap "Play Ranked" | Both clients get matched within 2s, both receive `game_start` event | ⬜ |
| 3 | Check Client A state | Client A is white, has starting hand of 3 cards, starting position | ⬜ |
| 4 | Check Client B state | Client B is black, has starting hand of 3 cards, board flipped | ⬜ |
| 5 | Client A: Play a move | Move executes, both clients receive `game_update` with new FEN | ⬜ |
| 6 | Client B: Play a move | Move executes, board syncs for both | ⬜ |
| 7 | Continue playing | Both can play, turns alternate correctly, card draws work | ⬜ |
| 8 | Game ends (checkmate) | Both clients show `game_over` event with result overlay | ⬜ |

### PvP Specific Checks
| # | Action | Expected Result | Pass/Fail |
|---|--------|-----------------|-----------|
| 9 | Verify opponent hand hidden | Opponent hand shows as array of `null` (length 3) — cards face down | ⬜ |
| 10 | Verify score piles visible | Both players' score piles visible to each other | ⬜ |
| 11 | Verify move history | Moves appear in `moveHistory` array | ⬜ |
| 12 | Test resignation | One player resigns, game ends, winner declared | ⬜ |
| 13 | Test disconnect | One player disconnects, game ends as timeout for disconnected player | ⬜ |

---

## Performance & Edge Cases

| Check | Expected | Status |
|-------|----------|--------|
| Disconnect mid-bot-game | `disposeByHumanId` called, socket handlers cleaned up, no crash | ⬜ |
| Switch apps mid-tutorial | Progress saved via `TutorialStorage` (AsyncStorage), resume works | ⬜ |
| Rapid bot game restart (start, exit, start again) | No event leak: old `play_move`/`resign` handlers removed via `socket.off` in `disposeBotGame` | ⬜ |
| All 4 difficulties playable | Each starts, progresses, finishes without error | ⬜ |
| Tutorial bad route (`/tutorial/99`) | "Lesson not found" error screen with back button | ⬜ |
| Bot all-stuck scenario (no legal moves with hand) | Bot resigns gracefully (`game.resign(this.color)`) | ⬜ |
| Deck exhaustion in bot game | `deckExhausted` result triggers `game_over` | ⬜ |
| Multiple rapid bot fallback offers | Queue timers cleaned up on cancel, no double modal | ⬜ |

---

## Bugs Found

| ID | Flow | Severity | Description | Status |
|----|------|----------|-------------|--------|
| BUG-001 | 1, 5, 6 | High | **Routing mismatch on Home screen:** `index.tsx` pushes `/queue?mode=ranked` and `/queue?mode=casual`, but files are at `game/queue.tsx` (route `/game/queue`) and `game/casual.tsx` (route `/game/casual`). Expo Router will return 404 for `/queue` unless a route remap exists. | Open |
| BUG-002 | 2 | Low | **No Rematch button in bot games:** `GameResultOverlay` supports `onRematch` prop but `game/[id].tsx` never passes it. The overlay conditionally renders "Rematch" only when `onRematch` is provided. PvP games also lack this. | Open |
| BUG-003 | 5, 6 | Low | **Bot fallback modal lacks "Cancel" button:** The modal has "Play vs Bot" and "Keep Searching" but no "Cancel" option. The "Cancel Search" button is always below the search area, not part of the modal, which may confuse users who feel trapped in the modal. | Open |

---

## Final Verdict

**Overall Status:** ❌ NOT READY — 1 blocking bug (BUG-001: routing mismatch), 2 low-severity issues

**Blocking:** BUG-001 prevents Flows 5 and 6 from working at all — the Play Ranked and Play Casual buttons on the home screen route to `/queue` which has no matching file. The files exist at `/game/queue` and `/game/casual` so either the home screen routes need updating to `/game/queue`, or the files need moving.

**Recommended fixes before sign-off:**
1. Fix BUG-001: Update `index.tsx` line 15 (`/queue?mode=ranked` → `/game/queue?mode=ranked`) and line 24 (`/queue?mode=casual` → `/game/casual`), or move files to `app/queue.tsx` and `app/casual.tsx`.
2. Add `onRematch` callback in `game/[id].tsx` for bot games (restart with same difficulty).
3. Consider adding "Cancel" option inside the bot fallback modal for better UX.
