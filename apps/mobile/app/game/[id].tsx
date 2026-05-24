import { useEffect, useState, useCallback, useMemo } from "react";
import { View, Text, ScrollView, StyleSheet, useWindowDimensions } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Chess } from "chess.js";
import type { Card, Color, GameResult } from "@gambit/shared";
import { cardToPiece, cardId } from "@gambit/shared";
import { getLegalMovesForHand } from "@gambit/chess";
import ChessBoard from "../../src/components/ChessBoard";
import CardHand from "../../src/components/CardHand";
import OpponentHand from "../../src/components/OpponentHand";
import ScorePile from "../../src/components/ScorePile";
import GameInfoBar from "../../src/components/GameInfoBar";
import ResignButton from "../../src/components/ResignButton";
import GameResultOverlay from "../../src/components/GameResultOverlay";
import MoveErrorToast from "../../src/components/MoveErrorToast";
import { useSocket } from "../../src/hooks/useSocket";
import { colors, spacing } from "../../src/theme/tokens";

export default function GameScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { gameState, playMove, resign, onMoveError } = useSocket();

  const [selectedCardIdx, setSelectedCardIdx] = useState<number | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);

  useEffect(() => { onMoveError((msg: string) => setMoveError(msg)); }, []);

  const gs = gameState as any;
  const color: Color = gs?.color ?? "white";
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
    return legalMovesMap.get(cardId(card))?.map((m: string) => m.slice(-2)) ?? [];
  }, [selectedCardIdx, myHand, legalMovesMap]);

  const handleCardTap = useCallback((idx: number) => {
    if (!myTurn) return;
    setSelectedCardIdx((prev) => (prev === idx ? null : idx));
  }, [myTurn]);

  const handleSquarePress = useCallback((square: string) => {
    if (!myTurn || selectedCardIdx == null) return;
    const card = myHand[selectedCardIdx];
    if (!card) return;
    const cid = cardId(card);
    const moves = legalMovesMap.get(cid) ?? [];
    const uciMove = moves.find((m: string) => m.endsWith(square));
    if (uciMove) {
      playMove(cid, uciMove);
      setSelectedCardIdx(null);
    }
  }, [myTurn, selectedCardIdx, myHand, legalMovesMap, playMove]);

  const isLandscape = width >= 600;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={[styles.scroll, isLandscape ? styles.row : styles.column]}>
        <View style={styles.topSection}>
          <GameInfoBar
            label={color === "black" ? "You" : "Opponent"}
            side="black"
            timeMs={color === "black" ? myTimeMs : opponentTimeMs}
            active={turn === "black"}
          />
          <OpponentHand cardCount={opponentHandCount} />
          <ScorePile cards={opponentScorePile} label="Captured" />
        </View>

        <View style={styles.boardSection}>
          <ChessBoard
            fen={fen}
            orientation={color}
            highlightedSquares={highlightedSquares}
            interactive={myTurn}
            onSquarePress={handleSquarePress}
          />
        </View>

        <View style={styles.bottomSection}>
          <ScorePile cards={myScorePile} label="Your Captures" />
          <GameInfoBar
            label={color === "white" ? "You" : "Opponent"}
            side="white"
            timeMs={color === "white" ? myTimeMs : opponentTimeMs}
            active={turn === "white"}
          />
          <CardHand
            cards={myHand}
            selectedIndex={selectedCardIdx}
            onCardTap={handleCardTap}
            disabled={!myTurn}
          />
          {selectedCardIdx != null && myHand[selectedCardIdx] && (
            <Text style={styles.selectedInfo}>
              Selected: {cardId(myHand[selectedCardIdx])} → {cardToPiece(myHand[selectedCardIdx])}
            </Text>
          )}
          <ResignButton onResign={resign} />
        </View>
      </ScrollView>

      <GameResultOverlay
        visible={result !== null}
        result={result}
        playerColor={color}
        onHome={() => router.replace("/")}
      />

      <MoveErrorToast message={moveError} onDismiss={() => setMoveError(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.primary },
  scroll: { padding: spacing.sm, gap: spacing.sm, paddingBottom: 60 },
  row: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center" },
  column: { flexDirection: "column", alignItems: "center" },
  topSection: { alignItems: "center", gap: spacing.xs, width: "100%", maxWidth: 480 },
  boardSection: { width: "100%", maxWidth: 480, alignSelf: "center" },
  bottomSection: { alignItems: "center", gap: spacing.sm, width: "100%", maxWidth: 480 },
  selectedInfo: { fontSize: 12, color: colors.text.secondary },
});
