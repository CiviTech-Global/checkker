import React from "react";
import { View, Text, StyleSheet } from "react-native";
import type { PlayerProfile } from "@checkker/shared";
import { colors, spacing, glassStyle, radius } from "../theme/tokens";

interface PlayerProfileCardProps {
  profile: PlayerProfile | null;
  side: "left" | "right";
}

export default function PlayerProfileCard({ profile, side }: PlayerProfileCardProps) {
  if (!profile) return null;

  const initials = profile.displayName
    .split(/[\s-]/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const streakIcon = profile.currentStreak > 0 ? "\uD83D\uDD25" : profile.currentStreak < 0 ? "\u2744\uFE0F" : null;
  const streakCount = Math.abs(profile.currentStreak);

  return (
    <View style={[styles.container, side === "right" && styles.rightAlign]}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>
      <View style={[styles.info, side === "right" && styles.infoRight]}>
        <Text style={styles.name} numberOfLines={1}>{profile.displayName}</Text>
        <View style={styles.row}>
          <Text style={styles.rating}>{profile.rating}</Text>
          {streakIcon && streakCount > 0 && (
            <View style={styles.streakBadge}>
              <Text style={styles.streakText}>{streakIcon} {streakCount}</Text>
            </View>
          )}
        </View>
        <Text style={styles.games}>{profile.gamesPlayed} games</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    ...glassStyle,
    borderRadius: radius.md,
    padding: spacing.xs,
  },
  rightAlign: {
    flexDirection: "row-reverse",
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accent.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.accent.gold,
  },
  avatarText: {
    color: colors.text.primary,
    fontSize: 14,
    fontWeight: "700",
  },
  info: {
    flex: 1,
  },
  infoRight: {
    alignItems: "flex-end",
  },
  name: {
    color: colors.text.primary,
    fontSize: 13,
    fontWeight: "600",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  rating: {
    color: colors.text.secondary,
    fontSize: 11,
  },
  streakBadge: {
    backgroundColor: "rgba(212,168,67,0.15)",
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: colors.border.gold,
  },
  streakText: {
    fontSize: 10,
    color: colors.accent.gold,
  },
  games: {
    color: colors.text.muted,
    fontSize: 10,
  },
});
