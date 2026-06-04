import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { colors, radius, spacing } from "../../src/theme/tokens";
import { useSocket } from "../../src/hooks/useSocket";

export default function CasualScreen() {
  const router = useRouter();
  const { connected, joinCasual, gameState, requestBot, onBotFallbackOffer } = useSocket();
  const [searching, setSearching] = useState(false);
  const [botOffer, setBotOffer] = useState<{ tc: string } | null>(null);

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

  useEffect(() => {
    onBotFallbackOffer((data) => setBotOffer(data));
  }, [onBotFallbackOffer]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Checkker</Text>
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

      {botOffer && (
        <View style={styles.botModal}>
          <Text style={styles.modalTitle}>No opponent found</Text>
          <Text style={styles.modalText}>Would you like to play against a bot instead?</Text>
          <TouchableOpacity
            style={styles.acceptBtn}
            onPress={() => {
              requestBot("intermediate", botOffer.tc);
              setBotOffer(null);
            }}
          >
            <Text style={styles.acceptText}>Play vs Bot (Intermediate)</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.keepSearchingBtn}
            onPress={() => {
              joinCasual(0, botOffer.tc);
              setBotOffer(null);
            }}
          >
            <Text style={styles.keepSearchingText}>Keep Searching</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity style={styles.cancelBtn} onPress={() => router.replace("/")}>
        <Text style={styles.cancelText}>Cancel Search</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.primary, alignItems: "center", justifyContent: "center", gap: spacing.lg },
  title: { fontSize: 36, fontWeight: "800", color: colors.accent.gold, letterSpacing: 3 },
  subtitle: { fontSize: 16, color: colors.text.secondary },
  searching: { alignItems: "center", gap: spacing.sm, padding: spacing.xl },
  searchText: { fontSize: 16, color: colors.text.primary, marginTop: spacing.md },
  modeText: { fontSize: 14, color: colors.text.muted },
  cancelBtn: { paddingHorizontal: spacing.xl, paddingVertical: spacing.sm, borderRadius: radius.md, backgroundColor: colors.bg.secondary, marginTop: spacing.xl },
  cancelText: { color: colors.text.primary, fontSize: 16, fontWeight: "600" },
  botModal: { position: "absolute", top: "40%", left: spacing.lg, right: spacing.lg, backgroundColor: colors.bg.secondary, borderRadius: radius.lg, padding: spacing.xl, alignItems: "center", gap: spacing.md, zIndex: 100 },
  modalTitle: { fontSize: 20, fontWeight: "700", color: colors.text.primary },
  modalText: { fontSize: 14, color: colors.text.secondary, textAlign: "center" },
  acceptBtn: { paddingHorizontal: spacing.xl, paddingVertical: spacing.sm, borderRadius: radius.md, backgroundColor: colors.accent.primary, width: "100%", alignItems: "center" },
  acceptText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  keepSearchingBtn: { paddingHorizontal: spacing.xl, paddingVertical: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.text.muted, width: "100%", alignItems: "center" },
  keepSearchingText: { color: colors.text.primary, fontSize: 14 },
});
