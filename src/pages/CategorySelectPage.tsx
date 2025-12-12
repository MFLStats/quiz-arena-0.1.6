import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Zap, Loader2, Flame, Clock, Play, Swords, Target } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { AppLayout } from '@/components/layout/AppLayout';
import { api } from '@/lib/api-client';
import { useGameStore } from '@/lib/game-store';
import { useAuthStore } from '@/lib/auth-store';
import { toast } from 'sonner';
import { QueueModal } from '@/components/game/QueueModal';
import type { Category, MatchState } from '@shared/types';
import { useCategories } from '@/hooks/use-categories';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { playSfx } from '@/lib/sound-fx';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CategoryTile } from '@/components/CategoryTile';
import { GlassCard } from '@/components/ui/glass-card';
interface CategorySectionProps {
  title: string;
  categories: Category[];
  joiningId: string | null;
  onJoin: (id: string, name: string) => void;
  userRatings?: Record<string, number>;
  gameMode: 'ranked' | 'private' | 'practice';
}
function CategorySection({ title, categories, joiningId, onJoin, userRatings, gameMode }: CategorySectionProps) {
  if (categories.length === 0) return null;
  const getBadge = (cat: Category) => {
    if (cat.isFeatured) return { text: 'Hot', color: 'bg-red-500 text-white', icon: Flame };
    if (cat.id === 'flags') return { text: 'New', color: 'bg-blue-500 text-white', icon: Clock };
    return undefined;
  };
  return (
    <div className="mb-8">
      <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2 mb-4 px-1">
        <span className="w-1 h-5 bg-indigo-500 rounded-full" />
        {title}
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6">
        <AnimatePresence mode="popLayout">
          {categories.map((cat, i) => (
            <motion.div
              key={cat.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ delay: i * 0.03 }}
            >
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <CategoryTile
                      cat={cat}
                      index={i}
                      isJoining={joiningId === cat.id}
                      onJoin={onJoin}
                      userElo={userRatings?.[cat.id]}
                      gameMode={gameMode === 'practice' ? 'ranked' : gameMode} // Reuse ranked style for practice
                      badge={getBadge(cat)}
                    />
                  </TooltipTrigger>
                  <TooltipContent className="bg-zinc-900 border-white/10 text-xs max-w-[200px]">
                    <p className="font-bold mb-1">{cat.name}</p>
                    <p className="text-muted-foreground">{cat.description}</p>
                    <div className="mt-2 pt-2 border-t border-white/10 flex justify-between">
                      <span>Base Elo: {cat.baseElo}</span>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
export function CategorySelectPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get('mode') === 'private' ? 'private' : 'ranked';
  const [search, setSearch] = useState('');
  const [queueState, setQueueState] = useState<{ categoryId: string; categoryName: string; matchFound?: boolean } | null>(null);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [gameMode, setGameMode] = useState<'ranked' | 'private' | 'practice'>(initialMode);
  const pollIntervalRef = useRef<number | null>(null);
  const initMatch = useGameStore(s => s.initMatch);
  const user = useAuthStore(s => s.user);
  const { categories, loading: categoriesLoading } = useCategories();
  const filtered = useMemo(() => {
    return categories.filter(c =>
      c.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [categories, search]);
  const featuredCategory = useMemo(() => {
    return categories.find(c => c.isFeatured) || categories[0];
  }, [categories]);
  const groupedCategories = useMemo(() => ({
    'General': categories.filter(c => c.group === 'General'),
    'Education': categories.filter(c => c.group === 'Education'),
    'TV & Movies': categories.filter(c => c.group === 'TV & Movies'),
    'Sports': categories.filter(c => c.group === 'Sports'),
  }), [categories]);
  const startMatch = useCallback(async (matchId: string) => {
    try {
      const match = await api<any>(`/api/match/${matchId}`);
      initMatch(match);
      setQueueState(null);
      navigate(`/arena/${matchId}`);
    } catch (err) {
      toast.error('Failed to load match details');
      console.error(err);
      setQueueState(null);
    }
  }, [initMatch, navigate]);
  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      window.clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);
  const startPolling = useCallback((categoryId: string) => {
    if (!user) return;
    if (pollIntervalRef.current) {
      window.clearInterval(pollIntervalRef.current);
    }
    pollIntervalRef.current = window.setInterval(async () => {
      try {
        const res = await api<{ matchId: string | null }>(`/api/queue/status?userId=${user.id}&categoryId=${categoryId}`);
        if (res.matchId) {
          stopPolling();
          setQueueState(prev => prev ? { ...prev, matchFound: true } : null);
          playSfx('match_found');
          setTimeout(() => {
            startMatch(res.matchId!);
          }, 1500);
        }
      } catch (err) {
        console.error("Polling error", err);
      }
    }, 2000);
  }, [user, startMatch, stopPolling]);
  const handleJoinQueue = useCallback(async (categoryId: string, categoryName: string) => {
    if (!user) {
      toast.error("Please log in to enter the arena");
      return;
    }
    setJoiningId(categoryId);
    try {
      if (gameMode === 'private') {
        const match = await api<MatchState>('/api/match/private/create', {
          method: 'POST',
          body: JSON.stringify({ userId: user.id, categoryId })
        });
        initMatch(match);
        navigate(`/arena/${match.id}`);
      } else if (gameMode === 'practice') {
        const match = await api<MatchState>('/api/match/start', {
          method: 'POST',
          body: JSON.stringify({ userId: user.id, categoryId, mode: 'practice' })
        });
        initMatch(match);
        navigate(`/arena/${match.id}`);
      } else {
        const res = await api<{ matchId: string | null }>('/api/queue/join', {
          method: 'POST',
          body: JSON.stringify({ userId: user.id, categoryId })
        });
        if (res.matchId) {
          await startMatch(res.matchId);
        } else {
          setQueueState({ categoryId, categoryName });
          startPolling(categoryId);
        }
      }
    } catch (err) {
      toast.error('Failed to join. Please try again.');
      console.error(err);
    } finally {
      setJoiningId(null);
    }
  }, [user, gameMode, initMatch, navigate, startMatch, startPolling]);
  const handleCancelQueue = useCallback(async () => {
    stopPolling();
    const catId = queueState?.categoryId;
    setQueueState(null);
    if (user && catId) {
      try {
        await api('/api/queue/leave', {
          method: 'POST',
          body: JSON.stringify({ userId: user.id, categoryId: catId })
        });
      } catch (e) {
        console.error("Failed to leave queue", e);
      }
    }
  }, [queueState, stopPolling, user]);
  useEffect(() => {
    if (categoriesLoading) return;
    const state = location.state as { autoJoin?: boolean; categoryId?: string; mode?: 'ranked' | 'private' | 'practice' } | null;
    if (state?.autoJoin && state?.categoryId) {
      const cat = categories.find(c => c.id === state.categoryId);
      const catName = cat?.name || 'Unknown Category';
      const toastId = toast.loading(`Joining ${catName}...`);
      navigate(location.pathname, { replace: true, state: {} });
      handleJoinQueue(state.categoryId, catName).then(() => {
          toast.dismiss(toastId);
      }).catch(() => {
          toast.dismiss(toastId);
      });
    }
  }, [categoriesLoading, location.state, categories, navigate, handleJoinQueue, location.pathname]);
  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);
  if (categoriesLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
        </div>
      </AppLayout>
    );
  }
  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-screen">
        {/* Compact Header */}
        <div className="flex flex-col gap-4 mb-8">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl md:text-3xl font-display font-bold text-white tracking-tight">
              Play
            </h1>
            <Tabs value={gameMode} onValueChange={(v: any) => setGameMode(v)}>
              <TabsList className="bg-white/5 border border-white/10 p-0.5 h-9 rounded-full">
                <TabsTrigger value="ranked" className="rounded-full px-3 text-xs data-[state=active]:bg-indigo-600 data-[state=active]:text-white gap-1.5">
                  <Swords className="w-3 h-3" /> Ranked
                </TabsTrigger>
                <TabsTrigger value="private" className="rounded-full px-3 text-xs data-[state=active]:bg-emerald-600 data-[state=active]:text-white gap-1.5">
                  <Zap className="w-3 h-3" /> Private
                </TabsTrigger>
                <TabsTrigger value="practice" className="rounded-full px-3 text-xs data-[state=active]:bg-amber-600 data-[state=active]:text-white gap-1.5">
                  <Target className="w-3 h-3" /> Practice
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className="relative w-full">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <Search className="w-4 h-4 text-muted-foreground" />
            </div>
            <Input
              placeholder="Search categories..."
              className="pl-10 h-10 bg-white/5 border-white/10 focus:border-indigo-500/50 focus:ring-indigo-500/20 transition-all rounded-xl text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        {/* Featured Banner (Compact) */}
        {!search && featuredCategory && (
          <GlassCard
            variant="interactive"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-8 relative p-6 group cursor-pointer bg-gradient-to-br from-indigo-900/20 to-purple-900/20"
            onClick={() => handleJoinQueue(featuredCategory.id, featuredCategory.name)}
          >
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1635070041078-e363dbe005cb?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-10 group-hover:scale-105 transition-transform duration-700" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-transparent" />
            <div className="relative z-10 flex items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[10px] font-bold uppercase tracking-wider mb-2">
                  <Zap className="w-3 h-3 fill-current" /> Featured
                </div>
                <h2 className="text-xl font-bold text-white leading-tight">{featuredCategory.name}</h2>
                <p className="text-sm text-gray-400 mt-1 line-clamp-1">
                  {featuredCategory.description}
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-white text-black flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                {joiningId === featuredCategory.id ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Play className="w-5 h-5 fill-current ml-0.5" />
                )}
              </div>
            </div>
          </GlassCard>
        )}
        {/* Content Area */}
        {search ? (
          <div className="space-y-6">
             <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Search className="w-4 h-4" />
              Results
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6">
              <AnimatePresence mode="popLayout">
                {filtered.map((cat, i) => (
                  <motion.div
                    key={cat.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <CategoryTile
                            cat={cat}
                            index={i}
                            isJoining={joiningId === cat.id}
                            onJoin={handleJoinQueue}
                            userElo={user?.categoryElo?.[cat.id]}
                            gameMode={gameMode === 'practice' ? 'ranked' : gameMode}
                          />
                        </TooltipTrigger>
                        <TooltipContent className="bg-zinc-900 border-white/10 text-xs">
                          {cat.description}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            {filtered.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-sm">No categories found matching "{search}"</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <CategorySection
              title="General Knowledge"
              categories={groupedCategories['General']}
              joiningId={joiningId}
              onJoin={handleJoinQueue}
              userRatings={user?.categoryElo}
              gameMode={gameMode}
            />
            <CategorySection
              title="Education & Science"
              categories={groupedCategories['Education']}
              joiningId={joiningId}
              onJoin={handleJoinQueue}
              userRatings={user?.categoryElo}
              gameMode={gameMode}
            />
            <CategorySection
              title="Entertainment"
              categories={groupedCategories['TV & Movies']}
              joiningId={joiningId}
              onJoin={handleJoinQueue}
              userRatings={user?.categoryElo}
              gameMode={gameMode}
            />
             {groupedCategories['Sports'].length > 0 && (
              <CategorySection
                title="Sports"
                categories={groupedCategories['Sports']}
                joiningId={joiningId}
                onJoin={handleJoinQueue}
                userRatings={user?.categoryElo}
                gameMode={gameMode}
              />
            )}
          </div>
        )}
        <QueueModal
          isOpen={!!queueState}
          onCancel={handleCancelQueue}
          categoryName={queueState?.categoryName || ''}
          matchFound={queueState?.matchFound}
        />
      </div>
    </AppLayout>
  );
}