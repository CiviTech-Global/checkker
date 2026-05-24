# UX/UI Specifications — Gambit Core Gameplay UI

| Field | Value |
|-------|-------|
| **Product** | Gambit — Chess + Poker Hybrid |
| **Document** | UX/UI Specifications V1.0 |
| **Author** | UX/UI Designer Agent |
| **Sprint** | V1 — Sprint 1 |
| **Status** | Ready for development |

---

## 1. Affected Screens & User Flows

### 1.1 User Journey Map

```
Home Screen
  ├─ [Play Ranked] ──→ Queue Screen ──→ Game Found ──→ Game Screen ──→ Game Over Overlay
  ├─ [Play Casual] ──→ Queue Screen ──→ Game Found ──→ Game Screen ──→ Game Over Overlay
  └─ (future) [Play Bot] ──→ (v1.1)
```

**Flow details:**

1. **Home → Queue**: User taps "Play Ranked" or "Play Casual" → navigates to `/game/queue` with a query param `?mode=ranked` or `?mode=casual`
2. **Queue → Searching**: User sees searching animation, estimated wait time, cancel button
3. **Queue → Game**: Server emits `game_start` → auto-navigate to `/game/[id]` with full `GameState`
4. **Game → Game Over**: Server emits `game_over` → overlay appears on top of game screen
5. **Game Over → Home/Rematch**: User taps "Return Home" or "Rematch" → navigate accordingly

### 1.2 New Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/game/queue` | `QueueScreen` | Matchmaking queue with mode param |
| `/game/[id]` | `GameScreen` | Active game (update existing placeholder) |

### 1.3 Modified Routes

| Route | Change |
|-------|--------|
| `/game/[id]` | Replace placeholder with full game UI |

---

## 2. Screen Layouts

### 2.1 Queue Screen (`/game/queue`)

```
┌─────────────────────────────────────┐
│           ┌──────────┐               │
│           │  Logo/Mark               │
│           └──────────┘               │
│                                      │
│         Searching for opponent       │
│                                      │
│           ┌──────────────────┐       │
│           │  [pulsing dots]   │       │
│           └──────────────────┘       │
│                                      │
│       Mode: Ranked  •  Blitz 7min    │
│       Estimated wait: ~45s           │
│                                      │
│                                      │
│        ┌────────────────────┐        │
│        │    Cancel Search   │        │
│        └────────────────────┘        │
│                                      │
│     (optional: your current ELO      │
│      shown for ranked mode)          │
└─────────────────────────────────────┘
```

**States:**

| State | Behavior |
|-------|----------|
| **Searching** | Pulsing dots animation, "Searching for opponent...", cancel button enabled |
| **Found** | Brief (500ms) "Opponent Found!" transition → auto-navigate to `/game/[id]` |
| **Error** | "Connection lost. Retry?" with retry button |
| **Canceled** | Navigate back to home |

### 2.2 Game Screen (`/game/[id]`)

```
┌─────────────────────────────────────┐
│  ┌─────────────────────────────────┐│
│  │  OPPONENT (Black)   3:42 ◉     ││ ← Opponent info bar
│  │  ELO 1450 • Knight Tier        ││
│  └─────────────────────────────────┘│
│                                      │
│  ┌─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┐   │
│  │   Opponent Score Pile        │   │ ← 3 face-down cards
│  │   [🂠] [🂠] [🂠] +3          │   │
│  └─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┘   │
│                                      │
│  ┌─────────────────────────────────┐│
│  │                                 ││
│  │         8×8 Chess Board         ││ ← FEN-driven, interactive on your turn
│  │                                 ││
│  │        [coordinates a-h,        ││
│  │         1-8 on edges]           ││
│  │                                 ││
│  └─────────────────────────────────┘│
│                                      │
│  ┌─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┐   │
│  │   Your Score Pile            │   │ ← face-up captured cards
│  │   [K♠] [Q♥] [J♦] +2        │   │
│  └─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┘   │
│                                      │
│  ┌─────────────────────────────────┐│
│  │  YOUR HAND (White)   4:12 ◉    ││ ← Player info bar with clock
│  │                                 ││
│  │  ┌───┐ ┌───┐ ┌───┐            ││
│  │  │ K │ │ 7 │ │ A │  ← tap     ││
│  │  │ ♠ │ │ ♥ │ │ ♦ │    to      ││
│  │  │Rk │ │Pn │ │Wi │    select  ││ ← 3 cards, face-up
│  │  └───┘ └───┘ └───┘            ││
│  │  Selected: K♠ → Rook          ││ ← shows selected card
│  │  Tap a square to move Rook    ││
│  │                                 ││
│  │      [Resign]                  ││ ← resign button
│  └─────────────────────────────────┘│
└─────────────────────────────────────┘
```

