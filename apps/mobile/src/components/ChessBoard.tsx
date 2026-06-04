import React, { useState, useMemo, useRef, useEffect } from "react";
import { View, Text, StyleSheet, LayoutChangeEvent } from "react-native";
import ChessSquare from "./ChessSquare";
import { colors, radius } from "../theme/tokens";

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

  const pieces = useMemo(() => parseFen(fen), [fen]);
  const highlightSet = useMemo(() => new Set(highlightedSquares), [highlightedSquares]);
  const lastMoveSet = useMemo(() => {
    const s = new Set<string>();
    if (lastMove) { s.add(lastMove.from); s.add(lastMove.to); }
    return s;
  }, [lastMove]);

  // Track previous FEN to detect piece movement
  const prevPiecesRef = useRef<string[][] | null>(null);
  const animatingSquare = useRef<{
    sq: string;
    dx: number;
    dy: number;
  } | null>(null);

  useEffect(() => {
    const prev = prevPiecesRef.current;
    if (prev) {
      // Find the piece that moved: find a square that lost a piece and one that gained
      let fromSq: string | null = null;
      let toSq: string | null = null;
      let movedPiece: string | null = null;

      for (let r = 0; r < 8; r++) {
        for (let f = 0; f < 8; f++) {
          const oldP = prev[r]?.[f] ?? "";
          const newP = pieces[r]?.[f] ?? "";
          if (oldP && !newP) {
            // Piece left this square
            if (!fromSq) {
              fromSq = `${FILES[f]}${8 - r}`;
              movedPiece = oldP;
            }
          }
          if (newP && oldP !== newP) {
            // Piece appeared here (or different piece)
            if (!toSq && newP === movedPiece) {
              toSq = `${FILES[f]}${8 - r}`;
            }
          }
        }
      }

      // Second pass: if movedPiece was set but toSq wasn't found (e.g. capture),
      // look for any square that gained movedPiece
      if (fromSq && movedPiece && !toSq) {
        for (let r = 0; r < 8; r++) {
          for (let f = 0; f < 8; f++) {
            const oldP = prev[r]?.[f] ?? "";
            const newP = pieces[r]?.[f] ?? "";
            const sq = `${FILES[f]}${8 - r}`;
            if (newP === movedPiece && oldP !== newP && sq !== fromSq) {
              toSq = sq;
              break;
            }
          }
          if (toSq) break;
        }
      }

      if (fromSq && toSq) {
        const from = sqToIdx(fromSq);
        const to = sqToIdx(toSq);
        // Calculate pixel offset (from → to means we animate FROM the old position)
        const fileDiff = from.file - to.file;
        const rankDiff = from.rank - to.rank;
        // Adjust for orientation
        const signF = orientation === "white" ? 1 : -1;
        const signR = orientation === "white" ? 1 : -1;
        animatingSquare.current = {
          sq: toSq,
          dx: fileDiff * squareSize * signF,
          dy: rankDiff * squareSize * signR,
        };
      } else {
        animatingSquare.current = null;
      }
    }
    prevPiecesRef.current = pieces;
  }, [pieces, squareSize, orientation]);

  const onLayout = (e: LayoutChangeEvent) => {
    setBoardWidth(e.nativeEvent.layout.width);
  };

  const visibleRanks = orientation === "white" ? RANKS : [...RANKS].reverse();
  const visibleFiles = orientation === "white" ? FILES : [...FILES].reverse();

  return (
    <View style={styles.container} onLayout={onLayout}>
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

                const anim = animatingSquare.current;
                const animFrom = anim && anim.sq === sq
                  ? { dx: anim.dx, dy: anim.dy }
                  : null;

                return (
                  <ChessSquare
                    key={sq}
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
                  />
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
