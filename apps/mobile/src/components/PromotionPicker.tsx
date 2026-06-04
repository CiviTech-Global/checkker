import { View, Text, TouchableOpacity, Modal, StyleSheet } from "react-native";
import Animated, {
  FadeIn,
  ZoomIn,
  SlideInUp,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { colors, radius, spacing, glassStyle, gradients } from "../theme/tokens";
import { useSpringPress, staggerDelay } from "../utils/animations";

const PROMOTION_PIECES = [
  { piece: "q", label: "Queen", symbol: "\u265B" },
  { piece: "r", label: "Rook", symbol: "\u265C" },
  { piece: "b", label: "Bishop", symbol: "\u265D" },
  { piece: "n", label: "Knight", symbol: "\u265E" },
];

interface PromotionPickerProps {
  visible: boolean;
  onSelect: (piece: string) => void;
  onCancel: () => void;
}

function PieceButton({
  piece,
  label,
  symbol,
  index,
  onSelect,
}: {
  piece: string;
  label: string;
  symbol: string;
  index: number;
  onSelect: (piece: string) => void;
}) {
  const { onPressIn, onPressOut, animatedStyle } = useSpringPress();

  return (
    <Animated.View
      entering={ZoomIn.duration(250)
        .delay(staggerDelay(index, 60) + 200)
        .springify()
        .damping(12)}
      style={animatedStyle}
    >
      <TouchableOpacity
        onPress={() => onSelect(piece)}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={0.9}
      >
        <View style={[styles.pieceBtn, glassStyle]}>
          <Text style={styles.pieceSymbol}>{symbol}</Text>
          <Text style={styles.pieceLabel}>{label}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function PromotionPicker({
  visible,
  onSelect,
  onCancel,
}: PromotionPickerProps) {
  return (
    <Modal visible={visible} transparent animationType="none">
      <Animated.View entering={FadeIn.duration(200)} style={styles.scrim}>
        <Animated.View
          entering={SlideInUp.duration(350).springify().damping(14)}
        >
          <View style={[styles.card, glassStyle]}>
            <LinearGradient
              colors={gradients.glass }
              style={styles.cardGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            <Animated.Text
              entering={FadeIn.duration(250).delay(100)}
              style={styles.title}
            >
              Promote Pawn
            </Animated.Text>
            <View style={styles.row}>
              {PROMOTION_PIECES.map(({ piece, label, symbol }, i) => (
                <PieceButton
                  key={piece}
                  piece={piece}
                  label={label}
                  symbol={symbol}
                  index={i}
                  onSelect={onSelect}
                />
              ))}
            </View>
            <Animated.View entering={FadeIn.duration(250).delay(500)}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    backgroundColor: colors.bg.primary,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.md,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: colors.border.gold,
  },
  cardGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text.primary,
    zIndex: 1,
  },
  row: { flexDirection: "row", gap: spacing.sm, zIndex: 1 },
  pieceBtn: {
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: "center",
    minWidth: 64,
    borderWidth: 1,
    borderColor: colors.border.gold,
  },
  pieceSymbol: { fontSize: 36, color: colors.text.primary, zIndex: 1 },
  pieceLabel: {
    fontSize: 11,
    color: colors.text.muted,
    marginTop: 4,
    zIndex: 1,
  },
  cancelBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    zIndex: 1,
  },
  cancelText: { color: colors.text.muted, fontSize: 14 },
});
