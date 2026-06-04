# Graph Report - .  (2026-05-29)

## Corpus Check
- Corpus is ~45,320 words - fits in a single context window. You may not need a graph.

## Summary
- 190 nodes · 210 edges · 31 communities detected
- Extraction: 84% EXTRACTED · 16% INFERRED · 0% AMBIGUOUS · INFERRED: 33 edges (avg confidence: 0.59)
- Token cost: 0 input · 0 output

## God Nodes (most connected - your core abstractions)
1. `GameEngine` - 19 edges
2. `TutorialEngine` - 11 edges
3. `GameServer` - 9 edges
4. `BotManager` - 9 edges
5. `Core Ruleset` - 6 edges
6. `TutorialStorage` - 5 edges
7. `evaluateFive()` - 5 edges
8. `getAsyncStorage()` - 4 edges
9. `BotPlayer` - 4 edges
10. `shuffle()` - 3 edges

## Surprising Connections (you probably didn't know these)
- `Hand of 3 Cards Turn Structure` --conceptually_related_to--> `CardHand Spec`  [INFERRED]
  Game.md → specs/ui-ux-specs.md
- `Captured Piece Bonus System` --conceptually_related_to--> `ScorePile Spec`  [INFERRED]
  Game.md → specs/ui-ux-specs.md
- `Dual Win Conditions` --conceptually_related_to--> `GameOverOverlay Spec`  [INFERRED]
  Game.md → specs/ui-ux-specs.md
- `Time Control Options` --conceptually_related_to--> `ChessClock Spec`  [INFERRED]
  Game.md → specs/ui-ux-specs.md
- `BUG-002: No Rematch` --conceptually_related_to--> `GameOverOverlay Spec`  [INFERRED]
  QA_REPORT.md → specs/ui-ux-specs.md

## Communities

### Community 0 - "Game UI Components"
Cohesion: 0.11
Nodes (0): 

### Community 1 - "Game Engine Core"
Cohesion: 0.15
Nodes (2): GameEngine, shuffle()

### Community 2 - "Bot AI System"
Cohesion: 0.15
Nodes (4): BotPlayer, evaluatePosition(), evaluatePositionSimple(), toChessColor()

### Community 3 - "Animation Utilities"
Cohesion: 0.12
Nodes (0): 

### Community 4 - "Card & Socket Logic"
Cohesion: 0.14
Nodes (0): 

### Community 5 - "Game Design Rules"
Cohesion: 0.14
Nodes (14): Ace Rebalanced Rule, Captured Piece Bonus System, Card-to-Piece Mapping, Core Ruleset, Dual Win Conditions, Gambit Game Design Document, Hand of 3 Cards Turn Structure, Skill Tiers (ELO-Based) (+6 more)

### Community 6 - "Tutorial Engine"
Cohesion: 0.18
Nodes (1): TutorialEngine

### Community 7 - "Screen Routing & Index"
Cohesion: 0.18
Nodes (0): 

### Community 8 - "Game Server"
Cohesion: 0.25
Nodes (1): GameServer

### Community 9 - "Bot Manager"
Cohesion: 0.28
Nodes (1): BotManager

### Community 10 - "Poker Evaluator"
Cohesion: 0.43
Nodes (6): combinations(), evaluateFive(), evaluateScorePile(), getRankCounts(), isFlush(), isStraight()

### Community 11 - "Tutorial Storage"
Cohesion: 0.53
Nodes (2): getAsyncStorage(), TutorialStorage

### Community 12 - "Rating System"
Cohesion: 0.5
Nodes (0): 

### Community 13 - "Graph Report Engines"
Cohesion: 0.5
Nodes (4): BotManager, BotPlayer, GameEngine, TutorialEngine

### Community 14 - "App Layout"
Cohesion: 1.0
Nodes (0): 

### Community 15 - "Chess Clock"
Cohesion: 1.0
Nodes (0): 

### Community 16 - "QA & UX Specs"
Cohesion: 1.0
Nodes (2): QA Report, UX/UI Specs V1.0

