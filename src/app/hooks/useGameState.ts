import { useState, useEffect } from 'react';
import { Question, GameState } from '@/types/game';
import { fetchBotpressQuestions, submitAnswerToBotpress } from '@/services/botpress';
import { useToast } from '@/components/ui/use-toast';

export const useGameState = (gameId: string) => {
  const [gameState, setGameState] = useState<GameState>({
    currentQuestionIndex: 0,
    questions: [],
    score: 0,
    timeLeft: 10,
    showResults: false,
  });

  const { toast } = useToast();

  useEffect(() => {
    const loadQuestions = async () => {
      try {
        console.log('Fetching questions for gameId:', gameId); // Debug log
        const questions = await fetchBotpressQuestions(gameId);
        console.log('Fetched questions:', questions); // Debug log
        
        if (questions.length === 0) {
          toast({
            title: "Error",
            description: "No questions received from Botpress. Please check your API key and try again.",
            variant: "destructive",
          });
          return;
        }

        setGameState(prev => ({ ...prev, questions }));
      } catch (error) {
        console.error('Error in loadQuestions:', error);
        toast({
          title: "Error",
          description: "Failed to load questions. Please check your API key and try again.",
          variant: "destructive",
        });
      }
    };

    if (gameId) {
      loadQuestions();
    }
  }, [gameId, toast]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (gameState.timeLeft > 0 && !gameState.showResults && gameState.questions.length > 0) {
      timer = setInterval(() => {
        setGameState(prev => {
          if (prev.timeLeft <= 1) {
            handleNextQuestion();
            return prev;
          }
          return { ...prev, timeLeft: prev.timeLeft - 1 };
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [gameState.timeLeft, gameState.showResults, gameState.questions.length]);

  const handleNextQuestion = () => {
    setGameState(prev => {
      if (prev.currentQuestionIndex >= prev.questions.length - 1) {
        return { ...prev, showResults: true };
      }
      return {
        ...prev,
        currentQuestionIndex: prev.currentQuestionIndex + 1,
        timeLeft: 10,
      };
    });
  };

  const handleAnswer = async (answerIndex: number) => {
    if (gameState.questions.length === 0) return;

    try {
      const currentQuestion = gameState.questions[gameState.currentQuestionIndex];
      console.log('Submitting answer for question:', currentQuestion); // Debug log
      
      const result = await submitAnswerToBotpress(
        currentQuestion.text,
        answerIndex
      );

      setGameState(prev => ({
        ...prev,
        score: prev.score + (result.points || 0),
      }));

      handleNextQuestion();
    } catch (error) {
      console.error('Error in handleAnswer:', error);
      toast({
        title: "Error",
        description: "Failed to submit answer. Please try again.",
        variant: "destructive",
      });
    }
  };

  return {
    gameState,
    handleAnswer,
  };
};