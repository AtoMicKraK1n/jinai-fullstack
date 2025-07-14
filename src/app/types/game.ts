export interface Question {
  text: string;
  options: string[];
  correctAnswer: number;
}

export interface GameState {
  currentQuestionIndex: number;
  questions: Question[];
  score: number;
  timeLeft: number;
  showResults: boolean;
}