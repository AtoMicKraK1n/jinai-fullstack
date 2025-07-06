import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export function setupSocketServer(io: Server) {
  io.on("connection", (socket: Socket) => {
    console.log(`🔌 Player connected: ${socket.id}`);

    socket.on("join-game", async ({ gameId, token }) => {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
        const userId = decoded.userId;

        const participant = await prisma.gameParticipant.findFirst({
          where: { gameId, userId },
          include: { user: true },
        });

        if (!participant) {
          socket.emit("error", { message: "❌ Not a valid participant" });
          return;
        }

        socket.join(gameId);
        socket.data.userId = userId;
        socket.data.gameId = gameId;

        console.log(`🎮 ${participant.user.username} joined game ${gameId}`);

        io.to(gameId).emit("player-joined", {
          userId,
          username: participant.user.username,
        });
      } catch (err) {
        console.error("❌ Token verification failed:", err);
        socket.emit("error", { message: "Invalid token" });
      }
    });

    socket.on("score-update", (data) => {
      if (!data.gameId) return;
      io.to(data.gameId).emit("score-update", data);
    });

    socket.on("send-countdown", ({ gameId, seconds = 10 }) => {
      let timeLeft = seconds;
      const interval = setInterval(() => {
        io.to(gameId).emit("countdown", { seconds: timeLeft });
        timeLeft--;
        if (timeLeft < 0) clearInterval(interval);
      }, 1000);
    });

    socket.on("send-question", async ({ gameId, questionId }) => {
      const question = await prisma.question.findUnique({
        where: { id: questionId },
      });

      if (question) {
        io.to(gameId).emit("new-question", {
          id: question.id,
          text: question.question,
          options: {
            A: question.optionA,
            B: question.optionB,
            C: question.optionC,
            D: question.optionD,
          },
        });
      }
    });

    socket.on("game-over", ({ gameId, winner }) => {
      io.to(gameId).emit("game-over", {
        message: "🛑 Game Over",
        winner,
      });
    });

    socket.on("player-joined", ({ gameId, playerId }) => {
      io.to(gameId).emit("player-joined", {
        playerId,
        message: `👤 Player ${playerId} joined`,
      });
    });

    socket.on("disconnect", () => {
      console.log(`❌ Player disconnected: ${socket.id}`);
      if (socket.data?.gameId && socket.data?.userId) {
        io.to(socket.data.gameId).emit("player-left", {
          userId: socket.data.userId,
        });
      }
    });
  });
}
