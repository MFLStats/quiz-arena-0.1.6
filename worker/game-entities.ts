import { IndexedEntity, Entity, Env, Index } from "./core-utils";
import { UserEntity } from "./entities";
import type { MatchState, Question, PlayerStats, SubmitAnswerResponse, Category, Report, SystemConfig, ShopItem } from "@shared/types";
import { MOCK_QUESTIONS, MOCK_SHOP_ITEMS } from "@shared/mock-data";
// --- Randomization Helpers ---
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}
function mulberry32(a: number) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
}
function seededShuffle<T>(array: T[], seed: string): T[] {
  if (!array || array.length === 0) return [];
  const seedNum = simpleHash(seed);
  const random = mulberry32(seedNum);
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
}
function shuffle<T>(array: T[]): T[] {
  if (!array || array.length === 0) return [];
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
}
// --- Entities ---
// CONFIG ENTITY: Stores global system settings
export class ConfigEntity extends Entity<SystemConfig> {
  static readonly entityName = "config";
  static readonly initialState: SystemConfig = {
    motd: "",
    maintenance: false,
    seasonEndDate: '2025-12-31'
  };
}
// SHOP ENTITY: Stores dynamic shop items individually
export class ShopEntity extends IndexedEntity<ShopItem> {
  static readonly entityName = "shop_item";
  static readonly indexName = "shop_items";
  static readonly initialState: ShopItem = {
    id: "",
    name: "",
    type: "avatar",
    rarity: "common",
    price: 0,
    assetUrl: "",
    description: ""
  };
  static seedData = MOCK_SHOP_ITEMS;
}
// CATEGORY ENTITY: Stores dynamic categories created by admins
export class CategoryEntity extends IndexedEntity<Category> {
  static readonly entityName = "category";
  static readonly indexName = "categories";
  static readonly initialState: Category = {
    id: "",
    name: "",
    icon: "Atom",
    description: "",
    baseElo: 1200,
    color: "from-blue-500 to-cyan-400",
    group: "General",
    isFeatured: false
  };
}
export function getCategoryQuestionIndex(env: Env, categoryId: string): Index<string> {
  return new Index<string>(env, `idx_cat_questions:${categoryId}`);
}
// QUESTION ENTITY: Stores dynamic questions created by admins
export class QuestionEntity extends IndexedEntity<Question> {
  static readonly entityName = "question";
  static readonly indexName = "questions";
  static readonly initialState: Question = {
    id: "",
    categoryId: "",
    text: "",
    options: [],
    correctIndex: 0
  };
  static async createQuestion(env: Env, state: Question): Promise<Question> {
    const id = state.id;
    const inst = new QuestionEntity(env, id);
    await inst.save(state);
    const globalIdx = new Index<string>(env, QuestionEntity.indexName);
    await globalIdx.add(id);
    if (state.categoryId) {
        const catIdx = getCategoryQuestionIndex(env, state.categoryId);
        await catIdx.add(id);
    }
    return state;
  }
  static async updateQuestion(env: Env, id: string, updates: Partial<Question>): Promise<Question> {
    const inst = new QuestionEntity(env, id);
    if (!await inst.exists()) {
        throw new Error("Question not found");
    }
    const oldState = await inst.getState();
    const newState = { ...oldState, ...updates };
    if (oldState.categoryId !== newState.categoryId) {
        if (oldState.categoryId) {
            const oldIdx = getCategoryQuestionIndex(env, oldState.categoryId);
            await oldIdx.remove(id);
        }
        if (newState.categoryId) {
            const newIdx = getCategoryQuestionIndex(env, newState.categoryId);
            await newIdx.add(id);
        }
    }
    await inst.save(newState);
    return newState;
  }
  static async createBatch(env: Env, questions: Question[]): Promise<void> {
    if (questions.length === 0) return;
    const CHUNK_SIZE = 10;
    for (let i = 0; i < questions.length; i += CHUNK_SIZE) {
        const chunk = questions.slice(i, i + CHUNK_SIZE);
        try {
            await Promise.all(chunk.map(q => new QuestionEntity(env, q.id).save(q)));
        } catch (e) {
            console.error(`[QuestionEntity] Failed to save batch ${i} - ${i + chunk.length}`, e);
        }
    }
    const globalIdx = new Index<string>(env, QuestionEntity.indexName);
    for (let i = 0; i < questions.length; i += CHUNK_SIZE) {
        const chunk = questions.slice(i, i + CHUNK_SIZE);
        try {
            await globalIdx.addBatch(chunk.map(q => q.id));
        } catch (e) {
            console.error(`[QuestionEntity] Failed to index global batch ${i}`, e);
        }
    }
    const byCategory: Record<string, string[]> = {};
    for (const q of questions) {
        if (q.categoryId) {
            if (!byCategory[q.categoryId]) byCategory[q.categoryId] = [];
            byCategory[q.categoryId].push(q.id);
        }
    }
    await Promise.all(Object.entries(byCategory).map(async ([catId, ids]) => {
        const catIdx = getCategoryQuestionIndex(env, catId);
        for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
            const chunk = ids.slice(i, i + CHUNK_SIZE);
            try {
                await catIdx.addBatch(chunk);
            } catch (e) {
                console.error(`[QuestionEntity] Failed to index category batch for ${catId}`, e);
            }
        }
    }));
  }
  static override async delete(env: Env, id: string): Promise<boolean> {
    const inst = new QuestionEntity(env, id);
    if (!await inst.exists()) return false;
    const state = await inst.getState();
    await inst.delete();
    const globalIdx = new Index<string>(env, QuestionEntity.indexName);
    await globalIdx.remove(id);
    if (state.categoryId) {
        const catIdx = getCategoryQuestionIndex(env, state.categoryId);
        await catIdx.remove(id);
    }
    return true;
  }
}
// REPORT ENTITY: Stores user reports for questions
export class ReportEntity extends IndexedEntity<Report> {
  static readonly entityName = "report";
  static readonly indexName = "reports";
  static readonly initialState: Report = {
    id: "",
    questionId: "",
    questionText: "",
    userId: "",
    reporterName: "",
    reason: "other",
    timestamp: 0
  };
}
// CODE REGISTRY ENTITY: Manages private room codes
export class CodeRegistryEntity extends Entity<{ codes: Record<string, string> }> {
  static readonly entityName = "code_registry";
  static readonly initialState = { codes: {} };
  async register(matchId: string): Promise<string> {
    const state = await this.ensureState();
    let code = '';
    let attempts = 0;
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    while (attempts < 10) {
      code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      if (!state.codes[code]) break;
      attempts++;
    }
    if (state.codes[code]) throw new Error("Failed to generate unique code");
    await this.mutate(s => ({
      codes: { ...s.codes, [code]: matchId }
    }));
    return code;
  }
  async lookup(code: string): Promise<string | null> {
    const state = await this.ensureState();
    return state.codes[code.toUpperCase()] || null;
  }
}
export class MatchEntity extends IndexedEntity<MatchState> {
  static readonly entityName = "match";
  static readonly indexName = "matches";
  static readonly initialState: MatchState = {
    id: "",
    categoryId: "",
    mode: "ranked",
    status: "waiting",
    currentQuestionIndex: 0,
    questions: [],
    startTime: 0,
    roundEndTime: 0,
    players: {},
    isPrivate: false
  };
  protected override async ensureState(): Promise<MatchState> {
    const s = await super.ensureState();
    let migrated = false;
    let newState = { ...s };
    if (newState.roundEndTime === undefined) {
        newState.roundEndTime = 0;
        migrated = true;
    }
    if (newState.startTime === undefined) {
        newState.startTime = 0;
        migrated = true;
    }
    if (migrated) {
        this._state = newState;
        return newState;
    }
    return s;
  }
  async startMatch(userIds: string[], categoryId: string, mode: 'ranked' | 'daily' = 'ranked', isPrivate: boolean = false): Promise<MatchState> {
    let dynamicQuestions: Question[] = [];
    try {
      if (mode === 'daily') {
        const globalIdx = new Index<string>(this.env, QuestionEntity.indexName);
        const { items: allIds } = await globalIdx.page(null, 2000);
        if (allIds.length > 0) {
            const today = new Date().toISOString().split('T')[0];
            const shuffledIds = seededShuffle(allIds, today);
            const selectedIds = shuffledIds.slice(0, 20);
            const entities = await Promise.all(selectedIds.map(id => new QuestionEntity(this.env, id).getState()));
            dynamicQuestions = entities.filter(q => q.id && q.text);
        }
      } else {
        const catIdx = getCategoryQuestionIndex(this.env, categoryId);
        const { items: ids } = await catIdx.page(null, 1000);
        if (ids.length > 0) {
            const shuffledIds = shuffle(ids);
            const selectedIds = shuffledIds.slice(0, 10);
            const entities = await Promise.all(selectedIds.map(id => new QuestionEntity(this.env, id).getState()));
            dynamicQuestions = entities.filter(q => q.id && q.text);
        }
      }
    } catch (e) {
      console.error("Failed to fetch dynamic questions", e);
    }
    const allQuestions = [...MOCK_QUESTIONS, ...dynamicQuestions];
    let selectedQuestions: Question[] = [];
    let targetCategory = categoryId;
    if (mode === 'daily') {
      const today = new Date().toISOString().split('T')[0];
      const pool = allQuestions;
      const shuffled = seededShuffle(pool, today);
      selectedQuestions = shuffled.slice(0, 10);
      targetCategory = 'daily';
    } else {
      const categoryQuestions = allQuestions.filter(q => q.categoryId === targetCategory);
      let pool = categoryQuestions;
      if (pool.length === 0) {
        console.warn(`No questions found for category ${targetCategory}, falling back to full pool`);
        pool = allQuestions;
      }
      selectedQuestions = shuffle(pool).slice(0, 5);
      if (selectedQuestions.length === 0) {
         console.error("CRITICAL: No questions available for match");
      }
    }
    const players: Record<string, PlayerStats> = {};
    for (const uid of userIds) {
      let name = 'Player';
      let country = 'US';
      let elo = 1200;
      let title: string | undefined = undefined;
      let avatar: string | undefined = undefined;
      let frame: string | undefined = undefined;
      if (mode === 'daily') {
        name = 'Challenger';
      } else {
        try {
          const userEntity = new UserEntity(this.env, uid);
          if (await userEntity.exists()) {
            const user = await userEntity.getState();
            name = user.name;
            country = user.country || 'US';
            elo = user.elo;
            title = user.title;
            avatar = user.avatar;
            frame = user.frame;
          }
        } catch (e) {
          console.error(`Failed to fetch user ${uid} for match snapshot`, e);
        }
      }
      players[uid] = {
        userId: uid,
        score: 0,
        correctCount: 0,
        answers: [],
        name,
        country,
        elo,
        title,
        avatar,
        frame
      };
    }
    const newState: MatchState = {
      id: this.id,
      categoryId: targetCategory,
      mode,
      status: isPrivate ? "waiting" : "playing",
      currentQuestionIndex: 0,
      questions: selectedQuestions,
      startTime: Date.now(),
      roundEndTime: Date.now() + 3500 + 10000,
      players,
      isPrivate
    };
    await this.save(newState);
    return newState;
  }
  async joinMatch(userId: string): Promise<MatchState> {
    const state = await this.getState();
    if (state.status !== 'waiting') throw new Error("Match is not waiting for players");
    if (state.players[userId]) return state;
    let name = 'Player';
    let country = 'US';
    let elo = 1200;
    let title: string | undefined = undefined;
    let avatar: string | undefined = undefined;
    let frame: string | undefined = undefined;
    try {
      const userEntity = new UserEntity(this.env, userId);
      if (await userEntity.exists()) {
        const user = await userEntity.getState();
        name = user.name;
        country = user.country || 'US';
        elo = user.elo;
        title = user.title;
        avatar = user.avatar;
        frame = user.frame;
      }
    } catch (e) {
      console.error(`Failed to fetch user ${userId} for match join`, e);
    }
    const newPlayer: PlayerStats = {
      userId,
      score: 0,
      correctCount: 0,
      answers: [],
      name,
      country,
      elo,
      title,
      avatar,
      frame
    };
    const updatedPlayers = { ...state.players, [userId]: newPlayer };
    const playerCount = Object.keys(updatedPlayers).length;
    const newStatus: 'waiting' | 'playing' = playerCount >= 2 ? 'playing' : 'waiting';
    const newState: MatchState = {
      ...state,
      players: updatedPlayers,
      status: newStatus,
      startTime: newStatus === 'playing' ? Date.now() : state.startTime,
      roundEndTime: newStatus === 'playing' ? Date.now() + 3500 + 10000 : state.roundEndTime
    };
    await this.save(newState);
    return newState;
  }
  async processTurn() {
    const state = await this.ensureState();
    if (state.status !== 'playing') return;
    if (Date.now() > state.roundEndTime) {
        if (state.currentQuestionIndex >= state.questions.length - 1) {
            await this.mutate(s => ({ ...s, status: 'finished' }));
        } else {
            await this.mutate(s => ({
                ...s,
                currentQuestionIndex: s.currentQuestionIndex + 1,
                roundEndTime: Date.now() + 10000
            }));
        }
    }
  }
  async submitAnswer(userId: string, questionIndex: number, answerIndex: number, timeRemainingMs: number): Promise<SubmitAnswerResponse> {
    const state = await this.getState();
    if (questionIndex !== state.currentQuestionIndex) {
        throw new Error("Question expired or invalid");
    }
    const question = state.questions[questionIndex];
    if (!question) throw new Error("Invalid question index");
    const isCorrect = answerIndex === question.correctIndex;
    let points = 0;
    if (isCorrect) {
      const basePoints = 100;
      const timeBonus = Math.floor((timeRemainingMs / 10000) * 50);
      points = basePoints + timeBonus;
      if (questionIndex === state.questions.length - 1) {
        points *= 2;
      }
    }
    let player = state.players[userId] || {
      userId,
      score: 0,
      correctCount: 0,
      answers: [],
      name: 'Unknown',
      country: 'US',
      elo: 1200
    };
    player = {
        ...player,
        score: player.score + points,
        correctCount: isCorrect ? player.correctCount + 1 : player.correctCount,
        answers: [...player.answers, { questionId: question.id, timeMs: 10000 - timeRemainingMs, correct: isCorrect }]
    };
    await this.mutate(s => ({
      ...s,
      players: { ...s.players, [userId]: player }
    }));
    const updatedState = await this.getState();
    const currentQId = updatedState.questions[updatedState.currentQuestionIndex].id;
    const allAnswered = Object.values(updatedState.players).every(p => 
        p.answers.some(a => a.questionId === currentQId)
    );
    if (allAnswered) {
        if (updatedState.currentQuestionIndex >= updatedState.questions.length - 1) {
             await this.mutate(s => ({ ...s, status: 'finished' }));
        } else {
             await this.mutate(s => ({
                 ...s,
                 currentQuestionIndex: s.currentQuestionIndex + 1,
                 roundEndTime: Date.now() + 2000 + 10000
             }));
        }
    }
    const opponentId = Object.keys(updatedState.players).find(id => id !== userId);
    const opponentScore = opponentId ? updatedState.players[opponentId].score : 0;
    return {
      correct: isCorrect,
      correctIndex: question.correctIndex,
      scoreDelta: points,
      totalScore: player.score,
      opponentScore: opponentScore
    };
  }
  async submitEmote(userId: string, emoji: string): Promise<void> {
    const state = await this.getState();
    const player = state.players[userId];
    if (!player) throw new Error("Player not in match");
    if (!emoji || emoji.length > 10) throw new Error("Invalid emote");
    const now = Date.now();
    const lastEmoteTime = player.lastEmote?.timestamp || 0;
    if (now - lastEmoteTime < 2000) {
      return;
    }
    await this.mutate(s => ({
      ...s,
      players: {
        ...s.players,
        [userId]: {
          ...s.players[userId],
          lastEmote: { emoji, timestamp: now }
        }
      }
    }));
  }
  async getResult(): Promise<MatchState> {
    return this.getState();
  }
}
// QUEUE ENTITY
export interface QueueState {
  id: string;
  waiting: string[];
  assignments: Record<string, string>;
  assignmentTimes: Record<string, number>;
}
export class QueueEntity extends Entity<QueueState> {
  static readonly entityName = "queue";
  static readonly initialState: QueueState = {
    id: "",
    waiting: [],
    assignments: {},
    assignmentTimes: {}
  };
  async join(userId: string, categoryId: string): Promise<string | null> {
    const MAX_RETRIES = 5;
    const STALE_TIMEOUT = 60000;
    for (let i = 0; i < MAX_RETRIES; i++) {
      const state = await this.ensureState();
      const now = Date.now();
      const assignmentTimes = state.assignmentTimes || {};
      if (state.assignments[userId]) {
        const matchId = state.assignments[userId];
        const assignedAt = assignmentTimes[userId] || 0;
        let isValid = false;
        if (now - assignedAt < STALE_TIMEOUT) {
          try {
            const matchEntity = new MatchEntity(this.env, matchId);
            if (await matchEntity.exists()) {
                const matchState = await matchEntity.getState();
                if (matchState.status !== 'finished') {
                    isValid = true;
                } else {
                    console.log(`[Queue] Match ${matchId} is finished. Clearing assignment for ${userId}.`);
                }
            } else {
                console.log(`[Queue] Match ${matchId} does not exist. Clearing assignment for ${userId}.`);
            }
          } catch (e) {
            console.warn(`[Queue] Error validating match ${matchId}:`, e);
          }
        }
        if (isValid) {
          return matchId;
        }
        await this.mutate(s => {
          const newAssignments = { ...s.assignments };
          const newAssignmentTimes = { ...(s.assignmentTimes || {}) };
          if (newAssignments[userId] === matchId) {
            delete newAssignments[userId];
            delete newAssignmentTimes[userId];
          }
          return {
            ...s,
            assignments: newAssignments,
            assignmentTimes: newAssignmentTimes
          };
        });
        continue;
      }
      if (state.waiting.includes(userId)) {
        return null;
      }
      if (state.waiting.length > 0) {
        const opponentId = state.waiting[0];
        const matchId = crypto.randomUUID();
        const matchEntity = new MatchEntity(this.env, matchId);
        await matchEntity.startMatch([opponentId, userId], categoryId, 'ranked');
        try {
          await this.mutate(s => {
            if (!s.waiting.includes(opponentId)) {
              throw new Error('RETRY');
            }
            const newWaiting = s.waiting.filter(id => id !== opponentId);
            return {
              ...s,
              waiting: newWaiting,
              assignments: {
                ...s.assignments,
                [opponentId]: matchId,
                [userId]: matchId
              },
              assignmentTimes: {
                ...(s.assignmentTimes || {}),
                [opponentId]: now,
                [userId]: now
              }
            };
          });
          return matchId;
        } catch (e: any) {
          if (e.message === 'RETRY') {
            continue;
          }
          throw e;
        }
      } else {
        await this.mutate(s => {
          const newAssignments = { ...s.assignments };
          const newAssignmentTimes = { ...(s.assignmentTimes || {}) };
          if (newAssignments[userId]) {
            delete newAssignments[userId];
            delete newAssignmentTimes[userId];
          }
          return {
            ...s,
            waiting: [...s.waiting, userId],
            assignments: newAssignments,
            assignmentTimes: newAssignmentTimes
          };
        });
        return null;
      }
    }
    throw new Error("Failed to join queue after multiple attempts");
  }
  async getAssignment(userId: string): Promise<string | null> {
    const state = await this.ensureState();
    const assignment = state.assignments[userId];
    if (!assignment) return null;
    const assignedAt = (state.assignmentTimes || {})[userId] || 0;
    if (Date.now() - assignedAt > 60000) {
      return null;
    }
    return assignment;
  }
  async leave(userId: string): Promise<void> {
    await this.mutate(s => ({
      ...s,
      waiting: s.waiting.filter(id => id !== userId),
    }));
  }
}