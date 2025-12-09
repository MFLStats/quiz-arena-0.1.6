/**
 * Minimal real-world demo: One Durable Object instance per entity (User, ChatBoard), with Indexes for listing.
 */
import { IndexedEntity } from "./core-utils";
import type { User } from "@shared/types";
import { MOCK_USERS as BASE_MOCK_USERS } from "@shared/mock-data";
import { PROGRESSION_CONSTANTS } from "@shared/progression";
// Extend mock users with countries for the seed
const MOCK_USERS_WITH_COUNTRIES: User[] = BASE_MOCK_USERS.map((u, i) => ({
  ...u,
  // Use existing country if defined, otherwise fallback to round-robin
  country: u.country || ['US', 'GB', 'JP', 'DE'][i % 4],
  friends: u.friends || [],
  currency: u.currency || 1000,
  inventory: u.inventory || [],
  categoryElo: {},
  xp: u.xp || 0,
  level: u.level || 1,
  loginStreak: u.loginStreak || 0,
  lastLogin: u.lastLogin || new Date().toISOString().split('T')[0],
  achievements: u.achievements || [],
  seasonPass: {
    level: u.level || 1,
    xp: u.xp || 0,
    isPremium: false,
    claimedRewards: []
  },
  activityMap: u.activityMap || {}
}));
// USER ENTITY: one DO instance per user
export class UserEntity extends IndexedEntity<User> {
  static readonly entityName = "user";
  static readonly indexName = "users";
  static readonly initialState: User = {
    id: "",
    name: "",
    elo: 1200,
    categoryElo: {},
    country: "US",
    friends: [],
    currency: 1000,
    inventory: [],
    history: [],
    stats: { wins: 0, losses: 0, matches: 0 },
    xp: 0,
    level: 1,
    loginStreak: 0,
    lastLogin: "",
    achievements: [],
    seasonPass: {
      level: 1,
      xp: 0,
      isPremium: false,
      claimedRewards: []
    },
    activityMap: {}
  };
  static seedData = MOCK_USERS_WITH_COUNTRIES;
  protected override async ensureState(): Promise<User> {
    try {
      let s: User;
      try {
        s = await super.ensureState();
      } catch (err) {
        console.error(`[UserEntity] super.ensureState failed for ${this.id}:`, err);
        const fallback: User = { ...UserEntity.initialState, id: this.id };
        this._state = fallback;
        return fallback;
      }
      // Defensive check for null/undefined state
      if (!s) {
        const fallback: User = { ...UserEntity.initialState, id: this.id };
        this._state = fallback;
        return fallback;
      }
      // Migration for existing users without new fields
      let migrated = false;
      let newState = { ...s };
      if (newState.xp === undefined || newState.level === undefined || newState.achievements === undefined) {
        newState.xp = newState.xp ?? 0;
        newState.level = newState.level ?? 1;
        newState.loginStreak = newState.loginStreak ?? 0;
        newState.lastLogin = newState.lastLogin ?? "";
        newState.achievements = newState.achievements ?? [];
        migrated = true;
      }
      if (!newState.seasonPass) {
        newState.seasonPass = {
          level: newState.level || 1,
          xp: newState.xp || 0,
          isPremium: false,
          claimedRewards: []
        };
        migrated = true;
      }
      if (!newState.activityMap) {
        newState.activityMap = {};
        migrated = true;
      }
      if (migrated) {
        this._state = newState;
        return newState;
      }
      return s;
    } catch (e) {
      console.error(`[UserEntity] State migration failed for ${this.id}:`, e);
      // Fallback to initial state but keep ID to prevent total lockout
      // This ensures the entity always returns *something* usable even if corrupted
      const fallback: User = {
        ...UserEntity.initialState,
        id: this.id
      };
      this._state = fallback;
      return fallback;
    }
  }
  // Handle daily login logic
  async processLogin(): Promise<{ xpBonus: number; coinBonus: number; streak: number }> {
    const today = new Date().toISOString().split('T')[0];
    const user = await this.ensureState();
    // Already logged in today
    if (user.lastLogin === today) {
      return { xpBonus: 0, coinBonus: 0, streak: user.loginStreak || 0 };
    }
    // Check if streak continues (yesterday was last login)
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    let newStreak = 1;
    if (user.lastLogin === yesterday) {
      newStreak = (user.loginStreak || 0) + 1;
    }
    // Calculate Bonuses
    // XP: Base + (Streak * Increment), capped
    const xpBonus = Math.min(
      PROGRESSION_CONSTANTS.XP_LOGIN_MAX,
      PROGRESSION_CONSTANTS.XP_LOGIN_BASE + ((newStreak - 1) * PROGRESSION_CONSTANTS.XP_LOGIN_INCREMENT)
    );
    const coinBonus = PROGRESSION_CONSTANTS.COINS_DAILY_LOGIN;
    // Update User
    await this.mutate(u => ({
      ...u,
      lastLogin: today,
      loginStreak: newStreak,
      xp: (u.xp || 0) + xpBonus,
      currency: (u.currency || 0) + coinBonus
    }));
    return { xpBonus, coinBonus, streak: newStreak };
  }
}