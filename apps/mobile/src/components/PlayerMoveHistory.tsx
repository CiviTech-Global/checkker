import React from "react";
import { View, Text, StyleSheet } from "react-native";
import type { MoveRecord, Color } from "@checkker/shared";
import { cardId } from "@checkker/shared";
import { colors, spacing, glassStyle, radius } from "../theme/tokens";

interface PlayerMoveHistoryProps {
  moves: MoveRecord[];
  color?: Color;
  maxMoves?: number;
}

export default function PlayerMoveHistory({ moves, color, maxMoves = 3 }: PlayerMoveHistoryProps) {
  const filtered = color ? moves.filter((m) => m.color === color) : moves;
  const recent = filtered.slice(-maxMoves);

  if (recent.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Moves</Text>
        <Text style={styles.emptyText}>No moves yet</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{color ? `${color === "white" ? "White" : "Black"} Moves` : "Moves"}</Text>
      {recent.map((m, i) => {
        const moveNum = color
          ? moves.filter((mv) => mv.color === color).indexOf(m) + 1
          : moves.indexOf(m) + 1;
        return (
          <View key={`${m.move}-${i}`} style={styles.moveRow}>
            <Text style={styles.moveNum}>{moveNum}.</Text>
            <Text style={styles.moveNotation}>{m.move}</Text>
            <Text style={styles.cardUsed}>{cardId(m.card)}</Text>
            {m.captured && <Text style={styles.capture}>x</Text>}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...glassStyle,
    borderRadius: radius.md,
    padding: spacing.xs,
    gap: 2,
  },
  title: {
    color: colors.text.secondary,
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 2,
  },
  emptyText: {
    color: colors.text.muted,
    fontSize: 10,
    fontStyle: "italic",
  },
  moveRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  moveNum: {
    color: colors.text.muted,
    fontSize: 10,
    width: 18,
  },
  moveNotation: {
    color: colors.text.primary,
    fontSize: 11,
    fontFamily: "monospace",
    flex: 1,
  },
  cardUsed: {
    color: colors.accent.gold,
    fontSize: 10,
    fontWeight: "600",
  },
  capture: {
    color: colors.accent.red,
    fontSize: 10,
    fontWeight: "700",
  },
});
