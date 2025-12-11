import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Swords, Lightbulb } from 'lucide-react';
const TIPS = [
  "Speed matters! Faster answers earn significantly more points.",
  "The final question is worth Double Points. Make it count!",
  "Don't guess randomly. Incorrect answers award 0 points.",
  "Check the shop for new avatars and frames to customize your profile.",
  "Daily Challenges reset every 24 hours. Play daily to keep your streak!",
  "Use the 'Report' flag if you spot an incorrect question.",
  "Private lobbies let you challenge friends directly via code.",
  "Winning matches increases your Elo rating and leaderboard rank."
];
export function MatchLoadingScreen() {
  const [dots, setDots] = useState('');
  const [tipIndex, setTipIndex] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);
    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
    // Rotate tips every 4 seconds
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % TIPS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-zinc-950 overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-zinc-950 to-zinc-950" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] opacity-20" />
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 flex flex-col items-center gap-8 max-w-md px-6 text-center"
      >
        {/* Central Pulse */}
        <div className="relative">
          <div className="absolute inset-0 bg-indigo-500/30 blur-[60px] rounded-full animate-pulse" />
          <div className="relative w-32 h-32 flex items-center justify-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 rounded-full border-t-4 border-l-4 border-indigo-500/50"
            />
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
              className="absolute inset-4 rounded-full border-b-4 border-r-4 border-purple-500/50"
            />
            <Swords className="w-12 h-12 text-white fill-white/20 animate-pulse" />
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-display font-bold text-white tracking-wider">
            ENTERING ARENA
          </h2>
          <div className="flex items-center justify-center gap-2 text-indigo-300 font-mono text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="tabular-nums min-w-[200px] text-left">
              ESTABLISHING CONNECTION{dots}
            </span>
          </div>
        </div>
        {/* Pro Tips Section */}
        <div className="mt-8 p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm w-full min-h-[100px] flex flex-col items-center justify-center">
          <div className="flex items-center gap-2 text-xs font-bold text-yellow-400 uppercase tracking-widest mb-2">
            <Lightbulb className="w-3 h-3" /> Pro Tip
          </div>
          <div className="relative w-full h-12 flex items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.p
                key={tipIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="text-sm text-indigo-100 font-medium leading-relaxed"
              >
                {TIPS[tipIndex]}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
      {/* Decorative Elements */}
      <div className="absolute bottom-10 left-0 right-0 flex justify-center gap-2 opacity-50">
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 1.5, delay: i * 0.2, repeat: Infinity }}
            className="w-2 h-2 rounded-full bg-indigo-500"
          />
        ))}
      </div>
    </div>
  );
}