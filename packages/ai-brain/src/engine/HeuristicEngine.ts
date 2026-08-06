import { Chess } from "chess.js";
import type { Engine, EngineEval } from "./Engine";

export class HeuristicEngine implements Engine {
  readonly name = "Heuristic v2";

  private readonly PAWN_VALUE = 100;
  private readonly KNIGHT_VALUE = 320;
  private readonly BISHOP_VALUE = 330;
  private readonly ROOK_VALUE = 500;
  private readonly QUEEN_VALUE = 900;

  private readonly PAWN_TABLE = [
    0, 0, 0, 0, 0, 0, 0, 0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
    5, 5, 10, 25, 25, 10, 5, 5,
    0, 0, 0, 20, 20, 0, 0, 0,
    5, -5, -10, 0, 0, -10, -5, 5,
    5, 10, 10, -20, -20, 10, 10, 5,
    0, 0, 0, 0, 0, 0, 0, 0,
  ];

  private readonly KNIGHT_TABLE = [
    -50, -40, -30, -30, -30, -30, -40, -50,
    -40, -20, 0, 0, 0, 0, -20, -40,
    -30, 0, 10, 15, 15, 10, 0, -30,
    -30, 5, 15, 20, 20, 15, 5, -30,
    -30, 0, 15, 20, 20, 15, 0, -30,
    -30, 5, 10, 15, 15, 10, 5, -30,
    -40, -20, 0, 5, 5, 0, -20, -40,
    -50, -40, -30, -30, -30, -30, -40, -50,
  ];

  private readonly BISHOP_TABLE = [
    -20, -10, -10, -10, -10, -10, -10, -20,
    -10, 0, 0, 0, 0, 0, 0, -10,
    -10, 0, 5, 10, 10, 5, 0, -10,
    -10, 5, 5, 10, 10, 5, 5, -10,
    -10, 0, 10, 10, 10, 10, 0, -10,
    -10, 10, 10, 10, 10, 10, 10, -10,
    -10, 5, 0, 0, 0, 0, 5, -10,
    -20, -10, -10, -10, -10, -10, -10, -20,
  ];

  private readonly ROOK_TABLE = [
    0, 0, 0, 0, 0, 0, 0, 0,
    5, 10, 10, 10, 10, 10, 10, 5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    0, 0, 0, 5, 5, 0, 0, 0,
  ];

  private readonly QUEEN_TABLE = [
    -20, -10, -10, -5, -5, -10, -10, -20,
    -10, 0, 0, 0, 0, 0, 0, -10,
    -10, 0, 5, 5, 5, 5, 0, -10,
    -5, 0, 5, 5, 5, 5, 0, -5,
    0, 0, 5, 5, 5, 5, 0, -5,
    -10, 5, 5, 5, 5, 5, 0, -10,
    -10, 0, 5, 0, 0, 0, 0, -10,
    -20, -10, -10, -5, -5, -10, -10, -20,
  ];

  private readonly KING_MIDDLE = [
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -20, -30, -30, -40, -40, -30, -30, -20,
    -10, -20, -20, -20, -20, -20, -20, -10,
    20, 20, 0, 0, 0, 0, 20, 20,
    20, 30, 10, 0, 0, 10, 30, 20,
  ];

  private readonly KING_ENDGAME = [
    -50, -40, -30, -20, -20, -30, -40, -50,
    -30, -20, -10, 0, 0, -10, -20, -30,
    -30, -10, 20, 30, 30, 20, -10, -30,
    -30, -10, 30, 40, 40, 30, -10, -30,
    -30, -10, 30, 40, 40, 30, -10, -30,
    -30, -10, 20, 30, 30, 20, -10, -30,
    -30, -30, 0, 0, 0, 0, -30, -30,
    -50, -30, -30, -30, -30, -30, -30, -50,
  ];

  private readonly FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

  async evaluate(fen: string, _depth: number = 12): Promise<EngineEval> {
    let chess: Chess;
    try {
      chess = new Chess(fen);
    } catch {
      // A king has been captured — terminal position, unparseable by chess.js.
      // Score decisively for whichever side still has a king.
      const whiteHasKing = fen.split(" ")[0].includes("K");
      return {
        score: whiteHasKing ? 100000 : -100000,
        isMate: true,
        mateIn: 0,
        depth: 0,
        bestLine: [],
      };
    }
    return this.evaluateChess(chess);
  }

  async getBestMove(fen: string, depth: number = 12): Promise<string | null> {
    let chess: Chess;
    try {
      chess = new Chess(fen);
    } catch {
      return null;   // terminal position — no move to make
    }
    const moves = chess.moves({ verbose: false });
    
    if (moves.length === 0) return null;

    // evaluateChess returns a White-relative score, so we orient the maximization
    // to the side that is actually moving.
    const isWhiteToMove = fen.includes(" w ");
    let bestScore = -Infinity;
    let bestMove: string | null = null;

    for (const move of moves) {
      chess.move(move);
      const evalResult = this.evaluateChess(chess);
      const score = isWhiteToMove ? evalResult.score : -evalResult.score;
      chess.undo();

      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }

    return bestMove;
  }

