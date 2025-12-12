import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { MatchState, Question, GameResult } from '@shared/types';
interface GameState {
  // Session Data
  matchId: string | null;
  categoryId: string | null;
  mode: 'ranked' | 'daily' | 'practice';
  questions: Question[];
  code: string | null;
  isPrivate: boolean;
  // Gameplay State
  status: 'idle' | 'loading' | 'playing' | 'finished' | 'waiting';
  currentQuestionIndex: number;
  selectedAnswerIndex: number | null;
  isAnswerLocked: boolean;
  lastAnswerCorrect: boolean | null;
  // Scores
  myScore: number;
  opponentScore: number;
  opponentLastEmote: { emoji: string; timestamp: number } | null;
  // Result Data
  gameResult: GameResult | null;
  // Actions
  initMatch: (match: MatchState) => void;
  setLoading: (loading: boolean) => void;
  selectAnswer: (index: number) => void;
  lockAnswer: (correct: boolean, correctIndex: number, scoreDelta: number, opponentScore: number) => void;
  nextQuestion: () => void;
  finishMatch: (result: GameResult) => void;
  syncOpponentState: (match: MatchState, myUserId: string) => void;
  reset: () => void;
}
export const useGameStore = create<GameState>()(
  immer((set) => ({
    matchId: null,
    categoryId: null,
    mode: 'ranked',
    questions: [],
    code: null,
    isPrivate: false,
    status: 'idle',
    currentQuestionIndex: 0,
    selectedAnswerIndex: null,
    isAnswerLocked: false,
    lastAnswerCorrect: null,
    myScore: 0,
    opponentScore: 0,
    opponentLastEmote: null,
    gameResult: null,
    initMatch: (match) => set((state) => {
      state.matchId = match.id;
      state.categoryId = match.categoryId;
      state.mode = match.mode;
      state.questions = match.questions;
      state.status = match.status; // Can be 'waiting' or 'playing'
      state.code = match.code || null;
      state.isPrivate = match.isPrivate || false;
      state.currentQuestionIndex = 0;
      state.selectedAnswerIndex = null;
      state.isAnswerLocked = false;
      state.lastAnswerCorrect = null;
      state.myScore = 0;
      state.opponentScore = 0;
      state.opponentLastEmote = null;
      state.gameResult = null;
    }),
    setLoading: (loading) => set((state) => {
      state.status = loading ? 'loading' : 'idle';
    }),
    selectAnswer: (index) => set((state) => {
      if (!state.isAnswerLocked) {
        state.selectedAnswerIndex = index;
      }
    }),
    lockAnswer: (correct, _correctIndex, scoreDelta, opponentScore) => set((state) => {
      state.isAnswerLocked = true;
      state.lastAnswerCorrect = correct;
      state.myScore += scoreDelta;
      state.opponentScore = opponentScore;
    }),
    nextQuestion: () => set((state) => {
      if (state.currentQuestionIndex < state.questions.length - 1) {
        state.currentQuestionIndex += 1;
        state.selectedAnswerIndex = null;
        state.isAnswerLocked = false;
        state.lastAnswerCorrect = null;
      } else {
        state.status = 'finished';
      }
    }),
    finishMatch: (result) => set((state) => {
      state.status = 'finished';
      state.gameResult = result;
    }),
    syncOpponentState: (match, myUserId) => set((state) => {
      const opponentId = Object.keys(match.players).find(id => id !== myUserId);
      if (opponentId) {
        const opponentStats = match.players[opponentId];
        state.opponentScore = opponentStats.score;
        // Sync Emote
        if (opponentStats.lastEmote) {
          // If we don't have an emote yet, or the server one is newer
          if (!state.opponentLastEmote || opponentStats.lastEmote.timestamp > state.opponentLastEmote.timestamp) {
             state.opponentLastEmote = opponentStats.lastEmote;
          }
        }
      }
      // Handle Waiting -> Playing transition for private matches
      // Only update status if we are waiting and server says playing
      if (state.status === 'waiting' && match.status === 'playing') {
        state.status = 'playing';
      }
      // Do NOT sync currentQuestionIndex or selectedAnswerIndex from server
      // These are local state driven by user interaction
    }),
    reset: () => set((state) => {
      state.matchId = null;
      state.categoryId = null;
      state.mode = 'ranked';
      state.questions = [];
      state.code = null;
      state.isPrivate = false;
      state.status = 'idle';
      state.currentQuestionIndex = 0;
      state.selectedAnswerIndex = null;
      state.isAnswerLocked = false;
      state.lastAnswerCorrect = null;
      state.myScore = 0;
      state.opponentScore = 0;
      state.opponentLastEmote = null;
      state.gameResult = null;
    }),
  }))
);