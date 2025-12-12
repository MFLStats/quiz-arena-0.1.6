import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lock, Check, Star, Crown, Gift, Zap, Coins, Box, User as UserIcon, Image as ImageIcon, Sparkles } from 'lucide-react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { cn, getBackgroundStyle } from '@/lib/utils';
import type { User, ClaimRewardRequest, ClaimRewardResponse, UpgradeSeasonPassRequest, ShopItem } from '@shared/types';
import { SEASON_REWARDS_CONFIG, SEASON_COST, SEASON_LEVELS, SEASON_NAME, SEASON_END_DATE } from '@shared/constants';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import { playSfx } from '@/lib/sound-fx';
interface SeasonPassProps {
  user: User | null;
}
// Map icon names from config to components
const ICON_MAP: Record<string, React.ElementType> = {
  Crown, Box, Coins, Gift, Star, User: UserIcon, Image: ImageIcon
};
export function SeasonPass({ user }: SeasonPassProps) {
  const updateUser = useAuthStore(s => s.updateUser);
  const [isProcessing, setIsProcessing] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');
  const [rewardResult, setRewardResult] = useState<{ type: 'coins' | 'item', amount?: number, item?: ShopItem } | null>(null);
  const currentLevel = user?.level || 1;
  const currentXp = user?.xp || 0;
  const isPremium = user?.seasonPass?.isPremium || false;
  const claimedRewards = user?.seasonPass?.claimedRewards || [];
  // Calculate progress within current level (simplified for display)
  const progressPercent = (currentXp % 100);
  useEffect(() => {
    const calculateTimeLeft = () => {
      const end = new Date(SEASON_END_DATE).getTime();
      const now = new Date().getTime();
      const difference = end - now;
      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
        return `${days}d ${hours}h`;
      }
      return 'Ended';
    };
    setTimeLeft(calculateTimeLeft());
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 60000); // Update every minute
    return () => clearInterval(timer);
  }, []);
  const handleClaim = async (level: number, track: 'free' | 'premium') => {
    if (!user) return;
    if (track === 'premium' && !isPremium) {
      toast.error("Upgrade to Premium to claim this reward!");
      return;
    }
    if (level > currentLevel) {
      toast.error("Reach this level to unlock!");
      return;
    }
    const claimKey = `${level}:${track}`;
    if (claimedRewards.includes(claimKey)) return;
    setIsProcessing(true);
    try {
      const req: ClaimRewardRequest = { userId: user.id, level, track };
      const response = await api<ClaimRewardResponse>('/api/shop/season/claim', {
        method: 'POST',
        body: JSON.stringify(req)
      });
      updateUser(response.user);
      setRewardResult(response.reward);
      playSfx('win');
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#fbbf24', '#f59e0b', '#d97706']
      });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to claim reward");
    } finally {
      setIsProcessing(false);
    }
  };
  const handleUpgrade = async () => {
    if (!user) return;
    if ((user.currency || 0) < SEASON_COST) {
      toast.error("Not enough coins!");
      return;
    }
    setIsProcessing(true);
    try {
      const req: UpgradeSeasonPassRequest = { userId: user.id };
      const updatedUser = await api<User>('/api/shop/season/upgrade', {
        method: 'POST',
        body: JSON.stringify(req)
      });
      updateUser(updatedUser);
      toast.success("Upgraded to Premium Pass! All rewards unlocked.");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to upgrade");
    } finally {
      setIsProcessing(false);
    }
  };
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Season Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-red-900 to-green-900 border border-white/10 p-8 md:p-12">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1544967082-d9d25d867d66?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center opacity-30 mix-blend-overlay" />
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-4 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/20 border border-red-500/30 text-red-300 text-sm font-bold uppercase tracking-wider">
              <Crown className="w-4 h-4 fill-red-300" /> Season Event
            </div>
            <h2 className="text-4xl md:text-5xl font-display font-bold text-white">{SEASON_NAME}</h2>
            <p className="text-indigo-100 max-w-lg">
              Unlock exclusive festive rewards, holiday avatars, and spread the cheer.
              Ends in {timeLeft}.
            </p>
          </div>
          {!isPremium && (
            <div className="flex flex-col items-center gap-4 bg-black/40 p-6 rounded-2xl border border-white/10 backdrop-blur-sm">
              <div className="text-center">
                <div className="text-sm text-muted-foreground uppercase tracking-wider font-bold mb-1">Premium Pass</div>
                <div className="text-3xl font-bold text-white">{SEASON_COST} Coins</div>
              </div>
              <Button
                size="lg"
                className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black font-bold shadow-lg shadow-orange-500/20"
                onClick={handleUpgrade}
                disabled={isProcessing}
              >
                Upgrade Now
              </Button>
            </div>
          )}
        </div>
      </div>
      {/* Progress Summary */}
      <div className="flex items-center gap-4 bg-zinc-900/50 p-4 rounded-xl border border-white/5">
        <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-xl text-white shadow-lg shadow-indigo-500/20">
          {currentLevel}
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex justify-between text-sm font-medium">
            <span className="text-white">Level Progress</span>
            <span className="text-indigo-300">{progressPercent}/100 XP</span>
          </div>
          <Progress value={progressPercent} className="h-2 bg-black/40" />
        </div>
        <div className="text-right hidden md:block">
          <div className="text-xs text-muted-foreground uppercase tracking-wider">Next Reward</div>
          <div className="font-bold text-white">50 Coins</div>
        </div>
      </div>
      {/* Timeline Track */}
      <div className="relative rounded-2xl bg-zinc-950/50 border border-white/5 overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-zinc-950 to-transparent z-10 pointer-events-none md:hidden" />
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-zinc-950 to-transparent z-10 pointer-events-none md:hidden" />
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex px-8 pt-8 pb-14 min-w-max">
            {/* Labels Column */}
            <div className="flex flex-col gap-8 mr-8 sticky left-0 z-20 bg-zinc-950/95 px-4 py-2 rounded-r-xl border-r border-white/10 shadow-xl">
              <div className="h-24 flex items-center font-bold text-indigo-300 uppercase tracking-wider text-sm">
                <Star className="w-4 h-4 mr-2" /> Free
              </div>
              <div className="h-24 flex items-center font-bold text-yellow-400 uppercase tracking-wider text-sm">
                <Crown className="w-4 h-4 mr-2" /> Premium
              </div>
            </div>
            {/* Levels */}
            <div className="flex gap-4">
              {SEASON_REWARDS_CONFIG.map((reward) => {
                const isUnlocked = currentLevel >= reward.level;
                const isNext = currentLevel + 1 === reward.level;
                const freeClaimed = claimedRewards.includes(`${reward.level}:free`);
                const premiumClaimed = claimedRewards.includes(`${reward.level}:premium`);
                return (
                  <div key={reward.level} className="flex flex-col gap-8 w-32 relative group">
                    {/* Connector Line */}
                    {reward.level < SEASON_LEVELS && (
                      <div className={cn(
                        "absolute top-1/2 left-1/2 w-full h-1 -translate-y-1/2 -z-10",
                        isUnlocked ? "bg-indigo-500/50" : "bg-white/5"
                      )} />
                    )}
                    {/* Level Indicator */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-0">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors",
                        isUnlocked
                          ? "bg-indigo-600 border-indigo-400 text-white shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                          : isNext
                            ? "bg-zinc-800 border-white/20 text-white animate-pulse"
                            : "bg-zinc-900 border-white/5 text-muted-foreground"
                      )}>
                        {reward.level}
                      </div>
                    </div>
                    {/* Free Reward Card */}
                    <div className="h-24 flex items-end justify-center pb-2">
                      {reward.free.type !== 'none' ? (
                        <RewardCard
                          type={reward.free.type}
                          label={reward.free.label}
                          unlocked={isUnlocked}
                          claimed={freeClaimed}
                          onClick={() => handleClaim(reward.level, 'free')}
                          disabled={isProcessing}
                        />
                      ) : (
                        <div className="w-1 h-8 bg-white/5 rounded-full" />
                      )}
                    </div>
                    {/* Premium Reward Card */}
                    <div className="h-24 flex items-start justify-center pt-2">
                      <RewardCard
                        type="premium"
                        label={reward.premium.label}
                        icon={ICON_MAP[reward.premium.iconName || 'Coins']}
                        unlocked={isUnlocked}
                        locked={!isPremium}
                        claimed={premiumClaimed}
                        onClick={() => handleClaim(reward.level, 'premium')}
                        isPremiumTrack
                        disabled={isProcessing}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <ScrollBar orientation="horizontal" className="bg-white/5" />
        </ScrollArea>
      </div>
      {/* Reward Reveal Dialog */}
      <Dialog open={!!rewardResult} onOpenChange={() => setRewardResult(null)}>
        <DialogContent className="bg-zinc-950 border-white/10 text-center sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-2xl font-display text-white">Reward Unlocked!</DialogTitle>
            <DialogDescription className="sr-only">You have claimed a reward</DialogDescription>
          </DialogHeader>
          {rewardResult && (
            <div className="py-8 flex flex-col items-center animate-in zoom-in duration-500">
              <div className={cn(
                "w-32 h-32 rounded-full flex items-center justify-center mb-6 relative",
                rewardResult.type === 'item' && rewardResult.item?.rarity === 'legendary' ? "bg-yellow-500/20 shadow-[0_0_50px_rgba(234,179,8,0.5)]" :
                rewardResult.type === 'item' && rewardResult.item?.rarity === 'epic' ? "bg-purple-500/20 shadow-[0_0_50px_rgba(168,85,247,0.5)]" :
                "bg-blue-500/20"
              )}>
                <Sparkles className={cn(
                  "absolute -top-4 -right-4 w-8 h-8 animate-bounce",
                  rewardResult.type === 'item' && rewardResult.item?.rarity === 'legendary' ? "text-yellow-400" : "text-white"
                )} />
                {rewardResult.type === 'coins' ? (
                  <Coins className="w-16 h-16 text-yellow-400" />
                ) : rewardResult.item ? (
                  rewardResult.item.type === 'avatar' ? (
                    <img src={rewardResult.item.assetUrl} className="w-24 h-24 rounded-full" />
                  ) : (
                    <div className="w-24 h-16 rounded bg-cover bg-center" style={getBackgroundStyle(rewardResult.item.assetUrl)} />
                  )
                ) : (
                  <Gift className="w-16 h-16 text-white" />
                )}
              </div>
              <h3 className={cn(
                "text-xl font-bold mb-1",
                rewardResult.type === 'item' && rewardResult.item?.rarity === 'legendary' ? "text-yellow-400" :
                rewardResult.type === 'item' && rewardResult.item?.rarity === 'epic' ? "text-purple-400" :
                "text-white"
              )}>
                {rewardResult.type === 'coins' ? `${rewardResult.amount} Coins` : rewardResult.item?.name}
              </h3>
              {rewardResult.type === 'item' && rewardResult.item && (
                <p className="text-sm text-muted-foreground uppercase tracking-widest">{rewardResult.item.rarity}</p>
              )}
            </div>
          )}
          <Button onClick={() => setRewardResult(null)}>Awesome!</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
interface RewardCardProps {
  type: string;
  label?: string;
  icon?: React.ElementType;
  unlocked: boolean;
  locked?: boolean;
  claimed?: boolean;
  onClick: () => void;
  isPremiumTrack?: boolean;
  disabled?: boolean;
}
function RewardCard({ type, label, icon: Icon, unlocked, locked, claimed, onClick, isPremiumTrack, disabled }: RewardCardProps) {
  const DisplayIcon = Icon || (type === 'box' ? Box : (type === 'coins' ? Coins : Gift));
  return (
    <motion.button
      whileHover={!claimed && !locked && !disabled ? { scale: 1.05 } : {}}
      whileTap={!claimed && !locked && !disabled ? { scale: 0.95 } : {}}
      onClick={!claimed && !locked && !disabled ? onClick : undefined}
      disabled={disabled || claimed || (locked && !isPremiumTrack)} // Allow clicking locked premium to trigger upgrade toast
      className={cn(
        "relative w-20 h-20 rounded-xl flex flex-col items-center justify-center gap-1 border-2 transition-all overflow-hidden",
        unlocked
          ? (isPremiumTrack ? "bg-yellow-500/10 border-yellow-500/30 hover:bg-yellow-500/20" : "bg-indigo-500/10 border-indigo-500/30 hover:bg-indigo-500/20")
          : "bg-zinc-900 border-white/5 opacity-60 grayscale",
        locked && "opacity-40",
        claimed && "opacity-50 grayscale border-emerald-500/50"
      )}
    >
      {locked && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
          <Lock className="w-6 h-6 text-white/50" />
        </div>
      )}
      {claimed && !locked && (
        <div className="absolute top-1 right-1 z-10">
          <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
            <Check className="w-2.5 h-2.5 text-white" />
          </div>
        </div>
      )}
      <DisplayIcon className={cn(
        "w-8 h-8",
        isPremiumTrack ? "text-yellow-400" : "text-indigo-400"
      )} />
      {label && (
        <span className="text-[9px] font-bold text-center leading-tight px-1 truncate w-full text-white/80">
          {label}
        </span>
      )}
    </motion.button>
  );
}