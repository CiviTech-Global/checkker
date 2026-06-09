import { useEffect, useRef, useState, useCallback } from "react";
import { io, type Socket } from "socket.io-client";
import type { ChatMessage, Card, Color, GameResult, ScoredGame, GameOdds, PlayerProfile, BotDifficulty } from "@checkker/shared";
import type { GameClientState, GameStartPayload, GameUpdatePayload, MoveErrorPayload, GameOverPayload } from "../types/game";
import type { Puzzle, PuzzleResult, PuzzlesListData } from "../types/puzzle";
import { SERVER_URL } from "../config/features";

/* ── Lazy socket singleton ──────────────────────────────────────────── */

let socket: Socket | null = null;
let listenersAttached = false;

function getSocket(): Socket {
  if (!socket) {
    socket = io(SERVER_URL, { autoConnect: true });
    attachListeners(socket);
  }
  return socket;
}

let singletonConnected = false;
const connectedListeners = new Set<(v: boolean) => void>();
const gameStateListeners = new Set<(v: GameClientState | null) => void>();

let _gameId: string | null = null;
let _gameState: GameClientState | null = null;
let _scores: GameOverPayload["scores"] | null = null;
let _chatMessages: ChatMessage[] = [];
let _moveErrorCallback: ((error: string) => void) | null = null;
let _botFallbackCallback: ((data: { tc: string }) => void) | null = null;
let _coachingTipCallback: ((tip: string) => void) | null = null;
let _spectatorCommentCallback: ((comment: string) => void) | null = null;
let _gameOverLocalCallback: ((data: GameOverPayload) => void) | null = null;
let _rematchRequestedCallback: (() => void) | null = null;

/* ── Auth & Betting state ──────────────────────────────────────────── */

export interface AuthState {
  profile: PlayerProfile | null;
  isNewUser: boolean;
  walletAddress?: string;
}

export interface DepositStatus {
  gameId: string;
  betAmountWei: string;
  betAmountUsd: number;
  contractAddress: string;
  myDeposit: boolean;
  opponentDeposit: boolean;
}

export interface BetSettledPayload {
  escrowGameId: string;
  txHash: string;
  betAmountUsd: number;
  result: string;
  outcome: "win" | "loss" | "draw";
}

let _authState: AuthState | null = null;
let _authErrorCallback: ((error: string) => void) | null = null;
let _authChallengeCallback: ((data: { nonce: string; message: string }) => void) | null = null;
let _depositStatus: DepositStatus | null = null;
let _betSettledCallback: ((data: BetSettledPayload) => void) | null = null;
let _betCancelledCallback: ((data: { gameId: string; reason: string }) => void) | null = null;
let _queueJoinedCallback: ((data: { mode: string; difficulty: string; tc: string; betAmountUsd: number }) => void) | null = null;
let _usernameCheckCallback: ((data: { username: string; available: boolean }) => void) | null = null;
const authStateListeners = new Set<(v: AuthState | null) => void>();
const depositStatusListeners = new Set<(v: DepositStatus | null) => void>();

export interface LeaderboardData {
  entries: any[];
  myRank: number | null;
}

export interface ProfileData {
  profile: PlayerProfile | null;
  recentGames: any[];
  rank?: number;
  user?: any;
}

let _leaderboardCallback: ((data: LeaderboardData) => void) | null = null;
let _profileDataCallback: ((data: ProfileData) => void) | null = null;
const scoresListeners = new Set<(v: GameOverPayload["scores"] | null) => void>();
const chatListeners = new Set<(v: ChatMessage[]) => void>();

/* ── Spectate types and state ─────────────────────────────────────── */

export interface SpectateMove {
  fen: string;
  move: string;
  card: string;
  color: Color;
  whiteHand: Card[];
  blackHand: Card[];
  whiteScorePile: Card[];
  blackScorePile: Card[];
  turn: Color;
  moveIndex: number;
  odds?: GameOdds;
  drawPileCount?: number;
}

export interface SpectateGameState {
  gameId: string;
  fen: string;
  turn: Color;
  whiteHand: Card[];
  blackHand: Card[];
  whiteScorePile: Card[];
  blackScorePile: Card[];
  whiteProfile: PlayerProfile;
  blackProfile: PlayerProfile;
  odds: GameOdds;
  whiteDifficulty: BotDifficulty;
  blackDifficulty: BotDifficulty;
  result?: GameResult | null;
  scores?: ScoredGame | null;
}

