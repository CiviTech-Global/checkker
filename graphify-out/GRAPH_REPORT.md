# Graph Report - .  (2026-06-09)

## Corpus Check
- Large corpus: 306 files · ~1,068,135 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder, or use --no-semantic to run AST-only.

## Summary
- 724 nodes · 1056 edges · 55 communities detected
- Extraction: 77% EXTRACTED · 23% INFERRED · 0% AMBIGUOUS · INFERRED: 241 edges (avg confidence: 0.52)
- Token cost: 0 input · 0 output

## God Nodes (most connected - your core abstractions)
1. `AIBrain` - 36 edges
2. `GameEngine` - 21 edges
3. `GameServer` - 17 edges
4. `TutorialEngine` - 14 edges
5. `PieceFactory` - 13 edges
6. `PlayerRepository` - 13 edges
7. `LLMCoach` - 13 edges
8. `StockfishEngine` - 13 edges
9. `PlayerStore` - 12 edges
10. `getDb()` - 11 edges

## Surprising Connections (you probably didn't know these)
- `Checkker Game` --uses_system--> `Crypto Betting (BNB/BSC)`  [EXTRACTED]
  Game.md → gameRules/BETTING_RULES.md
- `Puzzle Generator` --uses--> `Heuristic Chess Engine`  [EXTRACTED]
  packages/ai-brain/src/analysis/PuzzleGenerator.ts → packages/ai-brain/src/engine/HeuristicEngine.ts

## Communities

### Community 0 - "Other: handleDeposit, handleSelectTier"
Cohesion: 0.03
Nodes (8): copyToClipboard(), handleCopy(), reloadFromDb(), splitStats(), getAsyncStorage(), TutorialStorage, attachListeners(), getSocket()

### Community 1 - "Other: test, CameraController"
Cohesion: 0.05
Nodes (15): CameraController, createEngine(), getEngine(), HighlightManager, MoveExplainer, estimateCardValue(), evaluatePokerPotential(), getRankCounts() (+7 more)

### Community 2 - "Other: test, BotPlayer"
Cohesion: 0.06
Nodes (7): BotPlayer, createTestEngine(), testDeck(), getBnbUsdPrice(), usdToWei(), randomDelay(), SpectateManager

### Community 3 - "Documentation: Chess, System"
Cohesion: 0.06
Nodes (45): Adaptive Bot Difficulty, Heuristic Chess Engine, Hybrid Chess-Poker Evaluator, LLM Coaching System, Puzzle Generator, Desktop App (Electron), Flutter Mobile App, Mobile App (React Native + Expo) (+37 more)

### Community 4 - "Other: connect, createInterface"
Cohesion: 0.06
Nodes (8): Address__factory, isSuperArgs(), CheckkerEscrow__factory, isSuperArgs(), Errors__factory, isSuperArgs(), Ownable__factory, ReentrancyGuard__factory

### Community 5 - "Other: AIBrain, analyzeGame"
Cohesion: 0.06
Nodes (1): AIBrain

### Community 6 - "Flutter App: main, flutter_window"
Cohesion: 0.09
Nodes (5): createWindow(), startGameServer(), startLocalServer(), GetCommandLineArguments(), Utf8FromUtf16()

### Community 7 - "Other: GameEngine, checkGameEnd"
Cohesion: 0.13
Nodes (2): GameEngine, shuffle()

### Community 8 - "Flutter App: WindowClassRegistrar, resource"
Cohesion: 0.16
Nodes (16): Create(), Destroy(), EnableFullDpiSupportIfAvailable(), GetClientArea(), GetThisFromHandle(), GetWindowClass(), MessageHandler(), OnCreate() (+8 more)

### Community 9 - "Other: demoData, createDemoData"
Cohesion: 0.25
Nodes (17): createDemoData(), pick(), randInt(), clearGameHistory(), getDb(), getGameHistory(), getLocalProfile(), getStats() (+9 more)

### Community 10 - "Other: GameServer, addToDifficultyQueue"
Cohesion: 0.15
Nodes (1): GameServer

