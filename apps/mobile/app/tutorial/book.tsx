import { View, Text, Image, ScrollView, StyleSheet } from "react-native";
import { TouchableOpacity } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { galleryImages } from "../../assets/gallery";
import { BOOK_PAGES } from "../../src/tutorial/bookContent";
import {
  colors,
  spacing,
  radius,
  gradients,
  shadows,
} from "../../src/theme/tokens";
import { staggerDelay } from "../../src/utils/animations";
import Icon from "../../src/components/Icon";

/* ── Ornamental Divider ────────────────────────────────────────────── */

function BookDivider() {
  return (
    <View style={styles.dividerRow}>
      <View style={styles.dividerLine} />
      <Icon name="ornament" size={16} color={colors.accent.gold} style={{ marginHorizontal: spacing.sm }} />
      <View style={styles.dividerLine} />
    </View>
  );
}

/* ── Book Page Card ────────────────────────────────────────────────── */

function BookPageCard({
  page,
  index,
}: {
  page: (typeof BOOK_PAGES)[number];
  index: number;
}) {
  return (
    <Animated.View
      entering={FadeInDown.duration(350).delay(staggerDelay(index, 80) + 200)}
      style={styles.pageCard}
    >
      {/* Card Image */}
      <View style={styles.imageFrame}>
        <Image
          source={galleryImages[page.image]}
          style={styles.pageImage}
          resizeMode="contain"
        />
      </View>

      {/* Rank Badge */}
      <View style={styles.rankBadge}>
        <Text style={styles.rankBadgeText}>
          {page.cardRank} = {page.pieceType}
        </Text>
      </View>

      {/* Title */}
      <Text style={styles.pageTitle}>{page.title}</Text>

      {/* Description */}
      <Text style={styles.pageDescription}>{page.description}</Text>

      {/* Flavor Text */}
      <Text style={styles.pageFlavorText}>{page.flavorText}</Text>

      {/* Divider between pages */}
      {index < BOOK_PAGES.length - 1 && <BookDivider />}
    </Animated.View>
  );
}

/* ── Main Screen ────────────────────────────────────────────────────── */

export default function BookScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={gradients.parchment}
      style={styles.root}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View entering={FadeIn.duration(300)} style={styles.header}>
          <TouchableOpacity
            onPress={() =>
              router.canGoBack() ? router.back() : router.replace("/tutorial")
            }
            style={styles.backBtn}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Icon name="arrow-back" size={18} color={colors.accent.lapis} />
              <Text style={styles.backText}>Back</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* Title */}
        <Animated.View
          entering={FadeIn.duration(400).delay(100)}
          style={styles.titleContainer}
        >
          <Text style={styles.bookTitle}>The Cards of Checkker</Text>
          <View style={styles.titleUnderline} />
        </Animated.View>

        {/* Intro */}
        <Animated.Text
          entering={FadeIn.duration(400).delay(150)}
          style={styles.introText}
        >
          In Checkker, every chess move is played with a card from your hand.
          Each card rank corresponds to a specific piece. Learn which card
          moves which piece, and master the fusion of chess and poker.
        </Animated.Text>

        <BookDivider />

        {/* Pages */}
        {BOOK_PAGES.map((page, index) => (
          <BookPageCard key={page.image} page={page} index={index} />
        ))}

        {/* Footer CTA */}
        <Animated.View
          entering={FadeIn.duration(400).delay(800)}
          style={styles.ctaContainer}
        >
          <TouchableOpacity
            onPress={() => router.push("/tutorial")}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={gradients.ornateGold}
              style={styles.ctaButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.ctaText}>Start Tutorial Lessons</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  backBtn: {
    paddingVertical: spacing.xs,
  },
  backText: {
    color: colors.accent.lapis,
    fontSize: 16,
    fontWeight: "600",
  },
  titleContainer: {
    alignItems: "center",
    marginBottom: spacing.md,
  },
  bookTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.text.onParchment,
    letterSpacing: 1,
    textAlign: "center",
  },
  titleUnderline: {
    width: 80,
    height: 3,
    backgroundColor: colors.accent.gold,
    borderRadius: 2,
    marginTop: spacing.xs,
  },
  introText: {
    color: colors.text.onParchment,
    fontSize: 15,
    lineHeight: 24,
    textAlign: "center",
    marginBottom: spacing.lg,
    opacity: 0.85,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border.ornate,
  },
  dividerSymbol: {
    color: colors.accent.gold,
    fontSize: 16,
    marginHorizontal: spacing.sm,
  },
  pageCard: {
    marginBottom: spacing.sm,
    alignItems: "center",
  },
  imageFrame: {
    width: "100%",
    aspectRatio: 3 / 4,
    maxHeight: 420,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.border.ornate,
    overflow: "hidden",
    backgroundColor: colors.bg.parchmentDark,
    ...shadows.md,
  },
  pageImage: {
    width: "100%",
    height: "100%",
  },
  rankBadge: {
    marginTop: spacing.md,
    backgroundColor: colors.accent.lapis,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xxs,
    borderRadius: radius.full,
  },
  rankBadgeText: {
    color: "#f0e6d0",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 1,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.text.onParchment,
    marginTop: spacing.sm,
    textAlign: "center",
  },
  pageDescription: {
    color: colors.text.onParchment,
    fontSize: 15,
    lineHeight: 23,
    textAlign: "center",
    marginTop: spacing.sm,
    paddingHorizontal: spacing.sm,
    opacity: 0.9,
  },
  pageFlavorText: {
    color: colors.accent.burgundy,
    fontSize: 14,
    fontStyle: "italic",
    lineHeight: 21,
    textAlign: "center",
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    opacity: 0.8,
  },
  ctaContainer: {
    marginTop: spacing.lg,
    alignItems: "center",
  },
  ctaButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.lg,
    ...shadows.gold,
  },
  ctaText: {
    color: colors.text.onParchment,
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});
