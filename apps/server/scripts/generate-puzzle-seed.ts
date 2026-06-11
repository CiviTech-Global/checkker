/**
 * Generates puzzle-seed-data.json (500 puzzles) for the /admin/seed-puzzles endpoint.
 *
 * Run: npx tsx scripts/generate-puzzle-seed.ts
 *
 * Positions come from seeded random playouts. A position becomes a puzzle when
 * one move is clearly best under a depth-2 material search (gap >= GAP_MIN) or
 * delivers checkmate. Each puzzle carries a 3-card hand that contains a card
 * able to play the solution move, so puzzles respect Checkker's card rules.
 */
import { Chess } from "chess.js";
import { writeFileSync } from "fs";
import { join } from "path";

type Rank = "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K" | "A";
type Suit = "clubs" | "diamonds" | "hearts" | "spades";
interface Card { rank: Rank; suit: Suit; }

const SUITS: Suit[] = ["clubs", "diamonds", "hearts", "spades"];
const PAWN_RANKS: Rank[] = ["3", "4", "5", "6", "7", "8", "9"];
const PIECE_TO_RANKS: Record<string, Rank[]> = {
  k: ["K"], q: ["Q"], n: ["J"], r: ["10"], b: ["2"], p: PAWN_RANKS,
};
const ALL_RANKS: Rank[] = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];

const PIECE_VALUE: Record<string, number> = { p: 100, n: 300, b: 310, r: 500, q: 900, k: 0 };

const TARGET = 500;
const GAP_MIN = 250; // centipawns

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(0xc4ecc3e);
const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];

function material(chess: Chess, color: "w" | "b"): number {
  let score = 0;
  for (const row of chess.board()) {
    for (const sq of row) {
      if (!sq) continue;
      score += (sq.color === color ? 1 : -1) * PIECE_VALUE[sq.type];
    }
  }
  return score;
}

/** Score a move for the side to move: material after opponent's best material reply. */
function scoreMove(fen: string, moveSan: string): number {
  const mover = new Chess(fen);
  const us = mover.turn();
  mover.move(moveSan);
  if (mover.isCheckmate()) return 100000;
  if (mover.isDraw() || mover.isStalemate()) return 0;

  const replies = mover.moves();
  let worst = Infinity;
  for (const reply of replies) {
    const r = new Chess(mover.fen());
    r.move(reply);
    let s: number;
    if (r.isCheckmate()) s = -100000;
    else s = material(r, us);
    if (s < worst) worst = s;
  }
  return worst === Infinity ? material(mover, us) : worst;
}

function pieceCount(chess: Chess): number {
  let n = 0;
  for (const row of chess.board()) for (const sq of row) if (sq) n++;
  return n;
}

function sanToUci(fen: string, san: string): string {
  const c = new Chess(fen);
  const m = c.move(san);
  return m.from + m.to + (m.promotion ?? "");
}

function handFor(pieceType: string): Card[] {
  // One card guaranteed to move the solution piece, two random fillers.
  const ranks = PIECE_TO_RANKS[pieceType] ?? PAWN_RANKS;
  const keyCard: Card = { rank: pick(ranks), suit: pick(SUITS) };
  const fillers: Card[] = [
    { rank: pick(ALL_RANKS), suit: pick(SUITS) },
    { rank: pick(ALL_RANKS), suit: pick(SUITS) },
  ];
  const hand = [keyCard, ...fillers];
  // Shuffle so the key card isn't always first.
  for (let i = hand.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [hand[i], hand[j]] = [hand[j], hand[i]];
  }
  return hand;
}

const PIECE_NAME: Record<string, string> = {
  p: "pawn", n: "knight", b: "bishop", r: "rook", q: "queen", k: "king",
};
const CARD_LABEL: Record<string, string> = {
  p: "a pawn card (3-9)", n: "a Jack", b: "a 2", r: "a 10", q: "a Queen", k: "a King",
};

interface SeedPuzzle {
  fen: string;
  solution: string;
  hint: string;
  difficulty: string;
  category: string;
  rating: number;
  cards: string;
}

