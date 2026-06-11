import { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { useRouter, useLocalSearchParams } from "expo-router";
import { cardId, type ScoredGame } from "@checkker/shared";
import { colors, spacing, radius, glassStyle } from "../../src/theme/tokens";
import { LocalGameEngine, type LocalGameSnapshot } from "../../src/offline/LocalGameEngine";
import { pickBotMove, type LocalBotDifficulty } from "../../src/offline/LocalBot";
import ChessBoard from "../../src/components/ChessBoard";
import CardHand from "../../src/components/CardHand";
import OpponentHand from "../../src/components/OpponentHand";
import Icon from "../../src/components/Icon";

const BOT_DELAY_MS = 700;

function describeResult(snapshot: LocalGameSnapshot, playerColor: string): string {
  const result = snapshot.result;
  if (!result) return "";
  switch (result.type) {
    case "checkmate":
      return result.winner === playerColor ? "Checkmate — you win!" : "Checkmate — the bot wins.";
    case "resignation":
      return result.winner === playerColor ? "The bot resigned — you win!" : "You resigned.";
    case "timeout":
      return result.winner === playerColor ? "You win on time!" : "You lost on time.";
    case "draw":
      return "Draw.";
    case "deckExhausted":
      return "Deck exhausted — poker hands decide!";
    default:
      return "Game over.";
  }
}

export default function OfflineGameScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ difficulty?: string }>();
  const difficulty = (params.difficulty ?? "beginner") as LocalBotDifficulty;

  const engineRef = useRef<LocalGameEngine | null>(null);
  if (!engineRef.current) {
    engineRef.current = new LocalGameEngine("white");
  }
  const engine = engineRef.current;

  const [snapshot, setSnapshot] = useState<LocalGameSnapshot>(() => engine.getSnapshot());
  const [selectedCard, setSelectedCard] = useState<number | null>(null);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [legalForCard, setLegalForCard] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [scores, setScores] = useState<ScoredGame | null>(null);

  const refresh = useCallback(() => {
    const snap = engine.getSnapshot();
    setSnapshot(snap);
    if (snap.result) {
      setScores(engine.getScores());
    }
  }, [engine]);

  // Bot replies whenever it's the bot's turn.
  useEffect(() => {
    if (snapshot.result || snapshot.turn === engine.playerColor) return;
    const timer = setTimeout(() => {
      const botMove = pickBotMove(engine, difficulty);
      if (botMove) {
        engine.playCard(botMove.cardId, botMove.move);
      }
      refresh();
    }, BOT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [snapshot, engine, difficulty, refresh]);

  const handleCardTap = useCallback(
    (index: number) => {
      if (snapshot.result || snapshot.turn !== engine.playerColor) return;
      setError(null);
      setSelectedSquare(null);
      if (selectedCard === index) {
        setSelectedCard(null);
        setLegalForCard([]);
        return;
      }
      setSelectedCard(index);
      const card = snapshot.hand[index];
      const legal = engine
        .getLegalMoves()
        .find((g) => cardId(g.card) === cardId(card));
      setLegalForCard(legal?.moves ?? []);
    },
    [snapshot, selectedCard, engine]
  );

  const handleSquarePress = useCallback(
    (square: string) => {
      if (snapshot.result || snapshot.turn !== engine.playerColor) return;
      if (selectedCard === null) {
        setError("Select a card first.");
        return;
      }
      setError(null);

      if (selectedSquare) {
        const move = `${selectedSquare}${square}`;
        const matching = legalForCard.filter((m) => m.startsWith(move));
        if (matching.length > 0) {
          // Auto-queen promotions for simplicity.
          const uci = matching.find((m) => m.length === 4) ?? matching.find((m) => m.endsWith("q")) ?? matching[0];
          const card = snapshot.hand[selectedCard];
          const result = engine.playCard(cardId(card), uci);
          if (!result.success) {
            setError(result.error ?? "Move failed.");
          } else {
            setSelectedCard(null);
            setSelectedSquare(null);
            setLegalForCard([]);
            refresh();
          }
          return;
        }
        // Not a destination — treat as a new origin selection.
      }

      const origins = new Set(legalForCard.map((m) => m.slice(0, 2)));
      if (origins.has(square)) {
        setSelectedSquare(square);
      } else {
        setSelectedSquare(null);
      }
    },
    [snapshot, selectedCard, selectedSquare, legalForCard, engine, refresh]
  );

  const highlighted = selectedSquare
    ? legalForCard.filter((m) => m.startsWith(selectedSquare)).map((m) => m.slice(2, 4))
    : [];

  const handleNewGame = useCallback(() => {
    engineRef.current = new LocalGameEngine("white");
    setSelectedCard(null);
    setSelectedSquare(null);
    setLegalForCard([]);
    setScores(null);
    setError(null);
    setSnapshot(engineRef.current.getSnapshot());
  }, []);

  const handleResign = useCallback(() => {
    if (snapshot.result) return;
    engine.resign(engine.playerColor);
    refresh();
  }, [engine, snapshot, refresh]);

  const myTurn = !snapshot.result && snapshot.turn === engine.playerColor;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <Animated.View entering={FadeIn.duration(300)} style={styles.header}>
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
          style={styles.backBtn}
        >
          <Icon name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Offline vs Bot</Text>
        <View style={{ width: 40 }} />
      </Animated.View>

      <Text style={styles.subtitle}>
        {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} bot — no connection needed
      </Text>

      <View style={styles.statusRow}>
        <Text style={[styles.statusText, myTurn && styles.statusActive]}>
          {snapshot.result
            ? describeResult(snapshot, engine.playerColor)
            : myTurn
            ? "Your turn — pick a card, then a move"
            : "Bot is thinking..."}
        </Text>
      </View>

      <OpponentHand cardCount={snapshot.opponentHandCount} />

      <View style={styles.boardWrap}>
        <ChessBoard
          fen={snapshot.fen}
          orientation={engine.playerColor}
          highlightedSquares={highlighted}
          selectedSquare={selectedSquare}
          lastMove={snapshot.lastMove}
          interactive={myTurn}
          onSquarePress={handleSquarePress}
        />
      </View>

      <CardHand
        cards={snapshot.hand}
        selectedIndex={selectedCard}
        onCardTap={handleCardTap}
        disabled={!myTurn}
      />

      {error && <Text style={styles.errorText}>{error}</Text>}

      <View style={styles.infoRow}>
        <Text style={styles.infoText}>Draw pile: {snapshot.drawPileCount}</Text>
        <Text style={styles.infoText}>Your score pile: {snapshot.scorePile.length}</Text>
      </View>

      {snapshot.result && scores ? (
        <View style={styles.resultCard}>
          <Text style={styles.resultTitle}>{describeResult(snapshot, engine.playerColor)}</Text>
          <View style={styles.scoreRow}>
            <Text style={styles.scoreText}>
              You: {engine.playerColor === "white" ? scores.whiteTotal : scores.blackTotal} pts
            </Text>
            <Text style={styles.scoreText}>
              Bot: {engine.playerColor === "white" ? scores.blackTotal : scores.whiteTotal} pts
            </Text>
          </View>
          <TouchableOpacity style={styles.primaryBtn} onPress={handleNewGame}>
            <Text style={styles.primaryBtnText}>Play Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.resignBtn} onPress={handleResign}>
          <Text style={styles.resignText}>Resign</Text>
        </TouchableOpacity>
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
    gap: spacing.sm,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.md,
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
  subtitle: {
    fontSize: 13,
    color: colors.text.muted,
    textAlign: "center",
  },
  statusRow: {
    alignItems: "center",
    paddingHorizontal: spacing.md,
  },
  statusText: {
    fontSize: 14,
    color: colors.text.secondary,
    fontWeight: "600",
  },
  statusActive: {
    color: colors.accent.gold,
  },
  boardWrap: {
    paddingHorizontal: spacing.md,
  },
  errorText: {
    fontSize: 13,
    color: colors.accent.red,
    textAlign: "center",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.lg,
  },
  infoText: {
    fontSize: 12,
    color: colors.text.muted,
  },
  resultCard: {
    ...glassStyle,
    borderRadius: radius.lg,
    marginHorizontal: spacing.md,
    padding: spacing.lg,
    alignItems: "center",
    gap: spacing.sm,
  },
  resultTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.text.primary,
    textAlign: "center",
  },
  scoreRow: {
    flexDirection: "row",
    gap: spacing.lg,
  },
  scoreText: {
    fontSize: 14,
    color: colors.accent.gold,
    fontWeight: "600",
  },
  primaryBtn: {
    backgroundColor: colors.accent.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  resignBtn: {
    alignSelf: "center",
    borderWidth: 1,
    borderColor: colors.accent.red,
    borderRadius: radius.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.lg,
  },
  resignText: {
    color: colors.accent.red,
    fontSize: 13,
    fontWeight: "600",
  },
});
