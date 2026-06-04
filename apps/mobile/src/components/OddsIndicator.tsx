import React from "react";
import { View, Text, StyleSheet } from "react-native";
import type { GameOdds, Color } from "@checkker/shared";
import { colors, spacing, glassStyle, radius } from "../theme/tokens";

interface OddsIndicatorProps {
  odds: GameOdds | null;
  playerColor: Color;
}

export default function OddsIndicator({ odds, playerColor }: OddsIndicatorProps) {
  if (!odds) return null;

  const { whiteWinPct, blackWinPct, drawPct } = odds;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Probable Result</Text>
      <View style={styles.barRow}>
        <View style={[styles.segment, styles.whiteSeg, { flex: whiteWinPct || 1 }]}>
          {whiteWinPct >= 8 && <Text style={styles.pctTextDark} numberOfLines={1}>{whiteWinPct}%</Text>}
        </View>
        <View style={[styles.segment, styles.drawSeg, { flex: drawPct || 1 }]}>
          {drawPct >= 8 && <Text style={styles.pctText} numberOfLines={1}>{drawPct}%</Text>}
        </View>
        <View style={[styles.segment, styles.blackSeg, { flex: blackWinPct || 1 }]}>
          {blackWinPct >= 8 && <Text style={styles.pctText} numberOfLines={1}>{blackWinPct}%</Text>}
        </View>
      </View>
      <View style={styles.legendRow}>
        <Text style={styles.legendText}>White</Text>
        <Text style={styles.legendText}>Draw</Text>
        <Text style={styles.legendText}>Black</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...glassStyle,
    borderRadius: radius.md,
    padding: spacing.xs,
    width: "100%",
  },
  label: {
    color: colors.text.secondary,
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 4,
    textAlign: "center",
  },
  barRow: {
    flexDirection: "row",
    height: 24,
    borderRadius: 12,
    overflow: "hidden",
  },
  segment: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 20,
  },
  whiteSeg: {
    backgroundColor: colors.accent.green,
  },
  drawSeg: {
    backgroundColor: colors.accent.gold,
  },
  blackSeg: {
    backgroundColor: colors.accent.red,
  },
  pctText: {
    color: "#ffffff",
    fontSize: 9,
    fontWeight: "700",
  },
  pctTextDark: {
    color: colors.bg.primary,
    fontSize: 9,
    fontWeight: "700",
  },
  legendRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 2,
    paddingHorizontal: 4,
  },
  legendText: {
    color: colors.text.muted,
    fontSize: 9,
  },
});