### Community 11 - "Other: setReducedMotion, update"
Cohesion: 0.16
Nodes (2): CheckEffects, ParticleSystem

### Community 12 - "Other: TutorialEngine, advanceStep"
Cohesion: 0.14
Nodes (1): TutorialEngine

### Community 13 - "Other: PieceFactory, base"
Cohesion: 0.41
Nodes (1): PieceFactory

### Community 14 - "Other: sounds, ensureResumed"
Cohesion: 0.58
Nodes (12): ensureResumed(), getAudioCtx(), playCaptureSound(), playCastleSound(), playCheckmateSound(), playCheckSound(), playGameOverSound(), playGameStartSound() (+4 more)

### Community 15 - "Other: PlayerRepository, ensureDir"
Cohesion: 0.27
Nodes (1): PlayerRepository

### Community 16 - "Other: LLMCoach, callAPI"
Cohesion: 0.28
Nodes (1): LLMCoach

### Community 17 - "Other: StockfishEngine, cleanup"
Cohesion: 0.35
Nodes (1): StockfishEngine

### Community 18 - "Other: game, betting"
Cohesion: 0.18
Nodes (0): 

### Community 19 - "Other: PlayerStore, createBotProfile"
Cohesion: 0.26
Nodes (1): PlayerStore

### Community 20 - "Other: ChessScene3D, handleTouch"
Cohesion: 0.22
Nodes (1): ChessScene3D

### Community 21 - "Other: HeuristicEngine, countMobility"
Cohesion: 0.33
Nodes (1): HeuristicEngine

### Community 22 - "Other: BotManager, broadcastToHuman"
Cohesion: 0.24
Nodes (1): BotManager

### Community 23 - "Other: evaluator, combinations"
Cohesion: 0.31
Nodes (6): combinations(), evaluateFive(), evaluateScorePile(), getRankCounts(), isFlush(), isStraight()

### Community 24 - "Other: HybridEvaluator, analyzeMove"
Cohesion: 0.33
Nodes (1): HybridEvaluator

### Community 25 - "Other: BoardBuilder, build"
Cohesion: 0.36
Nodes (1): BoardBuilder

### Community 26 - "Other: PerformanceMonitor, beginFrame"
Cohesion: 0.32
Nodes (1): PerformanceMonitor

### Community 27 - "Other: AdaptiveBot, applyPersonalityBias"
Cohesion: 0.39
Nodes (1): AdaptiveBot

### Community 28 - "Other: PuzzleGenerator, difficultyToRating"
Cohesion: 0.39
Nodes (1): PuzzleGenerator

### Community 29 - "Other: PostProcessing, registerGlowMaterial"
Cohesion: 0.29
Nodes (1): PostProcessing

### Community 30 - "Other: PieceAnimator, animateCapture"
Cohesion: 0.33
Nodes (1): PieceAnimator

### Community 31 - "Flutter App: AppDelegate, swift"
Cohesion: 0.33
Nodes (2): AppDelegate, FlutterAppDelegate

### Community 32 - "Other: PlayerClusterer, clusterPlayers"
Cohesion: 0.53
Nodes (1): PlayerClusterer

### Community 33 - "Other: BetRepository, client"
Cohesion: 0.4
Nodes (0): 

### Community 34 - "Flutter App: GeneratedPluginRegistrant, swift"
Cohesion: 0.5
Nodes (1): GeneratedPluginRegistrant

### Community 35 - "Flutter App: flutter_lldb_helper, handle_new_rx_page"
Cohesion: 0.5
Nodes (2): handle_new_rx_page(), Intercept NOTIFY_DEBUGGER_ABOUT_RX_PAGES and touch the pages.

### Community 36 - "Flutter App: RunnerTests, swift"
Cohesion: 0.5
Nodes (2): RunnerTests, XCTestCase

### Community 37 - "Flutter App: MainFlutterWindow, swift"
Cohesion: 0.5
Nodes (2): MainFlutterWindow, NSWindow

