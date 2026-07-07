import { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Animated, { FadeIn, FadeInRight, SlideInUp } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { colors, spacing, radius, gradients, shadows, typography } from "../src/theme/tokens";
import { useSpringPress } from "../src/utils/animations";
import { haptics } from "../src/services/HapticsService";
import { onboarding, type PlayerBackground } from "../src/services/OnboardingService";
import { useLocalProfile } from "../src/context/LocalProfileContext";
import Icon, { type IconName } from "../src/components/Icon";

/* ── Components ──────────────────────────────────────────────────────── */

function StepDots({ total, current }: { total: number; current: number }) {
  return (
    <View style={styles.dots}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            i === current && { backgroundColor: colors.accent.gold, width: 20 },
          ]}
        />
      ))}
    </View>
  );
}

function PrimaryButton({ label, onPress, delay = 0 }: { label: string; onPress: () => void; delay?: number }) {
  const { onPressIn, onPressOut, animatedStyle } = useSpringPress(0.97);
  return (
    <Animated.View entering={SlideInUp.duration(300).delay(delay).springify().damping(15)} style={animatedStyle}>
      <TouchableOpacity
        onPress={() => {
          haptics.impact();
          onPress();
        }}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={0.9}
        style={styles.primaryBtn}
      >
        <LinearGradient colors={gradients.gold} style={styles.primaryGradient}>
          <Text style={styles.primaryText}>{label}</Text>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

function SecondaryButton({ label, onPress, delay = 0 }: { label: string; onPress: () => void; delay?: number }) {
  return (
    <Animated.View entering={FadeIn.duration(300).delay(delay)}>
      <TouchableOpacity onPress={onPress} style={styles.secondaryBtn} activeOpacity={0.8}>
        <Text style={styles.secondaryText}>{label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

function BackgroundCard({
  icon,
  title,
  subtitle,
  selected,
  onPress,
}: {
  icon: IconName;
  title: string;
  subtitle: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { onPressIn, onPressOut, animatedStyle } = useSpringPress(0.98);
  return (
    <Animated.View style={[styles.cardWrapper, animatedStyle]}>
      <TouchableOpacity
        onPress={() => {
          haptics.selection();
          onPress();
        }}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={0.85}
        style={[styles.backgroundCard, selected && styles.backgroundCardSelected]}
      >
        <View style={[styles.backgroundIconCircle, selected && { backgroundColor: `${colors.accent.gold}25` }]}>
          <Icon name={icon} size={28} color={selected ? colors.accent.gold : colors.text.muted} />
        </View>
        <Text style={[styles.backgroundTitle, selected && { color: colors.text.primary }]}>{title}</Text>
        <Text style={styles.backgroundSubtitle}>{subtitle}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

/* ── Steps ───────────────────────────────────────────────────────────── */

function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <View style={styles.step}>
      <Animated.View entering={FadeIn.duration(600)} style={styles.logoCircle}>
        <Text style={styles.logoEmoji}>♟️</Text>
      </Animated.View>
      <Animated.Text entering={SlideInUp.duration(400).delay(200)} style={styles.title}>
        Welcome to Checkker
      </Animated.Text>
      <Animated.Text entering={FadeIn.duration(400).delay(350)} style={styles.subtitle}>
        Chess + Poker, reimagined. Every move matters twice — on the board and in your score pile.
      </Animated.Text>
      <PrimaryButton label="Get Started" onPress={onNext} delay={500} />
    </View>
  );
}

function BackgroundStep({ value, onChange, onNext }: { value: PlayerBackground | null; onChange: (b: PlayerBackground) => void; onNext: () => void }) {
  return (
    <View style={styles.step}>
      <Animated.Text entering={FadeInRight.duration(300)} style={styles.title}>
        What brings you here?
      </Animated.Text>
      <Animated.Text entering={FadeIn.duration(300).delay(100)} style={styles.subtitle}>
        We’ll tailor your first match to your experience.
      </Animated.Text>

      <BackgroundCard
        icon="chess-piece"
        title="Chess player"
        subtitle="I know openings, tactics, and endgames."
        selected={value === "chess"}
        onPress={() => onChange("chess")}
      />
      <BackgroundCard
        icon="cards-playing"
        title="Poker player"
        subtitle="I read hands, odds, and bluffs."
        selected={value === "poker"}
        onPress={() => onChange("poker")}
      />
      <BackgroundCard
        icon="star"
        title="New to both"
        subtitle="Teach me as I play."
        selected={value === "new"}
        onPress={() => onChange("new")}
      />

      <PrimaryButton label="Continue" onPress={onNext} delay={200} />
    </View>
  );
}

function NameStep({ value, onChange, onNext }: { value: string; onChange: (n: string) => void; onNext: () => void }) {
  return (
    <View style={styles.step}>
      <Animated.Text entering={FadeInRight.duration(300)} style={styles.title}>
        What should we call you?
      </Animated.Text>
      <Animated.View entering={FadeIn.duration(300).delay(150)} style={styles.inputCard}>
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder="Player Name"
          placeholderTextColor={colors.text.muted}
          style={styles.input}
          maxLength={20}
          autoFocus
        />
      </Animated.View>
      <PrimaryButton label="Continue" onPress={onNext} delay={250} />
    </View>
  );
}

function PracticeStep({ onStart, onSkip }: { onStart: () => void; onSkip: () => void }) {
  return (
    <View style={styles.step}>
      <Animated.Text entering={FadeInRight.duration(300)} style={styles.title}>
        Ready for your first match?
      </Animated.Text>
      <Animated.Text entering={FadeIn.duration(300).delay(100)} style={styles.subtitle}>
        Play a quick practice game against a bot. We’ll guide you through the cards, captures, and scoring.
      </Animated.Text>
      <PrimaryButton label="Start Practice Match" onPress={onStart} delay={200} />
      <SecondaryButton label="Skip for now" onPress={onSkip} delay={300} />
    </View>
  );
}

/* ── Screen ──────────────────────────────────────────────────────────── */

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { updateOfflineName } = useLocalProfile();
  const [step, setStep] = useState(0);
  const [background, setBackground] = useState<PlayerBackground | null>(null);
  const [name, setName] = useState("");

  const finish = useCallback(async (startPractice = false) => {
    await onboarding.markComplete();
    if (background) await onboarding.setBackground(background);
    const finalName = name.trim() || "Player";
    await onboarding.setName(finalName);
    updateOfflineName(finalName);
    if (startPractice) {
      router.replace("/bot/difficulty");
    } else {
      router.replace("/");
    }
  }, [background, name, router, updateOfflineName]);

  const steps = [
    <WelcomeStep key="welcome" onNext={() => setStep(1)} />,
    <BackgroundStep key="background" value={background} onChange={setBackground} onNext={() => setStep(2)} />,
    <NameStep key="name" value={name} onChange={setName} onNext={() => setStep(3)} />,
    <PracticeStep key="practice" onStart={() => finish(true)} onSkip={() => finish(false)} />,
  ];

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <StepDots total={steps.length} current={step} />
          {step > 0 && (
            <TouchableOpacity onPress={() => finish(false)} style={styles.skipBtn}>
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.stepContainer}>{steps[step]}</View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/* ── Styles ──────────────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  dots: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.bg.tertiary,
  },
  skipBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  skipText: {
    color: colors.text.muted,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semiBold,
  },
  stepContainer: {
    flex: 1,
    justifyContent: "center",
  },
  step: {
    gap: spacing.md,
  },
  logoCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.bg.secondary,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: spacing.md,
    ...shadows.gold,
  },
  logoEmoji: {
    fontSize: 48,
  },
  title: {
    color: colors.text.primary,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.extraBold,
    textAlign: "center",
  },
  subtitle: {
    color: colors.text.secondary,
    fontSize: typography.size.body,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: spacing.sm,
  },
  primaryBtn: {
    borderRadius: radius.xl,
    overflow: "hidden",
    marginTop: spacing.sm,
    ...shadows.md,
  },
  primaryGradient: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
  },
  primaryText: {
    color: colors.bg.primary,
    fontSize: typography.size.body,
    fontWeight: typography.weight.extraBold,
  },
  secondaryBtn: {
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  secondaryText: {
    color: colors.text.muted,
    fontSize: typography.size.body,
    fontWeight: typography.weight.semiBold,
  },
  cardWrapper: {
    marginBottom: spacing.sm,
  },
  backgroundCard: {
    backgroundColor: colors.bg.secondary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  backgroundCardSelected: {
    borderColor: colors.accent.gold,
    backgroundColor: "rgba(168,85,247,0.08)",
  },
  backgroundIconCircle: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    backgroundColor: colors.bg.tertiary,
    justifyContent: "center",
    alignItems: "center",
  },
  backgroundTitle: {
    flex: 1,
    color: colors.text.secondary,
    fontSize: typography.size.body,
    fontWeight: typography.weight.bold,
  },
  backgroundSubtitle: {
    color: colors.text.muted,
    fontSize: typography.size.sm,
  },
  inputCard: {
    backgroundColor: colors.bg.secondary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    paddingHorizontal: spacing.md,
  },
  input: {
    color: colors.text.primary,
    fontSize: typography.size.body,
    paddingVertical: spacing.md,
  },
});
