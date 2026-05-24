import { TouchableOpacity, View, Text, StyleSheet } from "react-native";
import { colors, radius, PIECE_UNICODE } from "../theme/tokens";

interface ChessSquareProps {
  square: string;
  piece: string | null;
  isLight: boolean;
  isHighlighted: boolean;
  isSelected: boolean;
  isLastMove: boolean;
  isCheck: boolean;
  onPress: (square: string) => void;
  size: number;
}

export default function ChessSquare({
  square, piece, isLight, isHighlighted, isSelected, isLastMove, isCheck,
  onPress, size,
}: ChessSquareProps) {
  const bg = isLight ? colors.board.light : colors.board.dark;

  const overlays: React.ReactNode[] = [];
  if (isLastMove) {
    overlays.push(<View key="lm" style={[styles.overlay, { backgroundColor: colors.highlight.lastMove }]} />);
  }
  if (isSelected) {
    overlays.push(<View key="sel" style={[styles.overlay, { backgroundColor: colors.highlight.selected }]} />);
  }
  if (isCheck) {
    overlays.push(
      <View key="chk" style={[styles.overlay, { borderWidth: 2, borderColor: colors.accent.red, borderRadius: 2 }]} />
    );
  }

  const pieceColor = piece && piece === piece.toUpperCase() ? "white" : "black";
  const pieceKey = piece?.toLowerCase() as keyof typeof PIECE_UNICODE;
  const unicode = piece && PIECE_UNICODE[pieceKey]?.[pieceColor as "white" | "black"];

  return (
    <TouchableOpacity
      style={[styles.square, { width: size, height: size, backgroundColor: bg }]}
      onPress={() => onPress(square)}
      activeOpacity={0.7}
    >
      {unicode && <Text style={[styles.piece, { fontSize: size * 0.65 }]}>{unicode}</Text>}
      {overlays}
      {isHighlighted && !piece && (
        <View style={[styles.dot, { backgroundColor: colors.highlight.legal }]} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  square: { justifyContent: "center", alignItems: "center", position: "relative" },
  piece: { textAlign: "center" },
  overlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  dot: { width: 12, height: 12, borderRadius: 6, position: "absolute" },
});
