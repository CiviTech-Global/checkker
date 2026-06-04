import { spawn, type ChildProcess } from "child_process";
import * as path from "path";
import type { Engine, EngineEval } from "./Engine";
import { HeuristicEngine } from "./HeuristicEngine";

const STOCKFISH_BINARY_NAME = process.platform === "win32" ? "stockfish.exe" : "stockfish";

export class StockfishEngine implements Engine {
  readonly name = "Stockfish";
  private process: ChildProcess | null = null;
  private ready = false;
  private pendingResolve: ((value: string) => void) | null = null;
  private buffer = "";
  private fallback: HeuristicEngine;
  private fallbackActive = false;
  private processPath: string;
  private maxDepth: number;

  constructor(binaryPath?: string, maxDepth: number = 14) {
    this.processPath = binaryPath ?? STOCKFISH_BINARY_NAME;
    this.maxDepth = maxDepth;
    this.fallback = new HeuristicEngine();
  }

  private async startProcess(): Promise<void> {
    if (this.process) return;

    try {
      this.process = spawn(this.processPath, [], {
        stdio: ["pipe", "pipe", "pipe"],
      });

      this.process.stdout?.on("data", (data: Buffer) => {
        this.buffer += data.toString();
        const lines = this.buffer.split("\n");
        this.buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed === "uciok") {
            this.ready = true;
          }
          if (this.pendingResolve && (trimmed.startsWith("bestmove") || trimmed.startsWith("info"))) {
            this.pendingResolve(trimmed);
            this.pendingResolve = null;
          }
        }
      });

      this.process.stderr?.on("data", () => {});

      this.process.on("error", (err) => {
        console.warn(`[StockfishEngine] Failed to start Stockfish: ${err.message}. Falling back to heuristic.`);
        this.fallbackActive = true;
        this.cleanup();
      });

      this.process.on("exit", () => {
        this.ready = false;
        this.process = null;
      });

      this.send("uci");
      await this.waitFor("uciok", 5000);
      this.send("isready");
      await this.waitFor("readyok", 5000);

