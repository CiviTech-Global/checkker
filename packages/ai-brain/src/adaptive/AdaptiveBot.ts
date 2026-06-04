import { Chess } from "chess.js";
import type { Color, BotDifficulty, BotPersonality, Card } from "@checkker/shared";
import type { PlayerModel, AnalyzedMove } from "../types";

export class AdaptiveBot {
  private playerModels: Map<string, PlayerModel> = new Map();
  private moveHistory: Map<string, Array<{ fen: string; move: string; card: Card; color: Color; wasGood: boolean }>> = new Map();
  private readonly HISTORY_LIMIT = 100;

  getOrCreateModel(playerId: string): PlayerModel {
    let model = this.playerModels.get(playerId);
    if (!model) {
      model = {
        id: playerId,
        estimatedSkill: 1000,
        playStyle: "unknown",
        aggressionIndex: 0.5,
        cardConservationIndex: 0.5,
        weaknesses: [],
      };
      this.playerModels.set(playerId, model);
    }
    return model;
  }

  observeMove(playerId: string, move: string, fen: string, card: Card, color: Color, wasGood: boolean): void {
    let history = this.moveHistory.get(playerId);
    if (!history) {
      history = [];
      this.moveHistory.set(playerId, history);
    }

    history.push({ fen, move, card, color, wasGood });

    if (history.length > this.HISTORY_LIMIT) {
      history.shift();
    }

    this.updateModel(playerId);
  }

  private updateModel(playerId: string): void {
    const model = this.getOrCreateModel(playerId);
    const history = this.moveHistory.get(playerId) ?? [];

    if (history.length < 5) return;

    const total = history.length;

    const goodMoves = history.filter((h) => h.wasGood).length;
    const accuracy = goodMoves / total;

    model.estimatedSkill = Math.round(1000 + (accuracy - 0.5) * 1000);
    model.estimatedSkill = Math.max(200, Math.min(2500, model.estimatedSkill));

    const highCardMoves = history.filter((h) => {
      const rank = h.card.rank;
      return ["A", "K", "Q", "J", "10"].includes(rank);
    }).length;
    model.cardConservationIndex = 1 - (highCardMoves / Math.max(1, total));

    const captures = history.filter((h) => {
      const chess = new Chess(h.fen);
      const target = h.move.slice(2, 4);
      return chess.get(target as any) !== null;
    }).length;

    const aggressiveRatio = captures / Math.max(1, total);
    model.aggressionIndex = aggressiveRatio;

    if (aggressiveRatio > 0.4) model.playStyle = "aggressive";
    else if (aggressiveRatio < 0.15) model.playStyle = "defensive";
    else model.playStyle = "balanced";

    const weaknesses: string[] = [];
    if (accuracy < 0.4) weaknesses.push("positional_awareness");
    if (model.cardConservationIndex < 0.3) weaknesses.push("card_waste");
    if (captures < total * 0.1 && total > 10) weaknesses.push("missed_captures");
    model.weaknesses = weaknesses;
  }

  getRecommendedDifficulty(playerId: string): BotDifficulty {
    const model = this.getOrCreateModel(playerId);

    if (model.estimatedSkill < 600) return "beginner";
    if (model.estimatedSkill < 1100) return "intermediate";
    if (model.estimatedSkill < 1600) return "advanced";
    return "master";
  }

  getHumanLikelyRating(playerId: string): number {
    const model = this.getOrCreateModel(playerId);
    return model.estimatedSkill;
  }

  resetPlayer(playerId: string): void {
    this.playerModels.delete(playerId);
    this.moveHistory.delete(playerId);
  }

  /**
   * Apply personality bias to a list of analyzed moves.
   * Returns the same array re-scored based on the bot personality.
   */
  applyPersonalityBias(moves: AnalyzedMove[], personality: BotPersonality): AnalyzedMove[] {
    return moves.map((m) => {
      let bonus = 0;
      switch (personality) {
        case "aggressive":
          // Favor captures and checks
          if (m.explanation?.includes("capture") || m.explanation?.includes("check")) {
            bonus = 0.15;
          }
          bonus += m.chessScore > 0 ? 0.05 : 0;
          break;
        case "defensive":
          // Favor moves that don't lose material, prefer solid positional moves
          if (m.chessScore >= 0 && !m.isBlunder) {
            bonus = 0.1;
          }
          // Penalize risky captures
          if (m.explanation?.includes("sacrifice")) {
            bonus = -0.1;
          }
          break;
        case "tricky":
          // Favor moves that create complications, prefer non-obvious moves
          if (!m.isBestMove && m.rank <= 3 && m.chessScore > -0.5) {
            bonus = 0.12;
          }
          // Favor poker potential over pure chess
          bonus += m.pokerPotential * 0.1;
          break;
        case "classical":
          // Favor the objectively best move with slight preference for solid play
          if (m.isBestMove) {
            bonus = 0.08;
          }
          break;
      }
      return {
        ...m,
        hybridScore: m.hybridScore + bonus,
      };
    }).sort((a, b) => b.hybridScore - a.hybridScore);
  }
}
