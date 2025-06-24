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

export async function POST(request: NextRequest) {
  try {
    const userId = await verifyToken(request);
    const { gameId, questionId, selectedAnswer, responseTime } =
      await request.json();

    if (!gameId || !questionId || !selectedAnswer) {
      return NextResponse.json(
        { error: "Game ID, question ID, and selected answer are required" },
        { status: 400 }
      );
    }

    // Verify user is in this game
    const participant = await prisma.gameParticipant.findFirst({
      where: { gameId, userId },
    });

    if (!participant) {
      return NextResponse.json(
        { error: "You are not a participant in this game" },
        { status: 403 }
      );
    }

    // Check if user already answered this question
    const existingAnswer = await prisma.playerAnswer.findFirst({
      where: { gameId, userId, questionId },
    });

    if (existingAnswer) {
      return NextResponse.json(
        { error: "You have already answered this question" },
        { status: 400 }
      );
    }

    // Get the correct answer
    const question = await prisma.question.findUnique({
      where: { id: questionId },
    });

    if (!question) {
      return NextResponse.json(
        { error: "Question not found" },
        { status: 404 }
      );
    }

    const isCorrect = selectedAnswer === question.correctAnswer;

    // Calculate points based on correctness and speed
    let points = 0;
    if (isCorrect) {
      // Base points for correct answer + speed bonus
      const basePoints = 100;
      const speedBonus = Math.max(0, 50 - Math.floor(responseTime / 1000)); // Bonus decreases with time
      points = basePoints + speedBonus;
    }

    // Save player answer
    const playerAnswer = await prisma.playerAnswer.create({
      data: {
        gameId,
        userId,
        questionId,
        selectedAnswer,
        isCorrect,
        responseTime: responseTime || 0,
        points,
      },
    });

    return NextResponse.json({
      success: true,
      result: {
        isCorrect,
        points,
        correctAnswer: question.correctAnswer,
        responseTime,
      },
    });
  } catch (error) {
    console.error("Submit answer error:", error);
    return NextResponse.json(
      { error: "Failed to submit answer" },
      { status: 500 }
    );
  }
}
