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
  TIME_CONTROL_SECONDS,
  createDeck,
  cardToPiece,
  cardId,
} from "@gambit/shared";
import { getLegalMovesForHand, getCaptureBonus } from "@gambit/chess";

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

  constructor(whiteRating: number, blackRating: number, tc: TimeControl) {
    this.id = uuid();
    this.chess = new Chess();
    this.timeControl = tc;
    this.turn = "white";
    this.moveHistory = [];
    this.result = null;
    this.deckReshuffled = false;

    const deck = shuffle(createDeck());

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

    this.drawPile = deck;
    this.deadPile = [];

    this.drawToFull("white");
    this.drawToFull("black");
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

  getPublicState(color: Color): object {
    const state = this.getState();
    const player = state[color];
    const opp = state[color === "white" ? "black" : "white"];
    return {
      id: state.id,
      fen: state.fen,
      turn: state.turn,
      hand: player.hand,
      scorePile: player.scorePile,
      timeRemainingMs: player.timeRemainingMs,
      opponent: {
        hand: opp.hand.map(() => null),
        scorePile: opp.scorePile,
        timeRemainingMs: opp.timeRemainingMs,
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

    let moveResult;
    try {
      moveResult = this.chess.move(moveStr);
    } catch {
      return { success: false, error: "Invalid chess move" };
    }

    player.hand.splice(cardIdx, 1);

    const wasCapture = moveResult.captured !== undefined;
    const isCheckMove = this.chess.isCheck();
    let bonusCards = 0;

    if (wasCapture && card.rank !== "A") {
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
    });

    this.checkGameEnd();

    if (!this.result) {
      this.turn = this.turn === "white" ? "black" : "white";
      this.drawToFull(this.turn);
    }

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
    if (this.chess.isCheckmate()) {
      this.result = { type: "checkmate", winner: this.turn };
      return;
    }
    if (this.chess.isDraw() || this.chess.isStalemate() ||
        this.chess.isThreefoldRepetition() || this.chess.isInsufficientMaterial()) {
      this.result = { type: "draw", reason: "stalemate" };
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
}
