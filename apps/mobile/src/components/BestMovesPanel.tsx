import React from "react";
import { View, Text, StyleSheet } from "react-native";
import type { MoveEvaluation } from "@checkker/shared";
import { colors, spacing, glassStyle, radius } from "../theme/tokens";

interface BestMovesPanelProps {
  moves: MoveEvaluation[];
  hidden?: boolean;
}

export default function BestMovesPanel({ moves, hidden }: BestMovesPanelProps) {
  if (hidden) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Best Moves</Text>
        <View style={styles.hiddenRow}>
          <Text style={styles.lockIcon}>{"\uD83D\uDD12"}</Text>
          <Text style={styles.hiddenText}>Hidden</Text>
        </View>
      </View>
    );
  }

  if (moves.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Best Moves</Text>
        <Text style={styles.emptyText}>No suggestions</Text>
      </View>
    );
  }

  const maxScore = Math.max(...moves.map((m) => Math.abs(m.score)), 1);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Best Moves</Text>
      {moves.slice(0, 3).map((m, i) => (
        <View key={`${m.cardId}-${m.move}`} style={styles.moveRow}>
          <Text style={styles.rank}>{i + 1}.</Text>
          <Text style={styles.cardLabel}>{m.cardId}</Text>
          <Text style={styles.moveLabel}>{m.move}</Text>
          <View style={styles.barContainer}>
            <View
              style={[
                styles.bar,
                {
                  width: `${Math.min(100, (Math.abs(m.score) / maxScore) * 100)}%`,
                  backgroundColor: m.score >= 0 ? colors.accent.green : colors.accent.red,
                },
              ]}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...glassStyle,
    borderRadius: radius.md,
    padding: spacing.xs,
    gap: 4,
  },
  title: {
    color: colors.accent.gold,
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 2,
    letterSpacing: 1,
  },
  moveRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  rank: {
    color: colors.text.muted,
    fontSize: 10,
    width: 14,
  },
  cardLabel: {
    color: colors.accent.gold,
    fontSize: 10,
    fontWeight: "600",
    width: 28,
  },
  moveLabel: {
    color: colors.text.primary,
    fontSize: 10,
    fontFamily: "monospace",
    width: 36,
  },
  barContainer: {
    flex: 1,
    height: 6,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 3,
    overflow: "hidden",
  },
  bar: {
    height: "100%",
    borderRadius: 3,
  },
  hiddenRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    justifyContent: "center",
    paddingVertical: 4,
  },
  lockIcon: {
    fontSize: 12,
  },
  hiddenText: {
    color: colors.text.muted,
    fontSize: 11,
    fontStyle: "italic",
  },
  emptyText: {
    color: colors.text.muted,
    fontSize: 10,
    fontStyle: "italic",
    textAlign: "center",
  },
});
