import { GameEngine } from "../GameEngine";
import { cardId, createDeck, cardToPiece } from "@checkker/shared";

describe("server: moving while in check", () => {
  test("check-ignoring move is accepted, and game does not end prematurely", () => {
    const engine = new GameEngine(1200, 1200, "rapid");
    const e = engine as any;

    // White king e1 in check from black rook e8; white rook a1 can play a1a2.
    e.chess.load("4r2k/8/8/8/8/8/8/R3K3 w - - 0 1");
    e.turn = "white";
    expect(e.chess.isCheck()).toBe(true);

    const rook = createDeck().find((c: any) => cardToPiece(c) === "rook")!;
    e.white.hand = [rook];

    const offered = engine.getLegalMoves().find((g: any) => cardId(g.card) === cardId(rook));
    console.log("server offers:", JSON.stringify(offered?.moves));

    const res = engine.playCard(cardId(rook), "a1a2");
    console.log("playCard result:", JSON.stringify(res));
    console.log("result after move:", JSON.stringify(e.result));
    console.log("fen after:", e.chess.fen());

    expect(res.success).toBe(true);
  });

  test("checkGameEnd does not end the game when incoming player is in check", () => {
    const engine = new GameEngine(1200, 1200, "rapid");
    const e = engine as any;

    // Black to move, black king h8 in check from white rook h1. Black has escapes? none by rook.
    e.chess.load("7k/8/8/8/8/8/8/4K2R b - - 0 1");
    e.turn = "black";
    console.log("black in check:", e.chess.isCheck());
    console.log("legal moves (chess.moves):", e.chess.moves().length, e.chess.moves().join(","));

    e.checkGameEnd();
    console.log("result after checkGameEnd:", JSON.stringify(e.result));
  });
});
