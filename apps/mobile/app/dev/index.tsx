import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import Animated, { FadeIn, SlideInUp } from "react-native-reanimated";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  colors,
  spacing,
  radius,
  glassStyle,
} from "../../src/theme/tokens";
import { useLocalProfile } from "../../src/context/LocalProfileContext";
import Icon from "../../src/components/Icon";

export default function DevToolsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDemoDataLoaded, loadDemoData, clearDemoData } = useLocalProfile();

  const handleCreate = () => {
    loadDemoData();
  };

  const handleDelete = () => {
    clearDemoData();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <Animated.View entering={FadeIn.duration(300)} style={styles.header}>
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
          style={styles.backBtn}
        >
          <Icon name="arrow-back" size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dev Tools</Text>
        <View style={{ width: 40 }} />
      </Animated.View>

      {/* Demo Data Section */}
      <Animated.View
        entering={SlideInUp.duration(350).delay(100).springify().damping(15)}
        style={[styles.section, glassStyle]}
      >
        <Text style={styles.sectionTitle}>Demo Data</Text>
        <Text style={styles.sectionDesc}>
          Populate profile with realistic stats, game history, and fake leaderboard entries for testing.
        </Text>

        {/* Status */}
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, isDemoDataLoaded && styles.statusDotActive]} />
          <Text style={styles.statusText}>
            Demo data: {isDemoDataLoaded ? "loaded" : "not loaded"}
          </Text>
        </View>

        {/* Buttons */}
        <View style={styles.buttonGroup}>
          <TouchableOpacity
            onPress={handleCreate}
            style={styles.createBtn}
            activeOpacity={0.8}
          >
            <Text style={styles.createBtnText}>Create Demo Data</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleDelete}
            style={styles.deleteBtn}
            activeOpacity={0.8}
          >
            <Text style={styles.deleteBtnText}>Delete Demo Data</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    paddingTop: spacing.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  backArrow: {
    fontSize: 24,
    color: colors.text.primary,
    fontWeight: "600",
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: "700",
    color: colors.accent.gold,
    textAlign: "center",
    letterSpacing: 2,
  },
  section: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  sectionDesc: {
    fontSize: 14,
    color: colors.text.muted,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.text.muted,
  },
  statusDotActive: {
    backgroundColor: colors.accent.green,
  },
  statusText: {
    fontSize: 14,
    color: colors.text.secondary,
    fontWeight: "600",
  },
  buttonGroup: {
    gap: spacing.sm,
  },
  createBtn: {
    backgroundColor: colors.accent.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.accent.green,
  },
  createBtnText: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: "700",
  },
  deleteBtn: {
    backgroundColor: "transparent",
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.accent.red,
  },
  deleteBtnText: {
    color: colors.accent.red,
    fontSize: 16,
    fontWeight: "700",
  },
});
