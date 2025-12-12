import React from 'react';
import { Loader2, Atom, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CATEGORY_ICONS } from '@/lib/icons';
import type { Category } from '@shared/types';
interface CategoryTileProps {
  cat: Category;
  userElo?: number;
  isJoining: boolean;
  onJoin: (id: string, name: string) => void;
  index: number;
  gameMode: 'ranked' | 'private';
  badge?: {
    text: string;
    color: string;
    icon: React.ElementType;
  };
}
export const CategoryTile = React.forwardRef<HTMLDivElement, CategoryTileProps>(
  ({ cat, userElo = 1200, isJoining, onJoin, index, gameMode, badge }, ref) => {
    const Icon = CATEGORY_ICONS[cat.icon] || Atom;
    // Calculate Mastery
    const adjustedElo = Math.max(1200, userElo);
    const level = Math.floor((adjustedElo - 1200) / 100) + 1;
    const progress = (adjustedElo - 1200) % 100;
    return (
      <div
        ref={ref}
        className="group relative aspect-square h-full w-full"
        onClick={() => !isJoining && onJoin(cat.id, cat.name)}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-2xl blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="relative h-full flex flex-col items-center justify-center bg-black/40 border border-white/[0.05] hover:border-white/20 backdrop-blur-sm rounded-2xl p-3 transition-all duration-200 hover:-translate-y-1 hover:bg-white/[0.03] cursor-pointer overflow-hidden">
          {/* Background Gradient */}
          <div className={`absolute inset-0 bg-gradient-to-br ${cat.color} opacity-[0.05] group-hover:opacity-10 transition-opacity duration-300`} />
          {/* Badge */}
          {badge && (
            <div className={cn(
              "absolute top-2 right-2 w-2 h-2 rounded-full shadow-lg z-20",
              badge.color.replace('text-', 'bg-').split(' ')[0]
            )} title={badge.text} />
          )}
          {/* Level Badge (Top Left) - Only in Ranked */}
          {gameMode === 'ranked' && (
             <div className="absolute top-2 left-2 z-20 flex items-center gap-0.5 bg-black/60 px-1.5 py-0.5 rounded-full border border-white/10 backdrop-blur-md shadow-sm">
                <Star className="w-2 h-2 text-yellow-400 fill-yellow-400" />
                <span className="text-[8px] font-bold text-white leading-none">{level}</span>
             </div>
          )}
          {/* Icon Container with Progress Ring */}
          <div className="relative mb-3 group-hover:scale-110 transition-transform duration-300">
             {/* Progress Ring SVG */}
             {gameMode === 'ranked' && (
                <svg className="absolute inset-[-6px] w-[calc(100%+12px)] h-[calc(100%+12px)] transform -rotate-90 pointer-events-none">
                    {/* Track */}
                    <circle
                        cx="50%"
                        cy="50%"
                        r="46%"
                        stroke="currentColor"
                        strokeWidth="2"
                        fill="transparent"
                        className="text-white/5"
                    />
                    {/* Progress */}
                    <circle
                        cx="50%"
                        cy="50%"
                        r="46%"
                        stroke="currentColor"
                        strokeWidth="2"
                        fill="transparent"
                        strokeDasharray="100 100"
                        pathLength="100"
                        strokeDashoffset={100 - progress}
                        strokeLinecap="round"
                        className="text-indigo-500 drop-shadow-[0_0_4px_rgba(99,102,241,0.5)] transition-all duration-1000 ease-out"
                    />
                </svg>
             )}
             {/* Actual Icon Box */}
             <div className="relative w-12 h-12 md:w-14 md:h-14">
                <div className={`w-full h-full rounded-xl bg-gradient-to-br ${cat.color} flex items-center justify-center shadow-lg relative z-10`}>
                    {isJoining ? (
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                    ) : (
                    <Icon className="w-6 h-6 md:w-7 md:h-7 text-white" />
                    )}
                </div>
             </div>
          </div>
          {/* Text */}
          <div className="text-center relative z-10 w-full">
            <h3 className="text-sm md:text-base font-bold text-white leading-tight truncate px-1 group-hover:text-indigo-300 transition-colors">
              {cat.name}
            </h3>
            {gameMode === 'ranked' && (
              <span className="text-[10px] font-mono text-indigo-300/80 mt-0.5 block">
                Elo {userElo}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }
);
CategoryTile.displayName = "CategoryTile";