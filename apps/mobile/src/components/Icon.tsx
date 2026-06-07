import React from "react";
import { StyleProp, ViewStyle } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

const ICON_MAP = {
  "arrow-back": { lib: "ion", name: "arrow-back" },
  "arrow-forward": { lib: "ion", name: "arrow-forward" },
  "chevron-right": { lib: "ion", name: "chevron-forward" },
  ranked: { lib: "mci", name: "sword-cross" },
  casual: { lib: "mci", name: "chess-pawn" },
  bot: { lib: "mci", name: "chess-knight" },
  lan: { lib: "mci", name: "lan" },
  tutorials: { lib: "mci", name: "school" },
  puzzles: { lib: "mci", name: "puzzle" },
  leaderboard: { lib: "mci", name: "trophy" },
  spectate: { lib: "ion", name: "eye" },
  profile: { lib: "mci", name: "chess-king" },
  donate: { lib: "ion", name: "heart" },
  "dev-tools": { lib: "ion", name: "settings" },
  book: { lib: "ion", name: "book" },
  completed: { lib: "ion", name: "checkmark-circle" },
  incorrect: { lib: "ion", name: "close-circle" },
  locked: { lib: "ion", name: "lock-closed" },
  play: { lib: "ion", name: "play" },
  waiting: { lib: "ion", name: "hourglass" },
  "diamond-filled": { lib: "mci", name: "diamond" },
  "diamond-outline": { lib: "mci", name: "diamond-outline" },
  robot: { lib: "mci", name: "robot" },
  host: { lib: "mci", name: "home" },
  join: { lib: "mci", name: "link" },
  wallet: { lib: "mci", name: "wallet" },
  ornament: { lib: "mci", name: "diamond-stone" },
  menu: { lib: "ion", name: "menu" },
  close: { lib: "ion", name: "close" },
  "star-filled": { lib: "ion", name: "star" },
  "star-outline": { lib: "ion", name: "star-outline" },
  coach: { lib: "mci", name: "lightbulb-on" },
} as const;

export type IconName = keyof typeof ICON_MAP;

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

export default function Icon({ name, size = 24, color, style }: IconProps) {
  const entry = ICON_MAP[name];
  if (entry.lib === "ion") {
    return (
      <Ionicons
        name={entry.name as keyof typeof Ionicons.glyphMap}
        size={size}
        color={color}
        style={style}
      />
    );
  }
  return (
    <MaterialCommunityIcons
      name={entry.name as keyof typeof MaterialCommunityIcons.glyphMap}
      size={size}
      color={color}
      style={style}
    />
  );
}
