import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Swords } from 'lucide-react';
export function MatchLoadingScreen() {
  const [dots, setDots] = useState('');
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);
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
        className="relative z-10 flex flex-col items-center gap-8"
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
        <div className="text-center space-y-2">
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