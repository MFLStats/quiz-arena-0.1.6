export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
export interface MatchHistoryItem {
  matchId: string;
  opponentName: string;
  result: 'win' | 'loss' | 'draw';
  score: number;
  opponentScore: number;
  eloChange: number;
  timestamp: number;
}
export interface UserStats {
  wins: number;
  losses: number;
  matches: number;
}
export interface UserAchievement {
  achievementId: string;
  unlockedAt: number; // Timestamp
}
export interface SeasonPassProgress {
  level: number; // Current season level (can be synced with main level or separate)
  xp: number; // Season specific XP
  isPremium: boolean;
  claimedRewards: string[]; // Format: "level:type" e.g. "1:free", "5:premium"
}
export interface Notification {
  id: string;
  type: 'challenge';
  fromUserId: string;
  fromUserName: string;
  matchId: string;
  categoryId: string;
  categoryName: string;
  timestamp: number;
}
export interface FrameConfig {
  x: number;
  y: number;
  scale: number;
}
export interface User {
  id: string;
  name: string;
  email?: string;
  provider?: 'email' | 'google' | 'apple' | 'guest';
  passwordHash?: string; // Internal use, should be stripped in API responses
  // Progression
  elo: number;
  categoryElo?: Record<string, number>; // Per-category Elo ratings
  xp: number; // Total accumulated XP
  level: number; // Current level (derived from XP usually, but stored for ease)
  achievements: UserAchievement[];
  seasonPass?: SeasonPassProgress;
  // Social & Identity
  avatar?: string;
  banner?: string; // URL/Gradient for profile banner
  frame?: string; // Avatar frame asset URL
  frameConfig?: FrameConfig; // Custom frame positioning
  title?: string; // Equipped player title
  country?: string; // ISO 2-letter code e.g., 'US', 'JP'
  friends?: string[]; // List of friend User IDs
  notifications?: Notification[]; // Pending notifications
  // Economy
  currency?: number; // Coins for shop
  inventory?: string[]; // List of purchased Shop Item IDs
  // Activity
  lastLogin?: string; // ISO Date string
  loginStreak?: number;
  history?: MatchHistoryItem[];
  stats?: UserStats;
  dailyStats?: {
    date: string; // YYYY-MM-DD
    score: number;
  };
  activityMap?: Record<string, number>; // YYYY-MM-DD -> count
}
export type CategoryGroup = 'Education' | 'General' | 'TV & Movies' | 'Sports';
export interface Category {
  id: string;
  name: string;
  icon: string; // Lucide icon name
  description: string;
  baseElo: number;
  color: string;
  group: CategoryGroup;
  isFeatured?: boolean;
}
export interface Question {
  id: string;
  categoryId: string;
  text: string;
  media?: {
    type: 'emoji' | 'image';
    content: string;
  };
  options: string[];
  correctIndex: number;
}
export interface PlayerStats {
  userId: string;
  score: number;
  correctCount: number;
  answers: { questionId: string; timeMs: number; correct: boolean; selectedIndex?: number }[];
  // Snapshot of player details at match start
  name?: string;
  country?: string;
  elo?: number;
  title?: string;
  avatar?: string;
  frame?: string;
  frameConfig?: FrameConfig;
  banner?: string;
  lastEmote?: { emoji: string; timestamp: number; };
  // Dynamic Rank Info
  categoryRank?: number;
  displayTitle?: string;
}
export interface MatchState {
  id: string;
  categoryId: string;
  mode: 'ranked' | 'daily';
  status: 'waiting' | 'playing' | 'finished';
  currentQuestionIndex: number;
  questions: Question[];
  startTime: number; // Epoch millis when match started
  roundEndTime: number; // Epoch millis when current round ends
  players: {
    [userId: string]: PlayerStats;
  };
  winnerId?: string;
  code?: string; // Private room code
  isPrivate?: boolean;
}
export interface RewardBreakdown {
  source: string;
  amount: number;
}
export interface GameResult {
  matchId: string;
  won: boolean;
  score: number;
  opponentScore: number;
  eloChange: number;
  newElo: number;
  reactionTimes: { question: number; time: number }[];
  // New Rewards
  xpEarned: number;
  coinsEarned: number;
  xpBreakdown: RewardBreakdown[];
  coinsBreakdown: RewardBreakdown[];
  levelUp?: boolean;
  newLevel?: number;
  newAchievements?: string[]; // IDs of newly unlocked achievements
  isPrivate?: boolean;
  categoryId?: string; // Added for Play Again functionality
  // Match Review Data
  answers?: { questionId: string; timeMs: number; correct: boolean; selectedIndex?: number }[];
  questions?: Question[];
}
// Alias for API response to match GameResult
export type FinishMatchResponse = GameResult;
// For the API
export interface CreateMatchRequest {
  userId: string;
  categoryId: string;
  mode?: 'ranked' | 'daily';
}
export interface JoinMatchRequest {
  userId: string;
  code: string;
}
export interface SubmitAnswerRequest {
  userId: string;
  questionIndex: number;
  answerIndex: number;
  timeRemainingMs: number;
}
export interface SubmitAnswerResponse {
  correct: boolean;
  correctIndex: number;
  scoreDelta: number;
  totalScore: number;
  opponentScore: number; // Simulated for Phase 1
}
// Shop & Profile
export type ItemRarity = 'common' | 'rare' | 'epic' | 'legendary';
export type ItemType = 'avatar' | 'banner' | 'title' | 'frame' | 'box';
export interface ShopItem {
  id: string;
  name: string;
  type: ItemType;
  rarity: ItemRarity;
  price: number;
  assetUrl: string; // For boxes, this might be a placeholder image
  description?: string;
  // For boxes, potential contents could be defined here or on backend
}
export interface UpdateUserRequest {
  name?: string;
  country?: string;
  avatar?: string;
  banner?: string;
  title?: string;
  frame?: string;
  frameConfig?: FrameConfig;
}
export interface PurchaseItemRequest {
  userId: string;
  itemId: string;
}
export interface EquipItemRequest {
  userId: string;
  itemId: string;
  type: ItemType;
}
export interface UnequipItemRequest {
  userId: string;
  type: 'frame' | 'banner' | 'title';
}
// Auth Requests
export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  avatar?: string; // Custom avatar URL
}
export interface LoginEmailRequest {
  email: string;
  password: string;
}
export interface LoginRequest {
  provider: 'google' | 'apple' | 'guest';
  email?: string; // Optional email for simulated OAuth
}
// Achievements
export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string; // Lucide icon name
  rarity: ItemRarity;
}
// Bulk Import
export interface BulkImportRequest {
  userId: string;
  questions: Partial<Question>[];
  targetCategory: {
    mode: 'existing' | 'new';
    id?: string; // Required if mode is 'existing'
    create?: { // Required if mode is 'new'
      name: string;
      group: CategoryGroup;
      icon?: string;
      color?: string;
    };
  };
}
// Season Pass Requests
export interface ClaimRewardRequest {
  userId: string;
  level: number;
  track: 'free' | 'premium';
}
export interface UpgradeSeasonPassRequest {
  userId: string;
}
// Reporting System
export type ReportReason = 'wrong_answer' | 'typo' | 'inappropriate' | 'other';
export interface Report {
  id: string;
  questionId: string;
  questionText: string;
  userId: string;
  reporterName: string;
  reason: ReportReason;
  timestamp: number;
}
export interface CreateReportRequest {
  questionId: string;
  questionText: string;
  reason: ReportReason;
}
// System Config
export interface SystemConfig {
  motd?: string;
  seasonEndDate?: string; // ISO Date string
  maintenance?: boolean;
}
// Analytics
export interface SystemStats {
  userCount: number;
  questionCount: number;
  categoryCount: number;
  reportCount: number;
}
// Challenges
export interface ChallengeRequest {
  opponentId: string;
  categoryId: string;
}
export interface ClearNotificationsRequest {
  notificationIds: string[];
}