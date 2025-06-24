import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();

async function verifyToken(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token) throw new Error("No token provided");
  const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
  return decoded.userId;
}

export async function GET(request: NextRequest) {
  try {
    const userId = await verifyToken(request);
    const { searchParams } = new URL(request.url);
    const gameId = searchParams.get("gameId");

    if (!gameId) {
      return NextResponse.json(
        { error: "Game ID is required" },
        { status: 400 }
      );
    }

    // Get game results
    const participants = await prisma.gameParticipant.findMany({
      where: { gameId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            walletAddress: true,
          },
        },
      },
    });

    // Calculate scores for each participant
    const results = await Promise.all(
      participants.map(async (participant) => {
        const answers = await prisma.playerAnswer.findMany({
          where: {
            gameId,
            userId: participant.userId,
          },
        });

        const totalScore = answers.reduce(
          (sum, answer) => sum + answer.points,
          0
        );
        const correctAnswers = answers.filter(
          (answer) => answer.isCorrect
        ).length;

        return {
          userId: participant.userId,
          username: participant.user.username,
          walletAddress: participant.user.walletAddress,
          totalScore,
          correctAnswers,
          totalAnswers: answers.length,
          finalRank: participant.finalRank,
          prizeWon: participant.prizeWon,
        };
      })
    );

    // Sort by score (highest first)
    results.sort((a, b) => b.totalScore - a.totalScore);

    // Update ranks if not already set
    const gameSession = await prisma.gameSession.findUnique({
      where: { id: gameId },
    });

    if (gameSession?.status === "COMPLETED") {
      // Game is completed, calculate final prizes
      await calculateAndDistributePrizes(gameId, results);
    }

    return NextResponse.json({
      success: true,
      results,
      gameStatus: gameSession?.status,
    });
  } catch (error) {
    console.error("Get results error:", error);
    return NextResponse.json(
      { error: "Failed to get results" },
      { status: 500 }
    );
  }
}

async function calculateAndDistributePrizes(gameId: string, results: any[]) {
  try {
    const game = await prisma.gameSession.findUnique({
      where: { id: gameId },
    });

    if (!game) return;

    const prizeDistribution = {
      1: 0.6, // Winner gets 60%
      2: 0.25, // Second gets 25%
      3: 0.1, // Third gets 10%
      4: 0.05, // Fourth gets 5%
    };

    // Update participant ranks and prizes
    for (let i = 0; i < results.length; i++) {
      const rank = i + 1;
      const prizePercentage =
        prizeDistribution[rank as keyof typeof prizeDistribution] || 0;
      const prizeAmount = game.prizePool * prizePercentage;

      await prisma.gameParticipant.updateMany({
        where: {
          gameId,
          userId: results[i].userId,
        },
        data: {
          finalRank: rank,
          prizeWon: prizeAmount,
        },
      });
    }

    // TODO: Trigger smart contract to distribute prizes
    // This is where you'll call your Rust smart contract
    console.log(`Game ${gameId} completed. Triggering prize distribution...`);
  } catch (error) {
    console.error("Error calculating prizes:", error);
  }
}
