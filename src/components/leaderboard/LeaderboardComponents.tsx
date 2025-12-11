import React from 'react';
import { motion } from 'framer-motion';
import { Crown, Medal, UserPlus, Check, Loader2, Trophy, Star, Swords } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn, getFlagEmoji } from '@/lib/utils';
import type { User } from '@shared/types';
import { getLevelFromXp } from '@shared/progression';
import { Link } from 'react-router-dom';
interface PodiumProps {
  users: User[];
  currentUser: User | null;
  onAddFriend: (id: string) => void;
  addingFriendId: string | null;
  friends: User[];
  getDisplayScore: (user: User) => number;
  scoreLabel: string;
}
export function Podium({
  users,
  currentUser,
  onAddFriend,
  addingFriendId,
  friends,
  getDisplayScore,
  scoreLabel
}: PodiumProps) {
  const first = users[0];
  const second = users[1];
  const third = users[2];
  const renderSpot = (user: User | undefined, rank: 1 | 2 | 3) => {
    if (!user) return <div className="flex-1 min-w-[80px]" />; // Spacer
    const isMe = user.id === currentUser?.id;
    const isFriend = friends.some(f => f.id === user.id);
    const score = getDisplayScore(user);
    const { level } = getLevelFromXp(user.xp || 0);
    // Responsive Sizes
    let heightClass = "h-24 md:h-40"; // Default (3rd)
    let colorClass = "from-amber-700/20 to-amber-900/20 border-amber-700/30 text-amber-600"; // Bronze
    let icon = <Medal className="w-4 h-4 md:w-6 md:h-6 text-amber-700" />;
    let glowClass = "shadow-amber-900/20";
    let delay = 0.2;
    let avatarSize = "w-14 h-14 md:w-20 md:h-20"; // Rank 3
    if (rank === 1) {
      heightClass = "h-32 md:h-52";
      colorClass = "from-yellow-500/20 to-yellow-700/20 border-yellow-500/30 text-yellow-500"; // Gold
      icon = <Crown className="w-6 h-6 md:w-8 md:h-8 text-yellow-500 fill-yellow-500 animate-pulse" />;
      glowClass = "shadow-yellow-500/20";
      delay = 0.3;
      avatarSize = "w-20 h-20 md:w-32 md:h-32"; // Rank 1
    } else if (rank === 2) {
      heightClass = "h-28 md:h-44";
      colorClass = "from-slate-400/20 to-slate-600/20 border-slate-400/30 text-slate-400"; // Silver
      icon = <Medal className="w-4 h-4 md:w-6 md:h-6 text-slate-400" />;
      glowClass = "shadow-slate-500/20";
      delay = 0.1;
      avatarSize = "w-16 h-16 md:w-24 md:h-24"; // Rank 2
    }
    return (
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay, type: "spring", stiffness: 100 }}
        className="flex flex-col items-center justify-end flex-1 min-w-[90px] max-w-[180px] relative group"
      >
        {/* Avatar Section */}
        <div className="relative mb-2 md:mb-4">
          {rank === 1 && (
            <div className="absolute -top-6 md:-top-8 left-1/2 -translate-x-1/2 animate-bounce">
              {icon}
            </div>
          )}
          <Link to={`/profile/${user.id}`}>
            <div className={cn(
              "relative rounded-full p-1 bg-gradient-to-br shadow-2xl transition-transform duration-300 group-hover:scale-105 cursor-pointer",
              rank === 1 ? "from-yellow-300 to-yellow-600" :
              rank === 2 ? "from-slate-300 to-slate-500" :
              "from-amber-600 to-amber-800",
              avatarSize
            )}>
              <Avatar className="w-full h-full border-2 md:border-4 border-zinc-900">
                <AvatarImage src={user.avatar} className="object-cover" />
                <AvatarFallback className="bg-zinc-800 text-white font-bold text-xs md:text-base">
                  {user.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {/* Level Badge */}
              <div className="absolute -top-1 -right-1 md:-top-2 md:-right-2 bg-zinc-900 text-white text-[8px] md:text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-white/10 flex items-center gap-0.5 shadow-lg">
                <Star className="w-2 h-2 md:w-2.5 md:h-2.5 fill-yellow-400 text-yellow-400" />
                {level}
              </div>
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-zinc-900 text-white text-[10px] md:text-xs font-bold px-2 py-0.5 rounded-full border border-white/10 whitespace-nowrap flex items-center gap-1 max-w-[120%] shadow-md z-10">
                {getFlagEmoji(user.country)}
                <span className="max-w-[60px] md:max-w-[80px] truncate">{user.name}</span>
              </div>
            </div>
          </Link>
        </div>
        {/* Pedestal */}
        <div className={cn(
          "w-full rounded-t-xl md:rounded-t-2xl border-t border-x backdrop-blur-md bg-gradient-to-b flex flex-col items-center justify-start pt-2 md:pt-4 relative overflow-hidden transition-all duration-500",
          heightClass,
          colorClass,
          glowClass,
          "shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.5)]"
        )}>
          {/* Shine effect */}
          <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/0 skew-x-12 translate-x-[-100%] group-hover:animate-shimmer" />
          <div className="text-2xl md:text-4xl font-display font-bold mb-0.5 md:mb-1">{rank}</div>
          <div className="text-xs md:text-base font-mono font-bold opacity-90 flex flex-col items-center">
            <span>{score}</span>
            <span className="text-[8px] md:text-[10px] uppercase opacity-70">{scoreLabel}</span>
          </div>
          {/* Action Button (Add Friend) - Hidden on very small screens if needed, or scaled down */}
          {!isMe && !isFriend && (
            <div className="mt-2 md:mt-4 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 md:h-8 md:w-8 rounded-full hover:bg-white/10"
                onClick={() => onAddFriend(user.id)}
                disabled={addingFriendId === user.id}
              >
                {addingFriendId === user.id ? (
                  <Loader2 className="w-3 h-3 md:w-4 md:h-4 animate-spin" />
                ) : (
                  <UserPlus className="w-3 h-3 md:w-4 md:h-4" />
                )}
              </Button>
            </div>
          )}
        </div>
      </motion.div>
    );
  };
  if (users.length === 0) return null;
  return (
    <div className="flex items-end justify-center gap-2 md:gap-6 mb-8 md:mb-12 px-2 md:px-4 min-h-[240px] md:min-h-[300px]">
      {renderSpot(second, 2)}
      {renderSpot(first, 1)}
      {renderSpot(third, 3)}
    </div>
  );
}
interface LeaderboardListProps {
  users: User[];
  startIndex: number;
  currentUser: User | null;
  onAddFriend: (id: string) => void;
  addingFriendId: string | null;
  friends: User[];
  getDisplayScore: (user: User) => number;
  scoreLabel: string;
}
export function LeaderboardList({
  users,
  startIndex,
  currentUser,
  onAddFriend,
  addingFriendId,
  friends,
  getDisplayScore,
  scoreLabel
}: LeaderboardListProps) {
  if (users.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground bg-white/5 rounded-2xl border border-dashed border-white/10">
        No other players found.
      </div>
    );
  }
  return (
    <div className="bg-zinc-900/50 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-sm shadow-xl">
      {/* Header */}
      <div className="grid grid-cols-12 gap-2 md:gap-4 p-3 md:p-4 border-b border-white/5 bg-white/5 text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-wider">
        <div className="col-span-2 md:col-span-1 text-center">Rank</div>
        <div className="col-span-7 md:col-span-6">Player</div>
        <div className="col-span-3 hidden md:block text-center">Stats</div>
        <div className="col-span-3 md:col-span-2 text-right pr-2 md:pr-4">{scoreLabel}</div>
      </div>
      {/* List */}
      <div className="divide-y divide-white/5">
        {users.map((user, i) => {
          const rank = startIndex + i + 1;
          const isMe = user.id === currentUser?.id;
          const isFriend = friends.some(f => f.id === user.id);
          const score = getDisplayScore(user);
          const winRate = user.stats?.matches 
            ? Math.round((user.stats.wins / user.stats.matches) * 100) 
            : 0;
          const { level } = getLevelFromXp(user.xp || 0);
          return (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className={cn(
                "grid grid-cols-12 gap-2 md:gap-4 p-2 md:p-4 items-center hover:bg-white/5 transition-colors group",
                isMe && "bg-indigo-500/10 hover:bg-indigo-500/20"
              )}
            >
              {/* Rank */}
              <div className="col-span-2 md:col-span-1 flex justify-center">
                <span className={cn(
                  "font-mono font-bold text-xs md:text-sm w-6 h-6 md:w-8 md:h-8 flex items-center justify-center rounded-full",
                  isMe ? "bg-indigo-500 text-white" : "text-muted-foreground bg-white/5"
                )}>
                  {rank}
                </span>
              </div>
              {/* Player Info */}
              <div className="col-span-7 md:col-span-6 flex items-center gap-2 md:gap-3 overflow-hidden">
                <Link to={`/profile/${user.id}`} className="flex items-center gap-2 md:gap-3 overflow-hidden flex-1">
                  <div className="relative flex-shrink-0">
                    <Avatar className="w-8 h-8 md:w-10 md:h-10 border border-white/10">
                      <AvatarImage src={user.avatar} />
                      <AvatarFallback className="text-[10px] md:text-xs bg-zinc-800">
                        {user.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1 bg-zinc-900 text-[8px] font-bold px-1 rounded-full border border-white/10 text-yellow-400">
                      L{level}
                    </div>
                  </div>
                  <div className="flex flex-col min-w-0 overflow-hidden">
                    <span className={cn(
                      "font-bold text-sm md:text-base flex items-center gap-1 md:gap-2 truncate",
                      isMe && "text-indigo-400"
                    )}>
                      <span className="truncate">{user.name}</span>
                      {isMe && <span className="hidden sm:inline text-xs opacity-70">(You)</span>}
                      <span className="text-sm md:text-base flex-shrink-0" title={user.country}>
                        {getFlagEmoji(user.country)}
                      </span>
                    </span>
                    {user.title && (
                      <span className="text-[8px] md:text-[10px] text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1 truncate">
                        <Crown className="w-2.5 h-2.5 md:w-3 md:h-3 flex-shrink-0" /> {user.title}
                      </span>
                    )}
                  </div>
                </Link>
              </div>
              {/* Stats (Desktop Only) */}
              <div className="col-span-3 hidden md:block text-center text-sm font-mono text-muted-foreground">
                <div className="flex flex-col">
                  <span className="text-white">{winRate}%</span>
                  <span className="text-[10px] opacity-50">Win Rate</span>
                </div>
              </div>
              {/* Score & Actions */}
              <div className="col-span-3 md:col-span-2 text-right pr-2 md:pr-4 font-bold font-mono text-indigo-300 flex items-center justify-end gap-1 md:gap-3">
                <span className="text-sm md:text-base">{score}</span>
                {/* Friend Action */}
                <div className="w-6 md:w-8 flex justify-center">
                  {!isMe && !isFriend && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 md:h-8 md:w-8 rounded-full opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity hover:bg-indigo-500/20 hover:text-indigo-400"
                      onClick={() => onAddFriend(user.id)}
                      disabled={addingFriendId === user.id}
                    >
                      {addingFriendId === user.id ? (
                        <Loader2 className="w-3 h-3 md:w-4 md:h-4 animate-spin" />
                      ) : (
                        <UserPlus className="w-3 h-3 md:w-4 md:h-4" />
                      )}
                    </Button>
                  )}
                  {isFriend && (
                    <div className="flex items-center gap-1">
                      <Link to="/categories?mode=private">
                        <Button size="icon" variant="ghost" className="h-6 w-6 md:h-8 md:w-8 rounded-full opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity hover:bg-indigo-500/20 hover:text-indigo-400" title="Challenge">
                          <Swords className="w-3 h-3 md:w-4 md:h-4" />
                        </Button>
                      </Link>
                      <div className="h-6 w-6 md:h-8 md:w-8 flex items-center justify-center text-emerald-500" title="Friend">
                        <Check className="w-3 h-3 md:w-4 md:h-4" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}