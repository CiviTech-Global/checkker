import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
} from "react-native";
import Animated, { FadeIn, SlideInUp } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  colors,
  spacing,
  radius,
  gradients,
  glassStyle,
  shadows,
} from "../../src/theme/tokens";
import { staggerDelay } from "../../src/utils/animations";
import { DONATION_WALLETS, type WalletInfo } from "@checkker/shared";

function copyToClipboard(text: string) {
  if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.clipboard) {
    navigator.clipboard.writeText(text);
  }
}

function WalletCard({
  wallet,
  index,
}: {
  wallet: WalletInfo;
  index: number;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    copyToClipboard(wallet.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const truncatedAddr =
    wallet.address.length > 24
      ? `${wallet.address.slice(0, 12)}...${wallet.address.slice(-10)}`
      : wallet.address;

  return (
    <Animated.View
      entering={SlideInUp.duration(300).delay(staggerDelay(index, 60))}
    >
      <TouchableOpacity
        onPress={handleCopy}
        activeOpacity={0.8}
      >
        <View style={[styles.walletCard, glassStyle]}>
          <View style={styles.walletHeader}>
            <Text style={styles.walletIcon}>{wallet.icon}</Text>
            <View style={styles.walletNames}>
              <Text style={styles.walletNetwork}>{wallet.network}</Text>
              <Text style={styles.walletSymbol}>{wallet.symbol}</Text>
            </View>
            <View style={[styles.copyBadge, copied && styles.copyBadgeCopied]}>
              <Text style={[styles.copyText, copied && styles.copyTextCopied]}>
                {copied ? "Copied!" : "Tap to copy"}
              </Text>
            </View>
          </View>
          <Text style={styles.walletAddress} numberOfLines={1}>
            {truncatedAddr}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function DonateScreen() {
  const router = useRouter();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <Animated.View entering={FadeIn.duration(300)} style={styles.header}>
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
          style={styles.backBtn}
        >
          <Text style={styles.backArrow}>{"\u2190"}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Support Checkker</Text>
        <View style={{ width: 40 }} />
      </Animated.View>

      {/* Hero */}
      <Animated.View
        entering={FadeIn.duration(400).delay(100)}
        style={styles.heroSection}
      >
        <LinearGradient
          colors={gradients.goldToBronze}
          style={styles.heroGradient}
        >
          <Text style={styles.heroIcon}>{"\u2665"}</Text>
          <Text style={styles.heroTitle}>Support the Developer</Text>
          <Text style={styles.heroSubtitle}>
            Checkker is built with passion. Your donation helps keep the servers running and new features coming.
          </Text>
        </LinearGradient>
      </Animated.View>

      {/* Wallets */}
      <Animated.Text
        entering={FadeIn.duration(300).delay(200)}
        style={styles.sectionTitle}
      >
        Donation Wallets
      </Animated.Text>
      <Text style={styles.sectionHint}>
        Tap any wallet to copy the address
      </Text>

      {DONATION_WALLETS.map((wallet, index) => (
        <WalletCard key={wallet.symbol} wallet={wallet} index={index} />
      ))}

      {/* Thank you */}
      <Animated.View
        entering={FadeIn.duration(300).delay(600)}
        style={styles.thankYou}
      >
        <Text style={styles.thankYouText}>
          Thank you for supporting Checkker!
        </Text>
        <Text style={styles.thankYouHeart}>{"\u2665"}</Text>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  scrollContent: {
    paddingBottom: spacing.xxl + spacing.xxl,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  backArrow: { fontSize: 24, color: colors.text.primary, fontWeight: "600" },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: "700",
    color: colors.accent.gold,
    textAlign: "center",
    letterSpacing: 2,
  },
  heroSection: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
    borderRadius: radius.lg,
    overflow: "hidden",
    ...shadows.gold,
  },
  heroGradient: {
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.sm,
  },
  heroIcon: {
    fontSize: 40,
    color: colors.bg.primary,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.bg.primary,
    letterSpacing: 1,
  },
  heroSubtitle: {
    fontSize: 14,
    color: "rgba(0,0,0,0.6)",
    textAlign: "center",
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.accent.gold,
    letterSpacing: 1,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xxs,
  },
  sectionHint: {
    fontSize: 12,
    color: colors.text.muted,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  walletCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.gold,
  },
  walletHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  walletIcon: {
    fontSize: 22,
    color: colors.accent.gold,
    width: 30,
    textAlign: "center",
  },
  walletNames: {
    flex: 1,
  },
  walletNetwork: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text.primary,
  },
  walletSymbol: {
    fontSize: 12,
    color: colors.text.muted,
    fontWeight: "600",
  },
  copyBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  copyBadgeCopied: {
    borderColor: colors.accent.green,
    backgroundColor: "rgba(76,175,80,0.1)",
  },
  copyText: {
    fontSize: 11,
    color: colors.text.muted,
    fontWeight: "600",
  },
  copyTextCopied: {
    color: colors.accent.green,
  },
  walletAddress: {
    fontSize: 13,
    color: colors.text.secondary,
    fontFamily: Platform.OS === "web" ? "monospace" : undefined,
    letterSpacing: 0.5,
  },
  thankYou: {
    alignItems: "center",
    paddingVertical: spacing.xl,
    gap: spacing.xs,
  },
  thankYouText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text.secondary,
  },
  thankYouHeart: {
    fontSize: 28,
    color: colors.accent.red,
  },
});
