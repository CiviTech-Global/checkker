import { Group } from "three";
import { PieceFactory } from "./PieceFactory";
import { PieceAnimator } from "./PieceAnimator";
import {
  parseFenPieces,
  squareTo3D,
  type PieceType,
  type PieceColor,
  type SceneConfig,
} from "./types";

export interface SyncEvent {
  type: "move" | "capture" | "add" | "remove";
  square: string;
  capturedColor?: PieceColor;
}

interface TrackedPiece {
  group: Group;
  square: string;
  type: PieceType;
  color: PieceColor;
}

export class SceneSync {
  private piecesGroup: Group;
  private factory: PieceFactory;
  private animator: PieceAnimator;
  private config: SceneConfig;
  private pieces: TrackedPiece[] = [];
  private currentFen = "";

  constructor(
    piecesGroup: Group,
    factory: PieceFactory,
    animator: PieceAnimator,
    config: SceneConfig
  ) {
    this.piecesGroup = piecesGroup;
    this.factory = factory;
    this.animator = animator;
    this.config = config;
  }

  syncToFen(fen: string): SyncEvent[] {
    if (fen === this.currentFen) return [];
    this.currentFen = fen;

    const newPieces = parseFenPieces(fen);
    const events: SyncEvent[] = [];

    // Build lookup of current pieces by square
    const currentBySquare = new Map<string, TrackedPiece>();
    for (const p of this.pieces) {
      currentBySquare.set(p.square, p);
    }

    // Build lookup of new pieces by square
    const newBySquare = new Map<
      string,
      { type: PieceType; color: PieceColor }
    >();
    for (const p of newPieces) {
      newBySquare.set(p.square, { type: p.type, color: p.color });
    }

    // Find pieces that moved: piece disappeared from one square, same type+color appeared at another
    const removed: TrackedPiece[] = [];
    const addedSquares: string[] = [];

    for (const [sq, tracked] of currentBySquare) {
      const newPiece = newBySquare.get(sq);
      if (!newPiece || newPiece.type !== tracked.type || newPiece.color !== tracked.color) {
        removed.push(tracked);
      }
    }

    for (const [sq, piece] of newBySquare) {
      const current = currentBySquare.get(sq);
      if (!current || current.type !== piece.type || current.color !== piece.color) {
        addedSquares.push(sq);
      }
    }

    // Match removed pieces to added squares (detect moves)
    const moved = new Set<TrackedPiece>();
    const usedAdds = new Set<string>();

    for (const rem of removed) {
      for (const addSq of addedSquares) {
        if (usedAdds.has(addSq)) continue;
        const addPiece = newBySquare.get(addSq)!;
        if (addPiece.type === rem.type && addPiece.color === rem.color) {
          // This is a move
          const fromSquare = rem.square;
          const toCoords = squareTo3D(addSq, this.config);

          // Check if there's a piece being captured at the destination
          const capturedPiece = currentBySquare.get(addSq);
          if (capturedPiece && capturedPiece !== rem) {
            // Capture: animate the captured piece away
            this.animator.animateCapture(capturedPiece.group);
            events.push({
              type: "capture",
              square: addSq,
              capturedColor: capturedPiece.color,
            });
          }

          // Animate the moving piece
          this.animator.animateMove(
            rem.group,
            { x: toCoords.x, z: toCoords.z },
            300
          );
          rem.square = addSq;
          moved.add(rem);
          usedAdds.add(addSq);
          events.push({ type: "move", square: addSq });
          break;
        }
      }
    }

    // Remove pieces that weren't moved (captures or en passant)
    for (const rem of removed) {
      if (moved.has(rem)) continue;
      // Check if this is a captured piece (might already have been handled)
      if (this.piecesGroup.children.includes(rem.group)) {
        this.animator.animateCapture(rem.group);
        events.push({
          type: "remove",
          square: rem.square,
          capturedColor: rem.color,
        });
      }
    }

    // Add new pieces that weren't matched to moves (promotions, etc.)
    for (const addSq of addedSquares) {
      if (usedAdds.has(addSq)) continue;
      const piece = newBySquare.get(addSq)!;
      this.addPiece(piece.type, piece.color, addSq);
      events.push({ type: "add", square: addSq });
    }

    // Rebuild tracked pieces list
    this.pieces = [];
    for (const p of newPieces) {
      // Find existing group or the newly added one
      const existing = [...moved].find((m) => m.square === p.square);
      if (existing) {
        this.pieces.push(existing);
      } else {
        // Find in scene
        const group = this.piecesGroup.children.find(
          (c) =>
            c.userData.square === p.square &&
            c.userData.type === p.type &&
            c.userData.color === p.color
        ) as Group | undefined;
        if (group) {
          this.pieces.push({
            group,
            square: p.square,
            type: p.type,
            color: p.color,
          });
        }
      }
    }

    return events;
  }

  private addPiece(type: PieceType, color: PieceColor, square: string): void {
    const group = this.factory.createPiece(type, color);
    const coords = squareTo3D(square, this.config);
    group.position.set(coords.x, 0, coords.z);
    group.userData = { square, type, color };
    this.piecesGroup.add(group);
  }

  dispose(): void {
    // Groups are cleaned when parent scene disposes
    this.pieces = [];
  }
}