let _spectateState: SpectateGameState | null = null;
let _spectateMoves: SpectateMove[] = [];
const spectateStateListeners = new Set<(v: SpectateGameState | null) => void>();
const spectateMovesListeners = new Set<(v: SpectateMove[]) => void>();

let _replayMoves: any[] | null = null;
const replayMovesListeners = new Set<(v: any[] | null) => void>();

/* ── Cosmetics state ──────────────────────────────────────── */

let _cosmetics: any[] | null = null;
let _userCosmetics: any[] | null = null;
const cosmeticsListeners = new Set<(v: any[] | null) => void>();
const userCosmeticsListeners = new Set<(v: any[] | null) => void>();

/* ── Puzzle state ──────────────────────────────────────────── */

let _puzzles: PuzzlesListData | null = null;
let _puzzleResult: PuzzleResult | null = null;
let _dailyPuzzle: Puzzle | null = null;
const puzzlesListeners = new Set<(v: PuzzlesListData | null) => void>();
const puzzleResultListeners = new Set<(v: PuzzleResult | null) => void>();
const dailyPuzzleListeners = new Set<(v: Puzzle | null) => void>();

/* ── Attach all socket event listeners (called once) ────────────────── */

function attachListeners(s: Socket) {
  if (listenersAttached) return;
  listenersAttached = true;

  s.on("connect", () => {
    singletonConnected = true;
    connectedListeners.forEach((fn) => fn(true));
  });

  s.on("disconnect", () => {
    singletonConnected = false;
    connectedListeners.forEach((fn) => fn(false));
  });

  s.on("game_start", (data: GameStartPayload) => {
    _gameId = data.gameId;
    _gameState = data;
    _chatMessages = [];
    gameStateListeners.forEach((fn) => fn(_gameState));
    chatListeners.forEach((fn) => fn(_chatMessages));
  });

  s.on("game_update", (data: GameUpdatePayload) => {
    _gameState = data;
    gameStateListeners.forEach((fn) => fn(_gameState));
  });

  s.on("game_over", (data: GameOverPayload) => {
    if (_gameState) {
      _gameState = { ..._gameState, result: data.result };
      gameStateListeners.forEach((fn) => fn(_gameState));
    }
    _scores = data.scores ?? null;
    scoresListeners.forEach((fn) => fn(_scores));
    _gameOverLocalCallback?.(data);
  });

  s.on("move_error", (data: MoveErrorPayload) => {
    _moveErrorCallback?.(data.error);
  });

  s.on("bot_fallback_offer", (data: { tc: string }) => {
    _botFallbackCallback?.(data);
  });

  s.on("rematch_requested", () => {
    _rematchRequestedCallback?.();
  });

  s.on("chat_message", (msg: ChatMessage) => {
    _chatMessages = [..._chatMessages, msg];
    chatListeners.forEach((fn) => fn(_chatMessages));
  });

  s.on("coaching_tip", (tip: any) => {
    const text = typeof tip === "string" ? tip : tip?.text ?? "";
    if (text) _coachingTipCallback?.(text);
  });

  s.on("spectator_comment", (data: { text: string }) => {
    if (data?.text) _spectatorCommentCallback?.(data.text);
  });

  /* ── Auth & Betting listeners ─────────────────────────────────────── */

  s.on("auth_challenge", (data: { nonce: string; message: string }) => {
    _authChallengeCallback?.(data);
  });

  s.on("auth_success", (data: { profile: PlayerProfile | null; isNewUser: boolean; walletAddress?: string }) => {
    _authState = data;
    authStateListeners.forEach((fn) => fn(_authState));
  });

  s.on("auth_error", (data: { error: string }) => {
    _authErrorCallback?.(data.error);
  });

  s.on("username_check", (data: { username: string; available: boolean }) => {
    _usernameCheckCallback?.(data);
  });

  s.on("awaiting_deposits", (data: { gameId: string; betAmountWei: string; betAmountUsd: number; contractAddress: string }) => {
    _depositStatus = { ...data, myDeposit: false, opponentDeposit: false };
    depositStatusListeners.forEach((fn) => fn(_depositStatus));
  });

  s.on("deposit_confirmed", (data: { player: "self" | "opponent" }) => {
    if (_depositStatus) {
      if (data.player === "self") _depositStatus = { ..._depositStatus, myDeposit: true };
      else _depositStatus = { ..._depositStatus, opponentDeposit: true };
      depositStatusListeners.forEach((fn) => fn(_depositStatus));
    }
  });

  s.on("bet_settled", (data: BetSettledPayload) => {
    _betSettledCallback?.(data);
  });

  s.on("bet_cancelled", (data: { gameId: string; reason: string }) => {
    _depositStatus = null;
    depositStatusListeners.forEach((fn) => fn(null));
    _betCancelledCallback?.(data);
  });

  s.on("queue_joined", (data: { mode: string; difficulty: string; tc: string; betAmountUsd: number }) => {
    _queueJoinedCallback?.(data);
  });

  s.on("leaderboard", (data: LeaderboardData) => {
    _leaderboardCallback?.(data);
  });

  s.on("profile_data", (data: ProfileData) => {
    _profileDataCallback?.(data);
  });

  /* ── Spectate listeners ───────────────────────────────────────────── */

  s.on("spectate_game_start", (data: any) => {
    _spectateState = {
      gameId: data.gameId,
      fen: data.fen,
      turn: data.turn,
      whiteHand: data.whiteHand,
      blackHand: data.blackHand,
      whiteScorePile: data.whiteScorePile ?? [],
      blackScorePile: data.blackScorePile ?? [],
      whiteProfile: data.whiteProfile,
      blackProfile: data.blackProfile,
      odds: data.odds,
      whiteDifficulty: data.whiteDifficulty,
      blackDifficulty: data.blackDifficulty,
      result: null,
      scores: null,
    };
    _spectateMoves = [];
    spectateStateListeners.forEach((fn) => fn(_spectateState));
    spectateMovesListeners.forEach((fn) => fn(_spectateMoves));
  });

  s.on("spectate_move", (data: SpectateMove) => {
    _spectateMoves = [..._spectateMoves, data];
    if (_spectateState) {
      _spectateState = {
        ..._spectateState,
        fen: data.fen,
        turn: data.turn,
        whiteHand: data.whiteHand,
        blackHand: data.blackHand,
        whiteScorePile: data.whiteScorePile,
        blackScorePile: data.blackScorePile,
        odds: data.odds ?? _spectateState.odds,
      };
      spectateStateListeners.forEach((fn) => fn(_spectateState));
    }
    spectateMovesListeners.forEach((fn) => fn(_spectateMoves));
  });

  s.on("spectate_game_over", (data: { result: GameResult; scores?: ScoredGame }) => {
    if (_spectateState) {
      _spectateState = {
        ..._spectateState,
        result: data.result,
        scores: data.scores ?? null,
      };
      spectateStateListeners.forEach((fn) => fn(_spectateState));
    }
  });

  s.on("spectate_position", (data: any) => {
    if (_spectateState) {
      _spectateState = {
        ..._spectateState,
        fen: data.fen,
        turn: data.turn,
        whiteHand: data.whiteHand,
        blackHand: data.blackHand,
        whiteScorePile: data.whiteScorePile,
        blackScorePile: data.blackScorePile,
      };
      spectateStateListeners.forEach((fn) => fn(_spectateState));
    }
  });

  /* ── Replay listeners ───────────────────────────────────────────── */

  s.on("game_moves", (data: { gameId: string; moves: any[] }) => {
    _replayMoves = data.moves;
    replayMovesListeners.forEach((fn) => fn(_replayMoves));
  });

  /* ── Puzzle listeners ─────────────────────────────────────────────── */

  s.on("daily_puzzle", (data: Puzzle) => {
    _dailyPuzzle = data;
    dailyPuzzleListeners.forEach((fn) => fn(_dailyPuzzle));
  });

  s.on("puzzles", (data: PuzzlesListData) => {
    _puzzles = data;
    puzzlesListeners.forEach((fn) => fn(_puzzles));
  });

  s.on("puzzle_result", (data: PuzzleResult) => {
    _puzzleResult = data;
    puzzleResultListeners.forEach((fn) => fn(_puzzleResult));
  });

  /* ── Cosmetics listeners ─────────────────────────────────────────── */

  s.on("cosmetics", (data: { cosmetics: any[]; userCosmetics: any[] }) => {
    _cosmetics = data.cosmetics;
    _userCosmetics = data.userCosmetics;
    cosmeticsListeners.forEach((fn) => fn(_cosmetics));
    userCosmeticsListeners.forEach((fn) => fn(_userCosmetics));
  });

  s.on("cosmetic_equipped", (data: { cosmeticId: string; equipped: boolean }) => {
    if (_userCosmetics) {
      _userCosmetics = _userCosmetics.map((uc) =>
        uc.cosmeticId === data.cosmeticId ? { ...uc, equipped: data.equipped } : { ...uc, equipped: false }
      );
      userCosmeticsListeners.forEach((fn) => fn(_userCosmetics));
    }
  });
}

