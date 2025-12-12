import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Check, X, User as UserIcon, Loader2, Crown, Smile, Swords, Medal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
// --- Timer Circle ---
interface TimerCircleProps {
  duration: number; // seconds
  onComplete?: () => void;
  isRunning: boolean;
  className?: string;
}
export function TimerCircle({ duration, onComplete, isRunning, className }: TimerCircleProps) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const radius = 28; // Increased size
  const circumference = 2 * Math.PI * radius;
  const progress = (timeLeft / duration) * circumference;
  useEffect(() => {
    setTimeLeft(duration);
  }, [duration]);
  useEffect(() => {
    if (!isRunning) return;
    let start = performance.now();
    let frameId: number;
    const tick = (now: number) => {
      const elapsed = (now - start) / 1000;
      const remaining = Math.max(0, duration - elapsed);
      setTimeLeft(remaining);
      if (remaining > 0) {
        frameId = requestAnimationFrame(tick);
      } else {
        onComplete?.();
      }
    };
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [duration, isRunning, onComplete]);
  const isUrgent = timeLeft < 3;
  const colorClass = isUrgent ? 'text-rose-500' : timeLeft < 6 ? 'text-amber-400' : 'text-emerald-400';
  return (
    <div className={cn("relative flex items-center justify-center w-20 h-20", className)}>
      <svg className="w-full h-full transform -rotate-90 drop-shadow-lg">
        <circle
          cx="40"
          cy="40"
          r={radius}
          stroke="currentColor"
          strokeWidth="6"
          fill="transparent"
          className="text-white/10"
        />
        <circle
          cx="40"
          cy="40"
          r={radius}
          stroke="currentColor"
          strokeWidth="6"
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
          className={cn("transition-all duration-100 ease-linear", colorClass, isUrgent && "animate-pulse-fast")}
        />
      </svg>
      <span className={cn("absolute text-2xl font-bold tabular-nums font-display", colorClass, isUrgent && "animate-pulse-fast")}>
        {Math.ceil(timeLeft)}
      </span>
    </div>
  );
}
// --- Answer Button ---
interface AnswerButtonProps {
  text: string;
  index: number;
  selected: boolean;
  locked: boolean;
  correct?: boolean; // Only passed when revealing
  isLoading?: boolean;
  onClick: () => void;
}
export function AnswerButton({ text, index, selected, locked, correct, isLoading, onClick }: AnswerButtonProps) {
  let variantClass = "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/30 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)]";
  let icon = null;
  if (locked) {
    if (correct) {
      variantClass = "bg-emerald-500/20 border-emerald-500 text-emerald-100 shadow-[0_0_20px_rgba(16,185,129,0.3)]";
      icon = <Check className="w-6 h-6 text-emerald-400 drop-shadow-md" />;
    } else if (selected && correct === false) {
      variantClass = "bg-rose-500/20 border-rose-500 text-rose-100 shadow-[0_0_20px_rgba(244,63,94,0.3)]";
      icon = <X className="w-6 h-6 text-rose-400 drop-shadow-md" />;
    } else {
      variantClass = "bg-white/5 border-white/5 opacity-40 grayscale";
    }
  } else if (isLoading) {
    variantClass = "bg-indigo-500/30 border-indigo-400 text-indigo-100 shadow-[0_0_20px_rgba(99,102,241,0.4)] scale-[1.02]";
    icon = <Loader2 className="w-5 h-5 animate-spin text-indigo-300" />;
  } else if (selected) {
    variantClass = "bg-indigo-500/30 border-indigo-400 text-indigo-100 shadow-[0_0_20px_rgba(99,102,241,0.4)] scale-[1.02]";
  }
  const shortcutKey = index + 1;
  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      whileHover={!locked && !isLoading ? { scale: 1.02 } : {}}
      whileTap={!locked && !isLoading ? { scale: 0.98 } : {}}
      onClick={!locked && !isLoading ? onClick : undefined}
      disabled={locked || isLoading}
      className={cn(
        "relative w-full p-5 md:p-6 text-left rounded-2xl border-2 transition-all duration-200 flex items-center justify-between group backdrop-blur-sm",
        variantClass
      )}
    >
      <div className="flex items-center gap-4">
        <span className={cn(
          "flex items-center justify-center w-8 h-8 rounded-lg text-sm font-bold transition-colors relative",
          selected || (locked && correct) || isLoading ? "bg-white/20 text-white" : "bg-white/10 text-white/60"
        )}>
          {String.fromCharCode(65 + index)}
          {/* Shortcut Hint */}
          <span className="hidden md:block absolute -top-2 -right-2 text-[9px] font-mono opacity-50 bg-black/50 px-1 rounded border border-white/10">
            {shortcutKey}
          </span>
        </span>
        <span className="text-lg md:text-xl font-medium leading-tight">{text}</span>
      </div>
      {icon}
    </motion.button>
  );
}
// --- Score Badge ---
interface ScoreBadgeProps {
  score: number;
  label: string;
  isOpponent?: boolean;
}
export function ScoreBadge({ score, label, isOpponent }: ScoreBadgeProps) {
  return (
    <div className={cn(
      "flex flex-col items-center px-4 py-2 rounded-xl border backdrop-blur-md min-w-[90px] transition-all duration-300",
      isOpponent
        ? "bg-rose-950/30 border-rose-500/30 text-rose-100"
        : "bg-indigo-950/30 border-indigo-500/30 text-indigo-100"
    )}>
      <span className="text-[10px] uppercase tracking-widest opacity-70 mb-1 font-semibold">{label}</span>
      <AnimatePresence mode="wait">
        <motion.span
          key={score}
          initial={{ scale: 1.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-2xl font-display font-bold tabular-nums drop-shadow-lg"
        >
          {score}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}
// --- Opponent Avatar ---
export function OpponentAvatar({ name, className, isOpponent, title, displayTitle }: { name: string, className?: string, isOpponent?: boolean, title?: string, displayTitle?: string }) {
  // Determine title styling based on content
  let titleClass = "text-amber-400 border-amber-500/20 bg-amber-500/10";
  let titleIcon = <Crown className="w-3 h-3 fill-amber-400" />;
  if (displayTitle) {
    if (displayTitle === 'Gold' || displayTitle.includes('1st Daily')) {
      titleClass = "text-yellow-400 border-yellow-500/30 bg-yellow-500/10";
      titleIcon = <Crown className="w-3 h-3 fill-yellow-400" />;
    } else if (displayTitle === 'Silver' || displayTitle.includes('2nd Daily')) {
      titleClass = "text-slate-300 border-slate-400/30 bg-slate-400/10";
      titleIcon = <Medal className="w-3 h-3 text-slate-300" />;
    } else if (displayTitle === 'Bronze' || displayTitle.includes('3rd Daily')) {
      titleClass = "text-amber-600 border-amber-700/30 bg-amber-700/10";
      titleIcon = <Medal className="w-3 h-3 text-amber-600" />;
    } else if (displayTitle.includes('in ')) {
      // Category Rank
      titleClass = "text-indigo-300 border-indigo-500/30 bg-indigo-500/10";
      titleIcon = <Medal className="w-3 h-3 text-indigo-300" />;
    }
  }
  const finalTitle = displayTitle || title;
  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <div className={cn(
        "relative w-14 h-14 rounded-full p-[3px] shadow-xl",
        isOpponent
          ? "bg-gradient-to-br from-rose-500 to-orange-600"
          : "bg-gradient-to-br from-indigo-500 to-cyan-500"
      )}>
        <div className="absolute inset-0 rounded-full animate-pulse opacity-50 bg-white blur-md" />
        <div className="relative w-full h-full rounded-full bg-zinc-900 flex items-center justify-center overflow-hidden">
          <UserIcon className="w-7 h-7 text-white/80" />
        </div>
      </div>
      <div className="flex flex-col items-center">
        <span className="text-xs font-bold text-white/90 tracking-wide bg-black/40 px-2 py-0.5 rounded-full backdrop-blur-sm border border-white/5">
          {name}
        </span>
        {finalTitle && (
          <span className={cn(
            "mt-1 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 px-1.5 py-0.5 rounded border max-w-[120px] truncate",
            titleClass
          )}>
            {titleIcon} {finalTitle}
          </span>
        )}
      </div>
    </div>
  );
}
// --- Emote Picker ---
interface EmotePickerProps {
  onSelect: (emoji: string) => void;
  disabled?: boolean;
}
const EMOJIS = ['����', '👏', '🤔', '😱', '😎', '😭', '🤯', '🔥'];
export function EmotePicker({ onSelect, disabled }: EmotePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCooldown, setIsCooldown] = useState(false);
  const handleSelect = (emoji: string) => {
    if (isCooldown) return;
    onSelect(emoji);
    setIsOpen(false);
    setIsCooldown(true);
    setTimeout(() => setIsCooldown(false), 2000);
  };
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className={cn(
            "h-10 w-10 rounded-full border-white/10 bg-white/5 hover:bg-white/10 hover:text-yellow-400 transition-colors",
            isCooldown && "opacity-50 cursor-not-allowed"
          )}
          disabled={disabled || isCooldown}
        >
          <Smile className="w-5 h-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2 bg-zinc-900/95 border-white/10 backdrop-blur-xl rounded-xl" side="top">
        <div className="grid grid-cols-4 gap-2">
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleSelect(emoji)}
              className="text-2xl p-2 hover:bg-white/10 rounded-lg transition-colors hover:scale-110 active:scale-95"
            >
              {emoji}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
// --- Emote Floater ---
interface EmoteFloaterProps {
  emoji: string;
  timestamp: number;
}
export function EmoteFloater({ emoji, timestamp }: EmoteFloaterProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`${timestamp}-${emoji}`} // Robust key to prevent collisions
        initial={{ opacity: 0, y: 20, scale: 0.5 }}
        animate={{
            opacity: [0, 1, 1, 0],
            y: [20, -40, -80, -120],
            scale: [0.5, 1.5, 1, 0.8],
            rotate: [0, -10, 10, 0]
        }}
        transition={{ duration: 2, times: [0, 0.2, 0.8, 1], ease: "easeOut" }}
        className="absolute z-50 pointer-events-none text-4xl md:text-6xl drop-shadow-2xl"
      >
        {emoji}
      </motion.div>
    </AnimatePresence>
  );
}
// --- Round Intermission ---
interface RoundIntermissionProps {
  roundNumber: number;
  totalRounds: number;
}
export function RoundIntermission({ roundNumber, totalRounds }: RoundIntermissionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.1 }}
      className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-[2rem]"
    >
      <div className="flex flex-col items-center gap-4 p-8 rounded-3xl bg-zinc-900/90 border border-white/10 shadow-2xl text-center">
        <div className="p-4 rounded-full bg-indigo-500/20 border border-indigo-500/30 mb-2">
          <Swords className="w-8 h-8 text-indigo-400" />
        </div>
        <div>
          <h3 className="text-3xl font-display font-bold text-white mb-1">
            Round {roundNumber}
          </h3>
          <p className="text-indigo-200/70 font-medium uppercase tracking-widest text-xs">
            of {totalRounds}
          </p>
        </div>
        <div className="h-1 w-24 bg-white/10 rounded-full overflow-hidden mt-2">
          <motion.div
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
            className="h-full bg-indigo-500"
          />
        </div>
        <p className="text-sm text-muted-foreground animate-pulse">Get Ready...</p>
      </div>
    </motion.div>
  );
}