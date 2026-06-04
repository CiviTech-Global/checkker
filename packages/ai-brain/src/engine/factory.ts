import type { Engine } from "./Engine";
import { HeuristicEngine } from "./HeuristicEngine";

let stockfishInstance: Engine | null = null;

export function createEngine(type: "heuristic" | "stockfish" | "auto" = "auto"): Engine {
  if (type === "heuristic") return new HeuristicEngine();

  if (type === "stockfish" || type === "auto") {
    if (stockfishInstance) return stockfishInstance;

    try {
      const { StockfishEngine } = require("./StockfishEngine");
      const sf = new StockfishEngine();
      if (sf.isUsingFallback?.()) {
        return new HeuristicEngine();
      }
      stockfishInstance = sf;
      return sf;
    } catch {
      return new HeuristicEngine();
    }
  }

  return new HeuristicEngine();
}

export function getEngine(type: "heuristic" | "stockfish" | "auto" = "auto"): Engine {
  return createEngine(type);
}

export function disposeStockfish(): void {
  if (stockfishInstance) {
    stockfishInstance.dispose();
    stockfishInstance = null;
  }
}
