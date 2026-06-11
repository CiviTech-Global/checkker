import { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Share,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn } from "react-native-reanimated";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Chess } from "chess.js";
import { formatCheckkerGame, buildReplayLink } from "@checkker/shared";
import ChessBoard from "../../src/components/ChessBoard";
import { useSocket } from "../../src/hooks/useSocket";
import { colors, spacing, radius, glassStyle } from "../../src/theme/tokens";

function ReplayControlButton({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.controlBtn, disabled && styles.controlBtnDisabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.6}
    >
      <Text style={styles.controlIcon}>{icon}</Text>
      <Text style={styles.controlLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function cardLabel(m: any): string {
  if (m.cardRank && m.cardSuit) {
    return `${m.cardRank}${m.cardSuit}`;
  }
  return "";
}

export default function ReplayScreen() {
  const { gameId } = useLocalSearchParams<{ gameId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { replayMoves, getGameMoves } = useSocket();

  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [fen, setFen] = useState(
    "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
  );

  const movesRef = useRef<any[]>([]);

  useEffect(() => {
    if (gameId) {
      getGameMoves(gameId);
    }
  }, [gameId, getGameMoves]);

  useEffect(() => {
    if (replayMoves !== null) {
      movesRef.current = replayMoves;
      setLoading(false);
      applyIndex(replayMoves.length - 1);
    }
  }, [replayMoves]);

  const applyIndex = useCallback((index: number) => {
    const movesList = movesRef.current;
    try {
      const game = new Chess();
      for (let i = 0; i <= index && i < movesList.length; i++) {
        const m = movesList[i];
        if (m.san && m.san.length > 0) {
          game.move(m.san);
        } else {
          game.move(m.moveUci);
        }
      }
      setCurrentIndex(index);
      setFen(game.fen());
    } catch (_) {}
  }, []);

  const jumpToStart = useCallback(() => applyIndex(-1), [applyIndex]);
  const stepBack = useCallback(() => {
    if (currentIndex >= 0) applyIndex(currentIndex - 1);
  }, [applyIndex, currentIndex]);
  const stepForward = useCallback(() => {
    const movesList = movesRef.current;
    if (currentIndex < movesList.length - 1) applyIndex(currentIndex + 1);
  }, [applyIndex, currentIndex]);
  const jumpToEnd = useCallback(() => {
    applyIndex(movesRef.current.length - 1);
  }, [applyIndex]);

  const shareGame = useCallback(async () => {
    const movesList = movesRef.current;
    if (movesList.length === 0) return;
    const exportText = formatCheckkerGame(movesList, { gameId });
    const link = gameId ? buildReplayLink(gameId) : "";
    try {
      await Share.share({
        message: `${exportText}\n\nWatch the replay: ${link}`,
        title: "Checkker Game Replay",
      });
    } catch {
      // user dismissed the share sheet
    }
  }, [gameId]);

  const moves = movesRef.current;
  const currentMove =
    currentIndex >= 0 && currentIndex < moves.length
      ? moves[currentIndex]
      : null;

  const lastMove =
    currentMove?.moveUci
      ? {
          from: currentMove.moveUci.slice(0, 2),
          to: currentMove.moveUci.slice(2, 4),
        }
      : null;

  const movePairs: {
    num: number;
    whiteIdx: number;
    white: any;
    blackIdx: number;
    black: any;
  }[] = [];
  for (let i = 0; i < moves.length; i += 2) {
    const white = moves[i];
    const black = i + 1 < moves.length ? moves[i + 1] : null;
    movePairs.push({
      num: Math.floor(i / 2) + 1,
      whiteIdx: i,
      white,
      blackIdx: i + 1,
      black,
    });
  }

  const safeStyle = {
    paddingTop: insets.top,
    paddingBottom: insets.bottom,
    paddingLeft: insets.left,
    paddingRight: insets.right,
  };

  if (loading) {
    return (
      <View style={[styles.container, safeStyle, styles.center]}>
        <ActivityIndicator color={colors.accent.gold} size="large" />
        <Animated.Text
          entering={FadeIn.duration(200)}
          style={styles.loadingText}
        >
          Loading game moves...
        </Animated.Text>
      </View>
    );
  }

  if (moves.length === 0) {
    return (
      <View style={[styles.container, safeStyle, styles.center]}>
        <Text style={styles.noMovesText}>
          No moves recorded for this game.
        </Text>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const fillPercent =
    moves.length > 0
      ? ((currentIndex + 1) / moves.length) * 100
      : 0;

  return (
    <View style={[styles.container, safeStyle]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backArrow}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Text style={styles.backArrowText}>{"\u2190"}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Game Replay</Text>
        <View style={styles.headerSpacer} />
        <TouchableOpacity
          style={styles.shareBtn}
          onPress={shareGame}
          activeOpacity={0.7}
        >
          <Text style={styles.shareBtnText}>Share</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
        bounces={false}
      >
        <View style={styles.boardWrapper}>
          <ChessBoard
            fen={fen}
            orientation="white"
            highlightedSquares={[]}
            lastMove={lastMove}
            interactive={false}
            onSquarePress={() => {}}
          />
        </View>

        <Animated.View entering={FadeIn.duration(300)}>
          <Text style={styles.moveCounter}>
            Move {currentIndex + 1} of {moves.length}
          </Text>

          {currentMove && (
            <Text style={styles.currentMoveInfo}>
              {currentMove.san || currentMove.moveUci}
              {cardLabel(currentMove)
                ? `  \u2022  ${cardLabel(currentMove)}`
                : ""}
            </Text>
          )}
        </Animated.View>

        <View style={styles.progressWrapper}>
          <View style={styles.progressTrackBg}>
            <View
              style={[
                styles.progressTrackFill,
                { width: `${fillPercent}%` },
              ]}
            />
          </View>
          <View
            style={[
              styles.progressThumb,
              { left: `${fillPercent}%` },
            ]}
          />
        </View>

        <Animated.View
          entering={FadeIn.duration(300)}
          style={styles.moveListContainer}
        >
          <Text style={styles.moveListTitle}>Moves</Text>
          {movePairs.map((pair) => {
            const whiteSel = currentIndex === pair.whiteIdx;
            const blackSel = currentIndex === pair.blackIdx;
            return (
              <TouchableOpacity
                key={pair.num}
                style={[
                  styles.moveRow,
                  (whiteSel || blackSel) && styles.moveRowSelected,
                ]}
                onPress={() => applyIndex(pair.whiteIdx)}
                activeOpacity={0.6}
              >
                <Text style={styles.moveNum}>{pair.num}.</Text>
                <View style={styles.moveCell}>
                  <Text
                    style={[
                      styles.moveSan,
                      whiteSel && styles.moveSanSelected,
                    ]}
                  >
                    {pair.white?.san || pair.white?.moveUci || ""}
                  </Text>
                  {cardLabel(pair.white) ? (
                    <Text style={styles.moveCard}>
                      {cardLabel(pair.white)}
                    </Text>
                  ) : null}
                </View>
                <View style={styles.moveCell}>
                  {pair.black && (
                    <>
                      <Text
                        style={[
                          styles.moveSan,
                          blackSel && styles.moveSanSelected,
                        ]}
                      >
                        {pair.black.san || pair.black.moveUci}
                      </Text>
                      {cardLabel(pair.black) ? (
                        <Text style={styles.moveCard}>
                          {cardLabel(pair.black)}
                        </Text>
                      ) : null}
                    </>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </Animated.View>
      </ScrollView>

      <View style={styles.controlBar}>
        <ReplayControlButton
          icon={"\u23EE"}
          label="Start"
          onPress={jumpToStart}
          disabled={currentIndex <= -1}
        />
        <ReplayControlButton
          icon={"\u25C0"}
          label="Back"
          onPress={stepBack}
          disabled={currentIndex <= -1}
        />
        <ReplayControlButton
          icon={"\u25B6"}
          label="Forward"
          onPress={stepForward}
          disabled={currentIndex >= moves.length - 1}
        />
        <ReplayControlButton
          icon={"\u23ED"}
          label="End"
          onPress={jumpToEnd}
          disabled={currentIndex >= moves.length - 1}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  center: {
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.md,
  },
  loadingText: {
    fontSize: 14,
    color: colors.text.muted,
  },
  noMovesText: {
    fontSize: 16,
    color: colors.text.muted,
  },
  backBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.accent.primary,
    borderWidth: 1,
    borderColor: colors.accent.gold,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text.primary,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.bg.secondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.gold,
  },
  backArrow: {
    padding: spacing.xs,
    marginRight: spacing.sm,
  },
  backArrowText: {
    fontSize: 22,
    color: colors.text.primary,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text.primary,
    letterSpacing: 0.5,
  },
  headerSpacer: {
    flex: 1,
  },
  shareBtn: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.accent.gold,
  },
  shareBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.accent.gold,
  },
  scrollContent: {
    padding: spacing.md,
    gap: spacing.md,
    alignItems: "center",
    paddingBottom: 120,
  },
  boardWrapper: {
    width: "100%",
    maxWidth: 480,
  },
  moveCounter: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text.secondary,
    textAlign: "center",
  },
  currentMoveInfo: {
    fontSize: 13,
    color: colors.text.muted,
    textAlign: "center",
    marginTop: -spacing.xs,
    fontFamily: "monospace",
  },
  progressWrapper: {
    width: "100%",
    maxWidth: 480,
    height: 24,
    justifyContent: "center",
  },
  progressTrackBg: {
    height: 4,
    backgroundColor: colors.border.gold,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressTrackFill: {
    height: "100%",
    backgroundColor: colors.accent.gold,
    borderRadius: 2,
  },
  progressThumb: {
    position: "absolute",
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.accent.goldBright,
    top: 6,
    marginLeft: -6,
  },
  moveListContainer: {
    width: "100%",
    maxWidth: 480,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.bg.secondary,
  },
  moveListTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  moveRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
  },
  moveRowSelected: {
    backgroundColor: "rgba(212,168,67,0.15)",
  },
  moveNum: {
    width: 32,
    fontSize: 12,
    color: colors.text.muted,
  },
  moveCell: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xxs,
  },
  moveSan: {
    fontSize: 13,
    color: colors.text.primary,
    fontFamily: "monospace",
  },
  moveSanSelected: {
    color: colors.accent.gold,
    fontWeight: "700",
  },
  moveCard: {
    fontSize: 10,
    color: colors.text.muted,
  },
  controlBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-evenly",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.bg.secondary,
    borderTopWidth: 1,
    borderTopColor: colors.border.gold,
  },
  controlBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  controlBtnDisabled: {
    opacity: 0.35,
  },
  controlIcon: {
    fontSize: 24,
    color: colors.accent.gold,
  },
  controlLabel: {
    fontSize: 11,
    color: colors.text.secondary,
    marginTop: 2,
  },
});
