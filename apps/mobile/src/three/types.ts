import type * as THREE from "three";

export type PieceType = "k" | "q" | "r" | "b" | "n" | "p";
export type PieceColor = "white" | "black";

export interface PieceUserData {
  square: string;
  color: PieceColor;
  type: PieceType;
}

export interface PieceMesh extends THREE.Group {
  userData: PieceUserData;
}

export interface SquareCoords {
  x: number;
  z: number;
}

export interface SceneConfig {
  boardSize: number; // 8
  squareSize: number; // size of each square in world units
  lightColor: number;
  darkColor: number;
  whitePieceColor: number;
  blackPieceColor: number;
}

export const DEFAULT_CONFIG: SceneConfig = {
  boardSize: 8,
  squareSize: 1.0,
  lightColor: 0xf0d9b5,
  darkColor: 0xb58863,
  whitePieceColor: 0xf5f5f0,
  blackPieceColor: 0x2a2a3a,
};

/** Convert algebraic square (e.g. "e4") to 3D world coordinates */
export function squareTo3D(
  square: string,
  config: SceneConfig = DEFAULT_CONFIG
): SquareCoords {
  const file = square.charCodeAt(0) - 97; // a=0 .. h=7
  const rank = parseInt(square[1]) - 1; // 1=0 .. 8=7
  const half = (config.boardSize * config.squareSize) / 2;
  return {
    x: file * config.squareSize - half + config.squareSize / 2,
    z: -(rank * config.squareSize - half + config.squareSize / 2),
  };
}

/** Convert file/rank indices (0-7) to algebraic notation */
export function indicesToSquare(file: number, rank: number): string {
  return String.fromCharCode(97 + file) + (rank + 1);
}

/** Parse FEN position string to array of {square, type, color} */
export function parseFenPieces(
  fen: string
): { square: string; type: PieceType; color: PieceColor }[] {
  const position = fen.split(" ")[0];
  const rows = position.split("/");
  const pieces: { square: string; type: PieceType; color: PieceColor }[] = [];

  for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
    let fileIdx = 0;
    for (const ch of rows[rowIdx]) {
      if (ch >= "1" && ch <= "8") {
        fileIdx += parseInt(ch);
      } else {
        const rank = 8 - rowIdx;
        const file = fileIdx;
        const square = indicesToSquare(file, rank);
        const color: PieceColor = ch === ch.toUpperCase() ? "white" : "black";
        const type = ch.toLowerCase() as PieceType;
        pieces.push({ square, type, color });
        fileIdx++;
      }
    }
  }
  return pieces;
}
