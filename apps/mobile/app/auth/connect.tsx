import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import Animated, { FadeIn, SlideInUp } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useWallet } from "../../src/hooks/useWallet";
import { useSocket } from "../../src/hooks/useSocket";
import { useEffect, useState, useRef } from "react";
import { colors, spacing, radius, gradients, shadows, glassStyle } from "../../src/theme/tokens";
import Icon from "../../src/components/Icon";

export default function ConnectWalletScreen() {
  const router = useRouter();
  const wallet = useWallet();
  const {
    connected: socketConnected,
    authState: serverAuth,
    authRequest,
    authVerify,
    onAuthChallenge,
    onAuthError,
  } = useSocket();
  const [authStep, setAuthStep] = useState<"idle" | "connecting" | "signing" | "verifying" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const attemptedRef = useRef(false);

  // Listen for auth challenge — sign it with wallet and send back
  useEffect(() => {
    onAuthChallenge(async (data) => {
      if (!wallet.address) return;
      setAuthStep("signing");
      try {
        const signature = await wallet.sign(data.message);
        if (signature) {
          setAuthStep("verifying");
          authVerify(wallet.address, signature);
        } else {
          setError("Signature rejected");
          setAuthStep("idle");
          attemptedRef.current = false;
        }
      } catch {
        setError("Failed to sign message");
        setAuthStep("idle");
        attemptedRef.current = false;
      }
    });
    onAuthError((err) => {
      setError(err);
      setAuthStep("idle");
      attemptedRef.current = false;
    });
  }, [onAuthChallenge, onAuthError, wallet.address]);

  // When auth succeeds, navigate
  useEffect(() => {
    if (serverAuth) {
      setAuthStep("done");
      if (serverAuth.isNewUser) {
        router.replace("/auth/setup");
      } else {
        router.replace("/");
      }
    }
  }, [serverAuth]);

  // Once wallet is connected, start auth flow with server
  useEffect(() => {
    if (wallet.isConnected && wallet.address && socketConnected && !attemptedRef.current) {
      attemptedRef.current = true;
      setAuthStep("verifying");
      authRequest(wallet.address);
    }
  }, [wallet.isConnected, wallet.address, socketConnected]);

  const handleConnect = async () => {
    setAuthStep("connecting");
    setError(null);
    await wallet.connect();
  };

  return (
    <LinearGradient colors={gradients.velvet} style={styles.container}>
      <Animated.View entering={FadeIn.duration(400)} style={styles.content}>
        <Text style={styles.title}>Connect Wallet</Text>
        <Text style={styles.subtitle}>
          Your wallet address is your Checkker identity.{"\n"}
          No passwords needed.
        </Text>

        {wallet.isConnected && wallet.address ? (
          <Animated.View entering={SlideInUp.duration(300)} style={[styles.card, glassStyle]}>
            <Text style={styles.connectedLabel}>Connected</Text>
            <Text style={styles.address}>
              {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
            </Text>
            {wallet.balance && (
              <Text style={styles.balance}>{parseFloat(wallet.balance).toFixed(4)} BNB</Text>
            )}
            <TouchableOpacity
              style={styles.continueBtn}
              onPress={() => router.replace("/auth/setup")}
            >
              <Text style={styles.continueBtnText}>Set Up Profile</Text>
            </TouchableOpacity>
          </Animated.View>
        ) : (
          <TouchableOpacity
            style={[styles.connectBtn, wallet.isConnecting && styles.connectBtnDisabled]}
            onPress={handleConnect}
            disabled={wallet.isConnecting}
          >
            {wallet.isConnecting ? (
              <ActivityIndicator color={colors.text.primary} />
            ) : (
              <>
                <Text style={styles.connectIcon}>{"\uD83E\uDD8A"}</Text>
                <Text style={styles.connectBtnText}>Connect Wallet</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {(wallet.error || error) && (
          <Text style={styles.error}>{wallet.error || error}</Text>
        )}

        <TouchableOpacity onPress={() => router.back()} style={styles.backLink}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Icon name="arrow-back" size={16} color={colors.accent.blue} />
            <Text style={styles.backLinkText}>Back to Home</Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  content: { alignItems: "center", paddingHorizontal: spacing.lg, gap: spacing.md, maxWidth: 400, width: "100%" },
  title: { fontSize: 28, fontWeight: "800", color: colors.text.primary, letterSpacing: 2 },
  subtitle: { fontSize: 14, color: colors.text.secondary, textAlign: "center", lineHeight: 22 },
  card: { width: "100%", borderRadius: radius.lg, padding: spacing.lg, alignItems: "center", gap: spacing.sm },
  connectedLabel: { fontSize: 12, color: colors.accent.green, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1 },
  address: { fontSize: 16, fontWeight: "600", color: colors.text.primary, fontFamily: "monospace" },
  balance: { fontSize: 14, color: colors.accent.gold },
  continueBtn: {
    backgroundColor: colors.accent.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderWidth: 1,
    borderColor: colors.accent.gold,
    marginTop: spacing.xs,
  },
  continueBtnText: { color: colors.text.primary, fontSize: 16, fontWeight: "700" },
  connectBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.accent.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderWidth: 1.5,
    borderColor: colors.accent.gold,
    ...shadows.gold,
  },
  connectBtnDisabled: { opacity: 0.6 },
  connectIcon: { fontSize: 24 },
  connectBtnText: { color: colors.text.primary, fontSize: 18, fontWeight: "700" },
  error: { fontSize: 13, color: colors.accent.red, textAlign: "center" },
  backLink: { marginTop: spacing.md },
  backLinkText: { fontSize: 14, color: colors.text.muted },
});
