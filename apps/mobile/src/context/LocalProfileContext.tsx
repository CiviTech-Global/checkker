import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import {
  initLocalDb,
  getLocalProfile,
  updateLocalProfile,
  getStats,
  recordOfflineGame,
  syncOnlineStats,
  getGameHistory,
  type LocalProfile,
  type StatsRow,
  type GameOutcome,
  type GameMode,
  type GameResultType,
  type GameHistoryRow,
} from "../db/LocalDatabase";
import {
  createDemoData,
  deleteDemoData,
  type LeaderboardEntry,
} from "../dev/demoData";

/* ── Types ───────────────────────────────────────────────────────────── */

export interface SimpleStats {
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  currentStreak: number;
  bestStreak: number;
  rating: number;
}

interface LocalProfileContextValue {
  localProfile: LocalProfile;
  offlineStats: SimpleStats;
  onlineStats: SimpleStats;
  displayName: string;
  updateOfflineName: (name: string) => void;
  updateAvatar: (id: string) => void;
  cacheWalletAddress: (address: string) => void;
  setOnlineName: (name: string) => void;
  recordGameLocally: (
    outcome: GameOutcome,
    details: {
      mode: GameMode;
      difficulty?: string;
      resultType?: GameResultType;
      opponentName?: string;
      moveCount?: number;
    },
  ) => void;
  syncFromServer: (serverProfile: {
    gamesPlayed?: number;
    wins?: number;
    losses?: number;
    draws?: number;
    currentStreak?: number;
    bestStreak?: number;
    rating?: number;
  }) => void;
  getHistory: (filter?: { mode?: GameMode | GameMode[] }, limit?: number) => GameHistoryRow[];
  demoLeaderboard: LeaderboardEntry[] | null;
  isDemoDataLoaded: boolean;
  loadDemoData: () => void;
  clearDemoData: () => void;
}

const defaultStats: SimpleStats = {
  gamesPlayed: 0,
  wins: 0,
  losses: 0,
  draws: 0,
  currentStreak: 0,
  bestStreak: 0,
  rating: 1000,
};

const defaultProfile: LocalProfile = {
  offlineName: "Player",
  avatarId: "king_white",
  walletAddress: null,
  onlineName: null,
};

const LocalProfileContext = createContext<LocalProfileContextValue>({
  localProfile: defaultProfile,
  offlineStats: defaultStats,
  onlineStats: defaultStats,
  displayName: "Player",
  updateOfflineName: () => {},
  updateAvatar: () => {},
  cacheWalletAddress: () => {},
  setOnlineName: () => {},
  recordGameLocally: () => {},
  syncFromServer: () => {},
  getHistory: () => [],
  demoLeaderboard: null,
  isDemoDataLoaded: false,
  loadDemoData: () => {},
  clearDemoData: () => {},
});

/* ── Helper to split StatsRow ────────────────────────────────────────── */

function splitStats(row: StatsRow): { offline: SimpleStats; online: SimpleStats } {
  return {
    offline: {
      gamesPlayed: row.offGamesPlayed,
      wins: row.offWins,
      losses: row.offLosses,
      draws: row.offDraws,
      currentStreak: row.offCurrentStreak,
      bestStreak: row.offBestStreak,
      rating: row.offRating,
    },
    online: {
      gamesPlayed: row.onGamesPlayed,
      wins: row.onWins,
      losses: row.onLosses,
      draws: row.onDraws,
      currentStreak: row.onCurrentStreak,
      bestStreak: row.onBestStreak,
      rating: row.onRating,
    },
  };
}

/** Reload profile + stats from the database into React state. */
function reloadFromDb(
  setProfile: React.Dispatch<React.SetStateAction<LocalProfile>>,
  setOfflineStats: React.Dispatch<React.SetStateAction<SimpleStats>>,
  setOnlineStats: React.Dispatch<React.SetStateAction<SimpleStats>>,
) {
  setProfile(getLocalProfile());
  const stats = splitStats(getStats());
  setOfflineStats(stats.offline);
  setOnlineStats(stats.online);
}

