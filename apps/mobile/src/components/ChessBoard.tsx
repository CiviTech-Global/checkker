import React, { useState, useMemo } from "react";
import { View, Text, StyleSheet, LayoutChangeEvent } from "react-native";
import ChessSquare from "./ChessSquare";
import { colors, typography } from "../theme/tokens";

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
  container: { width: "100%", maxWidth: 480, alignSelf: "center" },
  coord: { fontSize: 12, color: colors.text.muted },
});