      console.log(`[StockfishEngine] Engine ready at ${this.processPath}`);
    } catch (err) {
      console.warn(`[StockfishEngine] Error initializing Stockfish: ${err}. Falling back to heuristic.`);
      this.fallbackActive = true;
      this.cleanup();
    }
  }

  private send(command: string): void {
    if (this.process?.stdin?.writable) {
      this.process.stdin.write(command + "\n");
    }
  }

  private waitFor(target: string, timeoutMs: number = 5000): Promise<void> {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const check = () => {
        if (this.fallbackActive) return resolve();
        if (!this.ready && target === "uciok") {
          if (Date.now() - start > timeoutMs) return resolve();
          setTimeout(check, 10);
          return;
        }
        resolve();
      };
      check();
    });
  }

  private async queryUCI(command: string): Promise<string> {
    if (this.fallbackActive) return "";

    return new Promise((resolve) => {
      this.pendingResolve = resolve;
      this.send(command);

      setTimeout(() => {
        if (this.pendingResolve) {
          this.pendingResolve("");
          this.pendingResolve = null;
        }
      }, 10000);
    });
  }

  async evaluate(fen: string, depth?: number): Promise<EngineEval> {
    if (this.fallbackActive) {
      return this.fallback.evaluate(fen, depth);
    }

    await this.startProcess();
    if (this.fallbackActive) {
      return this.fallback.evaluate(fen, depth);
    }
    if (!this.process) {
      return this.fallback.evaluate(fen, depth);
    }

    const d = depth ?? this.maxDepth;
    this.send(`position fen ${fen}`);
    this.send("setoption name MultiPV value 1");
    const result = await this.queryUCI(`go depth ${d}`);

    let score = 0;
    let isMate = false;
    let mateIn = 0;
    let bestDepth = 0;

    const infoMatch = result.match(/info depth (\d+).*?score (cp (-?\d+)|mate (-?\d+))/);
    if (infoMatch) {
      bestDepth = parseInt(infoMatch[1], 10);
      if (infoMatch[3] !== undefined) {
        score = parseInt(infoMatch[3], 10);
      } else if (infoMatch[4] !== undefined) {
        isMate = true;
        mateIn = parseInt(infoMatch[4], 10);
        score = mateIn > 0 ? 100000 : -100000;
      }
    }

    const bestMove = result.startsWith("bestmove") ? result.split(" ")[1] : "";

    return {
      score,
      isMate,
      mateIn,
      depth: bestDepth || d,
      bestLine: bestMove ? [bestMove] : [],
    };
  }

  async getBestMove(fen: string, depth?: number): Promise<string | null> {
    if (this.fallbackActive) {
      return this.fallback.getBestMove(fen, depth);
    }

    await this.startProcess();
    if (this.fallbackActive || !this.process) {
      return this.fallback.getBestMove(fen, depth);
    }

    const d = depth ?? this.maxDepth;
    this.send(`position fen ${fen}`);
    const result = await this.queryUCI(`go depth ${d}`);

    if (result.startsWith("bestmove")) {
      const move = result.split(" ")[1];
      return move !== "(none)" ? move : null;
    }

    return null;
  }

  async getTopMoves(fen: string, topN: number = 3, depth?: number): Promise<Array<{ move: string; score: number }>> {
    if (this.fallbackActive) {
      const best = await this.fallback.getBestMove(fen, depth);
      return best ? [{ move: best, score: 0 }] : [];
    }

    await this.startProcess();
    if (this.fallbackActive || !this.process) {
      const best = await this.fallback.getBestMove(fen, depth);
      return best ? [{ move: best, score: 0 }] : [];
    }

    const d = depth ?? Math.max(8, this.maxDepth - 4);
    this.send(`position fen ${fen}`);
    this.send(`setoption name MultiPV value ${topN}`);

    const lines: string[] = [];
    const originalHandler = this.pendingResolve;

    const result = await new Promise<string>((resolve) => {
      let fullOutput = "";
      const onData = (data: Buffer) => {
        fullOutput += data.toString();
      };
      this.process?.stdout?.on("data", onData);

      this.send(`go depth ${d}`);

      const checkForBestmove = () => {
        if (fullOutput.includes("bestmove")) {
          this.process?.stdout?.removeListener("data", onData);
          resolve(fullOutput);
        } else {
          setTimeout(checkForBestmove, 50);
        }
      };

      setTimeout(() => {
        this.process?.stdout?.removeListener("data", onData);
        resolve(fullOutput);
      }, 15000);

      checkForBestmove();
    });

    const moves: Array<{ move: string; score: number }> = [];
    const pvRegex = /info depth (\d+).*?multipv (\d+).*?score (cp (-?\d+)|mate (-?\d+)).*?pv (\S+)/g;
    let match;

    while ((match = pvRegex.exec(result)) !== null) {
      const pvNum = parseInt(match[2], 10);
      const scoreCp = match[4] ? parseInt(match[4], 10) : match[5] ? 100000 : 0;
      const move = match[6];

      if (move && pvNum <= topN) {
        moves.push({ move, score: scoreCp });
      }
    }

    if (moves.length === 0) {
      const bestmoveMatch = result.match(/bestmove (\S+)/);
      if (bestmoveMatch && bestmoveMatch[1] !== "(none)") {
        moves.push({ move: bestmoveMatch[1], score: 0 });
      }
    }

    moves.sort((a, b) => b.score - a.score);
    return moves.slice(0, topN);
  }

  dispose(): void {
    this.cleanup();
  }

  private cleanup(): void {
    if (this.process) {
      try {
        this.send("quit");
      } catch {}
      try {
        this.process.kill();
      } catch {}
      this.process = null;
    }
    this.ready = false;
  }

  isUsingFallback(): boolean {
    return this.fallbackActive;
  }

  retryStockfish(): void {
    this.fallbackActive = false;
    this.cleanup();
  }
}
