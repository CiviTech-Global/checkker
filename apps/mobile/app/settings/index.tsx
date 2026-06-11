import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, Switch, StyleSheet, Alert } from "react-native";
import Animated, { FadeIn, SlideInUp } from "react-native-reanimated";
import { useRouter } from "expo-router";
import {
  colors,
  spacing,
  radius,
} from "../../src/theme/tokens";
import { appSettings, type AppSettings } from "../../src/services/SettingsService";
import { syncMusicWithSettings, setMusicVolume } from "../../src/utils/music";
import Icon from "../../src/components/Icon";

function SectionTitle({ title, delay = 0 }: { title: string; delay?: number }) {
  return (
    <Animated.View
      entering={SlideInUp.duration(300).delay(delay).springify().damping(15)}
      style={styles.sectionTitleRow}
    >
      <Text style={styles.sectionTitleText}>{title.toUpperCase()}</Text>
      <View style={styles.sectionTitleLine} />
    </Animated.View>
  );
}

function SwitchTile({
  icon,
  title,
  subtitle,
  value,
  onValueChange,
  delay = 0,
}: {
  icon: string;
  title: string;
  subtitle: string;
  value: boolean;
  onValueChange: (val: boolean) => void;
  delay?: number;
}) {
  return (
    <Animated.View
      entering={SlideInUp.duration(300).delay(delay).springify().damping(15)}
      style={styles.tileCard}
    >
      <View style={styles.switchRow}>
        <Icon name={icon as any} size={22} color={colors.accent.gold} />
        <View style={styles.switchTextCol}>
          <Text style={styles.tileTitle}>{title}</Text>
          <Text style={styles.tileSubtitle}>{subtitle}</Text>
        </View>
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: colors.bg.tertiary, true: colors.accent.gold }}
          thumbColor={value ? colors.text.primary : colors.text.muted}
        />
      </View>
    </Animated.View>
  );
}

