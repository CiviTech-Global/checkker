import { useEffect } from "react";
import { TouchableOpacity, View, Text, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  FadeIn,
} from "react-native-reanimated";
import { colors, radius, PIECE_UNICODE, springConfig } from "../theme/tokens";

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
  animateFrom?: { dx: number; dy: number } | null;
  boardColors?: { light: string; dark: string };
  pieceColors?: { white: string; black: string };
}

export default function ChessSquare({
  square, piece, isLight, isHighlighted, isSelected, isLastMove, isCheck,
  onPress, size, animateFrom, boardColors, pieceColors,
}: ChessSquareProps) {
  const bg = isLight
    ? (boardColors?.light ?? colors.board.light)
    : (boardColors?.dark ?? colors.board.dark);

  // Piece movement animation
  const translateX = useSharedValue(animateFrom?.dx ?? 0);
  const translateY = useSharedValue(animateFrom?.dy ?? 0);

  useEffect(() => {
    if (animateFrom) {
      translateX.value = animateFrom.dx;
      translateY.value = animateFrom.dy;
      translateX.value = withSpring(0, springConfig.snappy);
      translateY.value = withSpring(0, springConfig.snappy);
    } else {
      translateX.value = 0;
      translateY.value = 0;
    }
  }, [animateFrom, translateX, translateY]);

  const pieceAnimStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  // Overlay fade
  const overlayOpacity = useSharedValue(0);
  useEffect(() => {
    overlayOpacity.value = withTiming(
      isLastMove || isSelected || isCheck ? 1 : 0,
      { duration: 150 }
    );
  }, [isLastMove, isSelected, isCheck, overlayOpacity]);

  const overlayAnimStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const pieceColor = piece && piece === piece.toUpperCase() ? "white" : "black";
  const pieceKey = piece?.toLowerCase() as keyof typeof PIECE_UNICODE;
  const unicode = piece && PIECE_UNICODE[pieceKey]?.[pieceColor as "white" | "black"];

  const overlayBg = isSelected
    ? colors.highlight.selected
    : isLastMove
    ? colors.highlight.lastMove
    : isCheck
    ? "transparent"
    : "transparent";

  return (
    <TouchableOpacity
      style={[styles.square, { width: size, height: size, backgroundColor: bg }]}
      onPress={() => onPress(square)}
      activeOpacity={0.7}
    >
      {/* Overlay for selection/lastMove/check */}
      <Animated.View
        style={[
          styles.overlay,
          { backgroundColor: overlayBg },
          isCheck && { borderWidth: 2, borderColor: colors.accent.red, borderRadius: 2 },
          overlayAnimStyle,
        ]}
      />

      {/* Piece */}
      {unicode && (
        <Animated.Text
          style={[
            styles.piece,
            { fontSize: size * 0.65 },
            pieceColors && { color: pieceColor === "white" ? pieceColors.white : pieceColors.black },
            pieceAnimStyle,
          ]}
        >
          {unicode}
        </Animated.Text>
      )}

      {/* Legal move dot */}
      {isHighlighted && !piece && (
        <Animated.View
          entering={FadeIn.duration(200)}
          style={[styles.dot, { backgroundColor: colors.highlight.legal }]}
        />
      )}

      {/* Capture indicator (highlighted + piece) */}
      {isHighlighted && piece && (
        <Animated.View
          entering={FadeIn.duration(200)}
          style={[styles.overlay, { borderWidth: 3, borderColor: colors.highlight.legal, borderRadius: size / 2 }]}
        />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  square: { justifyContent: "center", alignItems: "center", position: "relative" },
  piece: { textAlign: "center", zIndex: 2, textShadowColor: "rgba(0,0,0,0.5)", textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 },
  overlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 1 },
  dot: { width: 12, height: 12, borderRadius: 6, position: "absolute", zIndex: 3 },
});
