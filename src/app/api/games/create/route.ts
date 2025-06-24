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

    if (!poolId || !entryFee) {
      return NextResponse.json(
        { error: "Pool ID and entry fee are required" },
        { status: 400 }
      );
    }

    // Check if game with this poolId already exists
    const existingGame = await prisma.gameSession.findUnique({
      where: { poolId },
    });

    if (existingGame) {
      return NextResponse.json(
        { error: "Game with this pool ID already exists" },
        { status: 400 }
      );
    }

    // Create new game session
    const gameSession = await prisma.gameSession.create({
      data: {
        poolId,
        entryFee: parseFloat(entryFee),
        maxPlayers,
        prizePool: 0, // Will be updated as players join
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

    // Update player count
    await prisma.gameSession.update({
      where: { id: gameSession.id },
      data: {
        currentPlayers: 1,
        prizePool: parseFloat(entryFee),
      },
    });

    return NextResponse.json({
      success: true,
      game: {
        id: gameSession.id,
        poolId: gameSession.poolId,
        status: gameSession.status,
        currentPlayers: 1,
        maxPlayers: gameSession.maxPlayers,
        entryFee: gameSession.entryFee,
        prizePool: gameSession.prizePool,
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
    // Get all waiting games
    const waitingGames = await prisma.gameSession.findMany({
      where: {
        status: "WAITING",
        currentPlayers: {
          lt: 4, // Less than max players
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
