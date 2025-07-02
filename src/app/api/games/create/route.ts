import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();

// Middleware to verify JWT token
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
    const { poolId, entryFee, maxPlayers = 4 } = await request.json();

    if (!entryFee) {
      return NextResponse.json(
        { error: "Entry fee is required" },
        { status: 400 }
      );
    }

    let finalPoolId = poolId;

    // If no poolId provided, try to join an existing waiting game
    if (!finalPoolId) {
      const openGame = await prisma.gameSession.findFirst({
        where: {
          status: "WAITING",
          currentPlayers: { lt: maxPlayers },
          entryFee: parseFloat(entryFee),
        },
        orderBy: {
          createdAt: "asc",
        },
      });

      if (openGame) {
        return NextResponse.json(
          {
            success: false,
            message: "Found existing game to join",
            redirectToGameId: openGame.id,
          },
          { status: 302 } // or 409 if you prefer
        );
      }

      // No open game found, generate a new poolId
      finalPoolId =
        "pool_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
    }

    // Ensure no conflict with poolId if provided manually
    const existingPool = await prisma.gameSession.findUnique({
      where: { poolId: finalPoolId },
    });

    if (existingPool) {
      return NextResponse.json(
        { error: "Game with this pool ID already exists" },
        { status: 400 }
      );
    }

    // Create new game session
    const gameSession = await prisma.gameSession.create({
      data: {
        poolId: finalPoolId,
        entryFee: parseFloat(entryFee),
        maxPlayers,
        prizePool: 0,
        status: "WAITING",
      },
    });

    // Add creator as first participant
    await prisma.gameParticipant.create({
      data: {
        gameId: gameSession.id,
        userId,
      },
    });

    // Update current players and prize pool
    const updatedGame = await prisma.gameSession.update({
      where: { id: gameSession.id },
      data: {
        currentPlayers: 1,
        prizePool: parseFloat(entryFee),
      },
    });

    return NextResponse.json({
      success: true,
      game: {
        id: updatedGame.id,
        poolId: updatedGame.poolId,
        status: updatedGame.status,
        currentPlayers: updatedGame.currentPlayers,
        maxPlayers: updatedGame.maxPlayers,
        entryFee: updatedGame.entryFee,
        prizePool: updatedGame.prizePool,
      },
    });
  } catch (error) {
    console.error("Game creation error:", error);
    return NextResponse.json(
      { error: "Failed to create game" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const waitingGames = await prisma.gameSession.findMany({
      where: {
        status: "WAITING",
        currentPlayers: {
          lt: 4,
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                walletAddress: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      games: waitingGames.map((game) => ({
        id: game.id,
        poolId: game.poolId,
        status: game.status,
        currentPlayers: game.currentPlayers,
        maxPlayers: game.maxPlayers,
        entryFee: game.entryFee,
        prizePool: game.prizePool,
        participants: game.participants.map((p) => ({
          username: p.user.username,
          walletAddress: p.user.walletAddress,
          joinedAt: p.joinedAt,
        })),
        createdAt: game.createdAt,
      })),
    });
  } catch (error) {
    console.error("Fetch games error:", error);
    return NextResponse.json(
      { error: "Failed to fetch games" },
      { status: 500 }
    );
  }
}
