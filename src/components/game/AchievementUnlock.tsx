import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Zap, Target, Shield, Coins, Flame, Users, Calendar, Lock } from 'lucide-react';
import { ACHIEVEMENTS } from '@shared/achievements';
import { cn } from '@/lib/utils';
import { playSfx } from '@/lib/sound-fx';
interface AchievementUnlockProps {
  achievements: string[];
}
const ICON_MAP: Record<string, React.ElementType> = {
  Swords: Trophy, // Fallback
  Zap, Target, Shield, Coins, Flame, Users, Calendar
};
export function AchievementUnlock({ achievements }: AchievementUnlockProps) {
  const [queue, setQueue] = useState<string[]>(achievements);
  const [current, setCurrent] = useState<string | null>(null);
  useEffect(() => {
    if (queue.length > 0 && !current) {
      const next = queue[0];
      setCurrent(next);
      setQueue(prev => prev.slice(1));
      playSfx('win'); // Or a specific achievement sound
    }
  }, [queue, current]);
  useEffect(() => {
    if (current) {
      const timer = setTimeout(() => {
        setCurrent(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [current]);
  if (!current) return null;
  const achievement = ACHIEVEMENTS.find(a => a.id === current);
  if (!achievement) return null;
  const Icon = ICON_MAP[achievement.icon] || Trophy;
  return (
    <AnimatePresence>
      <motion.div
        key={current}
        initial={{ opacity: 0, y: 50, scale: 0.8 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -50, scale: 0.8 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
      >
        <div className="bg-zinc-900/90 border border-yellow-500/30 backdrop-blur-xl p-6 rounded-2xl shadow-2xl flex flex-col items-center text-center max-w-sm mx-4 relative overflow-hidden">
          {/* Shine Effect */}
          <div className="absolute inset-0 bg-gradient-to-tr from-yellow-500/10 via-transparent to-transparent pointer-events-none" />
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.2, type: "spring" }}
            className={cn(
              "w-20 h-20 rounded-full flex items-center justify-center mb-4 shadow-lg",
              achievement.rarity === 'legendary' ? "bg-yellow-500/20 text-yellow-400 shadow-yellow-500/20" :
              achievement.rarity === 'epic' ? "bg-purple-500/20 text-purple-400 shadow-purple-500/20" :
              "bg-blue-500/20 text-blue-400 shadow-blue-500/20"
            )}
          >
            <Icon className="w-10 h-10" />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h3 className="text-sm font-bold text-yellow-500 uppercase tracking-widest mb-1">Achievement Unlocked</h3>
            <h2 className="text-2xl font-display font-bold text-white mb-2">{achievement.name}</h2>
            <p className="text-sm text-muted-foreground">{achievement.description}</p>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}