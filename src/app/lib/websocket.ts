// lib/websocket.ts
import { Server, Socket } from "socket.io";

export function setupSocketServer(io: Server) {
  io.on("connection", (socket: Socket) => {
    console.log(`🔌 Player connected: ${socket.id}`);

    socket.on("join-game", (gameId: string) => {
      socket.join(gameId);
      console.log(`🎮 Player ${socket.id} joined game ${gameId}`);
    });

    socket.on("score-update", (data) => {
      io.to(data.gameId).emit("score-update", data);
    });

    socket.on("disconnect", () => {
      console.log(`❌ Player disconnected: ${socket.id}`);
    });
  });
}
