import { Chess } from "chess.js";
import { getLegalMovesForHand } from "@checkker/chess";
import type { Card, Color, BotDifficulty, MoveEvaluation } from "@checkker/shared";
import type { LegalMovesForCard } from "@checkker/chess";
import { HybridEvaluator } from "./evaluator/HybridEvaluator";
import { evaluatePokerPotential } from "./evaluator/PokerPotential";
import { MoveExplainer } from "./coaching/MoveExplainer";
import { AdaptiveBot } from "./adaptive/AdaptiveBot";
import { PostGameAnalyzer } from "./analysis/PostGameAnalysis";
import { LLMCoach } from "./coaching/LLMCoach";
import { PlayerRepository } from "./adaptive/PlayerRepository";
import { PlayerClusterer } from "./adaptive/PlayerClusterer";
import { PuzzleGenerator, type Puzzle } from "./analysis/PuzzleGenerator";
import { createEngine, disposeStockfish } from "./engine/factory";
import type { StockfishEngine } from "./engine/StockfishEngine";
import type { Engine } from "./engine/Engine";
import type {
  AnalyzedMove, PokerAwareScore, PlayerModel,
  GameReport, MoveExplanation, CoachingTip, PlayerCluster,
  MatchSuggestion,
} from "./types";

export type { Puzzle } from "./analysis/PuzzleGenerator";
export type { PlayerCluster, MatchSuggestion } from "./types";

export class AIBrain {
  private hybridEvaluator: HybridEvaluator;
  private moveExplainer: MoveExplainer;
  private llmCoach: LLMCoach;
  private adaptiveBot: AdaptiveBot;
  private postGameAnalyzer: PostGameAnalyzer;
  private playerRepository: PlayerRepository | null = null;
  private playerClusterer: PlayerClusterer;
  private puzzleGenerator: PuzzleGenerator;
  private activeEngine: Engine;

  constructor() {
    this.hybridEvaluator = new HybridEvaluator();
    this.moveExplainer = new MoveExplainer();
    this.llmCoach = new LLMCoach();
    this.adaptiveBot = new AdaptiveBot();
    this.postGameAnalyzer = new PostGameAnalyzer(this.hybridEvaluator);
    this.playerClusterer = new PlayerClusterer();
    this.puzzleGenerator = new PuzzleGenerator();
    this.activeEngine = createEngine("auto");
  }

  configureEngine(type: "heuristic" | "stockfish" | "auto"): void {
    disposeStockfish();
    this.activeEngine = createEngine(type);
  }

  getEngine(): Engine {
    return this.activeEngine;
  }

  enablePersistence(storageDir: string): void {
    if (this.playerRepository) {
      this.playerRepository.dispose();
    }
    this.playerRepository = new PlayerRepository(storageDir, this.adaptiveBot);
  }

  disablePersistence(): void {
    if (this.playerRepository) {
      this.playerRepository.flushDirty();
      this.playerRepository.dispose();
      this.playerRepository = null;
    }
  }

  getHybridEvaluator(): HybridEvaluator {
    return this.hybridEvaluator;
  }

  getMoveExplainer(): MoveExplainer {
    return this.moveExplainer;
  }

  getLLMCoach(): LLMCoach {
    return this.llmCoach;
  }

  getAdaptiveBot(): AdaptiveBot {
    return this.adaptiveBot;
  }

  getPostGameAnalyzer(): PostGameAnalyzer {
    return this.postGameAnalyzer;
  }

  getPlayerRepository(): PlayerRepository | null {
    return this.playerRepository;
  }

  getPlayerClusterer(): PlayerClusterer {
    return this.playerClusterer;
  }

  getPuzzleGenerator(): PuzzleGenerator {
    return this.puzzleGenerator;
  }

  async evaluatePosition(fen: string): Promise<number> {
    return await this.hybridEvaluator.evaluateChess(fen);
  }

  async evaluatePokerAware(
    fen: string,
    hand: Card[],
    scorePile: Card[],
    drawPileSize: number,
    color: Color,
  ): Promise<PokerAwareScore> {
    return await this.hybridEvaluator.evaluatePokerAware(fen, hand, scorePile, drawPileSize, color);
  }

  async getBestMoves(
    fen: string,
    hand: Card[],
    scorePile: Card[],
    drawPileSize: number,
    color: Color,
    topN: number = 3,
  ): Promise<AnalyzedMove[]> {
    const chess = new Chess(fen);
    const legalMoves = getLegalMovesForHand(chess, hand);
    return await this.hybridEvaluator.rankMoves(fen, legalMoves, scorePile, drawPileSize, color, topN);
  }

  async getBestMoveForDifficulty(
    fen: string,
    hand: Card[],
    legalMoves: LegalMovesForCard[],
    scorePile: Card[],
    drawPileSize: number,
    color: Color,
    difficulty: BotDifficulty,
  ): Promise<MoveEvaluation | null> {
    return await this.hybridEvaluator.evaluateDifficulty(fen, hand, legalMoves, scorePile, drawPileSize, color, difficulty);
  }

  async explainMoveLLM(fen: string, move: string, cardId: string, color: Color): Promise<MoveExplanation> {
    return this.llmCoach.explainMove(fen, move, cardId, color);
  }

  async explainMove(fen: string, move: string, cardId: string, color: Color): Promise<MoveExplanation> {
    return await this.moveExplainer.explainMove(fen, move, cardId, color);
  }

  async getCoachingTip(
    fen: string,
    hand: Card[],
    scorePile: Card[],
    turn: Color,
    moveNumber: number,
  ): Promise<CoachingTip | null> {
    const engineTip = await this.getEngineCoachingTip(fen, hand, scorePile, turn);

    if (this.llmCoach.isAvailable()) {
      try {
        const llmTip = await this.llmCoach.generateCoachingTip(fen, hand, turn, moveNumber);
        if (llmTip) {
          return {
            text: llmTip,
            category: "general",
            severity: "hint",
          };
        }
      } catch {}
    }

    return engineTip;
  }