### Community 17 - "Async Storage Types"
Cohesion: 1.0
Nodes (0): 

### Community 18 - "V1 Scope Definition"
Cohesion: 1.0
Nodes (1): V1 Ship Scope

### Community 19 - "QA Report"
Cohesion: 1.0
Nodes (1): QA Report

### Community 20 - "UI/UX Specs"
Cohesion: 1.0
Nodes (1): UX/UI Specs V1.0

### Community 21 - "ChessBoard Spec"
Cohesion: 1.0
Nodes (1): ChessBoard Spec

### Community 22 - "Design Tokens Spec"
Cohesion: 1.0
Nodes (1): Design Tokens

### Community 23 - "Code Rules"
Cohesion: 1.0
Nodes (1): Coding Standards

### Community 24 - "UX Rules"
Cohesion: 1.0
Nodes (1): UI/UX Standards

### Community 25 - "Team Workflow"
Cohesion: 1.0
Nodes (1): Team Workflow

### Community 26 - "Agent Orchestrator"
Cohesion: 1.0
Nodes (1): Master Orchestrator

### Community 27 - "Babel Config"
Cohesion: 1.0
Nodes (0): 

### Community 28 - "Game Server Report"
Cohesion: 1.0
Nodes (1): GameServer

### Community 29 - "Core Ruleset Report"
Cohesion: 1.0
Nodes (1): Core Ruleset

### Community 30 - "Game Loop Report"
Cohesion: 1.0
Nodes (1): Gambit Core Game Loop

## Knowledge Gaps
- **23 isolated node(s):** `Card-to-Piece Mapping`, `Ace Rebalanced Rule`, `Skill Tiers (ELO-Based)`, `V1 Ship Scope`, `QA Report` (+18 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `App Layout`** (2 nodes): `_layout.tsx`, `RootLayout()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Chess Clock`** (2 nodes): `ChessClock.tsx`, `formatTime()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `QA & UX Specs`** (2 nodes): `QA Report`, `UX/UI Specs V1.0`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Async Storage Types`** (1 nodes): `async-storage.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `V1 Scope Definition`** (1 nodes): `V1 Ship Scope`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `QA Report`** (1 nodes): `QA Report`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `UI/UX Specs`** (1 nodes): `UX/UI Specs V1.0`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `ChessBoard Spec`** (1 nodes): `ChessBoard Spec`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Design Tokens Spec`** (1 nodes): `Design Tokens`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Code Rules`** (1 nodes): `Coding Standards`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `UX Rules`** (1 nodes): `UI/UX Standards`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Team Workflow`** (1 nodes): `Team Workflow`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Agent Orchestrator`** (1 nodes): `Master Orchestrator`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Babel Config`** (1 nodes): `babel.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Game Server Report`** (1 nodes): `GameServer`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Core Ruleset Report`** (1 nodes): `Core Ruleset`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Game Loop Report`** (1 nodes): `Gambit Core Game Loop`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `GameEngine` connect `Game Engine Core` to `Bot AI System`?**
  _High betweenness centrality (0.123) - this node is a cross-community bridge._
- **Why does `TutorialEngine` connect `Tutorial Engine` to `Game UI Components`?**
  _High betweenness centrality (0.075) - this node is a cross-community bridge._
- **Why does `GameServer` connect `Game Server` to `Bot AI System`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **What connects `Card-to-Piece Mapping`, `Ace Rebalanced Rule`, `Skill Tiers (ELO-Based)` to the rest of the system?**
  _23 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Game UI Components` be split into smaller, more focused modules?**
  _Cohesion score 0.11 - nodes in this community are weakly interconnected._
- **Should `Animation Utilities` be split into smaller, more focused modules?**
  _Cohesion score 0.12 - nodes in this community are weakly interconnected._
- **Should `Card & Socket Logic` be split into smaller, more focused modules?**
  _Cohesion score 0.14 - nodes in this community are weakly interconnected._