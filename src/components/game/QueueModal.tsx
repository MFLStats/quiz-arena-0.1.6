import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Globe, Check, Swords } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
interface QueueModalProps {
  isOpen: boolean;
  onCancel: () => void;
  categoryName: string;
  matchFound?: boolean;
}
export function QueueModal({ isOpen, onCancel, categoryName, matchFound = false }: QueueModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !matchFound && onCancel()}>
      <DialogContent
        className="bg-zinc-950/90 border-white/10 backdrop-blur-xl sm:max-w-md overflow-hidden p-0 gap-0"
        onInteractOutside={(e) => e.preventDefault()} // Prevent closing by clicking outside
      >
        <div className="relative p-8 flex flex-col items-center justify-center min-h-[400px]">
          {/* Animated Background Grid */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-zinc-950/50 to-zinc-950" />
          <AnimatePresence mode="wait">
            {!matchFound ? (
              <motion.div
                key="searching"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex flex-col items-center w-full"
              >
                {/* Radar Animation */}
                <div className="relative w-64 h-64 mb-8 flex items-center justify-center">
                  {/* Pulsing Rings */}
                  <div className="absolute inset-0 rounded-full border border-indigo-500/20 animate-[ping_3s_linear_infinite]" />
                  <div className="absolute inset-4 rounded-full border border-indigo-500/30 animate-[ping_3s_linear_infinite_1s]" />
                  <div className="absolute inset-8 rounded-full border border-indigo-500/40 animate-[ping_3s_linear_infinite_2s]" />
                  {/* Rotating Radar Sweep */}
                  <div className="absolute inset-0 rounded-full border border-white/5 overflow-hidden">
                    <div className="absolute top-1/2 left-1/2 w-[50%] h-[50%] bg-gradient-to-br from-indigo-500/50 to-transparent origin-top-left animate-[spin_4s_linear_infinite]" />
                  </div>
                  {/* Center Icon */}
                  <div className="relative z-10 w-20 h-20 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center shadow-[0_0_40px_rgba(99,102,241,0.3)]">
                    <Globe className="w-10 h-10 text-indigo-400 animate-pulse" />
                  </div>
                  {/* Orbiting Dots */}
                  <div className="absolute inset-0 animate-[spin_8s_linear_infinite]">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-emerald-400 rounded-full shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
                  </div>
                  <div className="absolute inset-8 animate-[spin_6s_linear_infinite_reverse]">
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-purple-400 rounded-full shadow-[0_0_10px_rgba(192,132,252,0.8)]" />
                  </div>
                </div>
                <DialogHeader className="relative z-10 text-center space-y-2">
                  <DialogTitle className="text-2xl font-display font-bold text-white tracking-wide">
                    Searching for Opponent
                  </DialogTitle>
                  <DialogDescription className="text-indigo-200/70 text-base">
                    Scanning <span className="text-white font-semibold">{categoryName}</span> sector...
                  </DialogDescription>
                </DialogHeader>
                <div className="relative z-10 mt-8 w-full max-w-xs">
                  <Button
                    variant="outline"
                    className="w-full h-12 border-white/10 bg-white/5 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/50 transition-all duration-300 group"
                    onClick={onCancel}
                  >
                    <X className="w-4 h-4 mr-2 group-hover:rotate-90 transition-transform" />
                    Cancel Search
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="found"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center w-full py-8"
              >
                <div className="relative w-40 h-40 mb-8 flex items-center justify-center">
                  <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-pulse" />
                  <div className="absolute inset-0 border-4 border-emerald-500/30 rounded-full" />
                  <div className="w-32 h-32 bg-emerald-500 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(16,185,129,0.5)]">
                    <Swords className="w-16 h-16 text-white animate-bounce" />
                  </div>
                  <div className="absolute -right-2 -top-2 bg-zinc-900 rounded-full p-2 border-2 border-emerald-500">
                    <Check className="w-6 h-6 text-emerald-500" />
                  </div>
                </div>
                <DialogHeader className="relative z-10 text-center space-y-2">
                  <DialogTitle className="text-3xl font-display font-bold text-white tracking-wide">
                    Opponent Found!
                  </DialogTitle>
                  <DialogDescription className="text-emerald-200/70 text-lg">
                    Entering the Arena...
                  </DialogDescription>
                </DialogHeader>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}