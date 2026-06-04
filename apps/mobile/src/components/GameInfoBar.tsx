import { View, Text, StyleSheet } from "react-native";
import { colors, radius, spacing } from "../theme/tokens";

interface GameInfoBarProps {
  label: string;
  rating?: number;
  tierLabel?: string;
  side: "white" | "black";
  timeMs: number;
  active: boolean;
}

function formatTime(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function GameInfoBar({ label, rating, tierLabel, side, timeMs, active }: GameInfoBarProps) {
  const lowTime = timeMs < 30000;
  const critical = timeMs < 10000;

  return (
    <View style={[styles.bar, active && styles.active]}>
      <View style={styles.left}>
        <View style={[styles.dot, { backgroundColor: active ? colors.accent.green : colors.text.muted }]} />
        <Text style={[styles.label, { color: side === "white" ? "#fff" : colors.text.secondary }]} numberOfLines={1}>{label}</Text>
      </View>
      <View style={styles.right}>
        <Text style={[
          styles.time,
          { fontFamily: "monospace" },
          critical && styles.critical,
          lowTime && !critical && styles.lowTime,
        ]}>
          {formatTime(timeMs)}
        </Text>
        {rating != null && <Text style={styles.elo}>{rating}{tierLabel ? ` • ${tierLabel}` : ""}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  active: { backgroundColor: colors.accent.primary + "44", borderColor: colors.border.gold },
  left: { flexDirection: "row", alignItems: "center", gap: spacing.xs, flex: 1, minWidth: 0 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  label: { fontSize: 14, fontWeight: "600", flexShrink: 1 },
  right: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  time: { fontSize: 16, fontWeight: "600", color: colors.text.primary, minWidth: 50, textAlign: "right" },
  lowTime: { color: colors.accent.red },
  critical: { color: colors.accent.red, fontWeight: "bold" },
  elo: { fontSize: 12, color: colors.text.muted },
});