### 2.3 Game Over Overlay

```
┌─────────────────────────────────────┐
│         // DIM BACKGROUND //         │
│                                      │
│  ┌─────────────────────────────────┐│
│  │          GAME OVER              ││
│  │                                 ││
│  │         🏆 You Win!            ││
│  │     (or "Opponent Wins")        ││
│  │                                 ││
│  │  ┌─────────────────────────┐   ││
│  │  │  Chess: Checkmate +30   │   ││
│  │  │  Poker: Full House +10  │   ││
│  │  │  ─────────────────────  │   ││
│  │  │  Total: 40 vs 22        │   ││
│  │  └─────────────────────────┘   ││
│  │                                 ││
│  │  ┌────────────┐ ┌────────────┐ ││
│  │  │  Rematch   │ │ Return Home│ ││
│  │  └────────────┘ └────────────┘ ││
│  └─────────────────────────────────┘│
└─────────────────────────────────────┘
```

---

## 3. Component Specifications

### 3.1 ChessBoard

**Purpose:** Render an 8×8 chess board from a FEN string. Highlight legal moves when a card is selected. Handle tap-to-move.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `fen` | `string` | — | FEN string for current position |
| `orientation` | `"white" \| "black"` | `"white"` | Which color sits at bottom |
| `highlightedSquares` | `string[]` | `[]` | Array of algebraic squares (e.g. `["e2","e4"]`) |
| `selectedSquare` | `string \| null` | `null` | Currently selected piece square |
| `lastMove` | `{from: string, to: string} \| null` | `null` | Previous move highlight |
| `interactive` | `boolean` | `true` | Allow tap interaction |
| `onSquarePress` | `(square: string) => void` | — | Callback on tap |
| `pieceTheme` | `object` | default | Piece image set (future cosmetic) |
| `boardTheme` | `object` | default | Board colors (future cosmetic) |

**States:**