### Community 38 - "Other: rating, expectedScore"
Cohesion: 0.5
Nodes (0): 

### Community 39 - "Other: ChessClock, formatTime"
Cohesion: 1.0
Nodes (0): 

### Community 40 - "Flutter App: MainActivity"
Cohesion: 1.0
Nodes (1): MainActivity

### Community 41 - "Other: deploy, main"
Cohesion: 1.0
Nodes (0): 

### Community 42 - "Other: avatars, getAvatar"
Cohesion: 1.0
Nodes (0): 

### Community 43 - "Other: preload"
Cohesion: 1.0
Nodes (0): 

### Community 44 - "Other: _listen"
Cohesion: 1.0
Nodes (0): 

### Community 45 - "Other: babel, config"
Cohesion: 1.0
Nodes (0): 

### Community 46 - "Other: MoveHistory"
Cohesion: 1.0
Nodes (0): 

### Community 47 - "Other: async-storage"
Cohesion: 1.0
Nodes (0): 

### Community 48 - "Other: jest, config"
Cohesion: 1.0
Nodes (0): 

### Community 49 - "Flutter App: build, gradle"
Cohesion: 1.0
Nodes (0): 

### Community 50 - "Flutter App: settings, gradle"
Cohesion: 1.0
Nodes (0): 

### Community 51 - "Flutter App: Runner-Bridging-Header"
Cohesion: 1.0
Nodes (0): 

### Community 52 - "Other: CheckkerEscrow, test"
Cohesion: 1.0
Nodes (0): 

### Community 53 - "Other: contract"
Cohesion: 1.0
Nodes (0): 

### Community 54 - "Other: donations"
Cohesion: 1.0
Nodes (0): 

## Knowledge Gaps
- **12 isolated node(s):** `MainActivity`, `Intercept NOTIFY_DEBUGGER_ABOUT_RX_PAGES and touch the pages.`, `Chess + Poker Hybrid`, `Card-Driven Chess Moves`, `Score Pile (Poker Hands)` (+7 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Other: ChessClock, formatTime`** (2 nodes): `ChessClock.tsx`, `formatTime()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Flutter App: MainActivity`** (2 nodes): `MainActivity.kt`, `MainActivity`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Other: deploy, main`** (2 nodes): `deploy.ts`, `main()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Other: avatars, getAvatar`** (2 nodes): `avatars.ts`, `getAvatar()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Other: preload`** (1 nodes): `preload.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Other: _listen`** (1 nodes): `_listen.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Other: babel, config`** (1 nodes): `babel.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Other: MoveHistory`** (1 nodes): `MoveHistory.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Other: async-storage`** (1 nodes): `async-storage.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Other: jest, config`** (1 nodes): `jest.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Flutter App: build, gradle`** (1 nodes): `build.gradle.kts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Flutter App: settings, gradle`** (1 nodes): `settings.gradle.kts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Flutter App: Runner-Bridging-Header`** (1 nodes): `Runner-Bridging-Header.h`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Other: CheckkerEscrow, test`** (1 nodes): `CheckkerEscrow.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Other: contract`** (1 nodes): `contract.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Other: donations`** (1 nodes): `donations.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `AIBrain` connect `Other: AIBrain, analyzeGame` to `Other: test, CameraController`?**
  _High betweenness centrality (0.074) - this node is a cross-community bridge._
- **Why does `GameEngine` connect `Other: GameEngine, checkGameEnd` to `Other: test, BotPlayer`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **Why does `GameServer` connect `Other: GameServer, addToDifficultyQueue` to `Other: test, BotPlayer`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **What connects `MainActivity`, `Intercept NOTIFY_DEBUGGER_ABOUT_RX_PAGES and touch the pages.`, `Chess + Poker Hybrid` to the rest of the system?**
  _12 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Other: handleDeposit, handleSelectTier` be split into smaller, more focused modules?**
  _Cohesion score 0.03 - nodes in this community are weakly interconnected._
- **Should `Other: test, CameraController` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `Other: test, BotPlayer` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._