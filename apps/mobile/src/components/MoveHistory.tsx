import { ScrollView, View, Text, StyleSheet } from "react-native";
import { colors, radius, spacing } from "../theme/tokens";
import type { MoveRecord } from "@checkker/shared";
import { cardId } from "@checkker/shared";
import { useRef, useEffect } from "react";

interface MoveHistoryProps {
  moves: MoveRecord[];
}

export default function MoveHistory({ moves }: MoveHistoryProps) {
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [moves.length]);

  if (moves.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Moves</Text>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {moves.map((m, i) => (
          <View key={i} style={[styles.moveChip, m.color === "white" ? styles.whiteChip : styles.blackChip]}>
            <Text style={styles.moveNum}>{Math.floor(i / 2) + 1}{m.color === "white" ? "." : "..."}</Text>
            <Text style={styles.moveText}>{m.move}</Text>
            <Text style={styles.cardText}>{cardId(m.card)}</Text>
            {m.captured && <Text style={styles.captureIcon}>x</Text>}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: "100%", gap: 4 },
  label: { fontSize: 11, color: colors.text.muted, paddingLeft: 4 },
  scroll: { gap: 4, paddingHorizontal: 4 },
  moveChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  whiteChip: { backgroundColor: "rgba(255,255,255,0.1)" },
  blackChip: { backgroundColor: "rgba(0,0,0,0.3)" },
  moveNum: { fontSize: 10, color: colors.text.muted },
  moveText: { fontSize: 12, color: colors.text.primary, fontWeight: "600" },
  cardText: { fontSize: 10, color: colors.text.secondary },
  captureIcon: { fontSize: 10, color: colors.accent.red },
});
