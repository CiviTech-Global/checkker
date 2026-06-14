import React from "react";
import { View, Text, StyleSheet } from "react-native";
import type { GameOdds, Color } from "@checkker/shared";
import { colors, spacing, glassStyle, radius } from "../theme/tokens";

interface OddsIndicatorProps {
  odds: GameOdds | null;
  playerColor: Color;
}

/**
 * Win-probability bar driven by the server's poker-aware model
 * (chess expectation + locked score-pile points + poker potential).
 * White and Black keep fixed sides so it reads the same for both players and
 * spectators; the viewer's own side is marked "YOU".
 */
export default function OddsIndicator({ odds, playerColor }: OddsIndicatorProps) {
  if (!odds) return null;

  const { whiteWinPct, blackWinPct, drawPct } = odds;
  const leader =
    whiteWinPct > blackWinPct ? "white" : blackWinPct > whiteWinPct ? "black" : "draw";

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>WIN PROBABILITY</Text>
        <Text style={styles.leaderText}>
          {leader === "draw"
            ? "Even"
            : `${leader === "white" ? "White" : "Black"} favored`}
        </Text>
      </View>

      <View style={styles.barRow}>
        <View style={[styles.segment, styles.first, styles.whiteSeg, { flex: whiteWinPct || 1 }]}>
          {whiteWinPct >= 10 && <Text style={styles.pctTextDark} numberOfLines={1}>{whiteWinPct}%</Text>}
        </View>
        <View style={[styles.segment, styles.drawSeg, { flex: drawPct || 1 }]}>
          {drawPct >= 10 && <Text style={styles.pctText} numberOfLines={1}>{drawPct}%</Text>}
        </View>
        <View style={[styles.segment, styles.last, styles.blackSeg, { flex: blackWinPct || 1 }]}>
          {blackWinPct >= 10 && <Text style={styles.pctText} numberOfLines={1}>{blackWinPct}%</Text>}
        </View>
      </View>

      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: colors.accent.green }]} />
          <Text style={styles.legendText}>White{playerColor === "white" ? " · YOU" : ""}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: colors.accent.gold }]} />
          <Text style={styles.legendText}>Draw</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: colors.accent.red }]} />
          <Text style={styles.legendText}>Black{playerColor === "black" ? " · YOU" : ""}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...glassStyle,
    borderRadius: radius.lg,
    padding: spacing.sm,
    width: "100%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  label: {
    color: colors.text.muted,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  leaderText: {
    color: colors.accent.primary,
    fontSize: 11,
    fontWeight: "700",
  },
  barRow: {
    flexDirection: "row",
    height: 22,
    borderRadius: radius.full,
    overflow: "hidden",
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  segment: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 18,
  },
  first: { borderTopLeftRadius: radius.full, borderBottomLeftRadius: radius.full },
  last: { borderTopRightRadius: radius.full, borderBottomRightRadius: radius.full },
  whiteSeg: { backgroundColor: colors.accent.green },
  drawSeg: { backgroundColor: colors.accent.gold },
  blackSeg: { backgroundColor: colors.accent.red },
  pctText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "800",
  },
  pctTextDark: {
    color: colors.bg.primary,
    fontSize: 10,
    fontWeight: "800",
  },
  legendRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
    paddingHorizontal: 2,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  legendText: {
    color: colors.text.muted,
    fontSize: 10,
    fontWeight: "600",
  },
});
