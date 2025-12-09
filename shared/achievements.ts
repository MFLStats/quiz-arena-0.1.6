import type { Achievement } from './types';
export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_win',
    name: 'First Blood',
    description: 'Win your first match in the Arena.',
    icon: 'Swords',
    rarity: 'common'
  },
  {
    id: 'speed_demon',
    name: 'Speed Demon',
    description: 'Answer 3 questions in under 2 seconds in a single match.',
    icon: 'Zap',
    rarity: 'rare'
  },
  {
    id: 'perfect_round',
    name: 'Perfectionist',
    description: 'Answer all 5 questions correctly in a match.',
    icon: 'Target',
    rarity: 'epic'
  },
  {
    id: 'veteran',
    name: 'Arena Veteran',
    description: 'Play 50 matches.',
    icon: 'Shield',
    rarity: 'rare'
  },
  {
    id: 'high_roller',
    name: 'High Roller',
    description: 'Accumulate 5,000 coins.',
    icon: 'Coins',
    rarity: 'epic'
  },
  {
    id: 'streaker',
    name: 'Unstoppable',
    description: 'Win 3 matches in a row.',
    icon: 'Flame',
    rarity: 'legendary'
  },
  {
    id: 'social_butterfly',
    name: 'Social Butterfly',
    description: 'Add 5 friends.',
    icon: 'Users',
    rarity: 'common'
  },
  {
    id: 'daily_devotion',
    name: 'Daily Devotion',
    description: 'Maintain a 7-day login streak.',
    icon: 'Calendar',
    rarity: 'epic'
  }
];
export function getAchievement(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find(a => a.id === id);
}