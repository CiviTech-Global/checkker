import { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import Animated, { FadeIn, SlideInUp } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { AVATARS, getAvatar } from "@checkker/shared";
import { colors, spacing, radius, gradients, glassStyle, shadows } from "../../src/theme/tokens";
import { useSocket } from "../../src/hooks/useSocket";

export default function SetupProfileScreen() {
  const router = useRouter();
  const {
    authState,
    checkUsername,
    setUsername,
    updateAvatar,
    onUsernameCheck,
  } = useSocket();
  const [usernameInput, setUsernameInput] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState("king_white");
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCheckedRef = useRef<string>("");

  // Listen for username check responses from server
  useEffect(() => {
    onUsernameCheck((data) => {
      if (data.username === lastCheckedRef.current) {
        setUsernameStatus(data.available ? "available" : "taken");
      }
    });
  }, [onUsernameCheck]);

  // Debounced username check via socket
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!usernameInput || usernameInput.length < 3) {
      setUsernameStatus(usernameInput.length > 0 ? "invalid" : "idle");
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(usernameInput)) {
      setUsernameStatus("invalid");
      return;
    }

    setUsernameStatus("checking");
    debounceRef.current = setTimeout(() => {
      lastCheckedRef.current = usernameInput;
      checkUsername(usernameInput);
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [usernameInput, checkUsername]);

  const handleCreate = useCallback(async () => {
    if (usernameStatus !== "available" || usernameInput.length < 3) return;
    setIsSubmitting(true);

    try {
      const walletAddress = authState?.walletAddress ?? "";
      setUsername(walletAddress, usernameInput, selectedAvatar);

      // Also update avatar separately in case setUsername doesn't handle it
      updateAvatar(selectedAvatar);

      // Navigate after a short delay to let the server process
      // The auth_success event will update authState automatically
      setTimeout(() => {
        router.replace("/");
      }, 500);
    } catch {
      setIsSubmitting(false);
    }
  }, [usernameInput, selectedAvatar, usernameStatus, router, authState, setUsername, updateAvatar]);

  const usernameHint = {
    idle: "",
    checking: "Checking availability...",
    available: "Username is available!",
    taken: "Username already taken",
    invalid: "3-32 chars, letters/numbers/underscores only",
  }[usernameStatus];

  const usernameColor = {
    idle: colors.text.muted,
    checking: colors.text.muted,
    available: colors.accent.green,
    taken: colors.accent.red,
    invalid: colors.accent.red,
  }[usernameStatus];

  return (
    <LinearGradient colors={gradients.velvet} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
          <Text style={styles.title}>Create Your Profile</Text>
          <Text style={styles.subtitle}>Choose a username and avatar</Text>
        </Animated.View>

        {/* Username Input */}
        <Animated.View entering={SlideInUp.duration(300).delay(100)} style={[styles.section, glassStyle]}>
          <Text style={styles.sectionTitle}>Username</Text>
          <TextInput
            style={styles.input}
            value={usernameInput}
            onChangeText={setUsernameInput}
            placeholder="Enter username..."
            placeholderTextColor={colors.text.muted}
            maxLength={32}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {usernameHint ? (
            <Text style={[styles.hint, { color: usernameColor }]}>
              {usernameStatus === "checking" && <ActivityIndicator size="small" color={colors.text.muted} />}
              {usernameHint}
            </Text>
          ) : null}
        </Animated.View>

        {/* Avatar Grid */}
        <Animated.View entering={SlideInUp.duration(300).delay(200)} style={[styles.section, glassStyle]}>
          <Text style={styles.sectionTitle}>Avatar</Text>
          <View style={styles.avatarGrid}>
            {AVATARS.map((avatar) => (
              <TouchableOpacity
                key={avatar.id}
                style={[
                  styles.avatarCell,
                  selectedAvatar === avatar.id && styles.avatarSelected,
                ]}
                onPress={() => setSelectedAvatar(avatar.id)}
              >
                <Text style={styles.avatarSymbol}>{avatar.symbol}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        {/* Preview */}
        <Animated.View entering={SlideInUp.duration(300).delay(300)} style={[styles.section, glassStyle, styles.preview]}>
          <LinearGradient colors={gradients.goldToBronze} style={styles.previewRing}>
            <View style={styles.previewInner}>
              <Text style={styles.previewAvatar}>{getAvatar(selectedAvatar).symbol}</Text>
            </View>
          </LinearGradient>
          <Text style={styles.previewName}>{usernameInput || "YourName"}</Text>
          <Text style={styles.previewRating}>1000 ELO</Text>
        </Animated.View>

        {/* Create Button */}
        <Animated.View entering={SlideInUp.duration(300).delay(400)}>
          <TouchableOpacity
            style={[styles.createBtn, (usernameStatus !== "available" || isSubmitting) && styles.createBtnDisabled]}
            onPress={handleCreate}
            disabled={usernameStatus !== "available" || isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color={colors.text.primary} />
            ) : (
              <Text style={styles.createBtnText}>Create Account</Text>
            )}
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
    maxWidth: 460,
    alignSelf: "center",
    width: "100%",
  },
  header: { alignItems: "center", gap: spacing.xs, marginBottom: spacing.sm },
  title: { fontSize: 24, fontWeight: "800", color: colors.text.primary, letterSpacing: 2 },
  subtitle: { fontSize: 14, color: colors.text.secondary },
  section: { width: "100%", borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: colors.accent.gold, letterSpacing: 1 },
  input: {
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    fontSize: 16,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  hint: { fontSize: 12 },
  avatarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    justifyContent: "center",
  },
  avatarCell: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  avatarSelected: {
    borderColor: colors.accent.gold,
    backgroundColor: "rgba(205,175,100,0.15)",
  },
  avatarSymbol: { fontSize: 28 },
  preview: { alignItems: "center", gap: spacing.xs },
  previewRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.gold,
  },
  previewInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.bg.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  previewAvatar: { fontSize: 30, color: colors.accent.gold },
  previewName: { fontSize: 18, fontWeight: "700", color: colors.text.primary },
  previewRating: { fontSize: 13, color: colors.accent.bronze },
  createBtn: {
    backgroundColor: colors.accent.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    borderWidth: 1.5,
    borderColor: colors.accent.gold,
    ...shadows.gold,
    minWidth: 200,
    alignItems: "center",
  },
  createBtnDisabled: { opacity: 0.5 },
  createBtnText: { color: colors.text.primary, fontSize: 18, fontWeight: "700", letterSpacing: 1 },
});
