import { useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { useRouter } from "expo-router";
import { colors, spacing, radius, glassStyle } from "../../src/theme/tokens";
import { useSocket } from "../../src/hooks/useSocket";
import Icon, { type IconName } from "../../src/components/Icon";

function parsePayload(payload: unknown): Record<string, any> {
  if (payload && typeof payload === "object") return payload as Record<string, any>;
  if (typeof payload === "string") {
    try {
      return JSON.parse(payload);
    } catch {
      return {};
    }
  }
  return {};
}

function describeNotification(n: any): { icon: IconName; title: string; detail: string } {
  const payload = parsePayload(n.payload);
  switch (n.type) {
    case "friend_request":
      return {
        icon: "profile",
        title: "Friend request",
        detail: payload.fromUsername
          ? `${payload.fromUsername} wants to be your friend.`
          : "Someone sent you a friend request.",
      };
    case "friend_accepted":
      return {
        icon: "profile",
        title: "Friend request accepted",
        detail: payload.username
          ? `${payload.username} accepted your friend request.`
          : "Your friend request was accepted.",
      };
    case "game_invite":
      return {
        icon: "casual",
        title: "Game invite",
        detail: payload.fromUsername
          ? `${payload.fromUsername} invited you to a ${payload.tc ?? "blitz"} game.`
          : "You were invited to a game.",
      };
    case "daily_puzzle":
      return {
        icon: "puzzles",
        title: "Daily puzzle",
        detail: "A new daily puzzle is ready for you.",
      };
    default:
      return {
        icon: "information",
        title: "Notification",
        detail: payload.message ?? "You have a new notification.",
      };
  }
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { notifications, getNotifications, markNotificationsRead, authState } = useSocket();

  useEffect(() => {
    if (authState?.profile) {
      getNotifications();
    }
  }, [authState, getNotifications]);

  // Entering this screen clears the unread badge.
  useEffect(() => {
    if (authState?.profile && (notifications?.unread ?? 0) > 0) {
      markNotificationsRead();
    }
  }, [authState, notifications, markNotificationsRead]);

  const items = notifications?.notifications ?? [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <Animated.View entering={FadeIn.duration(300)} style={styles.header}>
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
          style={styles.backBtn}
        >
          <Icon name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ width: 40 }} />
      </Animated.View>

      {!authState?.profile ? (
        <View style={styles.centerState}>
          <Icon name="locked" size={48} color={colors.text.muted} />
          <Text style={styles.emptyText}>Connect your wallet to see notifications.</Text>
          <TouchableOpacity
            style={styles.connectBtn}
            onPress={() => router.push("/auth/connect")}
          >
            <Text style={styles.connectBtnText}>Connect Wallet</Text>
          </TouchableOpacity>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.centerState}>
          <Icon name="information" size={48} color={colors.text.muted} />
          <Text style={styles.emptyText}>No notifications yet.</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {items.map((n: any) => {
            const { icon, title, detail } = describeNotification(n);
            return (
              <View key={n.id} style={[styles.item, !n.read && styles.itemUnread]}>
                <View style={styles.itemIcon}>
                  <Icon name={icon} size={22} color={colors.accent.gold} />
                </View>
                <View style={styles.itemBody}>
                  <Text style={styles.itemTitle}>{title}</Text>
                  <Text style={styles.itemDetail}>{detail}</Text>
                  {n.createdAt ? (
                    <Text style={styles.itemTime}>
                      {new Date(n.createdAt).toLocaleString()}
                    </Text>
                  ) : null}
                </View>
                {!n.read && <View style={styles.unreadDot} />}
              </View>
            );
          })}
        </View>
      )}
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
  centerState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: spacing.xxl * 2,
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  emptyText: {
    fontSize: 15,
    color: colors.text.muted,
    fontWeight: "500",
    textAlign: "center",
  },
  connectBtn: {
    backgroundColor: colors.accent.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  connectBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  list: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  item: {
    ...glassStyle,
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  itemUnread: {
    borderColor: colors.accent.gold,
    borderWidth: 1,
  },
  itemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(212,168,67,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  itemBody: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text.primary,
  },
  itemDetail: {
    fontSize: 13,
    color: colors.text.secondary,
    marginTop: 2,
  },
  itemTime: {
    fontSize: 11,
    color: colors.text.muted,
    marginTop: 4,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent.gold,
  },
});
