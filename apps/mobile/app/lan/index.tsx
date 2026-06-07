import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  ScrollView,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { colors, radius, spacing, glassStyle } from "../../src/theme/tokens";
import { useSocket } from "../../src/hooks/useSocket";
import Icon from "../../src/components/Icon";

type LanMode = "select" | "host" | "join";

export default function LanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { connected, gameState, startBotGame } = useSocket();
  const [mode, setMode] = useState<LanMode>("select");
  const [serverAddress, setServerAddress] = useState("");
  const [hosting, setHosting] = useState(false);

  useEffect(() => {
    if (gameState && "gameId" in gameState) {
      router.replace(`/game/${(gameState as any).gameId}`);
    }
  }, [gameState]);

  const handleHost = useCallback(() => {
    setMode("host");
    setHosting(true);
    // In a full implementation this would start a local socket.io server
    // and advertise via mDNS/Bonjour. For now, show the hosting UI.
  }, []);

  const handleJoin = useCallback(() => {
    setMode("join");
  }, []);

  const handleConnect = useCallback(() => {
    const addr = serverAddress.trim();
    if (!addr) {
      Alert.alert("Enter Address", "Please enter the host's IP address or code.");
      return;
    }
    // In a full implementation this would connect to the given address.
    // For now, show a placeholder message.
    Alert.alert(
      "Connecting...",
      `Attempting to connect to ${addr}. LAN play networking will be implemented in a future update.`,
    );
  }, [serverAddress]);

  const safeStyle = {
    paddingTop: insets.top,
    paddingBottom: insets.bottom,
  };

  return (
    <View style={[styles.container, safeStyle]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        bounces={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Local Network Play</Text>
        <Text style={styles.subtitle}>
          Play against someone on the same Wi-Fi network
        </Text>

        {mode === "select" && (
          <View style={styles.optionGroup}>
            <TouchableOpacity style={styles.optionBtn} onPress={handleHost}>
              <Icon name="host" size={28} color={colors.accent.gold} />
              <View style={styles.optionTextGroup}>
                <Text style={styles.optionTitle}>Host Game</Text>
                <Text style={styles.optionDesc}>
                  Create a game and share your code with a friend nearby
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.optionBtn} onPress={handleJoin}>
              <Icon name="join" size={28} color={colors.accent.gold} />
              <View style={styles.optionTextGroup}>
                <Text style={styles.optionTitle}>Join Game</Text>
                <Text style={styles.optionDesc}>
                  Enter a host's IP address or game code to connect
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {mode === "host" && (
          <View style={styles.modeContainer}>
            <View style={styles.hostCard}>
              <ActivityIndicator size="large" color={colors.accent.gold} />
              <Text style={styles.hostStatus}>Waiting for opponent...</Text>
              <Text style={styles.hostHint}>
                Share this device's IP address with the other player so they can join.
              </Text>
              <View style={styles.codeBox}>
                <Text style={styles.codeLabel}>Your Address</Text>
                <Text style={styles.codeValue}>Check Wi-Fi settings</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => { setMode("select"); setHosting(false); }}
            >
              <Text style={styles.secondaryBtnText}>Cancel Hosting</Text>
            </TouchableOpacity>
          </View>
        )}

        {mode === "join" && (
          <View style={styles.modeContainer}>
            <View style={styles.joinCard}>
              <Text style={styles.joinLabel}>Host Address</Text>
              <TextInput
                style={styles.input}
                value={serverAddress}
                onChangeText={setServerAddress}
                placeholder="e.g. 192.168.1.42"
                placeholderTextColor={colors.text.muted}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                returnKeyType="go"
                onSubmitEditing={handleConnect}
              />
              <TouchableOpacity style={styles.connectBtn} onPress={handleConnect}>
                <Text style={styles.connectBtnText}>Connect</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => setMode("select")}
            >
              <Text style={styles.secondaryBtnText}>Back</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <TouchableOpacity
        style={[styles.backBtn, { bottom: Math.max(insets.bottom, spacing.md) }]}
        onPress={() => router.replace("/")}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Icon name="arrow-back" size={16} color={colors.text.secondary} />
          <Text style={styles.backText}>Home</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  scroll: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: 80,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.text.primary,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: "center",
    maxWidth: 300,
  },
  optionGroup: {
    width: "100%",
    maxWidth: 360,
    gap: spacing.md,
  },
  optionBtn: {
    ...glassStyle,
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  optionEmoji: {
    fontSize: 32,
  },
  optionTextGroup: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text.primary,
  },
  optionDesc: {
    fontSize: 12,
    color: colors.text.muted,
    marginTop: 2,
  },
  modeContainer: {
    width: "100%",
    maxWidth: 360,
    gap: spacing.md,
    alignItems: "center",
  },
  hostCard: {
    ...glassStyle,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.md,
    width: "100%",
  },
  hostStatus: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text.primary,
  },
  hostHint: {
    fontSize: 12,
    color: colors.text.muted,
    textAlign: "center",
  },
  codeBox: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: "center",
    width: "100%",
  },
  codeLabel: {
    fontSize: 10,
    color: colors.text.muted,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  codeValue: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "monospace",
    color: colors.accent.gold,
    marginTop: 2,
  },
  joinCard: {
    ...glassStyle,
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.md,
    width: "100%",
  },
  joinLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text.primary,
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text.primary,
    fontSize: 16,
    fontFamily: "monospace",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  connectBtn: {
    backgroundColor: colors.accent.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  connectBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryBtn: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.bg.secondary,
  },
  secondaryBtnText: {
    color: colors.text.primary,
    fontSize: 14,
    fontWeight: "600",
  },
  backBtn: {
    position: "absolute",
    left: spacing.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  backText: {
    color: colors.text.secondary,
    fontSize: 14,
    fontWeight: "600",
  },
});
