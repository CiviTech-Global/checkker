import React from "react";
import { View, StyleSheet } from "react-native";
import type { Card, Color, MoveRecord, PlayerProfile, MoveEvaluation } from "@checkker/shared";
import CardHand from "./CardHand";
import OpponentHand from "./OpponentHand";
import ScorePile from "./ScorePile";
import GameInfoBar from "./GameInfoBar";
import PlayerProfileCard from "./PlayerProfileCard";
import BestMovesPanel from "./BestMovesPanel";
import PlayerMoveHistory from "./PlayerMoveHistory";
import GameMenuButton from "./GameMenuButton";
import ResignButton from "./ResignButton";
import { spacing } from "../theme/tokens";

interface PlayerPanelProps {
  profile: PlayerProfile | null;
  cards: Card[] | (null)[];
  scorePile: Card[];
  moves: MoveRecord[];
  bestMoves: MoveEvaluation[];
  isOpponent: boolean;
  isActive: boolean;
  timeMs: number;
  points?: number;
  side: "left" | "right";
  color: Color;
  isBotGame: boolean;
  selectedCardIdx?: number | null;
  onCardTap?: (idx: number) => void;
  disabled?: boolean;
  onResign?: () => void;
  onMenuPress?: () => void;
  onUndo?: () => void;
}

export default function PlayerPanel({
  profile,
  cards,
  scorePile,
  moves,
  bestMoves,
  isOpponent,
  isActive,
  timeMs,
  points,
  side,
  color,
  isBotGame,
  selectedCardIdx,
  onCardTap,
  disabled,
  onResign,
  onMenuPress,
  onUndo,
}: PlayerPanelProps) {
  const label = isOpponent
    ? (isBotGame ? "Bot" : profile?.displayName ?? "Opponent")
    : (profile?.displayName ?? "You");

  return (
    <View style={styles.container}>
      <PlayerProfileCard profile={profile} side={side} />

      <GameInfoBar
        label={label}
        side={color}
        timeMs={timeMs}
        active={isActive}
        rating={profile?.rating}
      />

      <View style={styles.cardSection}>
        {isOpponent ? (
          <OpponentHand cardCount={(cards as (null)[]).length} />
        ) : (
          <CardHand
            cards={cards as Card[]}
            selectedIndex={selectedCardIdx ?? null}
            onCardTap={onCardTap ?? (() => {})}
            disabled={disabled}
          />
        )}
      </View>

      <ScorePile cards={scorePile} label={isOpponent ? "Captured" : "Your Captures"} points={points} />

      <PlayerMoveHistory moves={moves} color={color} maxMoves={3} />

      <BestMovesPanel moves={bestMoves} hidden={isOpponent} />

      {!isOpponent && side === "left" && (
        <View style={styles.actionRow}>
          <GameMenuButton
            onGoHome={onMenuPress ?? (() => {})}
            onUndo={onUndo}
            isBotGame={isBotGame}
          />
          {onResign && <ResignButton onResign={onResign} />}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
    padding: spacing.xs,
  },
  cardSection: {
    alignItems: "center",
    overflow: "hidden",
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.xs,
    flexWrap: "wrap",
  },
});
