import React from 'react';
import { cn } from '@/lib/utils';
import { motion, HTMLMotionProps } from 'framer-motion';
interface GlassCardProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'hover' | 'interactive';
}
export function GlassCard({ children, className, variant = 'default', ...props }: GlassCardProps) {
  const variants = {
    default: "bg-zinc-900/40 border-white/10",
    hover: "bg-zinc-900/40 border-white/10 hover:bg-zinc-900/60 hover:border-white/20 transition-all duration-300",
    interactive: "bg-zinc-900/40 border-white/10 hover:bg-zinc-900/60 hover:border-indigo-500/30 hover:shadow-[0_0_30px_rgba(99,102,241,0.15)] transition-all duration-300 cursor-pointer"
  };
  return (
    <motion.div
      className={cn(
        "backdrop-blur-xl border shadow-xl rounded-3xl overflow-hidden",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
}