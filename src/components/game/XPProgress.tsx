import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, ArrowUpCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { getLevelFromXp } from '@shared/progression';
import { cn } from '@/lib/utils';
interface XPProgressProps {
  totalXp: number;
  gainedXp: number;
}
export function XPProgress({ totalXp, gainedXp }: XPProgressProps) {
  const [displayProgress, setDisplayProgress] = useState(0);
  const [displayLevel, setDisplayLevel] = useState(1);
  const [showLevelUp, setShowLevelUp] = useState(false);
  // Calculate previous state
  const previousXp = Math.max(0, totalXp - gainedXp);
  const prevLevelInfo = getLevelFromXp(previousXp);
  const currLevelInfo = getLevelFromXp(totalXp);
  useEffect(() => {
    // Initial State
    setDisplayLevel(prevLevelInfo.level);
    setDisplayProgress(prevLevelInfo.progressPercent);
    // Animation Sequence
    const animate = async () => {
      // Small delay before starting animation
      await new Promise(r => setTimeout(r, 500));
      if (currLevelInfo.level > prevLevelInfo.level) {
        // Level Up Sequence
        // 1. Fill to 100%
        setDisplayProgress(100);
        // Wait for fill
        await new Promise(r => setTimeout(r, 1000));
        // 2. Show Level Up Splash & Reset Bar
        setShowLevelUp(true);
        setDisplayLevel(currLevelInfo.level);
        setDisplayProgress(0); // Instant reset visually (disable transition if needed, but Progress handles it okay usually)
        // Wait for splash impact
        await new Promise(r => setTimeout(r, 1500));
        setShowLevelUp(false);
        // 3. Fill to new progress
        setDisplayProgress(currLevelInfo.progressPercent);
      } else {
        // Normal Progress
        setDisplayProgress(currLevelInfo.progressPercent);
      }
    };
    animate();
  }, [totalXp, gainedXp]); // Run when props change
  return (
    <div className="w-full max-w-md mx-auto bg-zinc-900/50 border border-white/10 rounded-xl p-4 relative overflow-hidden">
      {/* Level Up Overlay */}
      <AnimatePresence>
        {showLevelUp && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.5 }}
            className="absolute inset-0 z-20 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          >
            <div className="flex flex-col items-center text-yellow-400 font-bold">
              <ArrowUpCircle className="w-12 h-12 mb-2 animate-bounce" />
              <span className="text-2xl font-display tracking-wider">LEVEL UP!</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex justify-between items-end mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg border border-indigo-400">
            {displayLevel}
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Level</span>
            <span className="text-sm font-bold text-white">
              {currLevelInfo.currentLevelXp} <span className="text-white/40">/</span> {currLevelInfo.nextLevelXp} XP
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-emerald-400 font-bold flex items-center justify-end gap-1">
            <Star className="w-3 h-3 fill-emerald-400" />
            +{gainedXp} XP
          </div>
        </div>
      </div>
      <div className="relative h-3 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
        <div 
            className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-1000 ease-out rounded-full relative"
            style={{ width: `${displayProgress}%` }}
        >
            <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite] skew-x-12" />
        </div>
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-muted-foreground font-medium uppercase tracking-widest">
        <span>Current</span>
        <span>Next Level</span>
      </div>
    </div>
  );
}