/* ── Server reconnection (LAN support) ──────────────────────────────── */

export function connectToServer(url: string) {
  const oldSocket = socket;
  if (oldSocket) {
    oldSocket.removeAllListeners();
    oldSocket.disconnect();
  }

  _gameId = null;
  _gameState = null;
  _scores = null;
  _chatMessages = [];
  _depositStatus = null;
  _authState = null;
  _spectateState = null;
  _spectateMoves = [];
  _replayMoves = null;
  _puzzles = null;
  _puzzleResult = null;
  _dailyPuzzle = null;

  listenersAttached = false;
  singletonConnected = false;

  socket = io(url, { autoConnect: true });
  attachListeners(socket);

  gameStateListeners.forEach((fn) => fn(null));
  scoresListeners.forEach((fn) => fn(null));
  chatListeners.forEach((fn) => fn([]));
  depositStatusListeners.forEach((fn) => fn(null));
  authStateListeners.forEach((fn) => fn(null));
  spectateStateListeners.forEach((fn) => fn(null));
  spectateMovesListeners.forEach((fn) => fn([]));
  replayMovesListeners.forEach((fn) => fn(null));
  puzzlesListeners.forEach((fn) => fn(null));
  puzzleResultListeners.forEach((fn) => fn(null));
  dailyPuzzleListeners.forEach((fn) => fn(null));
}