function classify(
  fen: string,
  san: string,
  gap: number,
  mate: boolean,
  pieces: number,
  index: number,
): Omit<SeedPuzzle, "fen" | "solution" | "cards"> {
  const c = new Chess(fen);
  const move = c.move(san);
  const pieceName = PIECE_NAME[move.piece];
  const cardLabel = CARD_LABEL[move.piece];
  const isCapture = !!move.captured;

  let category: string;
  if (pieces <= 10) category = "endgame";
  else if (index % 5 === 3 && !mate) category = "weakness";
  else if (index % 4 === 2 && move.piece !== "p" && !mate) category = "card_management";
  else category = "tactics";

  let difficulty: string;
  let rating: number;
  if (mate) {
    difficulty = pieces > 20 ? "intermediate" : "beginner";
    rating = pieces > 20 ? 1000 : 600;
  } else if (gap >= 800) {
    difficulty = "beginner";
    rating = 500 + Math.round(rand() * 200);
  } else if (gap >= 500) {
    difficulty = "intermediate";
    rating = 900 + Math.round(rand() * 300);
  } else if (gap >= 350) {
    difficulty = "advanced";
    rating = 1400 + Math.round(rand() * 300);
  } else {
    difficulty = "master";
    rating = 1800 + Math.round(rand() * 400);
  }

  let hint: string;
  if (mate) {
    hint = `Play ${cardLabel} to deliver checkmate with your ${pieceName}.`;
  } else if (category === "card_management") {
    hint = `Card economy: ${cardLabel} is the right spend here — your ${pieceName} has the strongest move.`;
  } else if (category === "weakness") {
    hint = `Don't miss it: there is a ${isCapture ? "winning capture" : "strong move"} for your ${pieceName} (${cardLabel}).`;
  } else if (isCapture) {
    hint = `Your ${pieceName} can win material. You'll need ${cardLabel}.`;
  } else {
    hint = `Look for the strongest ${pieceName} move. You'll need ${cardLabel}.`;
  }

  return { hint, difficulty, category, rating };
}

const FILES = "abcdefgh";
function sq(file: number, rank: number): string {
  return FILES[file] + (rank + 1);
}

/** Construct random legal low-piece endgame positions (white to move). */
function randomEndgameFen(): string | null {
  const used = new Set<string>();
  const place = (): string | null => {
    for (let tries = 0; tries < 20; tries++) {
      const s = sq(Math.floor(rand() * 8), Math.floor(rand() * 8));
      if (!used.has(s)) {
        used.add(s);
        return s;
      }
    }
    return null;
  };

  const wk = place();
  let bk: string | null = null;
  for (let tries = 0; tries < 30; tries++) {
    const cand = sq(Math.floor(rand() * 8), Math.floor(rand() * 8));
    if (used.has(cand) || !wk) continue;
    const df = Math.abs(FILES.indexOf(cand[0]) - FILES.indexOf(wk[0]));
    const dr = Math.abs(Number(cand[1]) - Number(wk[1]));
    if (Math.max(df, dr) >= 2) {
      bk = cand;
      used.add(cand);
      break;
    }
  }
  if (!wk || !bk) return null;

  const chess = new Chess();
  chess.clear();
  chess.put({ type: "k", color: "w" }, wk as any);
  chess.put({ type: "k", color: "b" }, bk as any);

  const whiteExtras = ["q", "r", "p", "n", "b"];
  const nWhite = 1 + Math.floor(rand() * 2);
  for (let i = 0; i < nWhite; i++) {
    const s = place();
    if (!s) break;
    const type = pick(whiteExtras);
    if (type === "p" && (s[1] === "1" || s[1] === "8")) continue;
    chess.put({ type: type as any, color: "w" }, s as any);
  }
  const nBlack = Math.floor(rand() * 2);
  for (let i = 0; i < nBlack; i++) {
    const s = place();
    if (!s) break;
    if (s[1] === "1" || s[1] === "8") continue;
    chess.put({ type: "p", color: "b" }, s as any);
  }

  const fen = chess.fen().replace(/ b /, " w "); // ensure white to move
  try {
    const test = new Chess(fen);
    if (test.isGameOver() || test.isCheck()) return null;
    // Black must not be in check while white is to move.
    const flipped = new Chess(fen.replace(" w ", " b "));
    if (flipped.isCheck()) return null;
    return fen;
  } catch {
    return null;
  }
}

