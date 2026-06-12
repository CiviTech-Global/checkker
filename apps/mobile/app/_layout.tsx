import "@ethersproject/shims";
import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-router";
import { colors, typography } from "../src/theme/tokens";
import { LocalProfileProvider, useLocalProfile } from "../src/context/LocalProfileContext";
import { useSocket } from "../src/hooks/useSocket";
import { ErrorBoundary } from "../src/components/ErrorBoundary";
import { initMonitoring } from "../src/utils/analytics";
import type { GameResult } from "@checkker/shared";

initMonitoring();

// NOTE: To enable premium Playfair Display font, install @expo-google-fonts/playfair-display
// and uncomment the useFonts block below. For now we use system serif fallback.
// import { useFonts, PlayfairDisplay_700Bold, PlayfairDisplay_800ExtraBold } from "@expo-google-fonts/playfair-display";

/**
 * Bridge component that records bot game results to local SQLite.
 * Must be rendered inside LocalProfileProvider.
 */
function GameRecordBridge() {
  const { onGameOverLocal, gameState } = useSocket();
  const { recordGameLocally } = useLocalProfile();

  useEffect(() => {
    onGameOverLocal((data) => {
      // Determine if this is a bot game by checking game metadata
      const gs = gameState as any;
      const isBotGame =
        gs?.whiteProfile?.id?.startsWith("bot-") ||
        gs?.blackProfile?.id?.startsWith("bot-") ||
        gs?.gameMeta?.mode === "bot";

      if (!isBotGame) return;

      // Determine outcome from the player's perspective
      const myColor = gs?.myColor ?? gs?.playerColor ?? "white";
      const result = data.result;
      let outcome: "win" | "loss" | "draw" = "draw";

      if (result.type === "checkmate" || result.type === "resignation" || result.type === "timeout") {
        outcome = result.winner === myColor ? "win" : "loss";
      } else if (result.type === "deckExhausted") {
        // Score-based result
        const scores = data.scores;
        if (scores) {
          outcome =
            scores.winner === myColor ? "win" : scores.winner === "draw" ? "draw" : "loss";
        }
      }

      const opponentProfile =
        myColor === "white" ? gs?.blackProfile : gs?.whiteProfile;

      recordGameLocally(outcome, {
        mode: "bot",
        difficulty: gs?.gameMeta?.difficulty ?? opponentProfile?.displayName,
        resultType: result.type as any,
        opponentName: opponentProfile?.displayName ?? "Bot",
        moveCount: gs?.moveHistory?.length ?? 0,
      });
    });
  }, [onGameOverLocal, gameState, recordGameLocally]);

  return null;
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <LocalProfileProvider>
        <GameRecordBridge />
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.bg.primary },
          }}
        />
      </LocalProfileProvider>
    </ErrorBoundary>
  );
}
