/**
 * Shared progression logic and constants to ensure consistency between frontend and backend.
 */
export const PROGRESSION_CONSTANTS = {
  // XP Rewards
  XP_PER_CORRECT_ANSWER: 20,
  XP_PER_FAST_ANSWER: 5, // Bonus
  XP_PER_PERFECT_ROUND: 20,
  XP_MATCH_WIN: 50,
  XP_MATCH_LOSS: 20,
  XP_MATCH_DRAW: 35,
  XP_DAILY_WIN_BONUS: 100,
  // Login Streak XP (Base + Increment * Streak)
  XP_LOGIN_BASE: 30,
  XP_LOGIN_INCREMENT: 20,
  XP_LOGIN_MAX: 150,
  // Coin Rewards
  COINS_PER_CORRECT_ANSWER: 2,
  COINS_PER_FASTEST_ANSWER: 3,
  COINS_MATCH_WIN: 20,
  COINS_MATCH_LOSS: 8,
  COINS_MATCH_DRAW: 12,
  COINS_DAILY_LOGIN: 10,
  COINS_LEVEL_UP: 50, // Bonus coins when leveling up
};
// Formula: XP_needed = 100 + (level - 1) * 50
// Level 1 -> 2: 100 XP
// Level 2 -> 3: 150 XP
// Level 3 -> 4: 200 XP
export function getXpRequiredForNextLevel(currentLevel: number): number {
  return 100 + (currentLevel - 1) * 50;
}
// Calculate total XP required to reach a specific level from level 1
export function getTotalXpForLevel(targetLevel: number): number {
  let total = 0;
  for (let i = 1; i < targetLevel; i++) {
    total += getXpRequiredForNextLevel(i);
  }
  return total;
}
// Calculate current level based on total XP
export function getLevelFromXp(totalXp: number): { level: number; currentLevelXp: number; nextLevelXp: number; progressPercent: number } {
  let level = 1;
  let xp = totalXp;
  while (true) {
    const required = getXpRequiredForNextLevel(level);
    if (xp < required) {
      return {
        level,
        currentLevelXp: xp,
        nextLevelXp: required,
        progressPercent: Math.floor((xp / required) * 100)
      };
    }
    xp -= required;
    level++;
  }
}