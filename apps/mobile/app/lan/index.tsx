import { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { colors, radius, spacing, glassStyle } from "../../src/theme/tokens";
import { useSocket, connectToServer, reconnectToDefault } from "../../src/hooks/useSocket";
import Icon from "../../src/components/Icon";

type LanMode = "select" | "host" | "join";

const CONNECTION_TIMEOUT_MS = 10000;

export default function LanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    connected,
    gameState,
    hostLanGame,
    cancelLanHost,
    joinLanGame,
    onLanGameHosted,
    onLanJoinResult,
  } = useSocket();
  const [mode, setMode] = useState<LanMode>("select");
  const [serverAddress, setServerAddress] = useState("");
  const [gameCode, setGameCode] = useState("");
  const [hostCode, setHostCode] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectingRef = useRef(false);
  const pendingJoinCodeRef = useRef<string | null>(null);

  useEffect(() => {
    if (gameState && "gameId" in gameState) {
      router.replace(`/game/${(gameState as any).gameId}`);
    }
  }, [gameState]);

  useEffect(() => {
    onLanGameHosted((data) => setHostCode(data.code));
    onLanJoinResult((data) => {
      setConnecting(false);
      if (!data.success) {
        setError(data.error ?? "Could not join the game.");
      }
    });
    return () => {
      onLanGameHosted(null);
      onLanJoinResult(null);
    };
  }, [onLanGameHosted, onLanJoinResult]);

  useEffect(() => {
    if (connectingRef.current && connected) {
      connectingRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      // Connected to the host's server — now complete the join handshake.
      const code = pendingJoinCodeRef.current;
      pendingJoinCodeRef.current = null;
      if (code) {
        joinLanGame(code);
      } else {
        setConnecting(false);
      }
    }
  }, [connected, joinLanGame]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleHost = useCallback(() => {
    setMode("host");
    setHostCode(null);
    setError(null);
    hostLanGame("blitz");
  }, [hostLanGame]);

  const handleJoin = useCallback(() => {
    setMode("join");
    setError(null);
  }, []);

  const handleConnect = useCallback(() => {
    const addr = serverAddress.trim();
    const code = gameCode.trim();
    if (!code) {
      setError("Please enter the host's game code.");
      return;
    }
    setError(null);
    if (!addr) {
      // Same server (or already connected to the host's) — join directly.
      setConnecting(true);
      joinLanGame(code);
      return;
    }
    const fullAddress = addr.startsWith("http://") || addr.startsWith("https://")
      ? addr
      : `http://${addr}:3001`;
    connectingRef.current = true;
    pendingJoinCodeRef.current = code;
    setConnecting(true);
    connectToServer(fullAddress);
    timeoutRef.current = setTimeout(() => {
      if (connectingRef.current) {
        connectingRef.current = false;
        pendingJoinCodeRef.current = null;
        setConnecting(false);
        setError(
          "Could not connect to the host. Check the IP address and make sure the server is running.",
        );
      }
    }, CONNECTION_TIMEOUT_MS);
  }, [serverAddress, gameCode, joinLanGame]);

  const handleDisconnect = useCallback(() => {
    cancelLanHost();
    reconnectToDefault();
    setMode("select");
    setConnecting(false);
    setError(null);
    setHostCode(null);
    connectingRef.current = false;
    pendingJoinCodeRef.current = null;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, [cancelLanHost]);

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
                Share this game code with the other player. They can join from
                the same server, or connect to your machine's IP first if you
                are hosting the server locally.
              </Text>
              <View style={styles.codeBox}>
                <Text style={styles.codeLabel}>Game Code</Text>
                <Text style={styles.codeValue}>{hostCode ?? "..."}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => { cancelLanHost(); setHostCode(null); setMode("select"); setError(null); }}
            >
              <Text style={styles.secondaryBtnText}>Cancel Hosting</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.disconnectBtn}
              onPress={handleDisconnect}
            >
              <Text style={styles.disconnectBtnText}>
                Disconnect & return to online
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {mode === "join" && (
          <View style={styles.modeContainer}>
            <View style={styles.joinCard}>
              <Text style={styles.joinLabel}>Game Code</Text>
              <TextInput
                style={styles.input}
                value={gameCode}
                onChangeText={setGameCode}
                placeholder="e.g. 4821"
                placeholderTextColor={colors.text.muted}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="number-pad"
                returnKeyType="go"
                onSubmitEditing={handleConnect}
                editable={!connecting}
                maxLength={4}
              />

              <Text style={styles.joinLabel}>Host Address (optional)</Text>
              <TextInput
                style={styles.input}
                value={serverAddress}
                onChangeText={setServerAddress}
                placeholder="e.g. 192.168.1.42 — leave blank if same server"
                placeholderTextColor={colors.text.muted}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                returnKeyType="go"
                onSubmitEditing={handleConnect}
                editable={!connecting}
              />

              {connecting ? (
                <View style={styles.connectingRow}>
                  <ActivityIndicator size="small" color={colors.accent.gold} />
                  <Text style={styles.connectingText}>
                    {serverAddress.trim()
                      ? `Connecting to ${serverAddress.trim()}...`
                      : "Joining game..."}
                  </Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.connectBtn}
                  onPress={handleConnect}
                >
                  <Text style={styles.connectBtnText}>Connect</Text>
                </TouchableOpacity>
              )}

              {error && (
                <View style={styles.errorBox}>
                  <Icon
                    name="close"
                    size={14}
                    color={colors.accent.red}
                  />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}
            </View>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => {
                if (connecting) {
                  connectingRef.current = false;
                  pendingJoinCodeRef.current = null;
                  setConnecting(false);
                  if (timeoutRef.current) {
                    clearTimeout(timeoutRef.current);
                    timeoutRef.current = null;
                  }
                }
                setMode("select");
                setError(null);
              }}
            >
              <Text style={styles.secondaryBtnText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.disconnectBtn}
              onPress={handleDisconnect}
            >
              <Text style={styles.disconnectBtnText}>
                Disconnect & return to online
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <TouchableOpacity
        style={[styles.backBtn, { bottom: Math.max(insets.bottom, spacing.md) }]}
        onPress={() => {
          reconnectToDefault();
          router.replace("/");
        }}
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
  connectingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  connectingText: {
    color: colors.text.secondary,
    fontSize: 14,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: "rgba(224,64,64,0.12)",
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  errorText: {
    color: colors.accent.red,
    fontSize: 12,
    flex: 1,
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
  disconnectBtn: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.accent.red,
  },
  disconnectBtnText: {
    color: colors.accent.red,
    fontSize: 13,
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
