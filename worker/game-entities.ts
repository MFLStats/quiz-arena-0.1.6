import { IndexedEntity, Entity, Env, Index } from "./core-utils";
import { UserEntity } from "./entities";
import type { MatchState, Question, PlayerStats, SubmitAnswerResponse, Category, Report, SystemConfig, ShopItem, User } from "@shared/types";
import { MOCK_QUESTIONS, MOCK_SHOP_ITEMS, MOCK_CATEGORIES } from "@shared/mock-data";
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
  /**
   * Resets the shop database by deleting all items and re-seeding with default data.
   * This is a destructive operation used for admin maintenance.
   */
  static async reset(env: Env): Promise<void> {
    const idx = new Index<string>(env, this.indexName);
    const ids = await idx.list();
    await this.deleteMany(env, ids);
    await this.ensureSeed(env);
  }
}
// CATEGORY ENTITY: Stores dynamic categories created by admins
// PERSISTENCE NOTE: This entity stores user-generated categories.
// The seedData logic in IndexedEntity only runs if the index is completely empty.
// Existing dynamic categories are NEVER overwritten by deployments.
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
// PERSISTENCE NOTE: User-generated questions are stored in Durable Objects.
// They persist across deployments and are NOT reset unless explicitly deleted via Admin API.
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
  // Helper to calculate ranks for players
  async calculateRanks(env: Env, userIds: string[], categoryId: string, mode: string): Promise<Record<string, { displayTitle?: string, categoryRank?: number }>> {
    const results: Record<string, { displayTitle?: string, categoryRank?: number }> = {};
    try {
      // Fetch users to determine rank. Limiting to 500 for performance in this demo scale.
      const { items: allUsers } = await UserEntity.list(env, null, 500);
      // 1. Daily Mode Ranks
      if (mode === 'daily') {
        const today = new Date().toISOString().split('T')[0];
        const dailyUsers = allUsers
          .filter(u => u.dailyStats?.date === today && (u.dailyStats?.score || 0) > 0)
          .sort((a, b) => (b.dailyStats?.score || 0) - (a.dailyStats?.score || 0));
        for (const uid of userIds) {
          const rankIndex = dailyUsers.findIndex(u => u.id === uid);
          if (rankIndex !== -1) {
            const rank = rankIndex + 1;
            if (rank === 1) results[uid] = { displayTitle: "1st Daily Quiz Challenge" };
            else if (rank === 2) results[uid] = { displayTitle: "2nd Daily Quiz Challenge" };
            else if (rank === 3) results[uid] = { displayTitle: "3rd Daily Quiz Challenge" };
          }
        }
      } 
      // 2. Ranked Mode Ranks
      else {
        // Overall Rank (Elo)
        const sortedByElo = [...allUsers].sort((a, b) => b.elo - a.elo);
        // Category Rank
        const sortedByCategory = [...allUsers]
          .filter(u => (u.categoryElo?.[categoryId] || 0) > 0)
          .sort((a, b) => (b.categoryElo?.[categoryId] || 0) - (a.categoryElo?.[categoryId] || 0));
        // Get Category Name (Robust Resolution)
        let categoryName = categoryId;
        // 1. Try Dynamic Entity First (Priority for user content)
        try {
            const catEntity = new CategoryEntity(env, categoryId);
            if (await catEntity.exists()) {
                const cat = await catEntity.getState();
                categoryName = cat.name;
            } else {
                // 2. Fallback to Mock
                const mockCat = MOCK_CATEGORIES.find(c => c.id === categoryId);
                if (mockCat) {
                    categoryName = mockCat.name;
                }
            }
        } catch (e) {
            // Fallback if entity fetch fails
            const mockCat = MOCK_CATEGORIES.find(c => c.id === categoryId);
            if (mockCat) categoryName = mockCat.name;
        }
        for (const uid of userIds) {
          let displayTitle: string | undefined;
          let categoryRank: number | undefined;
          // Check Overall Rank
          const overallRank = sortedByElo.findIndex(u => u.id === uid) + 1;
          if (overallRank === 1) displayTitle = "Gold";
          else if (overallRank === 2) displayTitle = "Silver";
          else if (overallRank === 3) displayTitle = "Bronze";
          // Check Category Rank
          const catRankIndex = sortedByCategory.findIndex(u => u.id === uid);
          if (catRankIndex !== -1) {
            categoryRank = catRankIndex + 1;
            // If no overall title, use category rank title
            if (!displayTitle) {
               displayTitle = `${categoryRank}${this.getOrdinalSuffix(categoryRank)} in ${categoryName}`;
            }
          }
          results[uid] = { displayTitle, categoryRank };
        }
      }
    } catch (e) {
      console.error("Failed to calculate ranks", e);
    }
    return results;
  }
  private getOrdinalSuffix(i: number): string {
    const j = i % 10, k = i % 100;
    if (j === 1 && k !== 11) return "st";
    if (j === 2 && k !== 12) return "nd";
    if (j === 3 && k !== 13) return "rd";
    return "th";
  }
  async startMatch(userIds: string[], categoryId: string, mode: 'ranked' | 'daily' = 'ranked', isPrivate: boolean = false): Promise<MatchState> {
    let selectedQuestions: Question[] = [];
    let targetCategory = categoryId;
    try {
      if (mode === 'daily') {
        targetCategory = 'daily';
        // 1. Get all dynamic IDs
        const globalIdx = new Index<string>(this.env, QuestionEntity.indexName);
        const { items: dynamicIds } = await globalIdx.page(null, 2000);
        // 2. Get all Mock IDs
        const mockIds = MOCK_QUESTIONS.map(q => q.id);
        // 3. Merge IDs
        const allIds = Array.from(new Set([...mockIds, ...dynamicIds]));
        // 4. Seeded Shuffle
        const today = new Date().toISOString().split('T')[0];
        const shuffledIds = seededShuffle(allIds, today);
        const selectedIds = shuffledIds.slice(0, 10); // Daily is 10 questions
        // 5. Resolve
        selectedQuestions = await this.resolveQuestions(selectedIds);
      } else {
        // Ranked / Category
        // 1. Mock IDs for category
        const mockIds = MOCK_QUESTIONS.filter(q => q.categoryId === categoryId).map(q => q.id);
        // 2. Dynamic IDs for category
        const catIdx = getCategoryQuestionIndex(this.env, categoryId);
        const { items: dynamicIds } = await catIdx.page(null, 1000);
        // 3. Merge
        const allIds = Array.from(new Set([...mockIds, ...dynamicIds]));
        if (allIds.length === 0) {
             console.warn(`No questions for ${categoryId}, fallback to all`);
             // Fallback to all mocks if category empty
             const allMockIds = MOCK_QUESTIONS.map(q => q.id);
             const shuffled = shuffle(allMockIds).slice(0, 5);
             selectedQuestions = await this.resolveQuestions(shuffled);
        } else {
             // 4. Shuffle
             const selectedIds = shuffle(allIds).slice(0, 5);
             // 5. Resolve
             selectedQuestions = await this.resolveQuestions(selectedIds);
        }
      }
    } catch (e) {
      console.error("Failed to fetch questions", e);
      // Ultimate fallback
      selectedQuestions = MOCK_QUESTIONS.slice(0, 5);
    }
    if (selectedQuestions.length === 0) {
         console.error("CRITICAL: No questions available for match");
    }
    // Calculate Ranks & Titles
    const rankInfo = await this.calculateRanks(this.env, userIds, categoryId, mode);
    const players: Record<string, PlayerStats> = {};
    for (const uid of userIds) {
      let name = 'Player';
      let country = 'US';
      let elo = 1200;
      let title: string | undefined = undefined;
      let avatar: string | undefined = undefined;
      let frame: string | undefined = undefined;
      let banner: string | undefined = undefined;
      let frameConfig: any = undefined;
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
            banner = user.banner;
            frameConfig = user.frameConfig;
          }
        } catch (e) {
          console.error(`Failed to fetch user ${uid} for match snapshot`, e);
        }
      }
      // Override title if dynamic rank title exists
      const dynamicInfo = rankInfo[uid];
      if (dynamicInfo?.displayTitle) {
        // If it's a special rank title (Gold/Silver/Bronze/Daily), use it as displayTitle
        // The frontend will prioritize displayTitle over title
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
        frame,
        frameConfig,
        banner,
        displayTitle: dynamicInfo?.displayTitle,
        categoryRank: dynamicInfo?.categoryRank
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
  // Helper to resolve IDs to Question objects (Dynamic > Mock)
  private async resolveQuestions(ids: string[]): Promise<Question[]> {
      const results = await Promise.all(ids.map(async (id) => {
          // Try dynamic
          const entity = new QuestionEntity(this.env, id);
          if (await entity.exists()) {
              return await entity.getState();
          }
          // Try mock
          return MOCK_QUESTIONS.find(q => q.id === id);
      }));
      return results.filter((q): q is Question => !!q && !!q.text);
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
    let banner: string | undefined = undefined;
    let frameConfig: any = undefined;
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
        frameConfig = user.frameConfig;
        banner = user.banner;
      }
    } catch (e) {
      console.error(`Failed to fetch user ${userId} for match join`, e);
    }
    // Calculate rank for joining player (simplified, re-calculating for single user context)
    // Note: In a real scenario, we might want to re-calculate for everyone or just this user.
    // For simplicity, we'll calculate for this user.
    const rankInfo = await this.calculateRanks(this.env, [userId], state.categoryId, state.mode);
    const dynamicInfo = rankInfo[userId];
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
      frame,
      frameConfig,
      banner,
      displayTitle: dynamicInfo?.displayTitle,
      categoryRank: dynamicInfo?.categoryRank
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
    // Server-side timing validation
    const now = Date.now();
    const serverRemaining = state.roundEndTime - now;
    const LATENCY_BUFFER = 2000; // 2 seconds buffer
    // Validate client timestamp
    let validatedTimeMs = timeRemainingMs;
    // If client claims more time than server has + buffer, clamp it
    if (validatedTimeMs > serverRemaining + LATENCY_BUFFER) {
        validatedTimeMs = Math.max(0, serverRemaining);
    }
    // Ensure non-negative
    validatedTimeMs = Math.max(0, validatedTimeMs);
    const isCorrect = answerIndex === question.correctIndex;
    let points = 0;
    if (isCorrect) {
      const basePoints = 100;
      const timeBonus = Math.floor((validatedTimeMs / 10000) * 50);
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
        answers: [...player.answers, {
            questionId: question.id,
            timeMs: 10000 - validatedTimeMs, // Store time taken
            correct: isCorrect,
            selectedIndex: answerIndex // Added selectedIndex persistence
        }]
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