  dispose(): void {}

  private evaluateChess(chess: Chess): EngineEval {
    const fen = chess.fen();
    const board = chess.board();

    let whiteMaterial = 0;
    let blackMaterial = 0;
    let whitePst = 0;
    let blackPst = 0;

    const whitePawnCounts = [0, 0, 0, 0, 0, 0, 0, 0];
    const blackPawnCounts = [0, 0, 0, 0, 0, 0, 0, 0];
    let whitePawnFileMask = 0;
    let blackPawnFileMask = 0;

    let whiteKingSquare = -1;
    let blackKingSquare = -1;
    let totalMaterial = 0;

    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const sq = board[r][f];
        if (sq === null) continue;

        const isWhite = sq.color === "w";
        const sign = isWhite ? 1 : -1;
        const v = isWhite ? 0 : 1;
        const pstIdx = isWhite ? r * 8 + f : (7 - r) * 8 + f;

        switch (sq.type) {
          case "p": {
            const val = this.PAWN_VALUE;
            whiteMaterial += isWhite ? val : 0;
            blackMaterial += isWhite ? 0 : val;
            whitePst += isWhite ? this.PAWN_TABLE[pstIdx] : 0;
            blackPst += isWhite ? 0 : this.PAWN_TABLE[pstIdx];
            totalMaterial += val;
            if (isWhite) {
              whitePawnCounts[f]++;
              whitePawnFileMask |= (1 << f);
              if (r === 1 || r === 2 || r === 3) whitePawnCounts[f] += 10;
            } else {
              blackPawnCounts[f]++;
              blackPawnFileMask |= (1 << f);
              if (r === 6 || r === 5 || r === 4) blackPawnCounts[f] += 10;
            }
            break;
          }
          case "n": {
            const val = this.KNIGHT_VALUE;
            whiteMaterial += isWhite ? val : 0;
            blackMaterial += isWhite ? 0 : val;
            whitePst += isWhite ? this.KNIGHT_TABLE[pstIdx] : 0;
            blackPst += isWhite ? 0 : this.KNIGHT_TABLE[pstIdx];
            totalMaterial += val;
            break;
          }
          case "b": {
            const val = this.BISHOP_VALUE;
            whiteMaterial += isWhite ? val : 0;
            blackMaterial += isWhite ? 0 : val;
            whitePst += isWhite ? this.BISHOP_TABLE[pstIdx] : 0;
            blackPst += isWhite ? 0 : this.BISHOP_TABLE[pstIdx];
            totalMaterial += val;
            break;
          }
          case "r": {
            const val = this.ROOK_VALUE;
            whiteMaterial += isWhite ? val : 0;
            blackMaterial += isWhite ? 0 : val;
            whitePst += isWhite ? this.ROOK_TABLE[pstIdx] : 0;
            blackPst += isWhite ? 0 : this.ROOK_TABLE[pstIdx];
            totalMaterial += val;
            break;
          }
          case "q": {
            const val = this.QUEEN_VALUE;
            whiteMaterial += isWhite ? val : 0;
            blackMaterial += isWhite ? 0 : val;
            whitePst += isWhite ? this.QUEEN_TABLE[pstIdx] : 0;
            blackPst += isWhite ? 0 : this.QUEEN_TABLE[pstIdx];
            totalMaterial += val;
            break;
          }
          case "k": {
            if (isWhite) whiteKingSquare = r * 8 + f;
            else blackKingSquare = r * 8 + f;
            break;
          }
        }
      }
    }

    const phase = Math.min(1, totalMaterial / 4000);
    const isEndgame = totalMaterial < 2400;

    let score = 0;

    score += (whiteMaterial - blackMaterial);
    score += (whitePst - blackPst);

    const kingTable = isEndgame ? this.KING_ENDGAME : this.KING_MIDDLE;
    if (whiteKingSquare >= 0) score += kingTable[whiteKingSquare];
    if (blackKingSquare >= 0) score -= kingTable[blackKingSquare];

    score += this.evaluatePawnStructure(whitePawnCounts, blackPawnCounts);
    score += this.evaluateBishopPair(board, whiteMaterial, blackMaterial);
    score += this.evaluateRookOpenFiles(chess, whiteMaterial, blackMaterial, whitePawnFileMask, blackPawnFileMask);

    const whiteMobility = this.countMobility(chess, "w");
    const blackMobility = this.countMobility(chess, "b");
    score += (whiteMobility - blackMobility) * 2;

    if (!isEndgame) {
      const whiteKingDanger = this.evaluateKingSafety(chess, "w", whiteKingSquare, whitePawnCounts);
      const blackKingDanger = this.evaluateKingSafety(chess, "b", blackKingSquare, blackPawnCounts);
      score += whiteKingDanger;
      score -= blackKingDanger;
    }

    const kingZoneAttack = this.evaluateKingTropism(board, whiteKingSquare, blackKingSquare);
    score += kingZoneAttack;

    if (chess.isCheck()) {
      score += chess.turn() === "w" ? -30 : 30;
    }

    // Return the score from White's absolute perspective. Callers that need a
    // different orientation (e.g., Black choosing a move) must negate it.
    return {
      score,
      isMate: false,
      mateIn: 0,
      depth: 12,
      bestLine: [],
    };
  }

  private evaluatePawnStructure(whiteCounts: number[], blackCounts: number[]): number {
    let score = 0;

    for (let f = 0; f < 8; f++) {
      const wc = whiteCounts[f];
      const bc = blackCounts[f];

      if (wc > 1) score -= 15 * (wc - 1);
      if (bc > 1) score += 15 * (bc - 1);

      const wLeft = f > 0 ? whiteCounts[f - 1] : 0;
      const wRight = f < 7 ? whiteCounts[f + 1] : 0;
      if (wc > 0 && wLeft === 0 && wRight === 0) score -= 10;

      const bLeft = f > 0 ? blackCounts[f - 1] : 0;
      const bRight = f < 7 ? blackCounts[f + 1] : 0;
      if (bc > 0 && bLeft === 0 && bRight === 0) score += 10;
    }

    return score;
  }

  private evaluateBishopPair(board: ReturnType<Chess["board"]>, whiteMaterial: number, blackMaterial: number): number {
    let whiteBishops = 0;
    let blackBishops = 0;

    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const sq = board[r][f];
        if (sq && sq.type === "b") {
          if (sq.color === "w") whiteBishops++;
          else blackBishops++;
        }
      }
    }

    let score = 0;
    if (whiteBishops >= 2) score += 30;
    if (blackBishops >= 2) score -= 30;
    return score;
  }

  private evaluateRookOpenFiles(
    chess: Chess,
    whiteMaterial: number,
    blackMaterial: number,
    whitePawnFileMask: number,
    blackPawnFileMask: number,
  ): number {
    const board = chess.board();
    let score = 0;

    const rookFiles: { white: number[]; black: number[] } = { white: [], black: [] };

    for (let f = 0; f < 8; f++) {
      for (let r = 0; r < 8; r++) {
        const sq = board[r][f];
        if (sq && sq.type === "r") {
          if (sq.color === "w") rookFiles.white.push(f);
          else rookFiles.black.push(f);
        }
      }
    }

    for (const f of rookFiles.white) {
      if (!(blackPawnFileMask & (1 << f))) score += 15;
      if (!(whitePawnFileMask & (1 << f)) && !(blackPawnFileMask & (1 << f))) score += 10;
    }
    for (const f of rookFiles.black) {
      if (!(whitePawnFileMask & (1 << f))) score -= 15;
      if (!(whitePawnFileMask & (1 << f)) && !(blackPawnFileMask & (1 << f))) score -= 10;
    }

    return score;
  }

  private countMobility(chess: Chess, color: "w" | "b"): number {
    const fen = chess.fen();
    if (fen.includes(` ${color} `) === (color === "w" ? false : true)) {
      try { chess.load(fen.replace(/ [wb] /, ` ${color} `)); } catch { return 0; }
    }
    return chess.moves({ verbose: false }).length;
  }

  private evaluateKingSafety(
    chess: Chess,
    color: "w" | "b",
    kingSquare: number,
    pawnCounts: number[],
  ): number {
    if (kingSquare < 0) return 0;

    const kingRank = Math.floor(kingSquare / 8);
    const kingFile = kingSquare % 8;
    const pawnRank = color === "w" ? kingRank + 1 : kingRank - 1;

    let shield = 0;
    for (let df = -1; df <= 1; df++) {
      const pf = kingFile + df;
      if (pf >= 0 && pf < 8 && pawnCounts[pf] > 0) {
        const isAdv = color === "w"
          ? pawnCounts[pf] >= 10
          : pawnCounts[pf] >= 10;
        if (isAdv) shield += 20;
        else shield += 10;
      }
    }

    return shield;
  }

  private evaluateKingTropism(
    board: ReturnType<Chess["board"]>,
    whiteKingSq: number,
    blackKingSq: number,
  ): number {
    let score = 0;

    const wkr = Math.floor(whiteKingSq / 8);
    const wkf = whiteKingSq % 8;
    const bkr = Math.floor(blackKingSq / 8);
    const bkf = blackKingSq % 8;

    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const sq = board[r][f];
        if (!sq || sq.type === "k") continue;

        const distToWhite = Math.abs(r - wkr) + Math.abs(f - wkf);
        const distToBlack = Math.abs(r - bkr) + Math.abs(f - bkf);

        if (sq.color === "w") {
          score += Math.max(0, 7 - distToBlack) * 3;
          score -= Math.max(0, 7 - distToWhite) * 2;
        } else {
          score -= Math.max(0, 7 - distToWhite) * 3;
          score += Math.max(0, 7 - distToBlack) * 2;
        }
      }
    }

    return score;
  }
}
