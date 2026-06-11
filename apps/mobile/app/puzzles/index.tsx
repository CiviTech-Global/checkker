import { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import Animated, { FadeIn, SlideInUp } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  colors,
  spacing,
  radius,
  glassStyle,
  gradients,
  shadows,
} from "../../src/theme/tokens";
import { useSpringPress, staggerDelay } from "../../src/utils/animations";
import Icon from "../../src/components/Icon";

interface PuzzleCategory {
  id: string;
  title: string;
  description: string;
  symbol: string;
  color: string;
  count: number;
}

const PUZZLE_CATEGORIES: PuzzleCategory[] = [
  {
    id: "daily",
    title: "Daily Puzzle",
    description: "A fresh challenge every day",
    symbol: "\u2606",
    color: colors.accent.gold,
    count: 1,
  },
  {
    id: "tactics",
    title: "Tactical Puzzles",
    description: "Sharpen your chess vision",
    symbol: "\u2694",
    color: colors.accent.red,
    count: 50,
  },
  {
    id: "card_management",
    title: "Card Management",
    description: "Optimal card selection puzzles",
    symbol: "\u2666",
    color: colors.accent.primary,
    count: 30,
  },
  {
    id: "endgame",
    title: "Endgame Training",
    description: "Master the final phase",
    symbol: "\u265A",
    color: colors.accent.bronze,
    count: 25,
  },
  {
    id: "weakness",
    title: "Weakness Training",
    description: "Puzzles targeting your weak spots",
    symbol: "\u2605",
    color: colors.accent.green,
    count: 0,
  },
];

function PuzzleCategoryCard({
  category,
  index,
  onPress,
}: {
  category: PuzzleCategory;
  index: number;
  onPress: () => void;
}) {
  const { onPressIn, onPressOut, animatedStyle } = useSpringPress();

  return (
    <Animated.View
      entering={SlideInUp.duration(300).delay(staggerDelay(index, 70))}
      style={animatedStyle}
    >
      <TouchableOpacity
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={0.9}
      >
        <View style={[styles.puzzleCard, glassStyle]}>
          <View style={[styles.cardAccent, { backgroundColor: category.color }]} />
          <View style={styles.cardBody}>
            <View style={styles.cardTop}>
              <Text style={[styles.cardSymbol, { color: category.color }]}>
                {category.symbol}
              </Text>
              <Text style={styles.cardTitle}>{category.title}</Text>
            </View>
            <Text style={styles.cardDesc}>{category.description}</Text>
            {category.count > 0 && (
              <Text style={styles.cardCount}>
                {category.count} puzzle{category.count !== 1 ? "s" : ""}
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function PuzzlesScreen() {
  const router = useRouter();
  const [streak] = useState(0);
  const [solved] = useState(0);

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
          <Icon name="arrow-back" size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Puzzles</Text>
        <View style={{ width: 40 }} />
      </Animated.View>

      {/* Streak Banner */}
      <Animated.View
        entering={FadeIn.duration(400).delay(100)}
        style={styles.streakBanner}
      >
        <LinearGradient
          colors={gradients.goldToBronze}
          style={styles.streakGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <View style={styles.streakContent}>
            <View style={styles.streakStat}>
              <Text style={styles.streakNumber}>{streak}</Text>
              <Text style={styles.streakLabel}>Day Streak</Text>
            </View>
            <View style={styles.streakDivider} />
            <View style={styles.streakStat}>
              <Text style={styles.streakNumber}>{solved}</Text>
              <Text style={styles.streakLabel}>Solved</Text>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>

      {/* Puzzle Categories */}
      <View style={styles.categoriesContainer}>
        {PUZZLE_CATEGORIES.map((cat, index) => (
          <PuzzleCategoryCard
            key={cat.id}
            category={cat}
            index={index}
            onPress={() => router.push(`/puzzles/play/${cat.id}`)}
          />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
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
  streakBanner: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
    borderRadius: radius.lg,
    overflow: "hidden",
    ...shadows.gold,
  },
  streakGradient: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  streakContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.lg,
  },
  streakStat: {
    alignItems: "center",
  },
  streakNumber: {
    fontSize: 32,
    fontWeight: "800",
    color: colors.bg.primary,
  },
  streakLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.bg.primary,
    textTransform: "uppercase",
    letterSpacing: 1,
    opacity: 0.8,
  },
  streakDivider: {
    width: 1,
    height: 40,
    backgroundColor: "rgba(10,10,15,0.2)",
  },
  categoriesContainer: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  puzzleCard: {
    borderRadius: radius.lg,
    flexDirection: "row",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border.gold,
  },
  cardAccent: {
    width: 4,
  },
  cardBody: {
    flex: 1,
    padding: spacing.md,
    gap: 4,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  cardSymbol: {
    fontSize: 20,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text.primary,
  },
  cardDesc: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  cardCount: {
    fontSize: 11,
    color: colors.text.muted,
  },
});
