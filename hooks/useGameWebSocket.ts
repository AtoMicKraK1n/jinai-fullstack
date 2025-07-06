// hooks/useGameWebSocket.ts
import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";

const SOCKET_URL = "http://localhost:4000";

export const useGameWebSocket = (gameId: string) => {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    socketRef.current = io(SOCKET_URL);
    socketRef.current.emit("join-game", gameId);

    return () => {
      socketRef.current?.disconnect();
    };
  }, [gameId]);

  const emitEvent = (event: string, data: any) => {
    socketRef.current?.emit(event, data);
  };

  const onEvent = (event: string, callback: (...args: any[]) => void) => {
    socketRef.current?.on(event, callback);
  };

  return { emitEvent, onEvent, socket: socketRef.current };
};