/* ── Provider ────────────────────────────────────────────────────────── */

export function LocalProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<LocalProfile>(defaultProfile);
  const [offlineStats, setOfflineStats] = useState<SimpleStats>(defaultStats);
  const [onlineStats, setOnlineStats] = useState<SimpleStats>(defaultStats);
  const [demoLeaderboard, setDemoLeaderboard] = useState<LeaderboardEntry[] | null>(null);
  const [isDemoDataLoaded, setIsDemoDataLoaded] = useState(false);
  const initRef = useRef(false);

  // Initialize database on mount
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    try {
      initLocalDb();
      setProfile(getLocalProfile());
      const stats = splitStats(getStats());
      setOfflineStats(stats.offline);
      setOnlineStats(stats.online);
    } catch {
      // SQLite may not be available (e.g. SSR), keep defaults
    }
  }, []);

  const displayName = profile.onlineName ?? profile.offlineName;

  const updateOfflineName = useCallback((name: string) => {
    updateLocalProfile({ offlineName: name });
    setProfile((p) => ({ ...p, offlineName: name }));
  }, []);

  const updateAvatarCb = useCallback((id: string) => {
    updateLocalProfile({ avatarId: id });
    setProfile((p) => ({ ...p, avatarId: id }));
  }, []);

  const cacheWalletAddress = useCallback((address: string) => {
    updateLocalProfile({ walletAddress: address });
    setProfile((p) => ({ ...p, walletAddress: address }));
  }, []);

  const setOnlineNameCb = useCallback((name: string) => {
    updateLocalProfile({ onlineName: name });
    setProfile((p) => ({ ...p, onlineName: name }));
  }, []);

  const recordGameLocally = useCallback(
    (
      outcome: GameOutcome,
      details: {
        mode: GameMode;
        difficulty?: string;
        resultType?: GameResultType;
        opponentName?: string;
        moveCount?: number;
      },
    ) => {
      const newStats = recordOfflineGame(outcome, details);
      const split = splitStats(newStats);
      setOfflineStats(split.offline);
    },
    [],
  );

  const syncFromServer = useCallback(
    (serverProfile: {
      gamesPlayed?: number;
      wins?: number;
      losses?: number;
      draws?: number;
      currentStreak?: number;
      bestStreak?: number;
      rating?: number;
    }) => {
      const newStats = syncOnlineStats(serverProfile);
      const split = splitStats(newStats);
      setOnlineStats(split.online);
    },
    [],
  );

  const getHistoryCb = useCallback(
    (filter?: { mode?: GameMode | GameMode[] }, limit?: number) => {
      return getGameHistory(filter, limit);
    },
    [],
  );

  const loadDemoData = useCallback(() => {
    const leaderboard = createDemoData();
    setDemoLeaderboard(leaderboard);
    setIsDemoDataLoaded(true);
    reloadFromDb(setProfile, setOfflineStats, setOnlineStats);
  }, []);

  const clearDemoDataCb = useCallback(() => {
    deleteDemoData();
    setDemoLeaderboard(null);
    setIsDemoDataLoaded(false);
    reloadFromDb(setProfile, setOfflineStats, setOnlineStats);
  }, []);

  return (
    <LocalProfileContext.Provider
      value={{
        localProfile: profile,
        offlineStats,
        onlineStats,
        displayName,
        updateOfflineName,
        updateAvatar: updateAvatarCb,
        cacheWalletAddress,
        setOnlineName: setOnlineNameCb,
        recordGameLocally,
        syncFromServer,
        getHistory: getHistoryCb,
        demoLeaderboard,
        isDemoDataLoaded,
        loadDemoData,
        clearDemoData: clearDemoDataCb,
      }}
    >
      {children}
    </LocalProfileContext.Provider>
  );
}

export function useLocalProfile() {
  return useContext(LocalProfileContext);
}
