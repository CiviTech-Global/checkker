import { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
  Alert,
} from "react-native";
import Animated, { FadeIn, SlideInUp } from "react-native-reanimated";
import { useRouter } from "expo-router";
import { colors, spacing, radius, glassStyle } from "../../src/theme/tokens";
import { useSocket } from "../../src/hooks/useSocket";
import Icon from "../../src/components/Icon";

export default function FriendsScreen() {
  const router = useRouter();
  const {
    connected,
    authState,
    gameState,
    friendsData,
    getFriends,
    sendFriendRequest,
    respondFriendRequest,
    removeFriend,
    inviteFriend,
    respondInvite,
    onFriendRequestResult,
    onIncomingFriendRequest,
    onFriendAccepted,
    onInviteSent,
    onPrivateInvite,
    onInviteDeclined,
    onInviteResponseResult,
  } = useSocket();

  const [usernameInput, setUsernameInput] = useState("");
  const [sending, setSending] = useState(false);
  const awaitingGameRef = useRef(false);
  const lastGameIdRef = useRef<string | null>((gameState as any)?.gameId ?? null);

  useEffect(() => {
    if (connected) getFriends();
  }, [connected, getFriends]);

  useEffect(() => {
    onFriendRequestResult((data) => {
      setSending(false);
      if (data.success) {
        setUsernameInput("");
        Alert.alert("Request Sent", `Friend request sent to ${data.username}.`);
      } else {
        Alert.alert("Couldn't Send Request", data.error ?? "Unknown error");
      }
    });
    onIncomingFriendRequest((data) => {
      getFriends();
      Alert.alert("Friend Request", `${data.fromUsername} wants to be your friend.`);
    });
    onFriendAccepted((data) => {
      Alert.alert("Friend Added", `${data.username} accepted your request!`);
    });
    onInviteSent((data) => {
      if (data.success) {
        awaitingGameRef.current = true;
        Alert.alert(
          "Invite Sent",
          data.online
            ? "Waiting for your friend to accept..."
            : "Your friend is offline — they'll see the invite in their notifications."
        );
      } else {
        Alert.alert("Couldn't Invite", data.error ?? "Unknown error");
      }
    });
    onInviteDeclined((data) => {
      awaitingGameRef.current = false;
      Alert.alert("Invite Declined", `${data.byUsername ?? "Your friend"} declined the invite.`);
    });
    onPrivateInvite((data) => {
      Alert.alert(
        "Game Invite",
        `${data.fromUsername} invited you to a ${data.tc} game!`,
        [
          { text: "Decline", style: "cancel", onPress: () => respondInvite(data.inviteId, false) },
          {
            text: "Accept",
            onPress: () => {
              awaitingGameRef.current = true;
              respondInvite(data.inviteId, true);
            },
          },
        ]
      );
    });
    onInviteResponseResult((data) => {
      if (!data.success) {
        awaitingGameRef.current = false;
        Alert.alert("Invite", data.error ?? "Invite is no longer valid.");
      }
    });
  }, [
    onFriendRequestResult,
    onIncomingFriendRequest,
    onFriendAccepted,
    onInviteSent,
    onPrivateInvite,
    onInviteDeclined,
    onInviteResponseResult,
    respondInvite,
    getFriends,
  ]);

  // Navigate into the game once the private match starts.
  useEffect(() => {
    const gameId = (gameState as any)?.gameId ?? null;
    if (gameId && gameId !== lastGameIdRef.current && awaitingGameRef.current) {
      awaitingGameRef.current = false;
      router.push(`/game/${gameId}?mode=casual`);
    }
    lastGameIdRef.current = gameId;
  }, [gameState, router]);

  const handleSendRequest = useCallback(() => {
    const username = usernameInput.trim();
    if (username.length < 3) {
      Alert.alert("Invalid Username", "Usernames are at least 3 characters.");
      return;
    }
    setSending(true);
    sendFriendRequest(username);
  }, [usernameInput, sendFriendRequest]);

  const handleInvite = useCallback(
    (friend: any) => {
      Alert.alert("Invite to Game", `Challenge ${friend.username} to a blitz game?`, [
        { text: "Cancel", style: "cancel" },
        { text: "Invite", onPress: () => inviteFriend(friend.userId, "blitz") },
      ]);
    },
    [inviteFriend]
  );

  const handleRemove = useCallback(
    (friend: any) => {
      Alert.alert("Remove Friend", `Remove ${friend.username} from your friends?`, [
        { text: "Cancel", style: "cancel" },
        { text: "Remove", style: "destructive", onPress: () => removeFriend(friend.friendshipId) },
      ]);
    },
    [removeFriend]
  );

  const friends = friendsData?.friends ?? [];
  const pending = friendsData?.pending ?? [];
  const isAuthenticated = !!authState?.profile;

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
        <Text style={styles.headerTitle}>Friends</Text>
        <View style={{ width: 40 }} />
      </Animated.View>

      {!isAuthenticated && (
        <Animated.View entering={FadeIn.duration(300).delay(100)} style={[styles.section, glassStyle]}>
          <Text style={styles.mutedText}>
            Connect your wallet and pick a username to add friends and play private games.
          </Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push("/auth/connect")}>
            <Text style={styles.primaryBtnText}>Connect</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {isAuthenticated && (
        <>
          {/* Add friend */}
          <Animated.View
            entering={SlideInUp.duration(300).delay(100).springify().damping(15)}
            style={[styles.section, glassStyle]}
          >
            <Text style={styles.sectionTitle}>Add Friend</Text>
            <View style={styles.addRow}>
              <TextInput
                style={styles.input}
                value={usernameInput}
                onChangeText={setUsernameInput}
                placeholder="Friend's username"
                placeholderTextColor={colors.text.muted}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={32}
              />
              <TouchableOpacity
                style={[styles.primaryBtn, sending && { opacity: 0.5 }]}
                onPress={handleSendRequest}
                disabled={sending}
              >
                <Text style={styles.primaryBtnText}>{sending ? "..." : "Add"}</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Pending requests */}
          {pending.length > 0 && (
            <Animated.View
              entering={SlideInUp.duration(300).delay(150).springify().damping(15)}
              style={[styles.section, glassStyle]}
            >
              <Text style={styles.sectionTitle}>Friend Requests</Text>
              {pending.map((req: any) => (
                <View key={req.friendshipId} style={styles.row}>
                  <Text style={styles.rowName}>{req.fromUsername}</Text>
                  <TouchableOpacity
                    style={styles.acceptBtn}
                    onPress={() => respondFriendRequest(req.friendshipId, true)}
                  >
                    <Text style={styles.acceptBtnText}>Accept</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.declineBtn}
                    onPress={() => respondFriendRequest(req.friendshipId, false)}
                  >
                    <Text style={styles.declineBtnText}>Decline</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </Animated.View>
          )}

          {/* Friends list */}
          <Animated.View
            entering={SlideInUp.duration(300).delay(200).springify().damping(15)}
            style={[styles.section, glassStyle]}
          >
            <Text style={styles.sectionTitle}>My Friends</Text>
            {friends.length === 0 ? (
              <Text style={styles.mutedText}>
                No friends yet. Add someone by username to play private games.
              </Text>
            ) : (
              friends.map((friend: any) => (
                <View key={friend.friendshipId} style={styles.row}>
                  <View
                    style={[
                      styles.presenceDot,
                      { backgroundColor: friend.online ? colors.accent.green : colors.text.muted },
                    ]}
                  />
                  <View style={styles.friendInfo}>
                    <Text style={styles.rowName}>{friend.username}</Text>
                    <Text style={styles.rowSub}>{friend.rating} ELO</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.inviteBtn, !friend.online && { opacity: 0.5 }]}
                    onPress={() => handleInvite(friend)}
                  >
                    <Text style={styles.inviteBtnText}>Invite</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleRemove(friend)} style={styles.removeBtn}>
                    <Icon name="close" size={16} color={colors.text.muted} />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </Animated.View>
        </>
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
  section: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.accent.gold,
    letterSpacing: 1,
  },
  mutedText: {
    fontSize: 13,
    color: colors.text.muted,
    lineHeight: 18,
  },
  addRow: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "center",
  },
  input: {
    flex: 1,
    backgroundColor: colors.bg.tertiary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  primaryBtn: {
    backgroundColor: colors.accent.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border.gold,
  },
  primaryBtnText: {
    color: colors.text.primary,
    fontSize: 14,
    fontWeight: "600",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  presenceDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  friendInfo: {
    flex: 1,
  },
  rowName: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text.primary,
    flex: 1,
  },
  rowSub: {
    fontSize: 12,
    color: colors.text.muted,
  },
  acceptBtn: {
    backgroundColor: "rgba(52,208,88,0.15)",
    borderRadius: radius.sm,
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.accent.green,
  },
  acceptBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.accent.green,
  },
  declineBtn: {
    backgroundColor: "rgba(224,64,64,0.15)",
    borderRadius: radius.sm,
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.accent.red,
  },
  declineBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.accent.red,
  },
  inviteBtn: {
    backgroundColor: "rgba(212,168,67,0.15)",
    borderRadius: radius.sm,
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.accent.gold,
  },
  inviteBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.accent.gold,
  },
  removeBtn: {
    padding: spacing.xxs,
  },
});
