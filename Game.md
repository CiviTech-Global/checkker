## Design principles I'm committing to

1. **Skill should dominate luck over a session, but luck creates moments.** A beginner should occasionally beat an intermediate; a mastermind should almost never lose to a beginner.
2. **The card mechanic must matter every turn, not just sometimes.** If players spend half their turns drawing dead cards, the game feels broken.
3. **Two parallel win conditions create the unique flavor.** Chess and poker pull you in different directions — that tension is the whole game.
4. **Watchable.** Spectators should understand the state in 10 seconds. This matters for streaming, tournaments, and virality.
5. **Free-to-play first, monetization through cosmetics and tournaments.** No real-money wagering in v1.

Working name from here on: **Gambit** (placeholder — chess term, poker connotation, short, memorable).

---

## The core ruleset

### Setup

Standard chess board, standard starting position, standard 52-card deck shuffled into a face-down draw pile. White moves first.

### Card-to-piece mapping (unchanged from your original — it's good)

| Card | Piece |
|---|---|
| K | King |
| Q | Queen |
| J | Knight |
| 10 | Rook |
| 2 | Bishop |
| 3–9 | Pawn |
| A | Wild (any piece) |

### Turn structure — revised

**This is the most important design decision.** I'm changing your single-card draw to a **hand of 3 cards**, because it transforms the game from luck-driven to skill-driven.

On your turn:

1. **Draw up to a hand of 3 cards.** (First turn: draw 3. Subsequent turns: draw until you have 3.)
2. **Play one card** from your hand to move the corresponding piece. You must make a legal move with that piece type if you can.
3. **If you capture, the played card goes to your score pile** (face-up, visible).
4. **If you don't capture, the played card goes to the discard pile.**
5. **End turn.**

**Why this matters:** with one card, you're a passenger. With three cards, every turn is a decision — which piece do I move, given three options? This is where chess thinking enters. It also means "I can't move anything" almost never happens, because you'd need all three cards to be dead simultaneously.

**Stuck rule:** if none of your 3 cards permits a legal move, discard all three (to the dead pile, reshuffled when draw pile empties) and draw 3 new ones. This is rare with 3 cards and tolerable when it happens.

### The Ace, rebalanced

Aces are too strong as pure wilds. New rule: **playing an Ace lets you move any piece, but the Ace is discarded — it never goes to your score pile, even on capture.** You trade scoring potential for flexibility. This makes Aces a tactical resource, not a free win, and prevents Ace-hoarding for royal flushes.

### Captured piece bonus

To make captures *feel* rewarding beyond just keeping the card:

- Capture a **pawn**: keep the card.
- Capture a **minor piece** (knight/bishop): keep the card + draw 1 extra card to hand (max hand size temporarily becomes 4).
- Capture a **rook**: keep the card + draw 1 extra.
- Capture **queen**: keep the card + draw 2 extra.
- Capture is *check* (you give check on the same move): keep the card + draw 1 extra. Stacks with piece bonus.

This creates a feedback loop: aggressive chess play fuels your poker hand. Defensive play starves your card economy. **This is the heart of the design.**

### Win conditions and scoring

The game ends when **any** of these happen:

- **Checkmate** — chess portion decided.
- **Chess draw** (stalemate, threefold repetition, 50-move rule, insufficient material).
- **Both draw piles exhausted** (main + dead pile already reshuffled once).
- **Time expires** (per time control chosen).
- **Resignation.**

Then both players score:

**Chess result:**
- Checkmate win: **30 points**
- Draw: **10 each**
- Resignation: winner 25, loser 0
- Time-out: opponent gets 25

**Poker score** — from your face-up score pile, partition into best 5-card hands plus leftovers:

| Hand | Points |
|---|---:|
| Royal Flush | 25 |
| Straight Flush | 18 |
| Four of a Kind | 14 |
| Full House | 10 |
| Flush | 8 |
| Straight | 6 |
| Three of a Kind | 4 |
| Two Pair | 3 |
| One Pair | 1 |
| High card leftover | 0 |

**Total = chess + poker.** Highest total wins.

**Why these numbers:** a checkmate (30) is worth more than any single hand. But a full house + a couple of pairs (~14) can easily flip a chess loss. This means: if you're losing on the board, fight for captures; if you're winning on the board, deny your opponent captures. Both players always have something to play for, even in a lost chess position. **This is what makes the game feel new.**

### Time control

- **Bullet**: 3 min per player
- **Blitz**: 7 min per player (default for ranked)
- **Rapid**: 15 min per player
- **Classical**: 25 min per player (tournament)

Standard chess clock — your time runs only on your turn, including card draw animations (which should be fast, <1 second).

---

## Skill tiers (replacing your money tiers)

Pure rating-based, like chess ELO but calibrated separately for this game since it's not chess:

