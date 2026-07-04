import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useBot } from "../../src/context/BotContext";
import { colors, spacing, radius, gradients } from "../../src/theme/tokens";
import { LinearGradient } from "expo-linear-gradient";
import Icon from "../../src/components/Icon";

export default function BotModeScreen() {
  const router = useRouter();
  const { config, maturity, setInBotMatch } = useBot();

  const start = (mode: "ranked" | "casual") => {
    if (!config.enabled) {
      router.push("/bot/config");
      return;
    }
    const difficulty = config.difficulty;
    setInBotMatch(true);
    router.push(`/game/queue?mode=${mode}&difficulty=${difficulty}&tc=blitz&bot=true`);
  };

  return (
    <LinearGradient colors={gradients.velvet} style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Delegate Mode</Text>
        <TouchableOpacity onPress={() => router.push("/bot/config")} style={styles.settingsBtn}>
          <Icon name="settings" size={22} color={colors.text.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.maturityCard}>
        <Text style={styles.maturityTitle}>Bot Maturity</Text>
        <View style={styles.barBg}>
          <View style={[styles.barFill, { flex: maturity.maturityScore }]} />
          <View style={{ flex: 100 - maturity.maturityScore }} />
        </View>
        <Text style={styles.maturitySub}>
          {maturity.maturityScore}/100 • {maturity.wins}W {maturity.losses}L {maturity.draws}D
        </Text>
        {maturity.unlockedTraits.length > 0 && (
          <View style={styles.traits}>
            {maturity.unlockedTraits.map((id) => (
              <View key={id} style={styles.traitChip}>
                <Text style={styles.traitText}>{id}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={styles.arenas}>
        <ArenaButton
          label="Ranked Matches"
          subtitle="Bot plays for rating and rewards"
          symbol="ranked"
          onPress={() => start("ranked")}
        />
        <ArenaButton
          label="Casual Matches"
          subtitle="Bot plays unrated practice games"
          symbol="casual"
          onPress={() => start("casual")}
        />
      </View>

      {!config.enabled && (
        <View style={styles.warning}>
          <Text style={styles.warningText}>
            Delegate mode is disabled. Configure and enable it first.
          </Text>
        </View>
      )}
    </LinearGradient>
  );
}

function ArenaButton({
  label,
  subtitle,
  symbol,
  onPress,
}: {
  label: string;
  subtitle: string;
  symbol: import("../../src/components/Icon").IconName;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.arenaBtn} onPress={onPress}>
      <View style={styles.arenaIcon}>
        <Icon name={symbol} size={24} color={colors.accent.gold} />
      </View>
      <View style={styles.arenaText}>
        <Text style={styles.arenaLabel}>{label}</Text>
        <Text style={styles.arenaSubtitle}>{subtitle}</Text>
      </View>
      <Icon name="chevron-right" size={20} color={colors.text.muted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.md },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: spacing.xl, marginBottom: spacing.md },
  title: { fontSize: 28, fontWeight: "800", color: colors.accent.gold },
  settingsBtn: { padding: spacing.sm },
  maturityCard: { backgroundColor: colors.bg.secondary, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border.gold, gap: spacing.sm },
  maturityTitle: { color: colors.text.primary, fontSize: 16, fontWeight: "700" },
  barBg: { flexDirection: "row", height: 8, borderRadius: radius.sm, overflow: "hidden", backgroundColor: colors.bg.primary },
  barFill: { backgroundColor: colors.accent.gold },
  maturitySub: { color: colors.text.muted, fontSize: 13 },
  traits: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  traitChip: { backgroundColor: colors.accent.gold + "26", paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.sm },
  traitText: { color: colors.text.primary, fontSize: 11 },
  arenas: { gap: spacing.md, marginTop: spacing.lg },
  arenaBtn: { flexDirection: "row", alignItems: "center", backgroundColor: colors.bg.secondary, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border.subtle },
  arenaIcon: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: colors.accent.gold + "26", alignItems: "center", justifyContent: "center" },
  arenaText: { flex: 1, marginLeft: spacing.md },
  arenaLabel: { color: colors.text.primary, fontSize: 16, fontWeight: "700" },
  arenaSubtitle: { color: colors.text.muted, fontSize: 13 },
  warning: { marginTop: spacing.lg, padding: spacing.md, backgroundColor: colors.accent.red + "1A", borderRadius: radius.md },
  warningText: { color: colors.accent.red, textAlign: "center" },
});