| State | Visual | Behavior |
|-------|--------|----------|
| **Default** | Standard 8×8 board, dark/light alternating (#b58863 / #f0d9b5) | Pieces rendered from FEN |
| **Highlighted** | Legal move squares show green dots (#00ff8866) | Tappable |
| **Selected** | Selected square has yellow/gold ring (#ffd70088) | Clear on second tap |
| **Last Move** | From/to squares subtly highlighted (#ffff0066) | Shows last move |
| **Check** | King square pulses red ring | Visual alert |
| **Disabled** | Board dimmed (opacity 0.6) | No tap interaction (opponent's turn) |
| **Loading** | Skeleton grid | Initial render before FEN loads |

**Coordinates:**
- Files (a–h) on bottom edge, Ranks (1–8) on left edge
- Font: mono, size 12, color #888 on dark squares, #666 on light squares

**Sizing:**
- Mobile: fills available width (100% width, square = width/8)
- Tablet: max 480px centered
- Web: max 600px centered

### 3.2 CardHand (Player)

**Purpose:** Show 3 face-up cards in the player's hand. Tappable for selection.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `cards` | `Card[]` | `[]` | Array of cards (max 3, occasionally 4) |
| `selectedIndex` | `number \| null` | `null` | Index of selected card |
| `onCardTap` | `(index: number) => void` | — | Callback on card tap |
| `disabled` | `boolean` | `false` | Disable interaction on opponent's turn |

**States:**

| State | Visual | Behavior |
|-------|--------|----------|
| **Default filled** | 3 cards face-up, rank+suit+piece label | Tappable |
| **Selected** | Card lifts up 4px, gold border (#ffd700) | Second tap deselects |
| **Empty** | Placeholder slots (dashed outline, opacity 0.3) | N/A |
| **Disabled** | All cards at opacity 0.5 | No tap interaction |
| **Loading Draw** | Card flip animation (150ms) | Card appears with flip |
| **4-card (capture bonus)** | 4th card slightly offset | Special indicator badge "Bonus" |

**Card Layout (each card):**
```
┌───────┐
│ K     │ ← rank (top-left)
│ ♠     │ ← suit (center)
│ Rook  │ ← piece (bottom)
└───────┘
```

**Dimensions:** 64×88px (mobile), 80×112px (tablet/web)
**Border radius:** 8px
**Colors:** Card face `#f5f5f0` (cream), text black

### 3.3 CardHand (Opponent)

**Purpose:** Show 3 face-down cards — card backs only, no information.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `cardCount` | `number` | `3` | Number of cards in opponent's hand |

**States:**

| State | Visual |
|-------|--------|
| **Default** | 3 card backs (patterned, #2a2a4a) |
| **1-draw remaining** | Counter "1 card left" subtle badge |
| **Empty (after play)** | Show 2 card backs |

**Card back design:**
```
┌───────┐
│ ╔═══╗ │
│ ║ ♠ ║ │ ← decorative pattern
│ ╚═══╝ │
│ Gambit│
└───────┘
```
Same dimensions as face-up cards. Pattern: dark navy with subtle gold diamond.

### 3.4 ScorePile

**Purpose:** Display both players' captured cards (face-up for player, face-up for opponent).

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `cards` | `Card[]` | `[]` | Captured cards in score pile |
| `label` | `string` | — | "Your Score Pile" or "Opponent's Score Pile" |
| `maxVisible` | `number` | `3` | Cards to show before "+N more" |

**States:**

| State | Visual | Behavior |
|-------|--------|----------|
| **Empty** | "No captures yet" text (opacity 0.4) | Placeholder state |
| **1–3 cards** | Face-up cards displayed in a row | Card backs for opponent's pile |
| **4+ cards** | First 3 shown + "+N" badge | Badge right-aligned, subtle |
| **New capture** | Brief scale-up animation (200ms) | New card pops in |

**Layout:** Horizontal row, cards overlapped by 8px (cascade effect). Compact: no rank/suit labels, just mini card (40×56px).

### 3.5 ChessClock

**Purpose:** Digital countdown timer for both players.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `whiteTime` | `number` | — | White's remaining time in ms |
| `blackTime` | `number` | — | Black's remaining time in ms |
| `activeColor` | `"white" \| "black" \| null` | `null` | Whose clock is ticking |
| `timeControl` | `TimeControl` | — | For display label |

**States:**

| State | Visual | Behavior |
|-------|--------|----------|
| **Running (your turn)** | Time displayed, subtle pulse animation on active clock | Digits update every 100ms |
| **Idle (opponent's turn)** | Static display, dimmed (opacity 0.6) | No pulse |
| **Low time (<30s)** | Red color (#ff4444), faster pulse | Warning state |
| **Critical (<10s)** | Red + bold, rapid pulse | "Hurry!" feel |
| **Expired** | "0:00" in red, clock stops | triggers timeout result |
| **Loading** | "—:—" placeholder | Before game state syncs |

**Format:** `M:SS` truncated from ms. E.g. `7:00`, `0:32`, `0:05`.

**Clock layout (shown twice — per player info bar):**
```
┌──────────────────────────────────────┐
│ White   4:23 ◉             1450 ELO  │
└──────────────────────────────────────┘
```
- Active clock: white circle indicator ◉ pulsing
- Inactive: ◌ at low opacity

### 3.6 GameOverOverlay

**Purpose:** Modal overlay showing game result, scores, and actions.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `visible` | `boolean` | `false` | Show/hide overlay |
| `result` | `GameResult \| null` | `null` | Game result type |
| `scores` | `{white: number, black: number} \| null` | `null` | Final scores |
| `chessScore` | `{white: number, black: number} \| null` | `null` | Chess portion |
| `pokerScore` | `{white: PokerResult, black: PokerResult} \| null` | `null` | Poker evaluation |
| `winner` | `"white" \| "black" \| "draw"` | — | Winner for display |
| `playerColor` | `"white" \| "black"` | — | To show "You Win/Lose" |
| `onRematch` | `() => void` | — | Rematch callback |
| `onHome` | `() => void` | — | Return home callback |

**States:**

| State | Visual | Behavior |
|-------|--------|----------|
| **Visible** | Fullscreen scrim (rgba(0,0,0,0.75)), centered card | Enter animation: fade + scale (300ms ease-out) |
| **Win** | Gold accent (#ffd700), "You Win!" header | Confetti-like particle effect (subtle) |
| **Lose** | Neutral accent (#888), "You Lose" header | Calm, respectful tone |
| **Draw** | Blue accent (#4a90d9), "Draw" header | Neutral visual |
| **Dismissed** | Animated out | Navigate away or rematch |

**Scores breakdown layout:**
```
┌──────────────────────────────┐
│         Game Over            │
│                              │
│    Your Score    Opponent   │
│       ┌────┐      ┌────┐    │
│       │ 40 │      │ 22 │    │
│       └────┘      └────┘    │
│                              │
│  Chess:  Checkmate   30     │
│  Poker:  Full House  10     │
│          (K♠ Q♥ J♦ 10♣ 9♠) │
│                              │
│  Opponent:                   │
│  Chess:  —               0   │
│  Poker:  One Pair        1   │
│          (7♠ 7♥)            │
│                              │
│   ┌─────────┐ ┌─────────┐   │
│   │ Rematch │ │  Home   │   │
│   └─────────┘ └─────────┘   │
└──────────────────────────────┘
```

### 3.7 TurnIndicator

**Purpose:** Show whose turn it is. Integrated into player info bars.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `activeColor` | `"white" \| "black"` | — | Current turn |
| `localColor` | `"white" \| "black"` | — | Your color |

**States:**

| State | Visual |
|-------|--------|
| **Your turn** | Your info bar highlighted (background #4a4a8a44, glow on card hand area) |
| **Opponent's turn** | Opponent's info bar highlighted, yours dimmed |
| **Waiting (loading)** | "Syncing..." subtle status text |

**Indicator:** Pulsing dot (◉) next to active player's name, 6px diameter, color `#4ade80` (green). Inactive: ◌ at opacity 0.3.

### 3.8 ConnectionIndicator

**Purpose:** Show WebSocket connection status.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `status` | `"connected" \| "disconnected" \| "reconnecting"` | `"connected"` | Socket status |

**States:**

| State | Visual | Duration |
|-------|--------|----------|
| **Connected** | No indicator (or subtle green dot) | Persistent |
| **Disconnected** | Fixed banner at top: "Connection lost. Reconnecting..." (yellow #f59e0b bg) | Until reconnected |
| **Reconnecting** | Same banner with spinning loader | Until connected or timeout |
| **Timeout** | "Connection failed. Retry?" with retry button (red #ef4444) | Persistent until dismissed |

---

## 4. State Inventory Per Component

| Component | Default | Hover | Active | Focused | Disabled | Loading | Error | Empty |
|-----------|---------|-------|--------|---------|----------|---------|-------|-------|
| **ChessBoard** | Board rendered, pieces shown | N/A (mobile) | Square tap highlight | N/A | Opacity 0.6, no interaction | Skeleton grid | N/A | Starting position |
| **CardHand (Player)** | 3 face-up cards | Card lifts 2px | Scale 0.95 on press | Gold border | Opacity 0.5 | Flip animation | N/A | — slots |
| **CardHand (Opponent)** | 3 card backs | N/A | N/A | N/A | N/A | N/A | N/A | — slots |
| **ScorePile** | Cards in row | N/A | N/A | N/A | N/A | N/A | N/A | "No captures" |
| **ChessClock** | Time displayed | N/A | N/A | N/A | Dimmed (0.5) | "—:—" | Red (low time) | N/A |
| **GameOverOverlay** | Hidden | N/A | N/A | N/A | N/A | Fade in | N/A | N/A |
| **TurnIndicator** | Active/inactive pulse | N/A | N/A | N/A | N/A | "Syncing..." | N/A | N/A |
| **ConnectionIndicator** | Hidden (connected) | N/A | N/A | N/A | N/A | Spinner | Red banner | N/A |

---

## 5. Accessibility Notes

### 5.1 Color & Contrast

| Use Case | Foreground | Background | Ratio | WCAG |
|----------|-----------|------------|-------|------|
| Body text | `#e0e0e0` | `#1a1a2e` | 9.3:1 | AAA |
| Button text | `#ffffff` | `#4a4a8a` | 4.8:1 | AA |
| Card text | `#1a1a2e` | `#f5f5f0` | 12:1 | AAA |
| Muted text | `#888888` | `#1a1a2e` | 4.3:1 | AA |
| Low time (red) | `#ff4444` | `#1a1a2e` | 5.2:1 | AA |

### 5.2 Touch Targets

- All tappable elements: minimum **44×44px** (cards, buttons, board squares)
- Board squares: auto-fill width/8, guaranteed ≥44px on mobile (board width ≥ 352px minimum)

### 5.3 Screen Reader

- Board squares: `aria-label="Square e2, white pawn"`
- Cards: `aria-label="King of Spades, moves Rook"`
- Score piles: `aria-label="Score pile, 3 cards"`
- Turn indicator: `aria-label="Your turn"`
- Clock: `aria-label="White, 4 minutes 23 seconds remaining"`
- Game result: `aria-label="Game over. You win. Chess score 30, poker score 10, total 40."`

### 5.4 Reduced Motion

- Respect `prefers-reduced-motion`: replace all flip/scale/glow animations with simple opacity fades (200ms)
- No pulsing on clocks — use static highlight instead
- No particle effects on game over
- Card draw: instant reveal instead of flip

### 5.5 Keyboard Navigation (Web)

- Tab through: resign button → score piles → card hand → board squares
- Board squares: arrow keys to navigate, Enter to select/move
- Escape: deselect card, close game over overlay

---

## 6. Responsive Behavior

### 6.1 Breakpoints

| Breakpoint | Width | Target |
|------------|-------|--------|
| Mobile | 360–480px | Phones |
| Tablet | 481–900px | Tablets, landscape phones |
| Web | 901px+ | Desktop browsers |

### 6.2 Layout Adaptations

#### Mobile (360–480px)

```
┌─────────────────────┐
│ Opponent Info + Clk │ ← single row
│ [🂠] Score pile      │ ← compact row
│                     │
│    Chess Board      │ ← 100% width (square = 45px min)
│                     │
│ [🂠] Score pile      │ ← compact row
│ Your Info + Clock   │ ← single row
│ [K♠] [7♥] [A♦]     │ ← 3 cards
│ [Resign]            │
└─────────────────────┘
```

- Board fills horizontal width
- Score piles shown as small card backs/fronts in a row
- Clock shown inline in info bar
- Card hand at bottom, always accessible (thumb zone)

#### Tablet (481–900px)

```
┌─────────────────────────────┐
│ Opponent (Black)   4:23 ◉  │
│ Score: [🂠] [🂠] [🂠] +2    │
│                             │
│         Chess Board         │ ← 420px max
│                             │
│ Score: [K♠] [Q♥] [J♦] +1  │
│ Your Hand                   │
│ [K♠] [7♥] [A♦]   [Resign] │
│ White          5:01 ◉      │
└─────────────────────────────┘
```

- Board: max 420px, centered
- Score piles shown inline with more spacing
- Card hand and info bar share bottom section

#### Web (901px+)

```
┌───────────────────────────────────────┐
│  ┌──────────┐    ┌──────────┐         │
│  │ Opponent │    │Chess Board│         │
│  │ Score    │    │ 480×480  │         │
│  │ Clock    │    │          │         │
│  └──────────┘    └──────────┘         │
│  ┌──────────┐    ┌──────────┐         │
│  │ Player   │    │  Hand    │         │
│  │ Score    │    │[K♠][7♥][A♦]        │
│  │ Clock    │    │[Resign] │         │
│  └──────────┘    └──────────┘         │
└───────────────────────────────────────┘
```

- Board: 480×480px fixed, centered
- Side panels: opponent info left, player info right
- Or: board centered, both panels on sides
- Maximum width: 960px container

### 6.3 Safe Areas

- Respect `safeAreaInsets` on iOS notch devices
- Card hand at bottom: add 20px padding above home indicator area
- Top info bar: add safe area top padding (44px iOS, 24px Android)

---

## 7. Design Tokens

### 7.1 Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `bg-primary` | `#1a1a2e` | Main background |
| `bg-secondary` | `#2a2a4a` | Card backs, secondary buttons, surfaces |
| `bg-tertiary` | `#3a3a5a` | Dividers, subtle surfaces |
| `bg-card` | `#f5f5f0` | Card face (cream) |
| `text-primary` | `#e0e0e0` | Body text, headings |
| `text-secondary` | `#b0b0b0` | Subtitles, secondary info |
| `text-muted` | `#888888` | Captions, coordinates, disabled state |
| `text-dark` | `#1a1a2e` | Text on light backgrounds |
| `accent-primary` | `#4a4a8a` | Primary buttons, active elements |
| `accent-secondary` | `#2a2a4a` | Secondary buttons |
| `accent-gold` | `#ffd700` | Selected cards, win state, highlights |
| `accent-green` | `#4ade80` | Online indicator, your turn |
| `accent-red` | `#ff4444` | Low time, errors, danger |
| `accent-blue` | `#4a90d9` | Draw state, information |
| `board-light` | `#f0d9b5` | Chess board light squares |
| `board-dark` | `#b58863` | Chess board dark squares |
| `overlay-scrim` | `rgba(0,0,0,0.75)` | Modal overlays |
| `highlight-legal` | `rgba(0,255,136,0.53)` | Legal move dots |
| `highlight-selected` | `rgba(255,215,0,0.53)` | Selected square ring |
| `highlight-lastmove` | `rgba(255,255,0,0.40)` | Last move highlight |

### 7.2 Typography

| Token | Size | Weight | Usage |
|-------|------|--------|-------|
| `font-xl` | 48px | Bold (700) | Gambit title (home) |
| `font-lg` | 24px | Bold (700) | Screen titles |
| `font-md` | 18px | Semi-bold (600) | Buttons, headings |
| `font-body` | 16px | Regular (400) | Body text |
| `font-sm` | 14px | Regular (400) | Secondary text, clock |
| `font-xs` | 12px | Medium (500) | Coordinates, card piece label |
| `font-mono` | 14px | Mono | Card rank, clock, scores |

**Font family:** System default (San Francisco on iOS, Roboto on Android, system-ui on web). Monospace for data elements.

### 7.3 Spacing

| Token | Value | Usage |
|-------|-------|-------|
| `space-xxs` | 4px | Inner card padding, dot spacing |
| `space-xs` | 8px | Between small elements |
| `space-sm` | 12px | Between related elements |
| `space-md` | 16px | Default spacing, card gaps |
| `space-lg` | 24px | Section spacing |
| `space-xl` | 32px | Major section gaps |
| `space-xxl` | 48px | Page padding |

### 7.4 Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `radius-sm` | 4px | Badges, score mini-cards |
| `radius-md` | 8px | Buttons, info bars |
| `radius-lg` | 12px | Cards, modal |
| `radius-full` | 999px | Connection dots, status |

### 7.5 Shadows

| Token | Value | Usage |
|-------|-------|-------|
| `shadow-sm` | `0 2px 4px rgba(0,0,0,0.3)` | Cards at rest |
| `shadow-md` | `0 4px 12px rgba(0,0,0,0.4)` | Selected card, buttons |
| `shadow-lg` | `0 8px 24px rgba(0,0,0,0.5)` | Modal overlay card |

### 7.6 Animation Timing

| Token | Duration | Easing | Usage |
|-------|----------|--------|-------|
| `motion-fast` | 150ms | ease-out | Tap feedback, micro-interactions |
| `motion-normal` | 250ms | ease-out | Card flip, draw, transitions |
| `motion-slow` | 350ms | ease-out | Modal enter, screen transitions |
| `motion-pulse` | 1s (loop) | ease-in-out | Clock low time, searching |

### 7.7 Z-Index Layers

| Layer | Value | Elements |
|-------|-------|----------|
| `z-base` | 0 | Board, cards at rest |
| `z-sticky` | 10 | Info bars, connection banner |
| `z-raised` | 20 | Selected card, hover card |
| `z-overlay` | 100 | Game over modal, scrim |

---

## 8. Interaction Specifications

### 8.1 Card Selection + Move Flow

```
1. User taps card in hand
   → Card lifts (translateY -4px, 150ms ease-out)
   → Board highlights legal moves (green dots)
   → Selected card info shown: "Selected: K♠ → Rook"
   
2. User taps board square
   → If valid: send play_move socket event
   → Card animates (scale to 0, 200ms) then removed
   → Piece animates from source to destination (250ms ease-out)
   → If capture: captured card pops into score pile (200ms scale-up)
   → Turn switches to opponent
   → Draw new card (if applicable) with flip animation (150ms)
   
3. User taps selected card again
   → Deselects card (translateY 0, 150ms ease-out)
   → Board clears highlights
   
4. User taps different card
   → Previous card drops back (translateY 0, 100ms)
   → New card lifts
   → Board recalculates highlights
```

### 8.2 Resign Flow

```
1. User taps "Resign" button
   → Confirmation dialog slides up (300ms ease-out)
   → "Are you sure you want to resign? [Cancel] [Resign]"
   → Resign is red (#ff4444), Cancel is default accent
   
2. [Cancel] → dialog slides down (250ms ease-out), state unchanged
3. [Resign] → emit resign socket event
   → Dialog closes
   → Game over overlay appears with result
```

### 8.3 Game Over Flow

```
1. Server emits `game_over`
   → Game screen shows overlay (fade + scale, 350ms ease-out)
   → All game interaction disabled
   → Scores computed and displayed
   
2. User taps "Rematch"
   → Navigate to queue screen with same mode param
   → (future: instant rematch with same opponent)
   
3. User taps "Return Home"
   → Navigate to / (home screen)
   → Socket disconnects from game room
```

---

## 9. File Structure

```
apps/mobile/
├── app/
│   ├── game/
│   │   ├── queue.tsx            ← NEW: QueueScreen
│   │   └── [id].tsx             ← REWRITE: GameScreen
│   ├── index.tsx                ← UNCHANGED: HomeScreen
│   └── _layout.tsx              ← UNCHANGED: RootLayout
│
├── src/
│   ├── components/
│   │   ├── ChessBoard.tsx       ← NEW
│   │   ├── CardHand.tsx         ← NEW
│   │   ├── CardSlot.tsx         ← NEW (individual card)
│   │   ├── ScorePile.tsx        ← NEW
│   │   ├── ChessClock.tsx       ← NEW
│   │   ├── GameOverOverlay.tsx  ← NEW
│   │   ├── TurnIndicator.tsx    ← NEW
│   │   ├── ConnectionIndicator.tsx ← NEW
│   │   └── ConfirmDialog.tsx    ← NEW (reusable confirm)
│   │
│   ├── hooks/
│   │   └── useSocket.ts         ← UNCHANGED already exists
│   │
│   ├── theme/
│   │   └── tokens.ts            ← NEW: Design tokens as constants
│   │
│   └── types/
│       └── index.ts             ← NEW: Local component prop types
```

---

## 10. Design Token Implementation Sketch

For developers, a starter `tokens.ts` file to centralize the design system:

```typescript
export const colors = {
  bg: { primary: "#1a1a2e", secondary: "#2a2a4a", tertiary: "#3a3a5a" },
  text: { primary: "#e0e0e0", secondary: "#b0b0b0", muted: "#888888", dark: "#1a1a2e" },
  accent: { primary: "#4a4a8a", secondary: "#2a2a4a", gold: "#ffd700", green: "#4ade80", red: "#ff4444", blue: "#4a90d9" },
  board: { light: "#f0d9b5", dark: "#b58863" },
  highlight: { legal: "rgba(0,255,136,0.53)", selected: "rgba(255,215,0,0.53)", lastMove: "rgba(255,255,0,0.40)" },
  overlay: "rgba(0,0,0,0.75)",
  cardFace: "#f5f5f0",
} as const;

export const spacing = { xxs: 4, xs: 8, sm: 12, md: 16, lg: 24, xl: 32, xxl: 48 } as const;

export const typography = {
  fontFamily: { default: undefined, mono: "monospace" },
  size: { xs: 12, sm: 14, body: 16, md: 18, lg: 24, xl: 48 },
  weight: { regular: "400", medium: "500", semiBold: "600", bold: "700" },
} as const;

export const radius = { sm: 4, md: 8, lg: 12, full: 999 } as const;

export const shadows = {
  sm: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 2 },
  md: { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 6 },
  lg: { shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 24, elevation: 12 },
} as const;

export const motion = {
  fast: 150,
  normal: 250,
  slow: 350,
  pulse: 1000,
} as const;
```

---

## 11. Edge Cases & Error Handling

| Scenario | UX Behavior |
|----------|-------------|
| **Disconnect mid-game** | ConnectionIndicator shows reconnect banner; game state preserved; on reconnect, full state sync; if timeout → auto-resign |
| **Invalid move response** | `move_error` event → red toast at bottom (`#ff4444` bg, "Illegal move. Try again.") for 3s, automatically disappears |
| **Both players time out** | First to 0 loses; if simultaneous, draw |
| **Deck exhausted** | When draw pile reaches 0, reshuffle dead pile with animation; counter shows "Reshuffling..." (500ms) |
| **Opponent disconnects** | Banner "Opponent disconnected. Waiting for reconnection..." (60s timeout) → if no reconnect, win by timeout |
| **Draw pile low warning** | When ≤5 cards remain, subtle counter "5 cards left" appears near draw pile area |
| **Hand full on capture bonus** | If at 4 cards and would draw more, skip excess (client shows toast "Hand full — bonus card discarded") |
| **Stuck rule trigger** | If none of 3 cards permits a legal move, auto-discard all 3 + draw 3 new; show brief animation "Redealing... (stuck)" |

---

## 12. Performance Notes

- **Board rendering**: Use `React.memo` with FEN string comparison; avoid re-render on every clock tick
- **Clock ticks**: Update every 100ms only for active clock, use `requestAnimationFrame` or native timer
- **Card animations**: GPU-accelerated (transform + opacity only)
- **Image assets**: Use SVG for pieces (scales cleanly), preload at app start
- **Memoize**: Chess board square press handlers, card selection handlers
