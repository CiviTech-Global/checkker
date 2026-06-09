export interface Puzzle {
  id: string;
  fen: string;
  solution: string;
  hint: string;
  difficulty: string;
  category: string;
  rating: number;
}

export interface PuzzleResult {
  correct: boolean;
  solution: string;
  hint: string;
  stats: { streak: number; solved: number; attempted: number };
}

export interface PuzzlesListData {
  category: string;
  puzzles: Puzzle[];
  count: number;
}
