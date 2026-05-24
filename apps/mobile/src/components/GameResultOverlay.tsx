import { View, Text, TouchableOpacity, Modal, StyleSheet } from "react-native";
import { colors, radius, spacing } from "../theme/tokens";
import type { GameResult, Color, PokerResult } from "@gambit/shared";

interface GameResultOverlayProps {
  visible: boolean;
  result: GameResult | null;
  playerColor: Color;
  opponentScore?: number;
  playerScore?: number;
  onRematch?: () => void;
  onHome: () => void;
}

function resultLabel(r: GameResult): string {
  switch (r.type) {
    case "checkmate": return "Checkmate";
    case "draw": return "Draw";
    case "resignation": return "Resignation";
    case "timeout": return "Time Out";
    case "deckExhausted": return "Deck Exhausted";
  }
}

function resultReason(r: GameResult): string {
  switch (r.type) {
    case "checkmate": return r.winner === "white" ? "White delivers checkmate" : "Black delivers checkmate";
    case "draw": return `Draw by ${r.reason}`;
    case "resignation": return r.winner === "white" ? "Black resigned" : "White resigned";
    case "timeout": return r.winner === "white" ? "Black ran out of time" : "White ran out of time";
    case "deckExhausted": return "Both decks exhausted";
  }
}

export default function GameResultOverlay({
  visible, result, playerColor, opponentScore, playerScore, onRematch, onHome,
}: GameResultOverlayProps) {
  if (!result) return null;

  const winner = "winner" in result ? result.winner : null;
  const isDraw = result.type === "draw" || result.type === "deckExhausted";
  const playerWon = winner === playerColor;

  const headerText = isDraw ? "Draw" : playerWon ? "You Win!" : "You Lose";
  const headerColor: string = isDraw ? colors.accent.blue : playerWon ? colors.accent.gold : colors.text.muted;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.scrim}>
        <View style={styles.card}>
          <Text style={[styles.header, { color: headerColor }]}>{headerText}</Text>

          <View style={styles.scoreRow}>
            <View style={styles.scoreBox}>
              <Text style={styles.scoreLabel}>You</Text>
              <Text style={styles.scoreVal}>{playerScore ?? "-"}</Text>
            </View>
            <Text style={styles.vs}>vs</Text>
            <View style={styles.scoreBox}>
              <Text style={styles.scoreLabel}>Opponent</Text>
              <Text style={styles.scoreVal}>{opponentScore ?? "-"}</Text>
            </View>
          </View>

          <View style={styles.detailBox}>
            <Text style={styles.reason}>{resultReason(result)}</Text>
            <Text style={styles.type}>({resultLabel(result)})</Text>
          </View>

          <View style={styles.actions}>
            {onRematch && (
              <TouchableOpacity style={styles.primaryBtn} onPress={onRematch}>
                <Text style={styles.primaryText}>Rematch</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.secondaryBtn} onPress={onHome}>
              <Text style={styles.secondaryText}>Return Home</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: colors.overlay, justifyContent: "center", alignItems: "center" },
  card: {
    backgroundColor: colors.bg.primary,
    borderRadius: radius.lg,
    padding: spacing.xl,
    width: 320,
    alignItems: "center",
    gap: spacing.md,
    shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 24, elevation: 12,
  },
  header: { fontSize: 28, fontWeight: "700" },
  scoreRow: { flexDirection: "row", alignItems: "center", gap: spacing.lg },
  scoreBox: { alignItems: "center" },
  scoreLabel: { fontSize: 12, color: colors.text.muted },
  scoreVal: { fontSize: 36, fontWeight: "700", color: colors.text.primary },
  vs: { fontSize: 16, color: colors.text.muted },
  detailBox: { alignItems: "center", gap: spacing.xxs },
  reason: { fontSize: 14, color: colors.text.secondary, textAlign: "center" },
  type: { fontSize: 12, color: colors.text.muted },
  actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  primaryBtn: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.md, backgroundColor: colors.accent.primary },
  primaryText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  secondaryBtn: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.md, backgroundColor: colors.bg.secondary },
  secondaryText: { color: colors.text.primary, fontSize: 14, fontWeight: "600" },
});
