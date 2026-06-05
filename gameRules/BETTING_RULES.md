# Checkker Betting & Ranking Rules

## Game Modes

### Ranked Mode
- Players start at 1000 ELO rating
- Matchmaking by difficulty tier (not rating proximity)
- Mandatory betting; amounts based on selected difficulty
- ELO rating changes after every game
- Results contribute to international leaderboard

### Casual Mode
- No ranking impact (ELO unchanged)
- Select difficulty level, get matched with opponent
- Beginner tier is free; all others require betting
- No tournament structure

## Betting Structure

### Bet Amounts (per player)

| Difficulty   | Ranked Bet | Casual Bet |
|-------------|-----------|-----------|
| Beginner    | $10       | FREE      |
| Intermediate| $25       | $25       |
| Advanced    | $100      | $100      |
| Master      | $500      | $500      |

### Payouts
- **Winner takes all**: Winner receives both bets minus 10% house cut
- **House cut**: 10% of total pot goes to the game/developer
- **Draw**: Both players get full refund (no house cut)

### Payout Examples

| Difficulty   | Each Bets | Total Pot | House Cut (10%) | Winner Gets |
|-------------|----------|-----------|-----------------|-------------|
| Beginner    | $10      | $20       | $2              | $18         |
| Intermediate| $25      | $50       | $5              | $45         |
| Advanced    | $100     | $200      | $20             | $180        |
| Master      | $500     | $1,000    | $100            | $900        |

### Casual Beginner (Free Mode)
- No charge to play
- Optional donation to support the developer: $1 to $5
- Donation is voluntary, triggered after game ends

## Cryptocurrency

### Payment Method
- **Currency**: BNB on BSC (BNB Smart Chain)
- **Network**: BSC Testnet (Chain ID 97) for development; BSC Mainnet (Chain ID 56) for production
- **USD conversion**: BNB/USD price fetched from CoinGecko at game creation time

### Escrow Mechanism
1. **Match found**: Server creates an escrow entry on the smart contract
2. **Deposit phase**: Both players have 2 minutes to deposit their bet
3. **Funds locked**: Smart contract holds both deposits during the game
4. **Game plays**: Standard Checkker chess game
5. **Settlement**: Server reports result → contract auto-pays winner and house

### Smart Contract Flow
```
createGame(gameId, white, black, betAmount)  ← Server creates match
deposit(gameId)                               ← Each player deposits BNB
reportWinner(gameId, winner)                  ← Server reports result
  → 90% to winner, 10% to house wallet       ← Automatic payout
reportDraw(gameId)                            ← Server reports draw
  → Full refund to both players               ← No house cut
cancelGame(gameId)                            ← Timeout/no deposits
  → Refund any deposits                       ← Full refund
```

## Win Conditions

A game ends (and triggers payout) when:
- **Checkmate**: Opponent's king is in checkmate → You win
- **Resignation**: Opponent resigns → You win
- **Timeout**: Opponent runs out of time → You win
- **Disconnect**: Opponent disconnects → You win (after timeout)
- **Draw**: Stalemate, threefold repetition, 50-move rule, or insufficient material → Both refunded
- **Deck Exhausted**: Card deck runs out → Scored by poker hands (higher total wins)

## Rating System

- **Algorithm**: ELO with K-factor of 32
- **Starting rating**: 1000
- **Rating tiers**:
  - Pawn: 0–999
  - Knight: 1000–1399
  - Bishop: 1400–1699
  - Rook: 1700–1999
  - Queen: 2000–2299
  - King: 2300+

## User Identity

- **Authentication**: Wallet-only (connect crypto wallet = your account)
- **Username**: Unique, 3–32 characters, alphanumeric + underscores
- **Avatar**: Choose from 16 predefined chess/card-themed icons
- **Profile**: Persistent stats, rating, game history, wallet address

## Anti-Abuse Rules

- Maximum 1 active betting game at a time per wallet
- Disconnect from 3+ consecutive betting games → temporary ranked ban
- Deposit timeout: 2 minutes to deposit after match found
- If one player deposits but opponent doesn't → full refund to depositor
