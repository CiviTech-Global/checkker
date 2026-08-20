import { useEffect, useState, useCallback, useMemo, useRef, lazy, Suspense } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
} from "react-native-reanimated";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Chess } from "chess.js";
import type { Card, Color, GameResult, PokerResult } from "@checkker/shared";
import { cardToPiece, cardId } from "@checkker/shared";
import { getLegalMovesForHand } from "@checkker/chess";
import ChessBoard from "../../src/components/ChessBoard";
const ChessBoardGL = lazy(() => import("../../src/components/ChessBoardGL"));
import { features } from "../../src/config/features";
import CardHand from "../../src/components/CardHand";
import OpponentHand from "../../src/components/OpponentHand";
import ScorePile from "../../src/components/ScorePile";
import GameInfoBar from "../../src/components/GameInfoBar";
import PlayerPanel from "../../src/components/PlayerPanel";
import OddsIndicator from "../../src/components/OddsIndicator";
import ChatPanel from "../../src/components/ChatPanel";
import BestMovesPanel from "../../src/components/BestMovesPanel";
import PlayerMoveHistory from "../../src/components/PlayerMoveHistory";
import GameMenuButton from "../../src/components/GameMenuButton";
import ResignButton from "../../src/components/ResignButton";
import GameResultOverlay from "../../src/components/GameResultOverlay";
import MoveErrorToast from "../../src/components/MoveErrorToast";
import PromotionPicker from "../../src/components/PromotionPicker";
import CoachingTipBanner from "../../src/components/CoachingTipBanner";
import SpectatorBanner from "../../src/components/SpectatorBanner";
import { useSocket } from "../../src/hooks/useSocket";
import { useBot } from "../../src/context/BotContext";
import { pickOnlineBotMove } from "../../src/bot/engine";
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
import { colors, spacing, radius, glassStyle } from "../../src/theme/tokens";
import { haptics } from "../../src/services/HapticsService";

/* ── Bot Thinking Indicator ──────────────────────────────────────────── */

function BotBanner({
  strategy,
  onTakeOver,
  allowTakeover,
}: {
  strategy: string;
  onTakeOver: () => void;
  allowTakeover: boolean;
}) {
  return (
    <View style={botBannerStyles.container}>
      <Text style={botBannerStyles.text}>🤖 Bot is playing for you • {strategy}</Text>
      {allowTakeover && (
        <TouchableOpacity onPress={onTakeOver} style={botBannerStyles.btn}>
          <Text style={botBannerStyles.btnText}>Take Over</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const botBannerStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.accent.gold + "26",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.accent.gold,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.xs,
  },
  text: { color: colors.text.primary, fontWeight: "600", flex: 1 },
  btn: { paddingHorizontal: spacing.sm },
  btnText: { color: colors.accent.gold, fontWeight: "700" },
});

function BotThinkingIndicator() {
  const opacity1 = useSharedValue(0.3);
  const opacity2 = useSharedValue(0.3);
  const opacity3 = useSharedValue(0.3);

  useEffect(() => {
    opacity1.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 400 }),
        withTiming(0.3, { duration: 400 })
      ),
      -1,
      false
    );
    opacity2.value = withRepeat(
      withSequence(
        withTiming(0.3, { duration: 200 }),
        withTiming(1, { duration: 400 }),
        withTiming(0.3, { duration: 400 })
      ),
      -1,
      false
    );
    opacity3.value = withRepeat(
      withSequence(
        withTiming(0.3, { duration: 400 }),
        withTiming(1, { duration: 400 }),
        withTiming(0.3, { duration: 400 })
      ),
      -1,
      false
    );
  }, [opacity1, opacity2, opacity3]);

  const dot1 = useAnimatedStyle(() => ({ opacity: opacity1.value }));
  const dot2 = useAnimatedStyle(() => ({ opacity: opacity2.value }));
  const dot3 = useAnimatedStyle(() => ({ opacity: opacity3.value }));

  return (
    <Animated.View entering={FadeIn.duration(200)} style={styles.botThinkingRow}>
      <Text style={styles.botThinkingText}>{"\uD83E\uDD16"} Bot is thinking</Text>
      <Animated.Text style={[styles.botDot, dot1]}>.</Animated.Text>
      <Animated.Text style={[styles.botDot, dot2]}>.</Animated.Text>
      <Animated.Text style={[styles.botDot, dot3]}>.</Animated.Text>
    </Animated.View>
  );
}

