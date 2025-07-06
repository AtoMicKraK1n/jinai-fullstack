// contexts/GameWebSocketContext.tsx
import React, { createContext, useContext } from "react";
import { useGameWebSocket } from "../hooks/useGameWebSocket";

const GameWebSocketContext = createContext<any>(null);

export const GameWebSocketProvider = ({ gameId, token, children }: any) => {
  const socket = useGameWebSocket(gameId, token);
  return (
    <GameWebSocketContext.Provider value={socket}>
      {children}
    </GameWebSocketContext.Provider>
  );
};

export const useSocket = () => useContext(GameWebSocketContext);
