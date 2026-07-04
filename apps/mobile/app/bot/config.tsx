import { useEffect, useRef, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Switch } from "react-native";
import { useRouter } from "expo-router";
import { useBot } from "../../src/context/BotContext";
import { useSocket } from "../../src/hooks/useSocket";
import { colors, spacing, radius } from "../../src/theme/tokens";
import type { BotDifficulty, BotStrategy } from "@checkker/shared";

const SAVE_TIMEOUT_MS = 5000;

const difficulties: BotDifficulty[] = ["beginner", "intermediate", "advanced", "master"];
const strategies: BotStrategy[] = ["balanced", "aggressive", "defensive", "gambler"];

export default function BotConfigScreen() {
  const router = useRouter();
  const { config, maturity, setConfig, setEnabled } = useBot();
  const { authState, updateBotConfig, onBotConfigUpdated, onBotError, guestIdentify } = useSocket();
  const [local, setLocal] = useState(config);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isAuthenticated = authState?.profile != null;
  const walletVerified = authState != null && authState.profile == null;

  // Ensure a guest identity exists for wallet-less bot config sync.
  useEffect(() => {
    if (!authState) {
      void guestIdentify();
    }
  }, [authState, guestIdentify]);

  useEffect(() => {
    onBotConfigUpdated((data) => {
      if (data.success) {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setSaving(false);
        router.back();
      }
    });
  }, [onBotConfigUpdated, router]);

  useEffect(() => {
    onBotError((msg) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setSaving(false);
      if (msg === "Not authenticated") {
        setError("Sign in to sync bot settings across devices. Settings are saved locally.");
      } else {
        setError(msg);
      }
    });
  }, [onBotError]);

  const handleSave = () => {
    setError(null);
    setInfo(null);
    setSaving(true);
    setConfig(local).then(() => {
      if (!isAuthenticated) {
        setSaving(false);
        if (walletVerified) {
          setInfo("Settings saved locally. Complete profile setup to sync across devices.");
        } else {
          setInfo("Settings saved locally. Sign in to sync across devices.");
        }
        return;
      }
      updateBotConfig(local, maturity);
      timeoutRef.current = setTimeout(() => {
        setSaving(false);
        setError("Server sync timed out. Settings are saved locally.");
      }, SAVE_TIMEOUT_MS);
    });
  };

  const update = (patch: Partial<typeof local>) => setLocal((prev) => ({ ...prev, ...patch }));

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bot Configuration</Text>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.row, styles.enableRow]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Enable Delegate Mode</Text>
            <Text style={styles.hint}>Let the bot play online matches for you</Text>
          </View>
          <Switch value={local.enabled} onValueChange={(v) => update({ enabled: v })} />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Difficulty</Text>
          <View style={styles.chipRow}>
            {difficulties.map((d) => (
              <TouchableOpacity
                key={d}
                style={[styles.chip, local.difficulty === d && styles.chipActive]}
                onPress={() => update({ difficulty: d })}
              >
                <Text style={[styles.chipText, local.difficulty === d && styles.chipTextActive]}>
                  {d[0].toUpperCase() + d.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Strategy</Text>
          <View style={styles.chipRow}>
            {strategies.map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.chip, local.strategy === s && styles.chipActive]}
                onPress={() => update({ strategy: s })}
              >
                <Text style={[styles.chipText, local.strategy === s && styles.chipTextActive]}>
                  {s[0].toUpperCase() + s.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Slider label="Patience" value={local.patience} onChange={(v) => update({ patience: v })} />
        <Slider label="Deep Thinking" value={local.deepThinking} onChange={(v) => update({ deepThinking: v })} />
        <Slider label="Risk Tolerance" value={local.riskTolerance} onChange={(v) => update({ riskTolerance: v })} />
        <Slider
          label="Thinking Delay"
          value={local.thinkingDelayMs}
          min={500}
          max={5000}
          step={500}
          display={(v) => `${v}ms`}
          onChange={(v) => update({ thinkingDelayMs: v })}
        />

        <View style={styles.row}>
          <Text style={styles.label}>Auto-rematch</Text>
          <Switch value={local.autoRematch} onValueChange={(v) => update({ autoRematch: v })} />
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Allow Takeover</Text>
          <Switch value={local.allowTakeover} onValueChange={(v) => update({ allowTakeover: v })} />
        </View>
      </ScrollView>

      {info && (
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>{info}</Text>
        </View>
      )}
      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
        <Text style={styles.saveText}>{saving ? "Saving..." : "Save & Sync"}</Text>
      </TouchableOpacity>
      {!isAuthenticated && (
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => router.push(walletVerified ? "/auth/setup" : "/profile")}
        >
          <Text style={styles.secondaryBtnText}>
            {walletVerified ? "Complete Profile Setup" : "Sign In to Sync"}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function Slider({
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  display,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  display?: (v: number) => string;
  onChange: (v: number) => void;
}) {
  const steps = Math.floor((max - min) / step);
  return (
    <View style={styles.section}>
      <View style={styles.sliderHeader}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{display ? display(value) : value}</Text>
      </View>
      <View style={styles.sliderTrack}>
        {Array.from({ length: steps + 1 }).map((_, i) => {
          const v = min + i * step;
          const active = value >= v;
          return (
            <TouchableOpacity
              key={i}
              style={[styles.sliderDot, active && styles.sliderDotActive]}
              onPress={() => onChange(v)}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.primary, padding: spacing.md },
  title: { fontSize: 24, fontWeight: "800", color: colors.accent.gold, marginBottom: spacing.md },
  scroll: { gap: spacing.md, paddingBottom: spacing.xl },
  section: { gap: spacing.sm },
  label: { color: colors.text.primary, fontSize: 16, fontWeight: "600" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.subtle },
  chipActive: { backgroundColor: colors.accent.primary, borderColor: colors.accent.primary },
  chipText: { color: colors.text.primary, fontWeight: "600" },
  chipTextActive: { color: "#fff" },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: spacing.sm },
  enableRow: { backgroundColor: colors.bg.secondary, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  hint: { color: colors.text.muted, fontSize: 13, marginTop: 2 },
  sliderHeader: { flexDirection: "row", justifyContent: "space-between" },
  value: { color: colors.accent.gold, fontWeight: "700" },
  sliderTrack: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", height: 24 },
  sliderDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.subtle },
  sliderDotActive: { backgroundColor: colors.accent.primary, borderColor: colors.accent.primary },
  saveBtn: { backgroundColor: colors.accent.primary, padding: spacing.md, borderRadius: radius.lg, alignItems: "center", marginTop: spacing.sm },
  saveText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  secondaryBtn: { padding: spacing.md, borderRadius: radius.lg, alignItems: "center", marginTop: spacing.sm, borderWidth: 1, borderColor: colors.accent.blue },
  secondaryBtnText: { color: colors.accent.blue, fontSize: 16, fontWeight: "700" },
  infoBox: { backgroundColor: colors.accent.blue + "26", borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  infoText: { color: colors.accent.blue, textAlign: "center" },
  errorBox: { backgroundColor: colors.accent.red + "26", borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  errorText: { color: colors.accent.red, textAlign: "center" },
});