export function reconnectToDefault() {
  connectToServer(SERVER_URL);
}

export function useSocket() {
  const [connected, setConnected] = useState(singletonConnected);
  const [gameState, setGameState] = useState<GameClientState | null>(_gameState);
  const [scores, setScores] = useState<GameOverPayload["scores"] | null>(_scores);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(_chatMessages);
  const moveErrorCbRef = useRef<((error: string) => void) | null>(null);
  const botFallbackCbRef = useRef<((data: { tc: string }) => void) | null>(null);
  const coachingTipCbRef = useRef<((tip: string) => void) | null>(null);
  const spectatorCommentCbRef = useRef<((comment: string) => void) | null>(null);
  const rematchRequestedCbRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Initialize socket lazily on first hook mount
    getSocket();

    const onConnected = (v: boolean) => setConnected(v);
    const onGameState = (v: GameClientState | null) => setGameState(v);
    const onScores = (v: GameOverPayload["scores"] | null) => setScores(v);
    const onChat = (v: ChatMessage[]) => setChatMessages(v);

    connectedListeners.add(onConnected);
    gameStateListeners.add(onGameState);
    scoresListeners.add(onScores);
    chatListeners.add(onChat);

    return () => {
      connectedListeners.delete(onConnected);
      gameStateListeners.delete(onGameState);
      scoresListeners.delete(onScores);
      chatListeners.delete(onChat);
    };
  }, []);

  useEffect(() => {
    _moveErrorCallback = (error: string) => moveErrorCbRef.current?.(error);
    _botFallbackCallback = (data: { tc: string }) => botFallbackCbRef.current?.(data);
    _coachingTipCallback = (tip: string) => coachingTipCbRef.current?.(tip);
    _spectatorCommentCallback = (comment: string) => spectatorCommentCbRef.current?.(comment);
    _rematchRequestedCallback = () => rematchRequestedCbRef.current?.();
  }, []);

  const joinQueue = useCallback((rating: number, tc: string) => {
    getSocket().emit("join_queue", { rating, tc });
  }, []);

  const joinCasual = useCallback((rating: number, tc: string) => {
    getSocket().emit("join_casual", { tc });
  }, []);

  const playMove = useCallback((card: string, move: string) => {
    if (!_gameId) return;
    getSocket().emit("play_move", { gameId: _gameId, card, move });
  }, []);

  const resign = useCallback(() => {
    if (!_gameId) return;
    getSocket().emit("resign", { gameId: _gameId });
  }, []);

  const startBotGame = useCallback((difficulty: string, tc: string) => {
    getSocket().emit("start_bot_game", { difficulty, tc });
  }, []);

  const onMoveError = useCallback((fn: (error: string) => void) => {
    moveErrorCbRef.current = fn;
  }, []);

  const onBotFallbackOffer = useCallback((fn: (data: { tc: string }) => void) => {
    botFallbackCbRef.current = fn;
  }, []);

  const requestBot = useCallback((difficulty: string, tc: string) => {
    getSocket().emit("request_bot", { difficulty, tc });
  }, []);

  const requestRematch = useCallback(() => {
    if (!_gameId) return;
    getSocket().emit("rematch_request", { gameId: _gameId });
  }, []);

  const sendChat = useCallback((text: string) => {
    if (!_gameId) return;
    getSocket().emit("chat_message", { gameId: _gameId, text });
  }, []);

  const undoMove = useCallback(() => {
    if (!_gameId) return;
    getSocket().emit("undo_move", { gameId: _gameId });
  }, []);

  const onCoachingTip = useCallback((fn: (tip: string) => void) => {
    coachingTipCbRef.current = fn;
  }, []);

  const onSpectatorComment = useCallback((fn: (comment: string) => void) => {
    spectatorCommentCbRef.current = fn;
  }, []);

  const onRematchRequested = useCallback((fn: () => void) => {
    rematchRequestedCbRef.current = fn;
  }, []);

  const gameOverLocalCbRef = useRef<((data: GameOverPayload) => void) | null>(null);

  useEffect(() => {
    _gameOverLocalCallback = (data) => gameOverLocalCbRef.current?.(data);
  }, []);

  const onGameOverLocal = useCallback((fn: (data: GameOverPayload) => void) => {
    gameOverLocalCbRef.current = fn;
  }, []);

  /* ── Spectate ─────────────────────────────────────────────────────── */

  /* ── Auth & Betting ─────────────────────────────────────────────────── */

  const [authState, setAuthState] = useState<AuthState | null>(_authState);
  const [depositStatus, setDepositStatus] = useState<DepositStatus | null>(_depositStatus);
  const authErrorCbRef = useRef<((error: string) => void) | null>(null);
  const authChallengeCbRef = useRef<((data: { nonce: string; message: string }) => void) | null>(null);
  const betSettledCbRef = useRef<((data: BetSettledPayload) => void) | null>(null);
  const betCancelledCbRef = useRef<((data: { gameId: string; reason: string }) => void) | null>(null);
  const queueJoinedCbRef = useRef<((data: { mode: string; difficulty: string; tc: string; betAmountUsd: number }) => void) | null>(null);
  const usernameCheckCbRef = useRef<((data: { username: string; available: boolean }) => void) | null>(null);

  useEffect(() => {
    const onAuth = (v: AuthState | null) => setAuthState(v);
    const onDeposit = (v: DepositStatus | null) => setDepositStatus(v);
    authStateListeners.add(onAuth);
    depositStatusListeners.add(onDeposit);
    return () => {
      authStateListeners.delete(onAuth);
      depositStatusListeners.delete(onDeposit);
    };
  }, []);

  useEffect(() => {
    _authErrorCallback = (error: string) => authErrorCbRef.current?.(error);
    _authChallengeCallback = (data) => authChallengeCbRef.current?.(data);
    _betSettledCallback = (data) => betSettledCbRef.current?.(data);
    _betCancelledCallback = (data) => betCancelledCbRef.current?.(data);
    _queueJoinedCallback = (data) => queueJoinedCbRef.current?.(data);
    _usernameCheckCallback = (data) => usernameCheckCbRef.current?.(data);
  }, []);

  const authRequest = useCallback((walletAddress: string) => {
    getSocket().emit("auth_request", { walletAddress });
  }, []);

  const authVerify = useCallback((walletAddress: string, signature: string) => {
    getSocket().emit("auth_verify", { walletAddress, signature });
  }, []);

  const setUsername = useCallback((walletAddress: string, username: string, avatarId?: string) => {
    getSocket().emit("set_username", { walletAddress, username, avatarId });
  }, []);

  const checkUsername = useCallback((username: string) => {
    getSocket().emit("check_username", { username });
  }, []);

  const updateAvatar = useCallback((avatarId: string) => {
    getSocket().emit("update_avatar", { avatarId });
  }, []);

  const joinRanked = useCallback((difficulty: string, tc: string) => {
    getSocket().emit("join_ranked", { difficulty, tc });
  }, []);

  const joinCasualDifficulty = useCallback((difficulty: string, tc: string) => {
    getSocket().emit("join_casual_difficulty", { difficulty, tc });
  }, []);

  const getLeaderboard = useCallback(() => {
    getSocket().emit("get_leaderboard");
  }, []);

  const getProfile = useCallback(() => {
    getSocket().emit("get_profile");
  }, []);

  const onAuthError = useCallback((fn: (error: string) => void) => {
    authErrorCbRef.current = fn;
  }, []);

  const onAuthChallenge = useCallback((fn: (data: { nonce: string; message: string }) => void) => {
    authChallengeCbRef.current = fn;
  }, []);

  const onBetSettled = useCallback((fn: (data: BetSettledPayload) => void) => {
    betSettledCbRef.current = fn;
  }, []);

  const onBetCancelled = useCallback((fn: (data: { gameId: string; reason: string }) => void) => {
    betCancelledCbRef.current = fn;
  }, []);

  const onQueueJoined = useCallback((fn: (data: { mode: string; difficulty: string; tc: string; betAmountUsd: number }) => void) => {
    queueJoinedCbRef.current = fn;
  }, []);

  const onUsernameCheck = useCallback((fn: (data: { username: string; available: boolean }) => void) => {
    usernameCheckCbRef.current = fn;
  }, []);

  const leaderboardCbRef = useRef<((data: LeaderboardData) => void) | null>(null);
  const profileDataCbRef = useRef<((data: ProfileData) => void) | null>(null);

  useEffect(() => {
    _leaderboardCallback = (data) => leaderboardCbRef.current?.(data);
    _profileDataCallback = (data) => profileDataCbRef.current?.(data);
  }, []);

  const onLeaderboard = useCallback((fn: (data: LeaderboardData) => void) => {
    leaderboardCbRef.current = fn;
  }, []);

  const onProfileData = useCallback((fn: (data: ProfileData) => void) => {
    profileDataCbRef.current = fn;
  }, []);

  /* ── Spectate ─────────────────────────────────────────────────────── */

  const [spectateState, setSpectateState] = useState<SpectateGameState | null>(_spectateState);
  const [spectateMoves, setSpectateMoves] = useState<SpectateMove[]>(_spectateMoves);

  useEffect(() => {
    const onSS = (v: SpectateGameState | null) => setSpectateState(v);
    const onSM = (v: SpectateMove[]) => setSpectateMoves(v);
    spectateStateListeners.add(onSS);
    spectateMovesListeners.add(onSM);
    return () => {
      spectateStateListeners.delete(onSS);
      spectateMovesListeners.delete(onSM);
    };
  }, []);

  /* ── Replay ──────────────────────────────────────────────────────────── */

  const [replayMoves, setReplayMoves] = useState<any[] | null>(_replayMoves);

  useEffect(() => {
    const onReplayMoves = (v: any[] | null) => setReplayMoves(v);
    replayMovesListeners.add(onReplayMoves);
    return () => {
      replayMovesListeners.delete(onReplayMoves);
    };
  }, []);

  const startSpectateGame = useCallback((whiteDifficulty: string, blackDifficulty: string) => {
    getSocket().emit("start_spectate_bot_game", { whiteDifficulty, blackDifficulty });
  }, []);

  const spectatePause = useCallback((gameId: string) => {
    getSocket().emit("spectate_pause", { gameId });
  }, []);

  const spectateResume = useCallback((gameId: string) => {
    getSocket().emit("spectate_resume", { gameId });
  }, []);

  const spectateStepForward = useCallback((gameId: string) => {
    getSocket().emit("spectate_step_forward", { gameId });
  }, []);

  const spectateStepBackward = useCallback((gameId: string, currentIndex: number) => {
    getSocket().emit("spectate_step_backward", { gameId, currentIndex });
  }, []);

  const spectateLeave = useCallback((gameId: string) => {
    getSocket().emit("spectate_leave", { gameId });
    _spectateState = null;
    _spectateMoves = [];
    spectateStateListeners.forEach((fn) => fn(null));
    spectateMovesListeners.forEach((fn) => fn([]));
  }, []);

  /* ── Replay ──────────────────────────────────────────────────────────── */

  const getGameMoves = useCallback((gameId: string) => {
    getSocket().emit("get_game_moves", { gameId });
  }, []);

  /* ── Puzzle ────────────────────────────────────────────────────────── */

  const [puzzles, setPuzzles] = useState<PuzzlesListData | null>(_puzzles);
  const [puzzleResult, setPuzzleResult] = useState<PuzzleResult | null>(_puzzleResult);
  const [dailyPuzzle, setDailyPuzzle] = useState<Puzzle | null>(_dailyPuzzle);

  useEffect(() => {
    const onPuzzles = (v: PuzzlesListData | null) => setPuzzles(v);
    const onPuzzleResult = (v: PuzzleResult | null) => setPuzzleResult(v);
    const onDailyPuzzle = (v: Puzzle | null) => setDailyPuzzle(v);
    puzzlesListeners.add(onPuzzles);
    puzzleResultListeners.add(onPuzzleResult);
    dailyPuzzleListeners.add(onDailyPuzzle);
    return () => {
      puzzlesListeners.delete(onPuzzles);
      puzzleResultListeners.delete(onPuzzleResult);
      dailyPuzzleListeners.delete(onDailyPuzzle);
    };
  }, []);

  const getPuzzles = useCallback((category: string, limit?: number) => {
    getSocket().emit("get_puzzles", { category, limit });
  }, []);

  const getDailyPuzzle = useCallback(() => {
    getSocket().emit("get_daily_puzzle");
  }, []);

  const submitPuzzle = useCallback((puzzleId: string, moveUci: string, timeSpentMs: number, usedHint: boolean) => {
    getSocket().emit("submit_puzzle", { puzzleId, moveUci, timeSpentMs, usedHint });
  }, []);

  /* ── Cosmetics ────────────────────────────────────────────────────── */

  const [cosmetics, setCosmetics] = useState<any[] | null>(_cosmetics);
  const [userCosmetics, setUserCosmetics] = useState<any[] | null>(_userCosmetics);

  useEffect(() => {
    const onCosmetics = (v: any[] | null) => setCosmetics(v);
    const onUserCosmetics = (v: any[] | null) => setUserCosmetics(v);
    cosmeticsListeners.add(onCosmetics);
    userCosmeticsListeners.add(onUserCosmetics);
    return () => {
      cosmeticsListeners.delete(onCosmetics);
      userCosmeticsListeners.delete(onUserCosmetics);
    };
  }, []);

  const getCosmetics = useCallback(() => {
    getSocket().emit("get_cosmetics");
  }, []);

  const equipCosmetic = useCallback((cosmeticId: string) => {
    getSocket().emit("equip_cosmetic", { cosmeticId });
  }, []);

  return {
    connected,
    gameState,
    scores,
    chatMessages,
    joinQueue,
    joinCasual,
    playMove,
    resign,
    startBotGame,
    requestBot,
    requestRematch,
    onMoveError,
    onBotFallbackOffer,
    sendChat,
    undoMove,
    onCoachingTip,
    onSpectatorComment,
    onGameOverLocal,
    onRematchRequested,
    // Auth
    authState,
    authRequest,
    authVerify,
    setUsername,
    checkUsername,
    updateAvatar,
    onAuthError,
    onAuthChallenge,
    onUsernameCheck,
    // Betting / Matchmaking
    depositStatus,
    joinRanked,
    joinCasualDifficulty,
    onBetSettled,
    onBetCancelled,
    onQueueJoined,
    getLeaderboard,
    getProfile,
    onLeaderboard,
    onProfileData,
    // Spectate
    spectateState,
    spectateMoves,
    startSpectateGame,
    spectatePause,
    spectateResume,
    spectateStepForward,
    spectateStepBackward,
    spectateLeave,
    // Replay
    replayMoves,
    getGameMoves,
    // Puzzles
    puzzles,
    puzzleResult,
    dailyPuzzle,
    getPuzzles,
    getDailyPuzzle,
    submitPuzzle,
    // Cosmetics
    cosmetics,
    userCosmetics,
    getCosmetics,
    equipCosmetic,
    // Server reconnection (LAN support)
    connectToServer,
    reconnectToDefault,
  };
}
