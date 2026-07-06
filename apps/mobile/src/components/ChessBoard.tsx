import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, LayoutChangeEvent } from "react-native";
import ChessSquare from "./ChessSquare";
import { colors, radius } from "../theme/tokens";
import { useEquippedTheme } from "../utils/cosmetics";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
const RANKS = [8, 7, 6, 5, 4, 3, 2, 1];

function parseFen(fen: string): string[][] {
  const rows = fen.split(" ")[0].split("/");
  return rows.map((row) => {
    const squares: string[] = [];
    for (const ch of row) {
      if (ch >= "1" && ch <= "8") {
        squares.push(...Array(parseInt(ch)).fill(""));
      } else {
        squares.push(ch);
      }
    }
    return squares;
  });
}

function isLightSquare(file: number, rank: number): boolean {
  return (file + rank) % 2 === 0;
}

/** Convert square name to board indices {file: 0-7, rank: 0-7 from top} */
function sqToIdx(sq: string): { file: number; rank: number } {
  return {
    file: sq.charCodeAt(0) - 97, // a=0
    rank: 8 - parseInt(sq[1]),   // 8=0, 1=7
  };
}

interface ChessBoardProps {
  fen?: string;
  orientation?: "white" | "black";
  highlightedSquares?: string[];
  selectedSquare?: string | null;
  lastMove?: { from: string; to: string } | null;
  interactive?: boolean;
  onSquarePress?: (square: string) => void;
}

function ChessBoard({
  fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  orientation = "white",
  highlightedSquares = [],
  selectedSquare = null,
  lastMove = null,
  interactive = true,
  onSquarePress = () => {},
}: ChessBoardProps) {
  const [boardWidth, setBoardWidth] = useState(320);
  const coordSize = 20;
  const squareSize = Math.floor((boardWidth - coordSize) / 8);
  const equippedTheme = useEquippedTheme();

  const pieces = useMemo(() => parseFen(fen), [fen]);
  const highlightSet = useMemo(() => new Set(highlightedSquares), [highlightedSquares]);
  const lastMoveSet = useMemo(() => {
    const s = new Set<string>();
    if (lastMove) { s.add(lastMove.from); s.add(lastMove.to); }
    return s;
  }, [lastMove]);

  // ── Piece movement animation ───────────────────────────────────────────
  // Previous implementation read the animation offset from a ref that was
  // written in a useEffect *after* render, so every new position briefly
  // re-rendered with the PREVIOUS move's offset on the wrong square — the
  // "last piece jumps and repeats its move" bug. We now derive the moved
  // piece authoritatively (prefer the `lastMove` prop; fall back to a FEN
  // diff) inside an effect and publish it as state with a monotonic key, so
  // each move animates its real destination square exactly once.
  const [anim, setAnim] = useState<{ sq: string; dx: number; dy: number; key: number } | null>(null);
  const prevFenRef = useRef<string>(fen);
  const prevPiecesRef = useRef<string[][]>(pieces);
  const animSeqRef = useRef(0);

  const diffMove = useCallback(
    (prev: string[][], next: string[][]): { from: string; to: string } | null => {
      let fromSq: string | null = null;
      let movedPiece: string | null = null;
      const gained: { sq: string; piece: string }[] = [];
      for (let r = 0; r < 8; r++) {
        for (let f = 0; f < 8; f++) {
          const oldP = prev[r]?.[f] ?? "";
          const newP = next[r]?.[f] ?? "";
          if (oldP && oldP !== newP) {
            if (!fromSq) { fromSq = `${FILES[f]}${8 - r}`; movedPiece = oldP; }
          }
          if (newP && oldP !== newP) gained.push({ sq: `${FILES[f]}${8 - r}`, piece: newP });
        }
      }
      if (!fromSq) return null;
      const dest =
        gained.find((g) => g.piece === movedPiece) ?? gained.find((g) => g.sq !== fromSq);
      return dest ? { from: fromSq, to: dest.sq } : null;
    },
    [],
  );

  useEffect(() => {
    const prevFen = prevFenRef.current;
    const prevPieces = prevPiecesRef.current;
    prevFenRef.current = fen;
    prevPiecesRef.current = pieces;
    if (prevFen === fen) return; // unrelated re-render (e.g. clock tick) — keep current anim

    const move =
      lastMove && lastMove.from && lastMove.to
        ? { from: lastMove.from, to: lastMove.to }
        : diffMove(prevPieces, pieces);
    if (!move) return;

    const from = sqToIdx(move.from);
    const to = sqToIdx(move.to);
    const sign = orientation === "white" ? 1 : -1;
    animSeqRef.current += 1;
    setAnim({
      sq: move.to,
      dx: (from.file - to.file) * squareSize * sign,
      dy: (from.rank - to.rank) * squareSize * sign,
      key: animSeqRef.current,
    });
  }, [fen, pieces, lastMove, squareSize, orientation, diffMove]);

  const onLayout = (e: LayoutChangeEvent) => {
    setBoardWidth(e.nativeEvent.layout.width);
  };

  const visibleRanks = orientation === "white" ? RANKS : [...RANKS].reverse();
  const visibleFiles = orientation === "white" ? FILES : [...FILES].reverse();

  return (
    <View testID="chess-board" style={styles.container} onLayout={onLayout}>
      <View style={{ flexDirection: "row" }}>
        <View style={{ width: coordSize }}>
          {visibleRanks.map((r) => (
            <View key={r} style={{ height: squareSize, justifyContent: "center", alignItems: "center" }}>
              <Text style={styles.coord}>{r}</Text>
            </View>
          ))}
        </View>
        <View style={{ flex: 1 }}>
          {visibleRanks.map((rank, ri) => (
            <View key={rank} style={{ flexDirection: "row" }}>
              {visibleFiles.map((file, fi) => {
                const boardRi = orientation === "white" ? ri : RANKS.length - 1 - ri;
                const boardFi = orientation === "white" ? fi : FILES.length - 1 - fi;
                const piece = pieces[boardRi]?.[boardFi] ?? "";
                const sq = `${file}${rank}`;

                const isAnimSq = anim != null && anim.sq === sq;
                const animFrom = isAnimSq ? { dx: anim!.dx, dy: anim!.dy } : null;

                return (
                  <View key={sq} testID={`square-${sq}`}>
                    <ChessSquare
                      square={sq}
                    piece={piece || null}
                    isLight={isLightSquare(boardFi, boardRi)}
                    isHighlighted={highlightSet.has(sq)}
                    isSelected={selectedSquare === sq}
                    isLastMove={lastMoveSet.has(sq)}
                    isCheck={false}
                    onPress={interactive ? onSquarePress : () => {}}
                    size={squareSize}
                    animateFrom={animFrom}
                    animKey={isAnimSq ? anim!.key : 0}
                    boardColors={equippedTheme.board?.board}
                    pieceColors={equippedTheme.piece?.isDefault ? undefined : equippedTheme.piece?.piece}
                    />
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      </View>
      <View style={{ marginLeft: coordSize, flexDirection: "row" }}>
        {visibleFiles.map((f) => (
          <View key={f} style={{ width: squareSize, alignItems: "center" }}>
            <Text style={styles.coord}>{f}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default React.memo(ChessBoard);

const styles = StyleSheet.create({
  container: {
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
    borderWidth: 2,
    borderColor: colors.border.gold,
    borderRadius: radius.md,
    padding: 2,
    backgroundColor: colors.bg.secondary,
  },
  coord: { fontSize: 12, color: colors.text.secondary },
});
