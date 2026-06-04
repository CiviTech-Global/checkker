import { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn } from "react-native-reanimated";
import { useLocalSearchParams, useRouter } from "expo-router";
import ChessBoard from "../../src/components/ChessBoard";
import CardHand from "../../src/components/CardHand";
import ScorePile from "../../src/components/ScorePile";
import GameInfoBar from "../../src/components/GameInfoBar";
import PlayerProfileCard from "../../src/components/PlayerProfileCard";
import OddsIndicator from "../../src/components/OddsIndicator";
import PlayerMoveHistory from "../../src/components/PlayerMoveHistory";
import BestMovesPanel from "../../src/components/BestMovesPanel";
import GameResultOverlay from "../../src/components/GameResultOverlay";
import { useSocket } from "../../src/hooks/useSocket";
import { colors, spacing, radius, glassStyle } from "../../src/theme/tokens";
import {
  playMoveSound,
  playCaptureSound,
  playCheckSound,
  playCheckmateSound,
  playCastleSound,
  playPromotionSound,
  playGameStartSound,
  playGameOverSound,
} from "../../src/utils/sounds";
import type { Card, Color, MoveRecord } from "@checkker/shared";

export default function SpectateGameScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    spectateState,
    spectateMoves,
    spectatePause,
    spectateResume,
    spectateStepForward,
    spectateStepBackward,
    spectateLeave,
  } = useSocket();

  const [paused, setPaused] = useState(false);
  const [started, setStarted] = useState(false);
  const [viewIndex, setViewIndex] = useState(-1);

  const prevWhiteScoreLen = useRef(0);
  const prevBlackScoreLen = useRef(0);

  const gameId = spectateState?.gameId ?? id ?? "";

  // Stay at latest when live
  useEffect(() => {
    if (!paused && started) {
      setViewIndex(-1);
    }
  }, [spectateMoves.length, paused, started]);

  // Sound effects on new moves — detect move type from SAN notation
  useEffect(() => {
    if (!started || spectateMoves.length === 0) return;
    const latest = spectateMoves[spectateMoves.length - 1];
    if (!latest) return;
    const san: string = latest.move ?? "";

    if (san.includes("#")) {
      playCheckmateSound();
    } else if (san.includes("+")) {
      playCheckSound();
    } else if (san.startsWith("O-O")) {
      playCastleSound();
    } else if (san.includes("=")) {
      playPromotionSound();
    } else {
      // Detect capture from score pile growth
      const whiteLen = latest.whiteScorePile?.length ?? 0;
      const blackLen = latest.blackScorePile?.length ?? 0;
      const prevTotal = prevWhiteScoreLen.current + prevBlackScoreLen.current;
      const newTotal = whiteLen + blackLen;
      if (newTotal > prevTotal || san.includes("x")) {
        playCaptureSound();
      } else {
        playMoveSound();
      }
      prevWhiteScoreLen.current = whiteLen;
      prevBlackScoreLen.current = blackLen;
    }
  }, [spectateMoves.length, started]);

  // Derive display state
  const currentMoveIdx = viewIndex === -1 ? spectateMoves.length - 1 : viewIndex;
  const currentMove = currentMoveIdx >= 0 ? spectateMoves[currentMoveIdx] : null;

  const fen =
    currentMove?.fen ??
    spectateState?.fen ??
    "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
  const turn = currentMove?.turn ?? spectateState?.turn ?? "white";
  const whiteHand = currentMove?.whiteHand ?? spectateState?.whiteHand ?? [];
  const blackHand = currentMove?.blackHand ?? spectateState?.blackHand ?? [];
  const whiteScorePile =
    currentMove?.whiteScorePile ?? spectateState?.whiteScorePile ?? [];
  const blackScorePile =
    currentMove?.blackScorePile ?? spectateState?.blackScorePile ?? [];
  const odds = currentMove?.odds ?? spectateState?.odds ?? null;
  const result = spectateState?.result ?? null;
  const scores = spectateState?.scores ?? null;

  // Build move history records
  const moveRecords: MoveRecord[] = spectateMoves
    .slice(0, currentMoveIdx + 1)
    .map((m) => ({
      move: m.move,
      card: { rank: m.card.slice(0, -1), suit: m.card.slice(-1) } as Card,
      color: m.color,
    }));

  const handleStart = useCallback(() => {
    setStarted(true);
    setPaused(false);
    spectateResume(gameId);
    playGameStartSound();
  }, [gameId, spectateResume]);

  const handlePauseResume = useCallback(() => {
    if (!started) {
      handleStart();
      return;
    }
    if (paused) {
      setPaused(false);
      setViewIndex(-1);
      spectateResume(gameId);
    } else {
      setPaused(true);
      setViewIndex(spectateMoves.length - 1);
      spectatePause(gameId);
    }
  }, [started, paused, gameId, spectateMoves.length, handleStart, spectateResume, spectatePause]);

  const handlePrev = useCallback(() => {
    if (!paused) return;
    const newIdx = Math.max(0, currentMoveIdx - 1);
    setViewIndex(newIdx);
    spectateStepBackward(gameId, currentMoveIdx);
  }, [paused, currentMoveIdx, gameId, spectateStepBackward]);

  const handleNext = useCallback(() => {
    if (!paused) return;
    if (currentMoveIdx < spectateMoves.length - 1) {
      setViewIndex(currentMoveIdx + 1);
    } else {
      spectateStepForward(gameId);
    }
  }, [paused, currentMoveIdx, spectateMoves.length, gameId, spectateStepForward]);

  const handleLeave = useCallback(() => {
    spectateLeave(gameId);
    router.replace("/");
  }, [gameId, spectateLeave, router]);

  // Game over sound
  useEffect(() => {
    if (result !== null && started) {
      playGameOverSound();
    }
  }, [result, started]);

  const safeStyle = {
    paddingTop: insets.top,
    paddingBottom: insets.bottom,
    paddingLeft: insets.left,
    paddingRight: insets.right,
  };

  const whiteProfile = spectateState?.whiteProfile ?? null;
  const blackProfile = spectateState?.blackProfile ?? null;

  return (
    <View style={[styles.container, safeStyle]}>
      <View style={styles.landscapeRow}>
        {/* ── Left Panel: White Bot ──────────────────────────── */}
        <ScrollView
          style={styles.sidePanel}
          contentContainerStyle={styles.panelScroll}
          showsVerticalScrollIndicator={true}
          bounces={false}
        >
          <GameInfoBar
            label={whiteProfile?.displayName ?? "White Bot"}
            side="white"
            timeMs={0}
            active={turn === "white"}
            rating={whiteProfile?.rating}
          />
          <PlayerProfileCard profile={whiteProfile} side="left" />
          <View style={styles.cardSection}>
            <CardHand
              cards={whiteHand}
              selectedIndex={null}
              onCardTap={() => {}}
              disabled={true}
            />
          </View>
          <ScorePile cards={whiteScorePile} label="Captured" />
          <PlayerMoveHistory moves={moveRecords} color="white" maxMoves={3} />
          <BestMovesPanel moves={[]} hidden={false} />

          {/* Spectator controls at bottom of left panel */}
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.menuBtn} onPress={handleLeave}>
              <Text style={styles.menuBtnText}>Leave</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* ── Center Column: Board + Odds + Controls ─────────── */}
        <ScrollView
          style={styles.centerColumn}
          contentContainerStyle={styles.centerScroll}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Spectating badge */}
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Spectating</Text>
            <Text style={styles.badgeSub}>
              {spectateState?.whiteDifficulty ?? "?"} vs{" "}
              {spectateState?.blackDifficulty ?? "?"}
            </Text>
          </View>

          <View style={styles.boardWrapper}>
            <ChessBoard
              fen={fen}
              orientation="white"
              highlightedSquares={[]}
              interactive={false}
              onSquarePress={() => {}}
            />
            <Text style={styles.deckCount}>
              Move {currentMoveIdx + 1}/{spectateMoves.length}
              {!started ? "" : !paused ? " \u2022 live" : " \u2022 paused"}
            </Text>
          </View>

          <OddsIndicator odds={odds} playerColor="white" />

          {/* Playback controls */}
          <View style={styles.controlBar}>
            <TouchableOpacity
              style={[styles.controlBtn, (!paused || !started) && styles.controlBtnDisabled]}
              onPress={handlePrev}
              disabled={!paused || !started || currentMoveIdx <= 0}
            >
              <Text style={styles.controlIcon}>{"\u23EE"}</Text>
              <Text style={styles.controlLabel}>Prev</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.controlBtnMain} onPress={handlePauseResume}>
              <Text style={styles.controlIconMain}>
                {!started ? "\u25B6" : paused ? "\u25B6" : "\u23F8"}
              </Text>
              <Text style={styles.controlLabel}>
                {!started ? "Start" : paused ? "Play" : "Pause"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.controlBtn, (!paused || !started) && styles.controlBtnDisabled]}
              onPress={handleNext}
              disabled={!paused || !started}
            >
              <Text style={styles.controlIcon}>{"\u23ED"}</Text>
              <Text style={styles.controlLabel}>Next</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* ── Right Panel: Black Bot ─────────────────────────── */}
        <ScrollView
          style={styles.sidePanel}
          contentContainerStyle={styles.panelScroll}
          showsVerticalScrollIndicator={true}
          bounces={false}
        >
          <GameInfoBar
            label={blackProfile?.displayName ?? "Black Bot"}
            side="black"
            timeMs={0}
            active={turn === "black"}
            rating={blackProfile?.rating}
          />
          <PlayerProfileCard profile={blackProfile} side="right" />
          <View style={styles.cardSection}>
            <CardHand
              cards={blackHand}
              selectedIndex={null}
              onCardTap={() => {}}
              disabled={true}
            />
          </View>
          <ScorePile cards={blackScorePile} label="Captured" />
          <PlayerMoveHistory moves={moveRecords} color="black" maxMoves={3} />
          <BestMovesPanel moves={[]} hidden={false} />
        </ScrollView>
      </View>

      {/* Start Match overlay */}
      {!started && spectateState && (
        <View style={styles.startOverlay}>
          <Animated.View entering={FadeIn.duration(300)} style={styles.startBox}>
            <Text style={styles.startTitle}>Ready to Watch</Text>
            <Text style={styles.startSub}>
              {spectateState?.whiteDifficulty ?? "?"} vs{" "}
              {spectateState?.blackDifficulty ?? "?"}
            </Text>
            <TouchableOpacity style={styles.startBtn} onPress={handleStart}>
              <Text style={styles.startBtnText}>Start Match</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      )}

      {/* Game Result Overlay */}
      <GameResultOverlay
        visible={result !== null}
        result={result}
        playerColor="white"
        scores={scores}
        onRematch={() => {}}
        onHome={handleLeave}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },

  /* 3-panel layout */
  landscapeRow: {
    flex: 1,
    flexDirection: "row",
  },
  sidePanel: {
    flex: 1,
    maxWidth: "28%",
  },
  panelScroll: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xxs,
    gap: spacing.xs,
    flexGrow: 1,
  },
  centerColumn: {
    flex: 2,
    minWidth: 0,
  },
  centerScroll: {
    padding: spacing.sm,
    gap: spacing.sm,
    alignItems: "center",
    flexGrow: 1,
    justifyContent: "center",
  },
  boardWrapper: {
    width: "100%",
    maxWidth: 480,
  },

  /* Shared */
  cardSection: {
    alignItems: "center",
    overflow: "hidden",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.accent.goldBright,
    letterSpacing: 0.5,
  },
  badgeSub: {
    fontSize: 11,
    color: colors.text.muted,
    textTransform: "capitalize",
  },
  deckCount: {
    fontSize: 12,
    color: colors.text.muted,
    textAlign: "center",
    marginTop: 4,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.xs,
    flexWrap: "wrap",
  },
  menuBtn: {
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: "rgba(224,64,64,0.15)",
    borderWidth: 1,
    borderColor: colors.accent.red,
  },
  menuBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.accent.red,
  },

  /* Playback controls */
  controlBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    ...glassStyle,
    borderRadius: radius.md,
    width: "100%",
    maxWidth: 480,
  },
  controlBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
  },
  controlBtnDisabled: {
    opacity: 0.4,
  },
  controlBtnMain: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.accent.primary,
    borderWidth: 1,
    borderColor: colors.accent.gold,
  },
  controlIcon: {
    fontSize: 20,
    color: colors.text.primary,
  },
  controlIconMain: {
    fontSize: 22,
    color: colors.text.primary,
  },
  controlLabel: {
    fontSize: 10,
    color: colors.text.secondary,
    marginTop: 2,
  },

  /* Start overlay */
  startOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  startBox: {
    alignItems: "center",
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border.gold,
    gap: spacing.sm,
  },
  startTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text.primary,
  },
  startSub: {
    fontSize: 14,
    color: colors.text.muted,
    textTransform: "capitalize",
  },
  startBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    backgroundColor: colors.accent.primary,
    borderWidth: 1,
    borderColor: colors.accent.gold,
    marginTop: spacing.xs,
  },
  startBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text.primary,
    letterSpacing: 0.5,
  },
});
