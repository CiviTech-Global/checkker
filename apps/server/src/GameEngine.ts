import { Chess } from "chess.js";
import { v4 as uuid } from "uuid";
import {
  type Card,
  type Color,
  type GameState,
  type MoveRecord,
  type PlayerState,
  type TimeControl,
  type GameResult,
  type ScoredGame,
  type PokerResult,
  TIME_CONTROL_SECONDS,
  createDeck,
  cardToPiece,
  cardId,
  scoreGame,
} from "@checkker/shared";
import { getLegalMovesForHand, getCaptureBonus, pseudoLegalMoves, applyPseudoLegalMove, hasAnyPlayableCard} from "@checkker/chess";
import { evaluateScorePile } from "@checkker/poker";
import { getTopMoves, type MoveEvaluation } from "./bot/evaluators";
import type { Move } from "chess.js";


export type PublicGameState = {
  id: string;
  fen: string;
  turn: Color;
  color: Color;
  hand: Card[];
  scorePile: Card[];
  timeRemainingMs: number;
  opponent: {
    hand: (Card | null)[];
    scorePile: Card[];
    timeRemainingMs: number;
  };
  drawPileCount: number;
  moveHistory: MoveRecord[];
  result: GameResult | null;
  timeControl: TimeControl;
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export class GameEngine {
  readonly id: string;
  private chess: Chess;
  private drawPile: Card[];
  private deadPile: Card[];
  private white: PlayerState;
  private black: PlayerState;
  private turn: Color;
  private timeControl: TimeControl;
  private moveHistory: MoveRecord[];
  private result: GameResult | null;
  private deckReshuffled: boolean;
  private lastMoveTimestamp: number;
  private timeoutInterval: ReturnType<typeof setInterval> | null;
  private onTimeoutCallback: (() => void) | null;
  private onTickCallback: (() => void) | null;
  private stateHistory: Array<{
    chess: string;
    turn: Color;
    whiteHand: Card[];
    blackHand: Card[];
    whiteScorePile: Card[];
    blackScorePile: Card[];
    drawPile: Card[];
    deadPile: Card[];
    moveHistory: MoveRecord[];
  }> = [];

  constructor(whiteRating: number, blackRating: number, tc: TimeControl, deck?: Card[]) {
    this.id = uuid();
    this.chess = new Chess();
    this.timeControl = tc;
    this.turn = "white";
    this.moveHistory = [];
    this.result = null;
    this.deckReshuffled = false;

    const actualDeck = deck ? [...deck] : shuffle(createDeck());

    this.white = {
      color: "white",
      hand: [],
      scorePile: [],
      timeRemainingMs: TIME_CONTROL_SECONDS[tc] * 1000,
      rating: whiteRating,
    };

    this.black = {
      color: "black",
      hand: [],
      scorePile: [],
      timeRemainingMs: TIME_CONTROL_SECONDS[tc] * 1000,
      rating: blackRating,
    };

    this.drawPile = actualDeck;
    this.deadPile = [];
    this.lastMoveTimestamp = Date.now();
    this.timeoutInterval = null;
    this.onTimeoutCallback = null;
    this.onTickCallback = null;

    this.drawToFull("white");
    this.drawToFull("black");
    this.ensurePlayableOpeningHand("white");
    this.ensurePlayableOpeningHand("black");
  }

  private get currentPlayer(): PlayerState {
    return this.turn === "white" ? this.white : this.black;
  }

  private get opponent(): PlayerState {
    return this.turn === "white" ? this.black : this.white;
  }

  private drawToFull(color: Color): Card[] {
    const player = color === "white" ? this.white : this.black;
    const drawn: Card[] = [];
    while (player.hand.length < 3 && this.drawPile.length > 0) {
      const card = this.drawPile.pop()!;
      player.hand.push(card);
      drawn.push(card);
    }
    if (player.hand.length < 3 && this.drawPile.length === 0) {
      this.reshuffleDead();
      while (player.hand.length < 3 && this.drawPile.length > 0) {
        const card = this.drawPile.pop()!;
        player.hand.push(card);
        drawn.push(card);
      }
    }
    return drawn;
  }

  /**
   * Redeals an opening hand that has no legal move at all. Only pawns and
   * knights can move from the starting position, so ~2.5% of three-card hands
   * are dead on arrival — without this the holder loses instantly via
   * checkGameEnd. Opening deal only; a dead hand later in the game is a loss.
   *
   * Rejected cards go under the draw pile rather than the dead pile, so the
   * deck composition is unchanged and reshuffleDead stays untouched.
   */
  private ensurePlayableOpeningHand(color: Color): void {
    const player = color === "white" ? this.white : this.black;
    let guard = 0;
    while (
      guard++ < 20 &&
      this.drawPile.length > 0 &&
      !hasAnyPlayableCard(this.chess, player.hand)
    ) {
      this.drawPile.unshift(...player.hand.splice(0, player.hand.length));
      this.drawToFull(color);
    }
  }

  private reshuffleDead(): void {
    if (this.deckReshuffled) {
      this.result = { type: "deckExhausted" };
      return;
    }
    this.drawPile = shuffle(this.deadPile);
    this.deadPile = [];
    this.deckReshuffled = true;
  }

  getState(): GameState {
    return {
      id: this.id,
      fen: this.chess.fen(),
      turn: this.turn,
      white: this.white,
      black: this.black,
      drawPile: this.drawPile,
      deadPile: this.deadPile,
      moveHistory: this.moveHistory,
      result: this.result,
      timeControl: this.timeControl,
    };
  }

  getPublicState(color: Color): PublicGameState {
    const state = this.getState();
    const player = state[color];
    const opp = state[color === "white" ? "black" : "white"];

    // Compute authoritative live remaining time for snapshots (e.g., reconnect,
    // initial state) without mutating engine state. The periodic tick keeps the
    // canonical timeRemainingMs up to date between snapshots.
    const elapsed = !this.result ? Date.now() - this.lastMoveTimestamp : 0;
    const activeIsPlayer = state.turn === color;
    const playerTime = activeIsPlayer
      ? Math.max(0, player.timeRemainingMs - elapsed)
      : player.timeRemainingMs;
    const opponentTime = !activeIsPlayer
      ? Math.max(0, opp.timeRemainingMs - elapsed)
      : opp.timeRemainingMs;

    return {
      id: state.id,
      fen: state.fen,
      turn: state.turn,
      color,
      hand: player.hand,
      scorePile: player.scorePile,
      timeRemainingMs: playerTime,
      opponent: {
        hand: opp.hand.map(() => null),
        scorePile: opp.scorePile,
        timeRemainingMs: opponentTime,
      },
      drawPileCount: state.drawPile.length,
      moveHistory: state.moveHistory,
      result: state.result,
      timeControl: state.timeControl,
    };
  }

  getLegalMoves(): ReturnType<typeof getLegalMovesForHand> {
    const player = this.currentPlayer;
    return getLegalMovesForHand(this.chess, player.hand);
  }

  playCard(cardIdStr: string, moveStr: string): { success: boolean; error?: string } {
    if (this.result) return { success: false, error: "Game already ended" };

    // Save snapshot for undo before making changes
    this.stateHistory.push({
      chess: this.chess.fen(),
      turn: this.turn,
      whiteHand: [...this.white.hand],
      blackHand: [...this.black.hand],
      whiteScorePile: [...this.white.scorePile],
      blackScorePile: [...this.black.scorePile],
      drawPile: [...this.drawPile],
      deadPile: [...this.deadPile],
      moveHistory: [...this.moveHistory],
    });

    const player = this.currentPlayer;
    const cardIdx = player.hand.findIndex((c) => cardId(c) === cardIdStr);
    if (cardIdx === -1) return { success: false, error: "Card not in hand" };

    const card = player.hand[cardIdx];
    const piece = cardToPiece(card);

    if (piece !== "wild") {
      const legal = getLegalMovesForHand(this.chess, [card])[0].moves;
      if (!legal.includes(moveStr)) {
        return { success: false, error: "Illegal move for this card" };
      }
    }

    // let moveResult;
    // try {
    //   moveResult = this.chess.move(moveStr);
    // } catch {
    //   return { success: false, error: "Invalid chess move" };
    // }

    let moveResult: Move;
    const candidate = pseudoLegalMoves(this.chess).find((m) => m.lan === moveStr);

    if (!candidate) {
      return { success: false, error: "Invalid chess move" };
    }
    applyPseudoLegalMove(this.chess, candidate);
    moveResult = candidate;

    player.hand.splice(cardIdx, 1);

    const wasCapture = moveResult.captured !== undefined;

    if (moveResult.captured === "k") {
      if (piece !== "wild") {
        player.scorePile.push(card);
      } else {
        this.deadPile.push(card);
      }
      this.moveHistory.push({
        move: moveStr,
        card,
        color: this.turn,
        captured: { type: "k", color: this.turn === "white" ? "black" : "white" },
        bonusCards: 0,
        check: false,
        mate: true,
      });
      this.result = { type: "checkmate", winner: this.turn };
      return { success: true };
    }

    const isCheckMove = this.chess.isCheck();
    const isMate = this.chess.isCheckmate();
    let bonusCards = 0;

    if (wasCapture && piece !== "wild") {
      player.scorePile.push(card);
      bonusCards = getCaptureBonus(moveResult.captured!, isCheckMove);
      if (bonusCards > 1) {
        const drawn = this.drawCards(player, bonusCards - 1);
        bonusCards = drawn.length + 1;
      }
    } else {
      this.deadPile.push(card);
    }

    this.moveHistory.push({
      move: moveStr,
      card,
      color: this.turn,
      captured: wasCapture
        ? { type: moveResult.captured!, color: this.turn === "white" ? "black" : "white" }
        : undefined,
      bonusCards,
      check: isCheckMove && !isMate,
      mate: isMate,
    });

    const now = Date.now();
    const elapsed = now - this.lastMoveTimestamp;
    player.timeRemainingMs -= elapsed;
    this.lastMoveTimestamp = now;

    if (player.timeRemainingMs <= 0) {
      player.timeRemainingMs = 0;
      this.timeOut(this.turn);
      return { success: true };
    }

    this.turn = this.turn === "white" ? "black" : "white";
    this.drawToFull(this.turn);

    this.checkGameEnd();

    return { success: true };
  }

  private drawCards(player: PlayerState, count: number): Card[] {
    const drawn: Card[] = [];
    for (let i = 0; i < count; i++) {
      if (this.drawPile.length === 0) this.reshuffleDead();
      if (this.result) break;
      if (this.drawPile.length > 0) {
        const card = this.drawPile.pop()!;
        player.hand.push(card);
        drawn.push(card);
      }
    }
    return drawn;
  }

  private checkGameEnd(): void {
    const boardHasMoves = pseudoLegalMoves(this.chess).length > 0;
    const handHasPlayableCard = hasAnyPlayableCard(this.chess, this.currentPlayer.hand);


    if (!boardHasMoves || !handHasPlayableCard) {
      this.result = { type: "checkmate", winner: this.turn === "white" ? "black" : "white" };
      return;
    }
    if (this.chess.isThreefoldRepetition()) {
      this.result = { type: "draw", reason: "threefold" };
      return;
    }
    if (this.chess.isInsufficientMaterial()) {
      this.result = { type: "draw", reason: "insufficientMaterial" };
      return;
    }
    if (this.chess.isDraw()) {
      this.result = { type: "draw", reason: "fiftyMove" };
      return;
    }
  }

  resign(color: Color): void {
    this.result = { type: "resignation", winner: color === "white" ? "black" : "white" };
  }

  timeOut(color: Color): void {
    this.result = { type: "timeout", winner: color === "white" ? "black" : "white" };
  }

  isOver(): boolean {
    return this.result !== null;
  }

  getResult(): GameResult | null {
    return this.result;
  }

  startTimeoutCheck(callbacks: { onTimeout: () => void; onTick?: () => void }): void {
    this.onTimeoutCallback = callbacks.onTimeout;
    this.onTickCallback = callbacks.onTick ?? null;
    this.timeoutInterval = setInterval(() => {
      if (this.result) return;

      const now = Date.now();
      const elapsed = now - this.lastMoveTimestamp;
      const player = this.currentPlayer;
      player.timeRemainingMs = Math.max(0, player.timeRemainingMs - elapsed);
      this.lastMoveTimestamp = now;

      if (player.timeRemainingMs <= 0) {
        this.timeOut(this.turn);
        this.onTimeoutCallback?.();
      } else {
        this.onTickCallback?.();
      }
    }, 1000);
  }

  dispose(): void {
    if (this.timeoutInterval) {
      clearInterval(this.timeoutInterval);
      this.timeoutInterval = null;
    }
    this.onTimeoutCallback = null;
  }

  undoLastMove(): boolean {
    if (this.stateHistory.length === 0 || this.result) return false;
    const prev = this.stateHistory.pop()!;
    this.chess.load(prev.chess);
    this.turn = prev.turn;
    this.white.hand = prev.whiteHand;
    this.black.hand = prev.blackHand;
    this.white.scorePile = prev.whiteScorePile;
    this.black.scorePile = prev.blackScorePile;
    this.drawPile = prev.drawPile;
    this.deadPile = prev.deadPile;
    this.moveHistory = prev.moveHistory;
    this.lastMoveTimestamp = Date.now();
    return true;
  }

  async getBestMoves(topN: number = 3): Promise<{ white: MoveEvaluation[]; black: MoveEvaluation[] }> {
    const fen = this.chess.fen();
    const whiteLegal = getLegalMovesForHand(this.chess, this.white.hand);
    const blackLegal = getLegalMovesForHand(this.chess, this.black.hand);
    return {
      white: await getTopMoves(fen, this.white.hand, whiteLegal, "white", topN, this.white.scorePile, this.drawPile.length),
      black: await getTopMoves(fen, this.black.hand, blackLegal, "black", topN, this.black.scorePile, this.drawPile.length),
    };
  }

  getScores(): ScoredGame | null {
    if (!this.result) return null;
    const whitePoker = evaluateScorePile(this.white.scorePile);
    const blackPoker = evaluateScorePile(this.black.scorePile);
    return scoreGame(this.result, whitePoker, blackPoker);
  }

  /** Full context for the poker-aware probable-result model. */
  getOddsInput(): {
    fen: string;
    whiteScorePile: Card[];
    blackScorePile: Card[];
    whiteHand: Card[];
    blackHand: Card[];
    drawPileCount: number;
    result: GameResult | null;
  } {
    return {
      fen: this.chess.fen(),
      whiteScorePile: this.white.scorePile,
      blackScorePile: this.black.scorePile,
      whiteHand: this.white.hand,
      blackHand: this.black.hand,
      drawPileCount: this.drawPile.length,
      result: this.result,
    };
  }

  /** Authoritative clock state for lightweight clock_tick broadcasts. */
  getClockState(): { whiteTimeRemainingMs: number; blackTimeRemainingMs: number; turn: Color } {
    const elapsed = !this.result ? Date.now() - this.lastMoveTimestamp : 0;
    const whiteActive = this.turn === "white";
    return {
      whiteTimeRemainingMs: whiteActive
        ? Math.max(0, this.white.timeRemainingMs - elapsed)
        : this.white.timeRemainingMs,
      blackTimeRemainingMs: !whiteActive
        ? Math.max(0, this.black.timeRemainingMs - elapsed)
        : this.black.timeRemainingMs,
      turn: this.turn,
    };
  }

  /** Live poker results for both sides (for the in-game score display). */
  getLiveScores(): { whitePoker: PokerResult; blackPoker: PokerResult } {
    return {
      whitePoker: evaluateScorePile(this.white.scorePile),
      blackPoker: evaluateScorePile(this.black.scorePile),
    };
  }
}
