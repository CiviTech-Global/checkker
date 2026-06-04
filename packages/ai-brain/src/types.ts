import type { Card } from "@checkker/shared";

export type EngineType = "heuristic" | "stockfish";

export interface EngineEval {
  score: number;
  isMate: boolean;
  mateIn: number;
  depth: number;
  bestLine: string[];
}

export interface PokerAwareScore {
  chessScore: number;
  pokerPotential: number;
  hybridScore: number;
  explanation?: string;
}

export interface AnalyzedMove {
  cardId: string;
  move: string;
  chessScore: number;
  pokerPotential: number;
  hybridScore: number;
  rank: number;
  isBlunder: boolean;
  isBestMove: boolean;
  explanation?: string;
}

export interface PlayerModel {
  id: string;
  estimatedSkill: number;
  playStyle: "aggressive" | "defensive" | "balanced" | "unknown";
  aggressionIndex: number;
  cardConservationIndex: number;
  weaknesses: string[];
}

export interface MoveExplanation {
  text: string;
  type: "positional" | "tactical" | "card_economy" | "poker" | "strategy" | "warning";
  priority: number;
}

export interface CoachingTip {
  lessonId?: string;
  text: string;
  category: "opening" | "middlegame" | "endgame" | "card_management" | "poker" | "general";
  severity: "hint" | "important" | "critical";
}

export interface PlayerCluster {
  id: string;
  name: string;
  centroid: PlayerModel;
  members: string[];
  description: string;
}

export interface MatchSuggestion {
  playerA: string;
  playerB: string;
  compatibility: number;
  reason: string;
}

export interface SkillGraph {
  opening: number;
  middlegame: number;
  endgame: number;
  cards: number;
  poker: number;
}

export interface GameReport {
  summary: string;
  playerRating: number;
  chessAccuracy: number;
  pokerEfficiency: number;
  keyMoments: Array<{
    moveNumber: number;
    description: string;
    scoreDelta: number;
  }>;
  mistakes: Array<{
    moveNumber: number;
    move: string;
    description: string;
    severity: "minor" | "major" | "blunder";
    suggestedMove?: string;
  }>;
  tips: CoachingTip[];
  skillGraph?: SkillGraph;
  weaknessRadar?: string[];
  improvementSuggestions?: string[];
  styleProfile?: "aggressive" | "defensive" | "balanced" | "tactical" | "positional";
}
