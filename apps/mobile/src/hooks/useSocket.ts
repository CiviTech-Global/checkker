import { useEffect, useRef, useState, useCallback } from "react";
import { io, type Socket } from "socket.io-client";
import type { ChatMessage, Card, Color, GameResult, ScoredGame, GameOdds, PlayerProfile, BotDifficulty } from "@checkker/shared";
import type { GameClientState, GameStartPayload, GameUpdatePayload, MoveErrorPayload, GameOverPayload } from "../types/game";

const SERVER_URL = "http://localhost:3001";

const socket: Socket = io(SERVER_URL, { autoConnect: true });

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

socket.on("connect", () => {
  singletonConnected = true;
  connectedListeners.forEach((fn) => fn(true));
});

socket.on("disconnect", () => {
  singletonConnected = false;
  connectedListeners.forEach((fn) => fn(false));
});

socket.on("game_start", (data: GameStartPayload) => {
  _gameId = data.gameId;
  _gameState = data;
  _chatMessages = [];
  gameStateListeners.forEach((fn) => fn(_gameState));
  chatListeners.forEach((fn) => fn(_chatMessages));
});

socket.on("game_update", (data: GameUpdatePayload) => {
  _gameState = data;
  gameStateListeners.forEach((fn) => fn(_gameState));
});

socket.on("game_over", (data: GameOverPayload) => {
  if (_gameState) {
    _gameState = { ..._gameState, result: data.result };
    gameStateListeners.forEach((fn) => fn(_gameState));
  }
  _scores = data.scores ?? null;
  scoresListeners.forEach((fn) => fn(_scores));
});

socket.on("move_error", (data: MoveErrorPayload) => {
  _moveErrorCallback?.(data.error);
});

socket.on("bot_fallback_offer", (data: { tc: string }) => {
  _botFallbackCallback?.(data);
});

socket.on("chat_message", (msg: ChatMessage) => {
  _chatMessages = [..._chatMessages, msg];
  chatListeners.forEach((fn) => fn(_chatMessages));
});

socket.on("coaching_tip", (tip: any) => {
  const text = typeof tip === "string" ? tip : tip?.text ?? "";
  if (text) _coachingTipCallback?.(text);
});

socket.on("spectator_comment", (data: { text: string }) => {
  if (data?.text) _spectatorCommentCallback?.(data.text);
});

/* ── Spectate listeners ───────────────────────────────────────────── */

socket.on("spectate_game_start", (data: any) => {
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

socket.on("spectate_move", (data: SpectateMove) => {
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

socket.on("spectate_game_over", (data: { result: GameResult; scores?: ScoredGame }) => {
  if (_spectateState) {
    _spectateState = {
      ..._spectateState,
      result: data.result,
      scores: data.scores ?? null,
    };
    spectateStateListeners.forEach((fn) => fn(_spectateState));
  }
});

socket.on("spectate_position", (data: any) => {
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

export function useSocket() {
  const [connected, setConnected] = useState(singletonConnected);
  const [gameState, setGameState] = useState<GameClientState | null>(_gameState);
  const [scores, setScores] = useState<GameOverPayload["scores"] | null>(_scores);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(_chatMessages);
  const moveErrorCbRef = useRef<((error: string) => void) | null>(null);
  const botFallbackCbRef = useRef<((data: { tc: string }) => void) | null>(null);
  const coachingTipCbRef = useRef<((tip: string) => void) | null>(null);
  const spectatorCommentCbRef = useRef<((comment: string) => void) | null>(null);

  useEffect(() => {
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
  }, []);

  const joinQueue = useCallback((rating: number, tc: string) => {
    socket.emit("join_queue", { rating, tc });
  }, []);

  const joinCasual = useCallback((rating: number, tc: string) => {
    socket.emit("join_casual", { tc });
  }, []);

  const playMove = useCallback((card: string, move: string) => {
    if (!_gameId) return;
    socket.emit("play_move", { gameId: _gameId, card, move });
  }, []);

  const resign = useCallback(() => {
    if (!_gameId) return;
    socket.emit("resign", { gameId: _gameId });
  }, []);

  const startBotGame = useCallback((difficulty: string, tc: string) => {
    socket.emit("start_bot_game", { difficulty, tc });
  }, []);

  const onMoveError = useCallback((fn: (error: string) => void) => {
    moveErrorCbRef.current = fn;
  }, []);

  const onBotFallbackOffer = useCallback((fn: (data: { tc: string }) => void) => {
    botFallbackCbRef.current = fn;
  }, []);

  const requestBot = useCallback((difficulty: string, tc: string) => {
    socket.emit("request_bot", { difficulty, tc });
  }, []);

  const requestRematch = useCallback(() => {
    if (!_gameId) return;
    socket.emit("rematch_request", { gameId: _gameId });
  }, []);

  const sendChat = useCallback((text: string) => {
    if (!_gameId) return;
    socket.emit("chat_message", { gameId: _gameId, text });
  }, []);

  const undoMove = useCallback(() => {
    if (!_gameId) return;
    socket.emit("undo_move", { gameId: _gameId });
  }, []);

  const onCoachingTip = useCallback((fn: (tip: string) => void) => {
    coachingTipCbRef.current = fn;
  }, []);

  const onSpectatorComment = useCallback((fn: (comment: string) => void) => {
    spectatorCommentCbRef.current = fn;
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

  const startSpectateGame = useCallback((whiteDifficulty: string, blackDifficulty: string) => {
    socket.emit("start_spectate_bot_game", { whiteDifficulty, blackDifficulty });
  }, []);

  const spectatePause = useCallback((gameId: string) => {
    socket.emit("spectate_pause", { gameId });
  }, []);

  const spectateResume = useCallback((gameId: string) => {
    socket.emit("spectate_resume", { gameId });
  }, []);

  const spectateStepForward = useCallback((gameId: string) => {
    socket.emit("spectate_step_forward", { gameId });
  }, []);

  const spectateStepBackward = useCallback((gameId: string, currentIndex: number) => {
    socket.emit("spectate_step_backward", { gameId, currentIndex });
  }, []);

  const spectateLeave = useCallback((gameId: string) => {
    socket.emit("spectate_leave", { gameId });
    _spectateState = null;
    _spectateMoves = [];
    spectateStateListeners.forEach((fn) => fn(null));
    spectateMovesListeners.forEach((fn) => fn([]));
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
    spectateState,
    spectateMoves,
    startSpectateGame,
    spectatePause,
    spectateResume,
    spectateStepForward,
    spectateStepBackward,
    spectateLeave,
  };
}