function BoardLoadingPlaceholder() {
  return (
    <View style={styles.boardLoadingPlaceholder}>
      <ActivityIndicator size="large" />
    </View>
  );
}

export default function GameScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const {
    gameState,
    scores,
    chatMessages,
    playMove,
    resign,
    requestRematch,
    onMoveError,
    sendChat,
    undoMove,
    onCoachingTip,
    onSpectatorComment,
    onRematchRequested,
    onBetSettled,
  } = useSocket();

  const [selectedCardIdx, setSelectedCardIdx] = useState<number | null>(null);
  const [selectedSourceSquare, setSelectedSourceSquare] = useState<string | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [promotionMoves, setPromotionMoves] = useState<string[] | null>(null);
  const [chatExpanded, setChatExpanded] = useState(false);
  const [coachingTip, setCoachingTip] = useState<string | null>(null);
  const [spectatorComment, setSpectatorComment] = useState<string | null>(null);
  const [rematchPending, setRematchPending] = useState(false);
  const [opponentWantsRematch, setOpponentWantsRematch] = useState(false);
  const [betSettlement, setBetSettlement] = useState<{
    outcome: "win" | "loss" | "draw";
    betAmountUsd: number;
    txHash: string;
  } | null>(null);
  const [botTakeover, setBotTakeover] = useState(false);
  const botTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { config, maturity, inBotMatch, recordGameResult, setInBotMatch } = useBot();
  const isOnlineBotMatch = inBotMatch && !botTakeover;

  useEffect(() => {
    onMoveError((msg: string) => setMoveError(msg));
    onCoachingTip((tip: string) => setCoachingTip(tip));
    onSpectatorComment((comment: string) => setSpectatorComment(comment));
    onRematchRequested(() => setOpponentWantsRematch(true));
    onBetSettled((data) => setBetSettlement({
      outcome: data.outcome,
      betAmountUsd: data.betAmountUsd,
      txHash: data.txHash,
    }));
  }, []);

  // Handle rematch: detect new game_start with different gameId
  const currentGameId = useRef(id);
  useEffect(() => {
    const gsAny = gameState as any;
    if (gsAny?.gameId && gsAny.gameId !== currentGameId.current) {
      // A new game started (rematch accepted) — navigate to it
      currentGameId.current = gsAny.gameId;
      setRematchPending(false);
      setOpponentWantsRematch(false);
      setBetSettlement(null);
      setBotTakeover(false);
      router.replace(`/game/${gsAny.gameId}`);
    }
  }, [(gameState as any)?.gameId]);

  const handleRematch = useCallback(() => {
    setRematchPending(true);
    requestRematch();
  }, [requestRematch]);

  const isBotGame = id?.startsWith("bot-") ?? false;

  const gs = gameState as any;
  const color: Color = gs?.color ?? "white";
  const drawPileCount = gs?.drawPileCount ?? 0;
  const showLastCardTension =
    gs?.drawPileCount != null && drawPileCount <= 5;
  const fen = gs?.fen ?? "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
  const turn = gs?.turn ?? "white";
  const myTurn = turn === color;

  const myHand: Card[] = gs?.hand ?? [];
  const myScorePile: Card[] = gs?.scorePile ?? [];
  const opponentScorePile: Card[] = gs?.opponent?.scorePile ?? [];
  const opponentHandCount = gs?.opponent?.hand?.length ?? 3;
  const myTimeMs = gs?.timeRemainingMs ?? 420000;
  const opponentTimeMs = gs?.opponent?.timeRemainingMs ?? 420000;
  const result: GameResult | null = gs?.result ?? null;
  const moveHistory = gs?.moveHistory ?? [];
  const odds = gs?.odds ?? null;
  const playerProfile = gs?.playerProfile ?? null;
  const opponentProfile = gs?.opponentProfile ?? null;
  const bestMoves = gs?.bestMoves ?? { white: [], black: [] };
  const liveScores = gs?.liveScores ?? null;
  const myPoker: PokerResult | undefined = liveScores
    ? (color === "white" ? liveScores.whitePoker : liveScores.blackPoker)
    : undefined;
  const opponentPoker: PokerResult | undefined = liveScores
    ? (color === "white" ? liveScores.blackPoker : liveScores.whitePoker)
    : undefined;
  const myPoints: number | undefined = myPoker?.total;
  const opponentPoints: number | undefined = opponentPoker?.total;

  const myBestMoves = bestMoves[color] ?? [];
  const opponentColor: Color = color === "white" ? "black" : "white";
  const opponentBestMoves = bestMoves[opponentColor] ?? [];

  // Online bot autoplay
  useEffect(() => {
    if (!isOnlineBotMatch || !myTurn || result !== null) return;
    const effective = { ...config, thinkingDelayMs: Math.max(500, config.thinkingDelayMs) };
    botTimeoutRef.current = setTimeout(() => {
      const pick = pickOnlineBotMove({
        fen,
        hand: myHand,
        config,
        maturity,
        myColor: color,
      });
      if (pick) playMove(pick.cardId, pick.move);
    }, effective.thinkingDelayMs);
    return () => {
      if (botTimeoutRef.current) clearTimeout(botTimeoutRef.current);
    };
  }, [isOnlineBotMatch, myTurn, fen, myHand, config, maturity, color, result, playMove]);

  // Record bot game result for maturity
  useEffect(() => {
    if (!inBotMatch || result === null) return;
    let outcome: "win" | "loss" | "draw" = "draw";
    if (result.type === "draw" || result.type === "deckExhausted") {
      outcome = "draw";
    } else if (result.winner === color) {
      outcome = "win";
    } else {
      outcome = "loss";
    }
    recordGameResult(outcome);
  }, [inBotMatch, result, color, recordGameResult]);

  // Clear bot match flag when leaving
  useEffect(() => {
    return () => {
      if (botTimeoutRef.current) clearTimeout(botTimeoutRef.current);
      setInBotMatch(false);
    };
  }, []);

  // Authoritative last move (UCI from the server) for the board slide animation.
  const lastMove = useMemo(() => {
    const last = moveHistory[moveHistory.length - 1];
    const mv: string = last?.move ?? "";
    return mv.length >= 4 ? { from: mv.slice(0, 2), to: mv.slice(2, 4) } : null;
  }, [moveHistory.length]);

  /* ── Sound effects ───────────────────────────────────────────────── */

  const prevMoveCount = useRef(0);
  const gameStartedRef = useRef(false);

  // Move sounds — watch moveHistory length for new entries
  useEffect(() => {
    if (moveHistory.length <= prevMoveCount.current) {
      prevMoveCount.current = moveHistory.length;
      return;
    }
    prevMoveCount.current = moveHistory.length;
    const latest = moveHistory[moveHistory.length - 1];
    if (!latest) return;
    // Server moves are UCI (e.g. "e2e4"), so capture/check/mate come from the
    // record's flags; castle/promotion are derived from the move string.
    const mv: string = latest.move ?? "";
    const isCastle = mv === "e1g1" || mv === "e1c1" || mv === "e8g8" || mv === "e8c8";
    const isPromotion = mv.length === 5;

    if (latest.mate) {
      playCheckmateSound();
      haptics.check();
    } else if (latest.check) {
      playCheckSound();
      haptics.check();
    } else if (isPromotion) {
      playPromotionSound();
      haptics.moveConfirm();
    } else if (isCastle) {
      playCastleSound();
      haptics.moveConfirm();
    } else if (latest.captured) {
      playCaptureSound();
      haptics.capture();
    } else {
      playMoveSound();
      haptics.moveConfirm();
    }
  }, [moveHistory.length]);

  // Game start sound
  useEffect(() => {
    if (gs?.fen && !gameStartedRef.current) {
      gameStartedRef.current = true;
      playGameStartSound();
    }
  }, [gs?.fen]);

  // Game over sound
  useEffect(() => {
    if (result !== null) {
      playGameOverSound();
      const winner = "winner" in result ? result.winner : null;
      const isDraw = result.type === "draw" || result.type === "deckExhausted";
      const playerWon = winner === color;
      if (isDraw) haptics.loss();
      else if (playerWon) haptics.win();
      else haptics.loss();
    }
  }, [result, color]);

  const legalMovesMap = useMemo(() => {
    try {
      const chess = new Chess(fen);
      const entries = getLegalMovesForHand(chess, myHand);
      return new Map(entries.map((e) => [cardId(e.card), e.moves]));
    } catch {
      return new Map<string, string[]>();
    }
  }, [fen, myHand]);

  const highlightedSquares = useMemo(() => {
    if (selectedCardIdx == null) return [];
    const card = myHand[selectedCardIdx];
    if (!card) return [];
    const allMoves = legalMovesMap.get(cardId(card)) ?? [];
    if (selectedSourceSquare != null) {
      return [...new Set(
        allMoves
          .filter((m: string) => m.startsWith(selectedSourceSquare))
          .map((m: string) => m.slice(2, 4))
      )];
    }
    return [...new Set(allMoves.map((m: string) => m.slice(2, 4)))];
  }, [selectedCardIdx, myHand, legalMovesMap, selectedSourceSquare]);

  const handleCardTap = useCallback((idx: number) => {
    if (!myTurn) return;
    haptics.cardTap();
    setSelectedCardIdx((prev) => (prev === idx ? null : idx));
    setSelectedSourceSquare(null);
  }, [myTurn]);

  const handleSquarePress = useCallback((square: string) => {
    if (!myTurn || selectedCardIdx == null) return;
    const card = myHand[selectedCardIdx];
    if (!card) return;
    const cid = cardId(card);
    const allMoves = legalMovesMap.get(cid) ?? [];

    if (selectedSourceSquare == null) {
      const hasMovesFromHere = allMoves.some((m: string) => m.startsWith(square));
      if (hasMovesFromHere) {
        setSelectedSourceSquare(square);
        return;
      }
      const matching = allMoves.filter((m: string) => m.slice(2, 4) === square);
      if (matching.length === 0) return;
      if (matching.length > 1 && matching[0].length > 4) {
        setPromotionMoves(matching);
        return;
      }
      haptics.moveConfirm();
      playMove(cid, matching[0]);
      setSelectedCardIdx(null);
      setSelectedSourceSquare(null);
    } else {
      const matching = allMoves.filter(
        (m: string) => m.startsWith(selectedSourceSquare) && m.slice(2, 4) === square
      );
      if (matching.length === 0) return;
      if (matching.length > 1 && matching[0].length > 4) {
        setPromotionMoves(matching);
        return;
      }
      haptics.moveConfirm();
      playMove(cid, matching[0]);
      setSelectedCardIdx(null);
      setSelectedSourceSquare(null);
    }
  }, [myTurn, selectedCardIdx, myHand, legalMovesMap, selectedSourceSquare, playMove]);

  const handlePromotionSelect = useCallback((piece: string) => {
    if (!promotionMoves || selectedCardIdx == null) return;
    const card = myHand[selectedCardIdx];
    if (!card) return;
    const move = promotionMoves.find((m: string) => m.endsWith(piece));
    if (move) {
      playMove(cardId(card), move);
    }
    setPromotionMoves(null);
    setSelectedCardIdx(null);
    setSelectedSourceSquare(null);
  }, [promotionMoves, selectedCardIdx, myHand, playMove]);

  const isLandscape = width >= 600;

  const handleGoHome = useCallback(() => {
    resign();
    router.replace("/");
  }, [resign, router]);

  const BoardComponent = features.use3DBoard ? ChessBoardGL : ChessBoard;

  const safeStyle = {
    paddingTop: insets.top,
    paddingBottom: insets.bottom,
    paddingLeft: insets.left,
    paddingRight: insets.right,
  };

  /* ── Landscape: 3-panel layout ─────────────────────────────────────── */

  if (isLandscape) {
    return (
      <View style={[styles.container, safeStyle]}>
        <View style={styles.landscapeRow}>
          {/* Left Panel — Player */}
          <ScrollView
            style={styles.sidePanel}
            contentContainerStyle={styles.panelScroll}
            showsVerticalScrollIndicator={true}
            bounces={false}
          >
            <PlayerPanel
              profile={playerProfile}
              cards={myHand}
              scorePile={myScorePile}
              moves={moveHistory}
              bestMoves={myBestMoves}
              isOpponent={false}
              isActive={turn === color}
              timeMs={myTimeMs}
              points={myPoints}
              side="left"
              color={color}
              isBotGame={isBotGame}
              selectedCardIdx={selectedCardIdx}
              onCardTap={handleCardTap}
              disabled={!myTurn}
              onResign={resign}
              onMenuPress={handleGoHome}
              onUndo={isBotGame ? undoMove : undefined}
            />
          </ScrollView>

          {/* Center Column — Board + Odds + Chat */}
          <KeyboardAvoidingView
            style={styles.centerColumn}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={insets.top}
          >
            <ScrollView
              contentContainerStyle={styles.centerScroll}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              {isOnlineBotMatch && (
                <BotBanner
                  strategy={config.strategy}
                  allowTakeover={config.allowTakeover}
                  onTakeOver={() => setBotTakeover(true)}
                />
              )}
              <View style={styles.boardWrapper}>
                <Suspense fallback={<BoardLoadingPlaceholder />}>
                  <BoardComponent
                    fen={fen}
                    orientation={color}
                    highlightedSquares={highlightedSquares}
                    lastMove={lastMove}
                    interactive={myTurn}
                    onSquarePress={handleSquarePress}
                  />
                </Suspense>
                {showLastCardTension && (
                  <Text style={styles.lastCardCounter}>
                    {drawPileCount} cards left
                  </Text>
                )}
              </View>
              {isBotGame && !myTurn && <BotThinkingIndicator />}
              <OddsIndicator odds={odds} playerColor={color} />
              <ChatPanel
                messages={chatMessages}
                onSend={sendChat}
                playerColor={color}
                playerId={gs?.id}
              />
            </ScrollView>
          </KeyboardAvoidingView>

          {/* Right Panel — Opponent */}
          <ScrollView
            style={styles.sidePanel}
            contentContainerStyle={styles.panelScroll}
            showsVerticalScrollIndicator={true}
            bounces={false}
          >
            <PlayerPanel
              profile={opponentProfile}
              cards={Array(opponentHandCount).fill(null)}
              scorePile={opponentScorePile}
              moves={moveHistory}
              bestMoves={opponentBestMoves}
              isOpponent={true}
              isActive={turn === opponentColor}
              timeMs={opponentTimeMs}
              points={opponentPoints}
              side="right"
              color={opponentColor}
              isBotGame={isBotGame}
            />
          </ScrollView>
        </View>

        <GameResultOverlay
          visible={result !== null}
          result={result}
          playerColor={color}
          scores={scores}
          onRematch={handleRematch}
          onHome={() => router.replace("/")}
          rematchPending={rematchPending}
          opponentWantsRematch={opponentWantsRematch}
          betSettlement={betSettlement}
        />
        <PromotionPicker
          visible={promotionMoves !== null}
          onSelect={handlePromotionSelect}
          onCancel={() => setPromotionMoves(null)}
        />
        <MoveErrorToast message={moveError} onDismiss={() => setMoveError(null)} />
      </View>
    );
  }

  /* ── Portrait: single-column layout ────────────────────────────────── */

  return (
    <View style={[styles.container, safeStyle]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={insets.top}
      >
        <ScrollView
          contentContainerStyle={styles.portraitScroll}
          showsVerticalScrollIndicator={true}
          bounces={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Opponent section */}
          <View style={styles.fullWidthRow}>
            <GameInfoBar
              label={isBotGame ? "Bot" : (opponentProfile?.displayName ?? "Opponent")}
              side={opponentColor}
              timeMs={opponentTimeMs}
              active={turn === opponentColor}
              rating={opponentProfile?.rating}
            />
          </View>
          <OpponentHand cardCount={opponentHandCount} />
          {isOnlineBotMatch && (
            <BotBanner
              strategy={config.strategy}
              allowTakeover={config.allowTakeover}
              onTakeOver={() => setBotTakeover(true)}
            />
          )}
          <View style={styles.fullWidthRow}>
            <ScorePile cards={opponentScorePile} label="Captured" points={opponentPoints} result={opponentPoker} />
          </View>

          {/* Board */}
          <View style={styles.boardContainerPortrait}>
            <Suspense fallback={<BoardLoadingPlaceholder />}>
              <BoardComponent
                fen={fen}
                orientation={color}
                highlightedSquares={highlightedSquares}
                lastMove={lastMove}
                interactive={myTurn}
                onSquarePress={handleSquarePress}
              />
            </Suspense>
          </View>
          {showLastCardTension && (
            <Text style={styles.lastCardCounter}>
              {drawPileCount} cards left
            </Text>
          )}

          {isBotGame && !myTurn && <BotThinkingIndicator />}

          {/* Odds */}
          <View style={styles.fullWidthRow}>
            <OddsIndicator odds={odds} playerColor={color} />
          </View>

          {/* Coaching Tip */}
          <CoachingTipBanner tip={coachingTip} onDismiss={() => setCoachingTip(null)} />

          {/* Spectator Commentary */}
          <SpectatorBanner comment={spectatorComment} onDismiss={() => setSpectatorComment(null)} />

          {/* Player section */}
          <CardHand
            cards={myHand}
            selectedIndex={selectedCardIdx}
            onCardTap={handleCardTap}
            disabled={!myTurn}
          />
          {selectedCardIdx != null && myHand[selectedCardIdx] && (
            <Text style={styles.selectedInfo}>
              Selected: {cardId(myHand[selectedCardIdx])} {"\u2192"} {cardToPiece(myHand[selectedCardIdx])}
            </Text>
          )}
          <View style={styles.fullWidthRow}>
            <GameInfoBar
              label={playerProfile?.displayName ?? "You"}
              side={color}
              timeMs={myTimeMs}
              active={turn === color}
              rating={playerProfile?.rating}
            />
          </View>
          <View style={styles.fullWidthRow}>
            <ScorePile cards={myScorePile} label="Your Captures" points={myPoints} result={myPoker} />
          </View>

          {/* Best Moves */}
          <View style={styles.fullWidthRow}>
            <BestMovesPanel moves={myBestMoves} />
          </View>

          {/* Move History */}
          <View style={styles.fullWidthRow}>
            <PlayerMoveHistory moves={moveHistory} maxMoves={6} />
          </View>

          {/* Chat */}
          <View style={styles.fullWidthRow}>
            <ChatPanel
              messages={chatMessages}
              onSend={sendChat}
              playerColor={color}
              playerId={gs?.id}
              collapsed={!chatExpanded}
              onToggle={() => setChatExpanded((v) => !v)}
            />
          </View>

          {/* Actions */}
          <View style={styles.actionRow}>
            <GameMenuButton
              onGoHome={handleGoHome}
              onUndo={isBotGame ? undoMove : undefined}
              isBotGame={isBotGame}
            />
            <ResignButton onResign={resign} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <GameResultOverlay
        visible={result !== null}
        result={result}
        playerColor={color}
        scores={scores}
        onRematch={requestRematch}
        onHome={() => router.replace("/")}
      />
      <PromotionPicker
        visible={promotionMoves !== null}
        onSelect={handlePromotionSelect}
        onCancel={() => setPromotionMoves(null)}
      />
      <MoveErrorToast message={moveError} onDismiss={() => setMoveError(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.primary },
  flex: { flex: 1 },

  /* Landscape */
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
  boardLoadingPlaceholder: {
    width: "100%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  /* Portrait */
  portraitScroll: {
    padding: spacing.sm,
    gap: spacing.sm,
    paddingBottom: 120,
    alignItems: "center",
  },
  fullWidthRow: {
    width: "100%",
    maxWidth: 480,
  },
  boardContainerPortrait: {
    width: "100%",
    maxWidth: 480,
  },

  /* Shared */
  selectedInfo: { fontSize: 12, color: colors.text.secondary },
  lastCardCounter: {
    fontSize: 12,
    color: colors.accent.gold,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 4,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    width: "100%",
    maxWidth: 480,
    justifyContent: "center",
    paddingBottom: spacing.sm,
  },
  botThinkingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
    ...glassStyle,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  botThinkingText: { fontSize: 12, color: colors.text.muted, fontStyle: "italic" },
  botDot: { fontSize: 16, color: colors.text.muted, fontWeight: "700" },
});
