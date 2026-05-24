import { useEffect, useRef, useState, useCallback } from "react";
import { io, type Socket } from "socket.io-client";

const SERVER_URL = "http://localhost:3001";

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [gameState, setGameState] = useState<any>(null);
  const [gameId, setGameId] = useState<string | null>(null);

  useEffect(() => {
    const socket = io(SERVER_URL);
    socketRef.current = socket;

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    socket.on("game_start", (data) => {
      setGameId(data.gameId);
      setGameState(data);
    });

    socket.on("game_update", (data) => {
      setGameState(data);
    });

    socket.on("game_over", (data) => {
      setGameState((prev: any) => ({ ...prev, result: data.result }));
    });

    socket.on("move_error", (data) => {
      console.error("Move error:", data.error);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const joinQueue = useCallback((rating: number, tc: string) => {
    socketRef.current?.emit("join_queue", { rating, tc });
  }, []);

  const playMove = useCallback((card: string, move: string) => {
    if (!gameId) return;
    socketRef.current?.emit("play_move", { gameId, card, move });
  }, [gameId]);

  const resign = useCallback(() => {
    if (!gameId) return;
    socketRef.current?.emit("resign", { gameId });
  }, [gameId]);

  return {
    connected,
    gameState,
    joinQueue,
    playMove,
    resign,
  };
}
