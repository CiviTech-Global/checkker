import { useEffect, useRef, useState, useCallback } from "react";
import { io, type Socket } from "socket.io-client";
import type { GameClientState, GameStartPayload, GameUpdatePayload, MoveErrorPayload, GameOverPayload } from "../types/game";

const SERVER_URL = "http://localhost:3001";

const socket: Socket = io(SERVER_URL, { autoConnect: true });

let singletonConnected = false;
const connectedListeners = new Set<(v: boolean) => void>();
const gameStateListeners = new Set<(v: GameClientState | null) => void>();

let _gameId: string | null = null;
let _gameState: GameClientState | null = null;
let _moveErrorCallback: ((error: string) => void) | null = null;

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
  gameStateListeners.forEach((fn) => fn(_gameState));
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
});

socket.on("move_error", (data: MoveErrorPayload) => {
  _moveErrorCallback?.(data.error);
});

export function useSocket() {
  const [connected, setConnected] = useState(singletonConnected);
  const [gameState, setGameState] = useState<GameClientState | null>(_gameState);
  const moveErrorCbRef = useRef<((error: string) => void) | null>(null);

  useEffect(() => {
    const onConnected = (v: boolean) => setConnected(v);
    const onGameState = (v: GameClientState | null) => setGameState(v);

    connectedListeners.add(onConnected);
    gameStateListeners.add(onGameState);

    return () => {
      connectedListeners.delete(onConnected);
      gameStateListeners.delete(onGameState);
    };
  }, []);

  useEffect(() => {
    _moveErrorCallback = (error: string) => moveErrorCbRef.current?.(error);
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

  const onMoveError = useCallback((fn: (error: string) => void) => {
    moveErrorCbRef.current = fn;
  }, []);

  return {
    connected,
    gameState,
    joinQueue,
    joinCasual,
    playMove,
    resign,
    onMoveError,
  };
}