  async generateSpectatorComment(fen: string, moveNumber: number): Promise<string | null> {
    return this.llmCoach.generateSpectatorComment(fen, moveNumber);
  }

  private async getEngineCoachingTip(
    fen: string,
    hand: Card[],
    scorePile: Card[],
    turn: Color,
  ): Promise<CoachingTip | null> {
    const chess = new Chess(fen);
    const legalMoves = getLegalMovesForHand(chess, hand);
    const ranked = await this.hybridEvaluator.rankMoves(fen, legalMoves, scorePile, 20, turn, 3);

    if (ranked.length === 0) return null;

    const bestScore = ranked[0].hybridScore;
    const allClose = ranked.every((m) => Math.abs(bestScore - m.hybridScore) < 50);

    if (!allClose && ranked.length >= 2) {
      const gap = bestScore - ranked[1].hybridScore;
      if (gap > 100) {
        return {
          text: `Consider ${ranked[0].move} — it's significantly stronger than other options.`,
          category: "general",
          severity: "hint",
        };
      }
    }

    const pokerPotential = evaluatePokerPotential(scorePile, hand, 20);
    if (pokerPotential.estimatedFinalScore > 10 && scorePile.length >= 3) {
      return {
        text: `Strong poker potential (${pokerPotential.handName}). Try to reach 5 cards in your score pile!`,
        category: "poker",
        severity: "hint",
      };
    }

    return null;
  }

  async analyzeGame(
    stateHistory: Array<{ fen: string; move: string; card: Card; color: Color }>,
    playerColor: Color,
    finalScore: number,
    rating: number,
  ): Promise<GameReport> {
    return await this.postGameAnalyzer.analyze(stateHistory, playerColor, finalScore, rating);
  }

  async analyzeGameWithLLM(
    stateHistory: Array<{ fen: string; move: string; card: Card; color: Color }>,
    playerColor: Color,
    finalScore: number,
    rating: number,
  ): Promise<GameReport> {
    const report = await this.postGameAnalyzer.analyze(stateHistory, playerColor, finalScore, rating);

    if (this.llmCoach.isAvailable()) {
      try {
        const lastResult = finalScore > rating ? "win" : finalScore < rating ? "loss" : "draw";
        const llmSummary = await this.llmCoach.generatePostGameSummary(
          stateHistory.map((h) => ({ move: h.move, fen: h.fen, color: h.color })),
          playerColor,
          lastResult,
        );
        if (llmSummary) {
          report.summary = llmSummary;
        }
      } catch {}
    }

    return report;
  }

  recordPlayerMove(
    playerId: string,
    move: string,
    fen: string,
    card: Card,
    color: Color,
    wasGoodMove: boolean,
  ): void {
    this.adaptiveBot.observeMove(playerId, move, fen, card, color, wasGoodMove);

    if (this.playerRepository) {
      this.playerRepository.recordMove(
        playerId, move, fen, card.rank, card.suit, color, wasGoodMove,
      );
    }
  }

  getPlayerModel(playerId: string): PlayerModel {
    if (this.playerRepository) {
      this.playerRepository.restoreModel(playerId);
    }
    return this.adaptiveBot.getOrCreateModel(playerId);
  }

  persistPlayer(playerId: string): void {
    if (this.playerRepository) {
      this.playerRepository.persistModel(playerId);
    }
  }

  getAdaptiveDifficulty(playerId: string): BotDifficulty {
    return this.adaptiveBot.getRecommendedDifficulty(playerId);
  }

  async getAdaptiveMove(
    playerId: string,
    fen: string,
    hand: Card[],
    legalMoves: LegalMovesForCard[],
    scorePile: Card[],
    drawPileSize: number,
    color: Color,
  ): Promise<MoveEvaluation | null> {
    const difficulty = this.adaptiveBot.getRecommendedDifficulty(playerId);
    return await this.hybridEvaluator.evaluateDifficulty(fen, hand, legalMoves, scorePile, drawPileSize, color, difficulty);
  }

  clusterPlayers(): PlayerCluster[] {
    const players = this.playerRepository
      ? this.playerRepository.getAllPlayerModels()
      : [];
    return this.playerClusterer.clusterPlayers(players);
  }

  findMatch(playerId: string): MatchSuggestion | null {
    if (!this.playerRepository) return null;
    const player = this.adaptiveBot.getOrCreateModel(playerId);
    const allPlayers = this.playerRepository.getAllPlayerModels();
    return this.playerClusterer.findMatch(player, allPlayers);
  }

  getClusterStats(): Array<{ name: string; count: number; description: string }> {
    const players = this.playerRepository
      ? this.playerRepository.getAllPlayerModels()
      : [];
    const clusters = this.playerClusterer.clusterPlayers(players);
    return this.playerClusterer.getClusterStats(clusters);
  }

  async generatePuzzle(
    fen: string,
    color: Color,
    difficulty: BotDifficulty = "intermediate",
  ): Promise<Puzzle | null> {
    return this.puzzleGenerator.generateFromPosition(fen, color, difficulty);
  }

  async generatePuzzlesFromHistory(
    history: Array<{ fen: string; move: string; color: Color }>,
    difficulty: BotDifficulty = "intermediate",
  ): Promise<Puzzle[]> {
    return await this.puzzleGenerator.generateFromMoveHistory(history, difficulty);
  }

  async dispose(): Promise<void> {
    if (this.playerRepository) {
      await this.playerRepository.flushDirty();
      this.playerRepository.dispose();
    }
    disposeStockfish();
  }
}
