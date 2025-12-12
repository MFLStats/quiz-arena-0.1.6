import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Trophy,
  TrendingUp,
  Swords,
  History,
  Edit2,
  Crown,
  UserPlus,
  Users,
  Check,
  Loader2,
  Shield,
  Zap,
  Star,
  MapPin,
  Target,
  Medal,
  Flame,
  Coins,
  Calendar,
  Lock,
  Palette,
  Image as ImageIcon,
  LayoutTemplate,
  User as UserIcon,
  Wand2,
  Share2,
  Activity,
  Search
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn, getFlagEmoji } from '@/lib/utils';
import type { User, Category, MatchHistoryItem, UpdateUserRequest, UserAchievement, ShopItem } from '@shared/types';
import { getLevelFromXp } from '@shared/progression';
import { ACHIEVEMENTS } from '@shared/achievements';
import { COUNTRIES } from '@shared/constants';
import { AvatarCreator } from './AvatarCreator';
import { toast } from 'sonner';
import { eachDayOfInterval, subDays, format, isSameDay, startOfWeek, endOfWeek } from 'date-fns';
import { api } from '@/lib/api-client';
// --- Icon Map ---
const ICON_MAP: Record<string, React.ElementType> = {
  Swords, Zap, Target, Shield, Coins, Flame, Users, Calendar
};
// --- Profile Banner ---
interface ProfileBannerProps {
  user: User;
  isOwnProfile: boolean;
  onUpdate: (data: UpdateUserRequest) => Promise<void>;
  onAddFriend?: () => Promise<void>;
  isFriend?: boolean;
  shopItems: ShopItem[];
}
export function ProfileBanner({ user, isOwnProfile, onUpdate, onAddFriend, isFriend, shopItems }: ProfileBannerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showCreator, setShowCreator] = useState(false);
  const [showAvatarDialog, setShowAvatarDialog] = useState(false);
  const [isAddingFriend, setIsAddingFriend] = useState(false);
  // Form State
  const [name, setName] = useState(user.name);
  const [country, setCountry] = useState(user.country || 'US');
  const [avatar, setAvatar] = useState(user.avatar);
  const [frame, setFrame] = useState(user.frame);
  const [banner, setBanner] = useState(user.banner);
  const [title, setTitle] = useState(user.title);
  // Reset state when dialog opens
  useEffect(() => {
    if (isEditing) {
      setName(user.name);
      setCountry(user.country || 'US');
      setAvatar(user.avatar);
      setFrame(user.frame);
      setBanner(user.banner);
      setTitle(user.title);
      setShowCreator(false);
    }
  }, [isEditing, user]);
  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdate({
        name,
        country,
        avatar,
        frame,
        banner,
        title
      });
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };
  const handleQuickAvatarSave = async (url: string) => {
    setIsSaving(true);
    try {
      await onUpdate({ avatar: url });
      setShowAvatarDialog(false);
    } finally {
      setIsSaving(false);
    }
  };
  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast.success("Profile link copied!");
  };
  const handleFriendAction = async () => {
    if (!onAddFriend) return;
    setIsAddingFriend(true);
    try {
      await onAddFriend();
    } finally {
      setIsAddingFriend(false);
    }
  };
  // Filter owned items
  const ownedItems = shopItems.filter(item => user.inventory?.includes(item.id));
  const ownedAvatars = ownedItems.filter(i => i.type === 'avatar');
  const ownedFrames = ownedItems.filter(i => i.type === 'frame');
  const ownedBanners = ownedItems.filter(i => i.type === 'banner');
  const ownedTitles = ownedItems.filter(i => i.type === 'title');
  // Use shared progression logic
  const { level, currentLevelXp, nextLevelXp, progressPercent } = getLevelFromXp(user.xp || 0);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-[2rem] bg-zinc-900 border border-white/10 shadow-2xl group"
    >
      {/* Banner Background */}
      <div className="absolute inset-0 h-56 md:h-80 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-60 transition-transform duration-1000 group-hover:scale-105"
          style={{
            backgroundImage: user.banner ? `url(${user.banner})` : undefined,
            background: user.banner && user.banner.startsWith('linear') ? user.banner : undefined
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-zinc-900/80 to-zinc-900" />
      </div>
      <div className="relative z-10 pt-40 md:pt-56 px-6 pb-6 md:px-10 md:pb-10 flex flex-col md:flex-row items-center md:items-end gap-6 md:gap-8">
        {/* Avatar Group */}
        <div className="relative shrink-0">
          <div className="absolute -inset-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full blur-lg opacity-50 group-hover:opacity-75 transition duration-500" />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-full p-1.5 bg-zinc-900 ring-4 ring-zinc-900/50 cursor-help">
                  <Avatar className="w-full h-full border-2 border-white/10">
                    <AvatarImage src={user.avatar} className="object-cover" />
                    <AvatarFallback className="text-4xl font-bold bg-zinc-800 text-white">
                      {user.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {/* Frame Overlay (if it were an image) */}
                  {user.frame && user.frame.startsWith('http') && (
                     <img src={user.frame} className="absolute inset-0 w-full h-full pointer-events-none" />
                  )}
                  {/* CSS Frame Fallback */}
                  {user.frame && !user.frame.startsWith('http') && (
                     <div className={cn("absolute inset-0 rounded-full pointer-events-none z-20", user.frame)} />
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent className="bg-zinc-900 border-white/10 text-xs font-medium">
                Vector SVG • 1:1 Aspect Ratio
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {/* Quick Edit Button */}
          {isOwnProfile && (
            <div className="absolute bottom-0 right-0 z-20 translate-x-1/4 translate-y-1/4">
              <Button
                size="icon"
                className="h-10 w-10 rounded-full bg-indigo-600 hover:bg-indigo-500 border-4 border-zinc-900 shadow-lg transition-transform hover:scale-110"
                onClick={() => setShowAvatarDialog(true)}
                title="Customize Avatar"
              >
                <Wand2 className="w-4 h-4 text-white" />
              </Button>
            </div>
          )}
          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-zinc-900 text-white font-bold px-4 py-1 rounded-full text-sm shadow-xl border border-white/10 flex items-center gap-1.5 whitespace-nowrap z-10">
            <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
            LVL {level}
          </div>
        </div>
        {/* User Info */}
        <div className="flex-1 w-full text-center md:text-left space-y-3 pb-2">
          <div className="flex flex-col md:flex-row items-center gap-3 md:gap-4">
            <h1 className="text-3xl md:text-5xl font-display font-bold text-white tracking-tight drop-shadow-lg">
              {user.name}
            </h1>
            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button
                size="icon"
                variant="ghost"
                className="h-9 w-9 rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white backdrop-blur-sm border border-white/5"
                onClick={handleShare}
                title="Share Profile"
              >
                <Share2 className="w-4 h-4" />
              </Button>
              {isOwnProfile ? (
                <Dialog open={isEditing} onOpenChange={setIsEditing}>
                  <DialogTrigger asChild>
                    <Button size="icon" variant="ghost" className="h-9 w-9 rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white backdrop-blur-sm border border-white/5">
                      <Edit2 className="w-4 h-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-zinc-950 border-white/10 max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                      <DialogTitle>Edit Profile</DialogTitle>
                      <DialogDescription>Customize your identity and appearance.</DialogDescription>
                    </DialogHeader>
                    <Tabs defaultValue="identity" className="flex-1 overflow-hidden flex flex-col mt-4">
                      <TabsList className="grid w-full grid-cols-2 bg-white/5">
                        <TabsTrigger value="identity">Identity</TabsTrigger>
                        <TabsTrigger value="appearance">Appearance</TabsTrigger>
                      </TabsList>
                      {/* IDENTITY TAB */}
                      <TabsContent value="identity" className="flex-1 space-y-6 py-4">
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label>Display Name</Label>
                            <Input
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                              className="bg-black/20 border-white/10"
                              placeholder="Enter your name"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Country</Label>
                            <Select value={country} onValueChange={setCountry}>
                              <SelectTrigger className="bg-black/20 border-white/10">
                                <SelectValue placeholder="Select a country" />
                              </SelectTrigger>
                              <SelectContent className="bg-zinc-900 border-white/10 max-h-[300px]">
                                {COUNTRIES.map((c) => (
                                  <SelectItem key={c.code} value={c.code}>
                                    <span className="mr-2 text-lg">{c.flag}</span> {c.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Title</Label>
                            <Select value={title || "none"} onValueChange={(val) => setTitle(val === "none" ? undefined : val)}>
                              <SelectTrigger className="bg-black/20 border-white/10">
                                <SelectValue placeholder="Select a title" />
                              </SelectTrigger>
                              <SelectContent className="bg-zinc-900 border-white/10">
                                <SelectItem value="none">None</SelectItem>
                                {ownedTitles.map((t) => (
                                  <SelectItem key={t.id} value={t.name}>
                                    {t.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </TabsContent>
                      {/* APPEARANCE TAB */}
                      <TabsContent value="appearance" className="flex-1 overflow-hidden flex flex-col py-4">
                        {showCreator ? (
                          <AvatarCreator
                            initialUrl={avatar}
                            onSave={(url) => {
                              setAvatar(url);
                              setShowCreator(false);
                            }}
                            onCancel={() => setShowCreator(false)}
                          />
                        ) : (
                          <ScrollArea className="flex-1 pr-4">
                            <div className="space-y-8">
                              {/* Avatars */}
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <Label className="flex items-center gap-2"><UserIcon className="w-4 h-4" /> Avatars</Label>
                                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setShowCreator(true)}>
                                    <Wand2 className="w-3 h-3" /> Create New
                                  </Button>
                                </div>
                                <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                                  {/* Current/Default Option if not in owned list */}
                                  <button
                                    onClick={() => setAvatar(user.avatar)}
                                    className={cn(
                                      "aspect-square rounded-xl overflow-hidden border-2 transition-all",
                                      avatar === user.avatar && !ownedAvatars.find(a => a.assetUrl === user.avatar)
                                        ? "border-indigo-500 ring-2 ring-indigo-500/30"
                                        : "border-white/10 hover:border-white/30"
                                    )}
                                  >
                                    <img src={user.avatar} className="w-full h-full object-cover" alt="Current" />
                                  </button>
                                  {ownedAvatars.map((item) => (
                                    <button
                                      key={item.id}
                                      onClick={() => setAvatar(item.assetUrl)}
                                      className={cn(
                                        "aspect-square rounded-xl overflow-hidden border-2 transition-all relative",
                                        avatar === item.assetUrl ? "border-indigo-500 ring-2 ring-indigo-500/30" : "border-white/10 hover:border-white/30"
                                      )}
                                    >
                                      <img src={item.assetUrl} className="w-full h-full object-cover" alt={item.name} />
                                      {avatar === item.assetUrl && (
                                        <div className="absolute inset-0 bg-indigo-500/20 flex items-center justify-center">
                                          <Check className="w-6 h-6 text-white drop-shadow-md" />
                                        </div>
                                      )}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              {/* Frames */}
                              <div className="space-y-3">
                                <Label className="flex items-center gap-2"><LayoutTemplate className="w-4 h-4" /> Frames</Label>
                                <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                                  <button
                                    onClick={() => setFrame(undefined)}
                                    className={cn(
                                      "aspect-square rounded-xl border-2 transition-all flex items-center justify-center bg-white/5",
                                      !frame ? "border-indigo-500 ring-2 ring-indigo-500/30" : "border-white/10 hover:border-white/30"
                                    )}
                                  >
                                    <span className="text-xs text-muted-foreground">None</span>
                                  </button>
                                  {ownedFrames.map((item) => (
                                    <button
                                      key={item.id}
                                      onClick={() => setFrame(item.assetUrl)}
                                      className={cn(
                                        "aspect-square rounded-xl border-2 transition-all relative flex items-center justify-center bg-zinc-900",
                                        frame === item.assetUrl ? "border-indigo-500 ring-2 ring-indigo-500/30" : "border-white/10 hover:border-white/30"
                                      )}
                                    >
                                      <div className={cn("w-12 h-12 rounded-full", item.assetUrl)} />
                                      {frame === item.assetUrl && (
                                        <div className="absolute inset-0 bg-indigo-500/20 flex items-center justify-center rounded-xl">
                                          <Check className="w-6 h-6 text-white drop-shadow-md" />
                                        </div>
                                      )}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              {/* Banners */}
                              <div className="space-y-3">
                                <Label className="flex items-center gap-2"><Palette className="w-4 h-4" /> Banners</Label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                  {ownedBanners.map((item) => (
                                    <button
                                      key={item.id}
                                      onClick={() => setBanner(item.assetUrl)}
                                      className={cn(
                                        "h-20 rounded-xl border-2 transition-all relative overflow-hidden",
                                        banner === item.assetUrl ? "border-indigo-500 ring-2 ring-indigo-500/30" : "border-white/10 hover:border-white/30"
                                      )}
                                    >
                                      <div
                                        className="absolute inset-0"
                                        style={{ background: item.assetUrl }}
                                      />
                                      {banner === item.assetUrl && (
                                        <div className="absolute inset-0 bg-indigo-500/20 flex items-center justify-center">
                                          <Check className="w-6 h-6 text-white drop-shadow-md" />
                                        </div>
                                      )}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </ScrollArea>
                        )}
                      </TabsContent>
                    </Tabs>
                    <DialogFooter className="mt-4">
                      {!showCreator && (
                        <>
                          <Button variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
                          <Button onClick={handleSave} disabled={isSaving}>
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
                          </Button>
                        </>
                      )}
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              ) : (
                // Public Profile Actions
                <>
                  {!isFriend ? (
                    <Button
                      size="sm"
                      className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2"
                      onClick={handleFriendAction}
                      disabled={isAddingFriend}
                    >
                      {isAddingFriend ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                      Add Friend
                    </Button>
                  ) : (
                    <Link to="/categories?mode=private">
                      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2">
                        <Swords className="w-4 h-4" />
                        Challenge
                      </Button>
                    </Link>
                  )}
                </>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-sm font-medium text-white/70">
            {user.title && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.1)]">
                <Crown className="w-3.5 h-3.5 fill-amber-400" />
                {user.title}
              </span>
            )}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(user.id);
                      toast.success("User ID copied to clipboard!");
                    }}
                    className="flex items-center gap-1.5 bg-white/5 px-3 py-1 rounded-full border border-white/5 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                    title="Click to copy full ID"
                  >
                    <Shield className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="font-mono">ID: {user.id.substring(0, 8)}</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent className="bg-zinc-900 border-white/10 text-xs">
                  Click to copy full ID
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <span className="flex items-center gap-1.5 bg-white/5 px-3 py-1 rounded-full border border-white/5">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              {getFlagEmoji(user.country)} {user.country || 'Global'}
            </span>
          </div>
          {/* Level Progress Bar */}
          <div className="w-full max-w-md mx-auto md:mx-0 pt-2">
            <div className="flex justify-between text-[10px] uppercase tracking-wider font-bold text-white/40 mb-1.5">
              <span>XP {currentLevelXp} / {nextLevelXp}</span>
              <span>{progressPercent}%</span>
            </div>
            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-1000"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
        {/* Elo Badge */}
        <div className="hidden md:flex flex-col items-end justify-center pb-2 shrink-0">
          <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Current Rating</div>
          <div className="text-6xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-br from-white via-white to-white/50 drop-shadow-2xl tracking-tighter">
            {user.elo}
          </div>
        </div>
      </div>
      {/* NEW: Dedicated Avatar Dialog */}
      <Dialog open={showAvatarDialog} onOpenChange={setShowAvatarDialog}>
        <DialogContent className="bg-zinc-950 border-white/10 max-w-md h-[80vh] flex flex-col">
            <DialogHeader>
                <DialogTitle>Customize Avatar</DialogTitle>
                <DialogDescription>Design your unique digital identity.</DialogDescription>
            </DialogHeader>
            <div className="flex-1 min-h-0 overflow-hidden">
                <AvatarCreator
                    initialUrl={user.avatar}
                    onSave={handleQuickAvatarSave}
                    onCancel={() => setShowAvatarDialog(false)}
                />
            </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
// --- Stat Grid ---
interface StatGridProps {
  user: User;
}
export function StatGrid({ user }: StatGridProps) {
  const stats = user.stats || { wins: 0, losses: 0, matches: 0 };
  const winRate = stats.matches > 0 ? Math.round((stats.wins / stats.matches) * 100) : 0;
  const items = [
    {
      label: 'Win Rate',
      value: `${winRate}%`,
      subtext: `${stats.wins}W - ${stats.losses}L`,
      icon: Trophy,
      color: 'text-yellow-400',
      bg: 'bg-yellow-400/10',
      border: 'border-yellow-400/20'
    },
    {
      label: 'Total Matches',
      value: stats.matches,
      subtext: 'Arena Veteran',
      icon: Swords,
      color: 'text-indigo-400',
      bg: 'bg-indigo-400/10',
      border: 'border-indigo-400/20'
    },
    {
      label: 'Login Streak',
      value: user.loginStreak || 0,
      subtext: 'Daily Active',
      icon: Flame,
      color: 'text-orange-400',
      bg: 'bg-orange-400/10',
      border: 'border-orange-400/20'
    },
    {
      label: 'Total XP',
      value: (user.xp || 0).toLocaleString(),
      subtext: 'Lifetime Points',
      icon: Target,
      color: 'text-emerald-400',
      bg: 'bg-emerald-400/10',
      border: 'border-emerald-400/20'
    }
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {items.map((item, i) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 + (i * 0.1) }}
          className={cn(
            "relative overflow-hidden rounded-2xl border p-5 bg-zinc-900/50 backdrop-blur-sm hover:bg-zinc-900/80 transition-colors group",
            item.border
          )}
        >
          <div className="flex flex-col h-full justify-between">
            <div className="flex justify-between items-start mb-4">
              <div className={cn("p-2.5 rounded-xl", item.bg)}>
                <item.icon className={cn("w-5 h-5", item.color)} />
              </div>
            </div>
            <div>
              <h3 className="text-3xl font-bold text-white tracking-tight mb-0.5">{item.value}</h3>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{item.label}</p>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
// --- Activity Heatmap ---
interface ActivityHeatmapProps {
  activityMap?: Record<string, number>;
}
export function ActivityHeatmap({ activityMap = {} }: ActivityHeatmapProps) {
  // Generate last 90 days
  const today = new Date();
  const days = eachDayOfInterval({
    start: subDays(today, 90),
    end: today
  });
  const getColor = (count: number) => {
    if (count === 0) return "bg-white/5";
    if (count <= 2) return "bg-indigo-900/60";
    if (count <= 5) return "bg-indigo-600/80";
    return "bg-indigo-400";
  };
  return (
    <Card className="bg-zinc-900/50 border-white/10 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Activity className="w-5 h-5 text-indigo-400" />
          Activity Log
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-1 justify-center md:justify-start">
          <TooltipProvider>
            {days.map((day) => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const count = activityMap[dateStr] || 0;
              return (
                <Tooltip key={dateStr}>
                  <TooltipTrigger asChild>
                    <div
                      className={cn(
                        "w-3 h-3 md:w-4 md:h-4 rounded-sm transition-colors hover:ring-1 hover:ring-white/50",
                        getColor(count)
                      )}
                    />
                  </TooltipTrigger>
                  <TooltipContent className="bg-zinc-900 border-white/10 text-xs">
                    <span className="font-bold text-white">{count} matches</span> on {format(day, 'MMM d, yyyy')}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </TooltipProvider>
        </div>
        <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground justify-end">
          <span>Less</span>
          <div className="flex gap-1">
            <div className="w-3 h-3 rounded-sm bg-white/5" />
            <div className="w-3 h-3 rounded-sm bg-indigo-900/60" />
            <div className="w-3 h-3 rounded-sm bg-indigo-600/80" />
            <div className="w-3 h-3 rounded-sm bg-indigo-400" />
          </div>
          <span>More</span>
        </div>
      </CardContent>
    </Card>
  );
}
// --- Topic Mastery ---
interface TopicMasteryProps {
  categories: Category[];
  categoryElo?: Record<string, number>;
}
export function TopicMastery({ categories, categoryElo = {} }: TopicMasteryProps) {
  return (
    <Card className="bg-zinc-900/50 border-white/10 backdrop-blur-sm h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Zap className="w-5 h-5 text-indigo-400" />
          Topic Mastery
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {categories.map((cat, i) => {
          const elo = categoryElo[cat.id] ?? 1200;
          // FIXED: Map base Elo (1200) to Level 1.
          // Formula: Level 1 for Elo <= 1299. Level 2 for 1300+.
          const adjustedElo = Math.max(1200, elo);
          const level = Math.floor((adjustedElo - 1200) / 100) + 1;
          const progress = (adjustedElo - 1200) % 100; // 0-99 progress to next level
          return (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + (i * 0.05) }}
              className="group relative p-4 rounded-2xl bg-black/20 border border-white/5 hover:border-indigo-500/30 hover:bg-white/5 transition-all overflow-hidden"
            >
              <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${cat.color} opacity-[0.05] rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:opacity-10 transition-opacity`} />
              <div className="flex items-center gap-4 relative z-10">
                {/* Circular Progress */}
                <div className="relative w-14 h-14 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="28"
                      cy="28"
                      r="24"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="transparent"
                      className="text-white/5"
                    />
                    <circle
                      cx="28"
                      cy="28"
                      r="24"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="transparent"
                      strokeDasharray={2 * Math.PI * 24}
                      strokeDashoffset={2 * Math.PI * 24 * (1 - progress / 100)}
                      strokeLinecap="round"
                      className="text-indigo-500 transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center font-bold text-sm text-white">
                    {level}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <h4 className="font-bold text-white truncate group-hover:text-indigo-300 transition-colors">{cat.name}</h4>
                    <span className="text-xs font-mono text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">
                      {elo}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {progress}% to Level {level + 1}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </CardContent>
    </Card>
  );
}
// --- Achievements Grid ---
interface AchievementsGridProps {
  userAchievements: UserAchievement[];
}
export function AchievementsGrid({ userAchievements }: AchievementsGridProps) {
  const unlockedIds = new Set(userAchievements.map(a => a.achievementId));
  return (
    <Card className="bg-zinc-900/50 border-white/10 backdrop-blur-sm h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Medal className="w-5 h-5 text-yellow-400" />
          Achievements
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          <TooltipProvider>
            {ACHIEVEMENTS.map((achievement, i) => {
              const isUnlocked = unlockedIds.has(achievement.id);
              const Icon = ICON_MAP[achievement.icon] || Trophy;
              return (
                <Tooltip key={achievement.id}>
                  <TooltipTrigger asChild>
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.1 + (i * 0.05) }}
                      className={cn(
                        "aspect-square rounded-xl flex flex-col items-center justify-center p-3 text-center border transition-all duration-300 group cursor-default",
                        isUnlocked
                          ? "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
                          : "bg-black/20 border-white/5 opacity-50 grayscale"
                      )}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-transform group-hover:scale-110",
                        isUnlocked
                          ? achievement.rarity === 'legendary' ? "bg-yellow-500/20 text-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.3)]" :
                            achievement.rarity === 'epic' ? "bg-purple-500/20 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.3)]" :
                            achievement.rarity === 'rare' ? "bg-blue-500/20 text-blue-400" :
                            "bg-white/10 text-white"
                          : "bg-white/5 text-white/30"
                      )}>
                        {isUnlocked ? <Icon className="w-5 h-5" /> : <Lock className="w-4 h-4" />}
                      </div>
                      <div className="text-xs font-bold truncate w-full px-1">
                        {achievement.name}
                      </div>
                    </motion.div>
                  </TooltipTrigger>
                  <TooltipContent className="bg-zinc-900 border-white/10 text-white">
                    <p className="font-bold mb-1">{achievement.name}</p>
                    <p className="text-xs text-muted-foreground">{achievement.description}</p>
                    {!isUnlocked && <p className="text-[10px] text-red-400 mt-1 uppercase font-bold">Locked</p>}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </TooltipProvider>
        </div>
      </CardContent>
    </Card>
  );
}
// --- Match History List ---
interface MatchHistoryListProps {
  history: MatchHistoryItem[];
}
export function MatchHistoryList({ history }: MatchHistoryListProps) {
  return (
    <Card className="bg-zinc-900/50 border-white/10 backdrop-blur-sm h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <History className="w-5 h-5 text-indigo-400" />
          Recent Matches
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {history.length > 0 ? (
          history.slice(0, 8).map((match, i) => (
            <Link
              // CRITICAL FIX: Use composite key to prevent collisions if matchId is duplicated in mock data
              key={`${match.matchId}-${i}`}
              to={`/results/${match.matchId}`}
              className="block"
            >
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + (i * 0.05) }}
                className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5 hover:bg-white/5 hover:border-white/10 transition-all group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs border",
                    match.result === 'win' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                    match.result === 'draw' ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" :
                    "bg-rose-500/10 text-rose-400 border-rose-500/20"
                  )}>
                    {match.result === 'win' ? 'W' : match.result === 'draw' ? 'D' : 'L'}
                  </div>
                  <div>
                    <div className="font-medium text-sm text-white group-hover:text-indigo-300 transition-colors">{match.opponentName}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {new Date(match.timestamp).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-mono font-bold">
                    <span className={match.result === 'win' ? "text-emerald-400" : "text-white/70"}>{match.score}</span>
                    <span className="text-muted-foreground mx-1">-</span>
                    <span className={match.result === 'loss' ? "text-rose-400" : "text-white/70"}>{match.opponentScore}</span>
                  </div>
                  <div className="text-[10px] font-bold text-muted-foreground">
                    {match.eloChange > 0 ? '+' : ''}{match.eloChange} Elo
                  </div>
                </div>
              </motion.div>
            </Link>
          ))
        ) : (
          <div className="text-center py-8 text-muted-foreground text-sm border border-dashed border-white/10 rounded-lg">
            No matches played yet.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
// --- Friends List ---
interface FriendsListProps {
  friends: User[];
  onAddFriend: (id: string) => Promise<void>;
}
export function FriendsList({ friends, onAddFriend }: FriendsListProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Partial<User>[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  // CRITICAL FIX: Deduplicate friends list to prevent key collisions
  const uniqueFriends = useMemo(() => {
    const map = new Map();
    friends.forEach(f => map.set(f.id, f));
    return Array.from(map.values());
  }, [friends]);
  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.length >= 2) {
        setIsSearching(true);
        try {
          const results = await api<Partial<User>[]>(`/api/users/search?query=${encodeURIComponent(searchQuery)}`);
          // Filter out existing friends and self (handled by backend usually but good to double check if we had current user ID)
          const friendIds = new Set(friends.map(f => f.id));
          setSearchResults(results.filter(u => u.id && !friendIds.has(u.id)));
        } catch (e) {
          console.error("Search failed", e);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, friends]);
  const handleAdd = async (friendId: string) => {
    if (!friendId) return;
    setIsAdding(true);
    try {
      await onAddFriend(friendId);
      setSearchQuery('');
      setSearchResults([]);
      setIsOpen(false);
    } finally {
      setIsAdding(false);
    }
  };
  return (
    <Card className="bg-zinc-900/50 border-white/10 backdrop-blur-sm mt-6">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-xl">
          <Users className="w-5 h-5 text-indigo-400" />
          Friends
        </CardTitle>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full hover:bg-white/10">
              <UserPlus className="w-4 h-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-zinc-950 border-white/10">
            <DialogHeader>
              <DialogTitle>Add Friend</DialogTitle>
              <DialogDescription>Search for players by name to connect.</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search users..."
                  className="pl-9 bg-black/20 border-white/10"
                />
              </div>
              <ScrollArea className="h-[200px] rounded-md border border-white/5 bg-black/20 p-2">
                {isSearching ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="space-y-2">
                    {searchResults.map(user => (
                      <div key={user.id} className="flex items-center justify-between p-2 rounded hover:bg-white/5 transition-colors">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8 border border-white/10">
                            <AvatarImage src={user.avatar} />
                            <AvatarFallback>{user.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="text-sm font-medium text-white">{user.name}</div>
                            <div className="text-xs text-muted-foreground">Lvl {user.level} • {getFlagEmoji(user.country)}</div>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => user.id && handleAdd(user.id)}
                          disabled={isAdding}
                        >
                          <UserPlus className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : searchQuery.length >= 2 ? (
                  <div className="text-center py-4 text-muted-foreground text-sm">No users found.</div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground text-sm">Type to search...</div>
                )}
              </ScrollArea>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-2">
        {uniqueFriends.length > 0 ? (
          uniqueFriends.map(friend => (
            <div key={friend.id} className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5 hover:bg-white/5 transition-colors group">
              <Link to={`/profile/${friend.id}`} className="flex items-center gap-3 flex-1">
                <div className="relative">
                  <Avatar className="w-9 h-9 border border-white/10">
                    <AvatarImage src={friend.avatar} />
                    <AvatarFallback>{friend.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-zinc-900" />
                </div>
                <div>
                  <div className="font-medium text-sm text-white group-hover:text-indigo-300 transition-colors">{friend.name}</div>
                  <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                    {getFlagEmoji(friend.country)} {friend.elo} Elo
                  </div>
                </div>
              </Link>
              <Link to="/categories?mode=private">
                <Button size="icon" variant="ghost" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-indigo-500/20 hover:text-indigo-400" title="Challenge Friend">
                  <Swords className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
          ))
        ) : (
          <div className="text-center py-6 text-muted-foreground text-xs border border-dashed border-white/10 rounded-lg">
            No friends added yet.
          </div>
        )}
      </CardContent>
    </Card>
  );
}