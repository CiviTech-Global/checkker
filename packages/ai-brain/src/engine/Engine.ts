import type { EngineEval } from "../types";
export type { EngineEval };

export interface Engine {
  readonly name: string;
  evaluate(fen: string, depth?: number): Promise<EngineEval>;
  getBestMove(fen: string, depth?: number): Promise<string | null>;
  dispose(): void;
}
