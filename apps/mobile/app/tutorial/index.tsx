import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  LayoutChangeEvent,
} from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useFocusEffect } from "expo-router";
import { TutorialStorage } from "../../src/tutorial/TutorialStorage";
import { LESSONS } from "../../src/tutorial/lessons";
import type { TutorialProgress } from "../../src/tutorial/types";
import {
  colors,
  spacing,
  radius,
  glassStyle,
  gradients,
  springConfig,
} from "../../src/theme/tokens";
import { useSpringPress, staggerDelay } from "../../src/utils/animations";
import Icon from "../../src/components/Icon";

/* ── Lesson Card ────────────────────────────────────────────────────── */

function LessonCard({
  lesson,
  index,
  unlocked,
  completed,
  onPress,
}: {
  lesson: (typeof LESSONS)[0];
  index: number;
  unlocked: boolean;
  completed: boolean;
  onPress: () => void;
}) {
  const { onPressIn, onPressOut, animatedStyle } = useSpringPress();

  const iconName = completed ? "completed" : unlocked ? "play" : "locked";
  const iconColor = completed
    ? colors.accent.green
    : unlocked
      ? colors.accent.gold
      : colors.text.muted;

  return (
    <Animated.View
      entering={FadeInDown.duration(300).delay(staggerDelay(index, 50))}
      style={[!unlocked && { opacity: 0.5 }, animatedStyle]}
    >
      <TouchableOpacity
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={0.9}
      >
        <View style={[styles.lessonCard, glassStyle]}>
          <View style={styles.lessonRow}>
            <View style={styles.lessonIcon}>
              <Icon name={iconName} size={22} color={iconColor} />
            </View>
            <View style={styles.lessonInfo}>
              <Text
                style={[
                  styles.lessonNumber,
                  !unlocked && styles.lockedText,
                ]}
              >
                Lesson {lesson.id}
              </Text>
              <Text
                style={[
                  styles.lessonTitle,
                  !unlocked && styles.lockedText,
                ]}
              >
                {lesson.title}
              </Text>
              <Text
                style={[
                  styles.lessonDesc,
                  !unlocked && styles.lockedText,
                ]}
              >
                {lesson.description}
              </Text>
            </View>
            {completed && (
              <Animated.View
                entering={FadeIn.duration(300).springify().damping(10)}
              >
                <Icon name="completed" size={18} color={colors.accent.green} />
              </Animated.View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

/* ── Progress Bar ───────────────────────────────────────────────────── */

function ProgressBar({
  completed,
  total,
}: {
  completed: number;
  total: number;
}) {
  const [barWidth, setBarWidth] = useState(0);
  const fillWidth = useSharedValue(0);

  const onTrackLayout = (e: LayoutChangeEvent) => {
    setBarWidth(e.nativeEvent.layout.width);
  };

  useEffect(() => {
    const target = barWidth * (completed / total);
    fillWidth.value = withTiming(target, {
      duration: 600,
      easing: Easing.out(Easing.cubic),
    });
  }, [completed, total, barWidth, fillWidth]);

  const fillStyle = useAnimatedStyle(() => ({
    width: fillWidth.value,
  }));

  return (
    <View style={styles.progressSection}>
      <View style={styles.progressTrack} onLayout={onTrackLayout}>
        <Animated.View style={[styles.progressFillContainer, fillStyle]}>
          <LinearGradient
            colors={gradients.success }
            style={styles.progressGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          />
        </Animated.View>
      </View>
      <Text style={styles.progressText}>
        {completed}/{total} completed
      </Text>
    </View>
  );
}

/* ── Main Screen ────────────────────────────────────────────────────── */

export default function TutorialListScreen() {
  const router = useRouter();
  const [progress, setProgress] = useState<TutorialProgress | null>(null);
  const storage = useRef(new TutorialStorage()).current;

  const loadProgress = useCallback(async () => {
    const p = await storage.loadProgress();
    setProgress(p);
  }, [storage]);

  useFocusEffect(
    useCallback(() => {
      loadProgress();
    }, [loadProgress])
  );

  const completedCount = progress?.completedLessonIds.length ?? 0;

  const handleLessonPress = (lessonId: number) => {
    if (!progress) return;
    if (!storage.isLessonUnlocked(lessonId, progress)) {
      Alert.alert("Locked", "Complete the previous lesson first");
      return;
    }
    router.push(`/tutorial/${lessonId}`);
  };

  const handleReset = () => {
    Alert.alert(
      "Reset Progress",
      "Are you sure you want to reset all tutorial progress?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            await storage.resetProgress();
            await loadProgress();
          },
        },
      ]
    );
  };

  const renderLesson = ({
    item: lesson,
    index,
  }: {
    item: (typeof LESSONS)[0];
    index: number;
  }) => {
    const unlocked = progress
      ? storage.isLessonUnlocked(lesson.id, progress)
      : false;
    const completed =
      progress?.completedLessonIds.includes(lesson.id) ?? false;

    return (
      <LessonCard
        lesson={lesson}
        index={index}
        unlocked={unlocked}
        completed={completed}
        onPress={() => handleLessonPress(lesson.id)}
      />
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <Animated.View entering={FadeIn.duration(300)} style={styles.header}>
        <TouchableOpacity
          onPress={() => router.canGoBack() ? router.back() : router.replace("/")}
          style={styles.backBtn}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Icon name="arrow-back" size={18} color={colors.accent.blue} />
            <Text style={styles.backText}>Back</Text>
          </View>
        </TouchableOpacity>
        <Animated.Text
          entering={FadeIn.duration(400).delay(100)}
          style={styles.headerTitle}
        >
          Tutorials & Training
        </Animated.Text>
        <View style={styles.headerSpacer} />
      </Animated.View>

      {/* Book Entry */}
      <Animated.View entering={FadeIn.duration(300).delay(150)}>
        <TouchableOpacity
          onPress={() => router.push("/tutorial/book")}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={gradients.parchment}
            style={styles.bookEntry}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Icon name="book" size={28} color={colors.text.onParchment} />
            <View style={styles.bookEntryInfo}>
              <Text style={styles.bookEntryTitle}>The Cards of Checkker</Text>
              <Text style={styles.bookEntryDesc}>
                Illustrated guide to every card and piece
              </Text>
            </View>
            <Icon name="chevron-right" size={20} color={colors.text.onParchment} style={{ opacity: 0.5 }} />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      {/* Progress */}
      <ProgressBar completed={completedCount} total={LESSONS.length} />

      {/* Lesson List */}
      <FlatList
        data={LESSONS}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderLesson}
        contentContainerStyle={styles.list}
      />

      {/* Reset */}
      <Animated.View entering={FadeIn.duration(300).delay(400)}>
        <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
          <Text style={styles.resetText}>Reset Progress</Text>
        </TouchableOpacity>
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
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingTop: 56,
    paddingBottom: spacing.sm,
  },
  backBtn: {
    width: 60,
  },
  backText: {
    color: colors.accent.blue,
    fontSize: 16,
  },
  headerTitle: {
    color: colors.text.primary,
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  headerSpacer: {
    width: 60,
  },
  progressSection: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  progressTrack: {
    height: 8,
    backgroundColor: colors.bg.tertiary,
    borderRadius: radius.full,
    overflow: "hidden",
  },
  progressFillContainer: {
    height: "100%",
    borderRadius: radius.full,
    overflow: "hidden",
  },
  progressGradient: {
    flex: 1,
  },
  progressText: {
    color: colors.text.secondary,
    fontSize: 14,
    marginTop: spacing.xs,
    textAlign: "center",
  },
  list: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  lessonCard: {
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  lessonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  lessonIcon: {
    width: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  lessonInfo: {
    flex: 1,
  },
  lessonNumber: {
    color: colors.text.muted,
    fontSize: 12,
    fontWeight: "500",
  },
  lessonTitle: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: "600",
    marginTop: 2,
  },
  lessonDesc: {
    color: colors.text.secondary,
    fontSize: 13,
    marginTop: 4,
  },
  lockedText: {
    color: colors.text.muted,
  },
  completedBadge: {
    fontSize: 16,
  },
  bookEntry: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.lg,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.ornate,
    gap: spacing.sm,
  },
  bookEntryIcon: {
    fontSize: 28,
  },
  bookEntryInfo: {
    flex: 1,
  },
  bookEntryTitle: {
    color: colors.text.onParchment,
    fontSize: 16,
    fontWeight: "700",
  },
  bookEntryDesc: {
    color: colors.text.onParchment,
    fontSize: 13,
    opacity: 0.7,
    marginTop: 2,
  },
  bookEntryArrow: {
    color: colors.text.onParchment,
    fontSize: 20,
    opacity: 0.5,
  },
  resetButton: {
    paddingVertical: spacing.md,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: colors.bg.tertiary,
    marginHorizontal: spacing.md,
  },
  resetText: {
    color: colors.accent.red,
    fontSize: 15,
    fontWeight: "500",
  },
});
