import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { colors, radius, spacing } from "../../src/theme/tokens";
import { useSocket } from "../../src/hooks/useSocket";

export default function CasualScreen() {
  const router = useRouter();
  const { connected, joinCasual, gameState } = useSocket();
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (connected && !searching) {
      setSearching(true);
      joinCasual(1200, "blitz");
    }
  }, [connected]);

  useEffect(() => {
    if (gameState && "gameId" in gameState) {
      router.replace(`/game/${gameState.gameId}`);
    }
  }, [gameState]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Gambit</Text>
      <Text style={styles.subtitle}>Casual Match</Text>

      {searching ? (
        <View style={styles.searching}>
          <ActivityIndicator size="large" color={colors.accent.primary} />
          <Text style={styles.searchText}>Searching for opponent...</Text>
          <Text style={styles.modeText}>Unranked • Blitz 7 min</Text>
        </View>
      ) : (
        <View style={styles.searching}>
          <Text style={styles.searchText}>Connecting to server...</Text>
        </View>
      )}

      <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
        <Text style={styles.cancelText}>Cancel Search</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.primary, alignItems: "center", justifyContent: "center", gap: spacing.lg },
  title: { fontSize: 36, fontWeight: "700", color: colors.text.primary },
  subtitle: { fontSize: 16, color: colors.text.secondary },
  searching: { alignItems: "center", gap: spacing.sm, padding: spacing.xl },
  searchText: { fontSize: 16, color: colors.text.primary, marginTop: spacing.md },
  modeText: { fontSize: 14, color: colors.text.muted },
  cancelBtn: { paddingHorizontal: spacing.xl, paddingVertical: spacing.sm, borderRadius: radius.md, backgroundColor: colors.bg.secondary, marginTop: spacing.xl },
  cancelText: { color: colors.text.primary, fontSize: 16, fontWeight: "600" },
});
