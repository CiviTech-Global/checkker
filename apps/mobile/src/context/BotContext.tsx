import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import type { BotConfiguration, BotMaturity } from "@checkker/shared";
import { recordBotGameResult } from "@checkker/shared";
import { loadBotConfig, loadBotMaturity, saveBotConfig, saveBotMaturity } from "../bot/storage";

interface BotContextValue {
  config: BotConfiguration;
  maturity: BotMaturity;
  loading: boolean;
  inBotMatch: boolean;
  setConfig: (config: BotConfiguration) => Promise<void>;
  setEnabled: (enabled: boolean) => Promise<void>;
  recordGameResult: (result: "win" | "loss" | "draw") => Promise<void>;
  setInBotMatch: (value: boolean) => void;
}

const BotContext = createContext<BotContextValue | null>(null);

const DEFAULT_CONFIG: BotConfiguration = {
  enabled: false,
  difficulty: "intermediate",
  strategy: "balanced",
  patience: 50,
  deepThinking: 40,
  riskTolerance: 50,
  thinkingDelayMs: 1500,
  autoRematch: false,
  allowTakeover: true,
};

const DEFAULT_MATURITY: BotMaturity = {
  gamesPlayed: 0,
  wins: 0,
  losses: 0,
  draws: 0,
  currentStreak: 0,
  bestStreak: 0,
  maturityScore: 0,
  unlockedTraits: [],
};

export function BotProvider({ children }: { children: ReactNode }) {
  const [config, setConfigState] = useState<BotConfiguration>(DEFAULT_CONFIG);
  const [maturity, setMaturityState] = useState<BotMaturity>(DEFAULT_MATURITY);
  const [loading, setLoading] = useState(true);
  const [inBotMatch, setInBotMatch] = useState(false);

  useEffect(() => {
    let mounted = true;
    Promise.all([loadBotConfig(), loadBotMaturity()]).then(([loadedConfig, loadedMaturity]) => {
      if (!mounted) return;
      setConfigState(loadedConfig);
      setMaturityState(loadedMaturity);
      setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const setConfig = useCallback(async (next: BotConfiguration) => {
    setConfigState(next);
    await saveBotConfig(next);
  }, []);

  const setEnabled = useCallback(async (enabled: boolean) => {
    const next = { ...config, enabled };
    await setConfig(next);
  }, [config, setConfig]);

  const recordGameResult = useCallback(async (result: "win" | "loss" | "draw") => {
    const next = recordBotGameResult(maturity, result);
    setMaturityState(next);
    await saveBotMaturity(next);
  }, [maturity]);

  return (
    <BotContext.Provider
      value={{
        config,
        maturity,
        loading,
        inBotMatch,
        setConfig,
        setEnabled,
        recordGameResult,
        setInBotMatch,
      }}
    >
      {children}
    </BotContext.Provider>
  );
}

export function useBot() {
  const ctx = useContext(BotContext);
  if (!ctx) throw new Error("useBot must be used inside BotProvider");
  return ctx;
}
