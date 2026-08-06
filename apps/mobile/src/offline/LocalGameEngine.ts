import { Chess } from "chess.js";
import {
  type Card,
  type Color,
  type GameResult,
  type MoveRecord,
  type ScoredGame,
  type PokerResult,
  createDeck,
  cardToPiece,
  cardId,
  scoreGame,
} from "@checkker/shared";
import { getLegalMovesForHand, getCaptureBonus, pseudoLegalMoves,
  applyPseudoLegalMove,
  hasAnyPlayableCard, } from "@checkker/chess";
import { evaluateScorePile } from "@checkker/poker";

/**
 * Client-side port of the server GameEngine (apps/server/src/GameEngine.ts)
 * for offline bot games. Untimed — offline games have no clock.
 */

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface LocalPlayerState {
  color: Color;
  hand: Card[];
  scorePile: Card[];
}

export interface LocalGameSnapshot {
  fen: string;
  turn: Color;
  hand: Card[];
  scorePile: Card[];
  opponentHandCount: number;
  opponentScorePile: Card[];
  drawPileCount: number;
  moveHistory: MoveRecord[];
  result: GameResult | null;
  lastMove: { from: string; to: string } | null;
}

export class LocalGameEngine {
  private chess: Chess;
  private drawPile: Card[];
  private deadPile: Card[];
  private white: LocalPlayerState;
  private black: LocalPlayerState;
  private turn: Color;
  private moveHistory: MoveRecord[];
  private result: GameResult | null;
  private deckReshuffled: boolean;
  readonly playerColor: Color;

  constructor(playerColor: Color = "white") {
    this.chess = new Chess();
    this.turn = "white";
    this.moveHistory = [];
    this.result = null;
    this.deckReshuffled = false;
    this.playerColor = playerColor;

    this.white = { color: "white", hand: [], scorePile: [] };
    this.black = { color: "black", hand: [], scorePile: [] };
    this.drawPile = shuffle(createDeck());
    this.deadPile = [];

    this.drawToFull("white");
    this.drawToFull("black");
    this.ensurePlayableHand();
  }

  /**
   * If the side to move has no legal moves with their hand (no matching
   * cards and no wild Ace), discard the hand and redraw until they can
   * move or the deck runs out.
   */
  private ensurePlayableHand(): void {
    const player = this.currentPlayer;
    let guard = 0;
    while (
      !this.result &&
      guard++ < 20 &&
      !getLegalMovesForHand(this.chess, player.hand).some((g) => g.moves.length > 0)
    ) {
      this.deadPile.push(...player.hand.splice(0, player.hand.length));
      this.drawToFull(this.turn);
      if (player.hand.length === 0) {
        this.result = { type: "deckExhausted" };
      }
    }
  }

  private get currentPlayer(): LocalPlayerState {
    return this.turn === "white" ? this.white : this.black;
  }

  private drawToFull(color: Color): void {
    const player = color === "white" ? this.white : this.black;
    while (player.hand.length < 3 && this.drawPile.length > 0) {
      player.hand.push(this.drawPile.pop()!);
    }
    if (player.hand.length < 3 && this.drawPile.length === 0) {
      this.reshuffleDead();
      while (player.hand.length < 3 && this.drawPile.length > 0) {
        player.hand.push(this.drawPile.pop()!);
      }
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

  getSnapshot(): LocalGameSnapshot {
    const me = this.playerColor === "white" ? this.white : this.black;
    const opp = this.playerColor === "white" ? this.black : this.white;
    const last = this.moveHistory[this.moveHistory.length - 1];
    return {
      fen: this.chess.fen(),
      turn: this.turn,
      hand: [...me.hand],
      scorePile: [...me.scorePile],
      opponentHandCount: opp.hand.length,
      opponentScorePile: [...opp.scorePile],
      drawPileCount: this.drawPile.length,
      moveHistory: [...this.moveHistory],
      result: this.result,
      lastMove: last
        ? { from: last.move.slice(0, 2), to: last.move.slice(2, 4) }
        : null,
    };
  }

  getTurn(): Color {
    return this.turn;
  }

  /** Legal moves for the side to move, grouped per card in hand. */
  getLegalMoves(): Array<{ card: Card; moves: string[] }> {
    const grouped = getLegalMovesForHand(this.chess, this.currentPlayer.hand);
    return grouped.map((g, i) => ({ card: this.currentPlayer.hand[i], moves: g.moves }));
  }

  playCard(cardIdStr: string, moveStr: string): { success: boolean; error?: string } {
    if (this.result) return { success: false, error: "Game already ended" };

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

    const candidate = pseudoLegalMoves(this.chess).find((m) => m.lan === moveStr);
    if (!candidate) {
      return { success: false, error: "Invalid chess move" };
    }
    applyPseudoLegalMove(this.chess, candidate);
    const moveResult = candidate;

    player.hand.splice(cardIdx, 1);

    const wasCapture = moveResult.captured !== undefined;

    if (moveResult.captured === "k") {
      this.result = { type: "checkmate", winner: this.turn };
      return { success: true };
    }

    const isCheckMove = this.chess.isCheck();
    let bonusCards = 0;

    if (wasCapture && piece !== "wild") {
      player.scorePile.push(card);
      bonusCards = getCaptureBonus(moveResult.captured!, isCheckMove);
      if (bonusCards > 1) {
        for (let i = 0; i < bonusCards - 1; i++) {
          if (this.drawPile.length === 0) this.reshuffleDead();
          if (this.result) break;
          if (this.drawPile.length > 0) player.hand.push(this.drawPile.pop()!);
        }
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
    });

    this.turn = this.turn === "white" ? "black" : "white";
    this.drawToFull(this.turn);
    this.checkGameEnd();

    return { success: true };
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

  isOver(): boolean {
    return this.result !== null;
  }

  getResult(): GameResult | null {
    return this.result;
  }

  getScores(): ScoredGame | null {
    if (!this.result) return null;
    const whitePoker = evaluateScorePile(this.white.scorePile);
    const blackPoker = evaluateScorePile(this.black.scorePile);
    return scoreGame(this.result, whitePoker, blackPoker);
  }

  /** Live poker results for both sides (mirrors server GameEngine.getLiveScores). */
  getLiveScores(): { whitePoker: PokerResult; blackPoker: PokerResult } {
    return {
      whitePoker: evaluateScorePile(this.white.scorePile),
      blackPoker: evaluateScorePile(this.black.scorePile),
    };
  }

  /** Internal chess instance, used by the local bot for evaluation. */
  getChess(): Chess {
    return this.chess;
  }
}