function generate(): SeedPuzzle[] {
  const puzzles: SeedPuzzle[] = [];
  const seenFens = new Set<string>();
  let games = 0;

  // Phase 1: constructed endgames (~100).
  const ENDGAME_TARGET = 100;
  let endgameTries = 0;
  while (puzzles.filter((p) => p.category === "endgame").length < ENDGAME_TARGET && endgameTries < 30000) {
    endgameTries++;
    const fen = randomEndgameFen();
    if (!fen) continue;
    const fenKey = fen.split(" ").slice(0, 2).join(" ");
    if (seenFens.has(fenKey)) continue;

    const chess = new Chess(fen);
    const legal = chess.moves();
    if (legal.length < 3) continue;

    const scored = legal
      .map((san) => ({ san, score: scoreMove(fen, san) }))
      .sort((a, b) => b.score - a.score);
    const best = scored[0];
    const second = scored[1];
    const mate = best.score >= 100000;
    const gap = best.score - second.score;
    if (!mate && gap < GAP_MIN) continue;

    const meta = classify(fen, best.san, gap, mate, pieceCount(chess), puzzles.length);
    meta.category = "endgame";
    const c = new Chess(fen);
    const m = c.move(best.san);
    seenFens.add(fenKey);
    puzzles.push({
      fen,
      solution: sanToUci(fen, best.san),
      cards: JSON.stringify(handFor(m.piece)),
      ...meta,
    });
  }

  // Phase 2: playout positions for the rest.
  while (puzzles.length < TARGET && games < 20000) {
    games++;
    const chess = new Chess();
    const maxPlies = 16 + Math.floor(rand() * 90);

    for (let ply = 0; ply < maxPlies; ply++) {
      const moves = chess.moves();
      if (moves.length === 0) break;
      // Bias playouts toward captures/checks so positions stay sharp.
      const captures = moves.filter((m) => m.includes("x"));
      const move = captures.length > 0 && rand() < 0.45 ? pick(captures) : pick(moves);
      chess.move(move);
      if (chess.isGameOver()) break;

      if (ply < 8 || rand() > 0.22) continue;

      const fen = chess.fen();
      const fenKey = fen.split(" ").slice(0, 2).join(" ");
      if (seenFens.has(fenKey)) continue;

      const legal = chess.moves();
      if (legal.length < 3) continue;

      const scored = legal
        .map((san) => ({ san, score: scoreMove(fen, san) }))
        .sort((a, b) => b.score - a.score);

      const best = scored[0];
      const second = scored[1];
      const mate = best.score >= 100000;
      const gap = best.score - second.score;
      if (!mate && gap < GAP_MIN) continue;

      const pieces = pieceCount(chess);
      const meta = classify(fen, best.san, gap, mate, pieces, puzzles.length);
      const c = new Chess(fen);
      const m = c.move(best.san);

      seenFens.add(fenKey);
      puzzles.push({
        fen,
        solution: sanToUci(fen, best.san),
        cards: JSON.stringify(handFor(m.piece)),
        ...meta,
      });
      if (puzzles.length >= TARGET) break;
      break; // one puzzle per game keeps positions diverse
    }
  }

  return puzzles;
}

const puzzles = generate();
const byCategory: Record<string, number> = {};
const byDifficulty: Record<string, number> = {};
for (const p of puzzles) {
  byCategory[p.category] = (byCategory[p.category] ?? 0) + 1;
  byDifficulty[p.difficulty] = (byDifficulty[p.difficulty] ?? 0) + 1;
}
const outPath = join(__dirname, "..", "src", "puzzle-seed-data.json");
writeFileSync(outPath, JSON.stringify(puzzles, null, 1));
console.log(`Wrote ${puzzles.length} puzzles to ${outPath}`);
console.log("By category:", byCategory);
console.log("By difficulty:", byDifficulty);