| Tier | Rating | Vibe |
|---|---|---|
| Pawn | 0–999 | Learning |
| Knight | 1000–1399 | Familiar |
| Bishop | 1400–1699 | Intermediate |
| Rook | 1700–1999 | Advanced |
| Queen | 2000–2299 | Expert |
| King | 2300+ | Mastermind |

Matchmaking pairs players within ~150 rating of each other. New players play 10 placement games before getting a rating.

---

## Monetization (free to play, no wagering)

**Free for everyone, forever, with no pay-to-win.** Revenue from:

1. **Cosmetics**: board themes, piece sets, card backs, capture animations, victory effects. $2–8 per item. This is how Chess.com and most successful chess apps make money.
2. **Premium subscription** ($5/month or $40/year): unlimited game analysis with engine review, opening trainer for Gambit (yes, openings will develop), unlimited puzzle access, ad-free, profile customization, tournament entry priority.
3. **Tournament entry fees** with prize pools (where legal — most jurisdictions allow skill-game tournaments with entry fees). Platform takes 15–20%, rest goes to prize pool. Weekly $5 buy-ins, monthly $20 buy-ins, special events.
4. **Spectator tipping** for streamed games — viewers tip players, platform takes a cut. Drives streamer engagement.
5. **Coaching marketplace**: stronger players list lessons, platform takes 20% commission.

This is the Chess.com playbook adapted. It works because the core game is free and the audience is large. No gambling license needed for any of this.

---

## Features that make it sticky

**Puzzles.** "Mate in 2 with these 3 cards in hand." Daily puzzles drive daily return visits — this is the single most important retention mechanic chess apps use.

**Analysis engine.** After every game, an engine reviews your moves, marks blunders, suggests better plays *given the cards you had*. This needs custom development since Stockfish doesn't know about cards, but it's tractable — you essentially run Stockfish constrained to legal moves under your card hand.

**Opening theory will emerge.** With card randomness, traditional openings break down. New theory will develop — the community will discover it. Build a wiki feature to capture it.

**Replays + share.** Every game produces a watchable replay with card draws visible. One-click share to social. This is your viral mechanic.

**Streaks and missions.** "Win 3 games in a row," "Capture a queen with a pawn card," "Win a game with a full house." Daily/weekly resets.

**Spectator mode + Twitch integration.** Show the board, both score piles, and the most recent card draw. Easy to follow. Streamers will love the drama of card draws.

---

## What makes a single game feel exciting

A few mechanics I'd add to maximize dramatic moments:

**Card reveal animation.** When you draw, the card flips with a small delay. Spectators see what you see, half a second after you do. This creates universal "ooh" moments.

**Score pile display.** Both players' score piles are visible to everyone. Watching someone build a flush, one card at a time, is its own drama — and the opponent sees it building and has to decide whether to disrupt.

**"Last card" tension.** When the draw pile gets to 5 cards remaining, a counter appears. Late-game card draws become high-stakes.

**Queen captures are events.** A capture animation that pauses the game for 1 second, with sound. Make big moments feel big.

---

## What I'd cut from your original concept

- **"Donate to play" for beginners.** Free-to-play attracts 100x more users than any donation model.
- **Real-money wagering between tiers.** As I argued last message — this turns a game project into a gambling business. Save it for v3, after you have an audience and capital for licensing.
- **Single-card draw.** Replaced with 3-card hand for skill density.
- **Pure Ace wild.** Replaced with Ace-as-flexible-but-non-scoring for balance.

---

## What I'd test in playtesting before locking the rules

Three things will only reveal themselves in actual play:

1. **Hand size**: is 3 right, or should it be 2 or 4? Test all three. More cards = more skill, fewer = more drama.
2. **Capture bonus magnitudes**: do extra-card bonuses create snowballing where one capture wins the game? If so, dial them down.
3. **Poker vs. chess scoring weight**: does anyone ever choose to "go for poker" over checkmate? They should sometimes, but not often. Adjust the point values until ~20% of games are decided by poker rather than chess.

Get this in front of 20 real players for 100 games. The numbers above are my best first-pass guesses; playtesting will tell you the truth.

---

## What v1 actually ships with

To keep scope realistic:

- Web + iOS + Android (one codebase if you use React Native or Flutter)
- 1v1 ranked + casual + bot opponents (4 difficulty levels)
- 4 time controls
- Replays
- Puzzles (daily + library of 500 at launch)
- Basic cosmetics shop (10 board themes, 10 piece sets, 10 card backs)
- Friend invites and private games
- Spectator mode

**Not in v1:** tournaments, coaching marketplace, analysis engine, streaming integration. All v2.

---

Want me to take any of this deeper? I'd suggest one of these as the next step:

1. **Write a printable rules sheet** for physical playtesting (single page).
2. **Design the digital UI** — wireframes for the mobile game screen with board, hand, score piles, opponent state.
3. **Map the technical architecture** for the online version — state sync, matchmaking, anti-cheat.
4. **Detail the puzzle and analysis engine** — this is where the real custom dev work lives.

Which one moves you forward fastest?