import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import Animated, { FadeIn, SlideInUp } from "react-native-reanimated";
import { useRouter } from "expo-router";
import {
  colors,
  spacing,
  radius,
  glassStyle,
} from "../../src/theme/tokens";
import { useSocket } from "../../src/hooks/useSocket";
import { getAvatar } from "@checkker/shared";
import { useLocalProfile } from "../../src/context/LocalProfileContext";
import Icon from "../../src/components/Icon";

interface LeaderboardEntry {
  id: string;
  username: string;
  avatarId: string;
  rating: number;
  wins: number;
  losses: number;
  draws: number;
  gamesPlayed: number;
}

function RankBadge({ rank }: { rank: number }) {
  const badgeColor =
    rank === 1 ? colors.accent.gold :
    rank === 2 ? "#C0C0C0" :
    rank === 3 ? colors.accent.bronze :
    colors.text.muted;

  return (
    <View style={[styles.rankBadge, { borderColor: badgeColor }]}>
      <Text style={[styles.rankText, { color: badgeColor }]}>
        {rank <= 3 ? ["\u2655", "\u2656", "\u2657"][rank - 1] : `#${rank}`}
      </Text>
    </View>
  );
}

function LeaderboardRow({
  entry,
  rank,
  isMe,
}: {
  entry: LeaderboardEntry;
  rank: number;
  isMe: boolean;
}) {
  const avatar = getAvatar(entry.avatarId);
  const winRate = entry.gamesPlayed > 0
    ? Math.round((entry.wins / entry.gamesPlayed) * 100)
    : 0;

  return (
    <View style={[styles.row, isMe && styles.rowHighlight]}>
      <RankBadge rank={rank} />
      <Text style={styles.rowAvatar}>{avatar?.symbol ?? "\u265A"}</Text>
      <View style={styles.rowInfo}>
        <Text style={styles.rowName} numberOfLines={1}>{entry.username}</Text>
        <Text style={styles.rowRecord}>
          {entry.wins}W {entry.losses}L {entry.draws}D ({winRate}%)
        </Text>
      </View>
      <Text style={styles.rowRating}>{entry.rating}</Text>
    </View>
  );
}

export default function LeaderboardScreen() {
  const router = useRouter();
  const { connected, getLeaderboard, onLeaderboard } = useSocket();
  const { demoLeaderboard } = useLocalProfile();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const usingDemo = demoLeaderboard !== null;

  useEffect(() => {
    if (usingDemo) {
      setEntries(demoLeaderboard);
      setMyRank(null);
      setLoading(false);
      return;
    }
    onLeaderboard((data) => {
      setEntries(data.entries ?? []);
      setMyRank(data.myRank);
      setLoading(false);
      setRefreshing(false);
    });
  }, [onLeaderboard, usingDemo, demoLeaderboard]);

  useEffect(() => {
    if (!usingDemo && connected) getLeaderboard();
  }, [connected, getLeaderboard, usingDemo]);

  const onRefresh = useCallback(() => {
    if (usingDemo) return;
    setRefreshing(true);
    getLeaderboard();
  }, [getLeaderboard, usingDemo]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <Animated.View entering={FadeIn.duration(300)} style={styles.header}>
        <TouchableOpacity
          onPress={() => router.canGoBack() ? router.back() : router.replace("/")}
          style={styles.backBtn}
        >
          <Icon name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Leaderboard</Text>
        {usingDemo ? (
          <View style={styles.demoBadge}>
            <Text style={styles.demoBadgeText}>DEMO</Text>
          </View>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </Animated.View>

      {/* My Rank */}
      {myRank !== null && (
        <Animated.View entering={SlideInUp.duration(300).delay(100)} style={[styles.myRankCard, glassStyle]}>
          <Text style={styles.myRankLabel}>Your Rank</Text>
          <Text style={styles.myRankValue}>#{myRank}</Text>
        </Animated.View>
      )}

      {/* Table Header */}
      <View style={styles.tableHeader}>
        <Text style={[styles.tableHeaderText, { width: 50 }]}>Rank</Text>
        <Text style={[styles.tableHeaderText, { flex: 1 }]}>Player</Text>
        <Text style={[styles.tableHeaderText, { width: 60, textAlign: "right" }]}>Rating</Text>
      </View>

      {loading ? (
        <View style={styles.loadingSection}>
          <ActivityIndicator size="large" color={colors.accent.gold} />
          <Text style={styles.loadingText}>Loading leaderboard...</Text>
        </View>
      ) : entries.length === 0 ? (
        <View style={styles.loadingSection}>
          <Text style={styles.emptyText}>No players ranked yet.</Text>
          <Text style={styles.emptySubtext}>Play ranked games to appear here!</Text>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <LeaderboardRow
              entry={item}
              rank={index + 1}
              isMe={myRank === index + 1}
            />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.accent.gold}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.primary },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  backArrow: { fontSize: 24, color: colors.text.primary, fontWeight: "600" },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: "700", color: colors.accent.gold, textAlign: "center", letterSpacing: 2 },
  myRankCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border.gold,
  },
  myRankLabel: { fontSize: 14, color: colors.text.secondary, fontWeight: "600" },
  myRankValue: { fontSize: 24, fontWeight: "800", color: colors.accent.gold },
  tableHeader: {
    flexDirection: "row",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderColor: colors.border.subtle,
  },
  tableHeaderText: { fontSize: 12, color: colors.text.muted, textTransform: "uppercase", letterSpacing: 1, fontWeight: "600" },
  listContent: { paddingBottom: spacing.xxl },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.subtle,
  },
  rowHighlight: {
    backgroundColor: "rgba(205,127,50,0.08)",
    borderLeftWidth: 3,
    borderLeftColor: colors.accent.gold,
  },
  rankBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  rankText: { fontSize: 14, fontWeight: "700" },
  rowAvatar: { fontSize: 24 },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 16, fontWeight: "600", color: colors.text.primary },
  rowRecord: { fontSize: 12, color: colors.text.muted },
  rowRating: { fontSize: 18, fontWeight: "700", color: colors.accent.gold, width: 60, textAlign: "right" },
  loadingSection: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md },
  loadingText: { fontSize: 14, color: colors.text.muted },
  emptyText: { fontSize: 18, fontWeight: "600", color: colors.text.secondary },
  emptySubtext: { fontSize: 14, color: colors.text.muted },
  demoBadge: {
    backgroundColor: colors.accent.gold,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    minWidth: 40,
    alignItems: "center",
  },
  demoBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.bg.primary,
    letterSpacing: 1,
  },
});
