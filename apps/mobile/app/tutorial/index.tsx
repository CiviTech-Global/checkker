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

  let icon: string;
  if (completed) {
    icon = "\u2705";
  } else if (unlocked) {
    icon = "\u25B6\uFE0F";
  } else {
    icon = "\uD83D\uDD12";
  }

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
            <Text style={styles.lessonIcon}>{icon}</Text>
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
              <Animated.Text
                entering={FadeIn.duration(300).springify().damping(10)}
                style={styles.completedBadge}
              >
                {"\u2705"}
              </Animated.Text>
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
          <Text style={styles.backText}>{"\u2190"} Back</Text>
        </TouchableOpacity>
        <Animated.Text
          entering={FadeIn.duration(400).delay(100)}
          style={styles.headerTitle}
        >
          Tutorial
        </Animated.Text>
        <View style={styles.headerSpacer} />
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
    fontSize: 24,
    width: 36,
    textAlign: "center",
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
    color: "#555555",
  },
  completedBadge: {
    fontSize: 16,
  },
  resetButton: {
    paddingVertical: spacing.md,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: colors.bg.tertiary,
    marginHorizontal: spacing.md,
  },
  resetText: {
    color: "#EF5350",
    fontSize: 15,
    fontWeight: "500",
  },
});