function ChipSelector({
  icon,
  title,
  value,
  options,
  onChange,
  delay = 0,
}: {
  icon: string;
  title: string;
  value: string;
  options: string[];
  onChange: (val: string) => void;
  delay?: number;
}) {
  return (
    <Animated.View
      entering={SlideInUp.duration(300).delay(delay).springify().damping(15)}
      style={styles.tileCard}
    >
      <View style={styles.chipHeader}>
        <Icon name={icon as any} size={20} color={colors.accent.gold} />
        <Text style={styles.tileTitle}>{title}</Text>
      </View>
      <View style={styles.chipRow}>
        {options.map((option) => {
          const selected = option === value;
          const label = option.charAt(0).toUpperCase() + option.slice(1).replace(/_/g, " ");
          return (
            <TouchableOpacity
              key={option}
              activeOpacity={0.7}
              onPress={() => onChange(option)}
              style={[styles.chip, selected && styles.chipSelected]}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </Animated.View>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const [settings, setSettings] = useState<AppSettings>(appSettings.settings);

  useEffect(() => {
    appSettings.load().then(setSettings);
  }, []);

  const handle = async (key: keyof AppSettings, value: boolean | string | number) => {
    const methodMap: Record<keyof AppSettings, (v: any) => Promise<void>> = {
      soundEnabled: appSettings.setSoundEnabled.bind(appSettings),
      musicEnabled: appSettings.setMusicEnabled.bind(appSettings),
      musicVolume: appSettings.setMusicVolume.bind(appSettings),
      hapticEnabled: appSettings.setHapticEnabled.bind(appSettings),
      reducedMotion: appSettings.setReducedMotion.bind(appSettings),
      boardTheme: appSettings.setBoardTheme.bind(appSettings),
      pieceTheme: appSettings.setPieceTheme.bind(appSettings),
      cardBack: appSettings.setCardBack.bind(appSettings),
    };
    await methodMap[key](value);
    setSettings((prev) => ({ ...prev, [key]: value }));
    if (key === "musicEnabled") syncMusicWithSettings();
    if (key === "musicVolume") setMusicVolume(value as number);
  };

  const confirmClearData = () => {
    Alert.alert(
      "Clear Local Data",
      "This erases all locally stored settings, tutorial progress, and puzzle streaks on this device. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear Data",
          style: "destructive",
          onPress: async () => {
            await appSettings.clearAllData();
            const fresh = await appSettings.load();
            setSettings(fresh);
            syncMusicWithSettings();
          },
        },
      ]
    );
  };

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
          <Icon name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 40 }} />
      </Animated.View>

      {/* Audio & Feedback */}
      <SectionTitle title="Audio & Feedback" delay={100} />

      <SwitchTile
        icon="volume-high"
        title="Sound Effects"
        subtitle="Play sounds for moves, captures, and game events"
        value={settings.soundEnabled}
        onValueChange={(v) => handle("soundEnabled", v)}
        delay={150}
      />

      <SwitchTile
        icon="volume-high"
        title="Background Music"
        subtitle="Ambient music while you play"
        value={settings.musicEnabled}
        onValueChange={(v) => handle("musicEnabled", v)}
        delay={175}
      />

      {settings.musicEnabled && (
        <ChipSelector
          icon="volume-high"
          title="Music Volume"
          value={
            settings.musicVolume <= 0.34
              ? "low"
              : settings.musicVolume <= 0.67
                ? "medium"
                : "high"
          }
          options={["low", "medium", "high"]}
          onChange={(v) =>
            handle("musicVolume", v === "low" ? 0.25 : v === "medium" ? 0.5 : 0.9)
          }
          delay={185}
        />
      )}

      <SwitchTile
        icon="phone-vibrate"
        title="Haptic Feedback"
        subtitle="Vibrate on card selection and moves"
        value={settings.hapticEnabled}
        onValueChange={(v) => handle("hapticEnabled", v)}
        delay={200}
      />

      <SwitchTile
        icon="motion-play"
        title="Reduced Motion"
        subtitle="Minimize animations for accessibility"
        value={settings.reducedMotion}
        onValueChange={(v) => handle("reducedMotion", v)}
        delay={250}
      />

      {/* Appearance */}
      <SectionTitle title="Appearance" delay={300} />

      <ChipSelector
        icon="grid-view"
        title="Board Theme"
        value={settings.boardTheme}
        options={["classic", "emerald", "dark"]}
        onChange={(v) => handle("boardTheme", v)}
        delay={350}
      />

      <ChipSelector
        icon="chess-piece"
        title="Piece Theme"
        value={settings.pieceTheme}
        options={["default", "neo", "wood"]}
        onChange={(v) => handle("pieceTheme", v)}
        delay={400}
      />

      <ChipSelector
        icon="cards-playing"
        title="Card Back"
        value={settings.cardBack}
        options={["default", "royal_flush", "midnight"]}
        onChange={(v) => handle("cardBack", v)}
        delay={450}
      />

      {/* Account */}
      <SectionTitle title="Account" delay={475} />

      <Animated.View
        entering={SlideInUp.duration(300).delay(490).springify().damping(15)}
        style={styles.tileCard}
      >
        <TouchableOpacity onPress={confirmClearData} style={styles.actionRow} activeOpacity={0.7}>
          <Icon name="incorrect" size={22} color={colors.accent.red} />
          <View style={styles.switchTextCol}>
            <Text style={[styles.tileTitle, { color: colors.accent.red }]}>Clear Local Data</Text>
            <Text style={styles.tileSubtitle}>
              Erase settings, tutorial progress, and puzzle streaks on this device
            </Text>
          </View>
          <Icon name="chevron-right" size={18} color={colors.text.muted} />
        </TouchableOpacity>
      </Animated.View>

      {/* About */}
      <SectionTitle title="About" delay={500} />

      <Animated.View
        entering={SlideInUp.duration(300).delay(550).springify().damping(15)}
        style={[styles.tileCard, styles.aboutRow]}
      >
        <Icon name="information" size={22} color={colors.accent.gold} />
        <View style={styles.aboutTextCol}>
          <Text style={styles.tileTitle}>Version</Text>
          <Text style={styles.aboutVersion}>1.0.0</Text>
        </View>
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
    paddingBottom: spacing.xxl,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: "700",
    color: colors.accent.gold,
    textAlign: "center",
    letterSpacing: 2,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  sectionTitleText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.accent.gold,
    letterSpacing: 1.5,
  },
  sectionTitleLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border.gold,
  },
  tileCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: colors.bg.secondary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  switchTextCol: {
    flex: 1,
    gap: 2,
  },
  tileTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text.primary,
  },
  tileSubtitle: {
    fontSize: 12,
    color: colors.text.muted,
  },
  chipHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  chip: {
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.bg.tertiary,
    borderWidth: 1,
    borderColor: "transparent",
  },
  chipSelected: {
    backgroundColor: colors.accent.gold,
    borderColor: colors.accent.goldBright,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text.primary,
  },
  chipTextSelected: {
    color: colors.text.dark,
  },
  aboutRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  aboutTextCol: {
    flex: 1,
    gap: 2,
  },
  aboutVersion: {
    fontSize: 13,
    color: colors.text.muted,
  },
});
