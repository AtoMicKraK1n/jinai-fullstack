import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();

async function verifyToken(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token) {
    throw new Error("No token provided");
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
  return decoded.userId;
}

export async function POST(request: NextRequest) {
  try {
    const userId = await verifyToken(request);
    const { gameId } = await request.json();

    if (!gameId) {
      return NextResponse.json(
        { error: "Game ID is required" },
        { status: 400 }
      );
    }

    // Get game details
    const game = await prisma.gameSession.findUnique({
      where: { id: gameId },
      include: {
        participants: true,
      },
    });

    if (!game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    // Check if game is joinable
    if (game.status !== "WAITING") {
      return NextResponse.json(
        { error: "Game is not accepting new players" },
        { status: 400 }
      );
    }

    if (game.currentPlayers >= game.maxPlayers) {
      return NextResponse.json({ error: "Game is full" }, { status: 400 });
    }

    // Check if user is already in this game
    const existingParticipant = game.participants.find(
      (p) => p.userId === userId
    );

    if (existingParticipant) {
      return NextResponse.json(
        { error: "You are already in this game" },
        { status: 400 }
      );
    }

    // Add user to game
    await prisma.gameParticipant.create({
      data: {
        gameId,
        userId,
      },
    });

    // Update game player count and prize pool
    const newPlayerCount = game.currentPlayers + 1;
    const updatedGame = await prisma.gameSession.update({
      where: { id: gameId },
      data: {
        currentPlayers: newPlayerCount,
        prizePool: game.prizePool + game.entryFee,
        // Start game if we have 4 players
        status: newPlayerCount === game.maxPlayers ? "STARTING" : "WAITING",
      },
    });

    // If game is starting, prepare questions
    if (newPlayerCount === game.maxPlayers) {
      await prepareGameQuestions(gameId);
    }

    return NextResponse.json({
      success: true,
      game: {
        id: updatedGame.id,
        poolId: updatedGame.poolId,
        status: updatedGame.status,
        currentPlayers: updatedGame.currentPlayers,
        maxPlayers: updatedGame.maxPlayers,
        prizePool: updatedGame.prizePool,
      },
      message:
        newPlayerCount === game.maxPlayers
          ? "Game is starting! Get ready..."
          : "Successfully joined the game",
    });
  } catch (error) {
    console.error("Game join error:", error);
    return NextResponse.json({ error: "Failed to join game" }, { status: 500 });
  }
}

async function prepareGameQuestions(gameId: string) {
  try {
    // Get random questions for the game
    const questions = await prisma.question.findMany({
      where: {
        isActive: true,
      },
      take: 10, // 10 questions per game
      orderBy: {
        createdAt: "desc", // You might want to randomize this
      },
    });

    // Create game questions
    const gameQuestions = questions.map((question, index) => ({
      gameId,
      questionId: question.id,
      orderIndex: index + 1,
      timeLimit: 30, // 30 seconds per question
    }));

    await prisma.gameQuestion.createMany({
      data: gameQuestions,
    });

    // Schedule game start (you might want to add a delay)
    setTimeout(async () => {
      await prisma.gameSession.update({
        where: { id: gameId },
        data: {
          status: "IN_PROGRESS",
          startTime: new Date(),
        },
      });
    }, 5000); // 5 second delay before starting
  } catch (error) {
    console.error("Error preparing game questions:", error);
  }
}
