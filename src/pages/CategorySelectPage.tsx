import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Sparkles, Zap, ArrowRight, Loader2, ChevronDown, ChevronUp, Swords, Lock, Atom, Flame, Star, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AppLayout } from '@/components/layout/AppLayout';
import { api } from '@/lib/api-client';
import { useGameStore } from '@/lib/game-store';
import { useAuthStore } from '@/lib/auth-store';
import { toast } from 'sonner';
import { QueueModal } from '@/components/game/QueueModal';
import { cn } from '@/lib/utils';
import type { Category, MatchState } from '@shared/types';
import { useCategories } from '@/hooks/use-categories';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { playSfx } from '@/lib/sound-fx';
import { CATEGORY_ICONS } from '@/lib/icons';
interface CategoryCardProps {
  cat: Category;
  userRating?: number;
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
// Fixed: Wrapped in forwardRef to support AnimatePresence
const CategoryCard = React.forwardRef<HTMLDivElement, CategoryCardProps>(
  ({ cat, userRating, isJoining, onJoin, index, gameMode, badge }, ref) => {
    const Icon = CATEGORY_ICONS[cat.icon] || Atom;
    return (
      <motion.div
        ref={ref}
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ delay: index * 0.05 }}
        className="group relative h-full"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="relative h-full flex flex-col bg-black/40 border border-white/[0.05] hover:border-white/20 backdrop-blur-sm rounded-3xl p-6 transition-all duration-300 hover:-translate-y-1 overflow-hidden">
          {/* Background Gradient */}
          <div className={`absolute top-0 right-0 w-64 h-64 bg-gradient-to-br ${cat.color} opacity-[0.03] rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:opacity-10 transition-opacity duration-500`} />
          {/* Badge */}
          {badge && (
            <div className={cn(
              "absolute top-4 right-4 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-lg z-20 border",
              badge.color
            )}>
              <badge.icon className="w-3 h-3" />
              {badge.text}
            </div>
          )}
          <div className="flex items-start justify-between mb-6 relative z-10">
            <div className={`p-3.5 rounded-2xl bg-gradient-to-br ${cat.color} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
              <Icon className="w-6 h-6 text-white" />
            </div>
            <div className="text-right">
              <span className="block text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">
                {userRating ? 'Your Rating' : 'Base Rating'}
              </span>
              <span className={cn(
                "text-xl font-bold font-mono",
                userRating ? "text-indigo-300" : "text-white"
              )}>
                {userRating || cat.baseElo}
              </span>
            </div>
          </div>
          <div className="flex-grow relative z-10">
            <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-indigo-300 transition-colors">{cat.name}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{cat.description}</p>
          </div>
          <div className="mt-8 pt-6 border-t border-white/5 relative z-10">
            <Button
              className={cn(
                "w-full h-12 text-base font-semibold rounded-xl transition-all duration-300",
                "bg-white/5 text-white hover:bg-white hover:text-black border border-white/10 hover:border-transparent",
                "group-hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]"
              )}
              onClick={() => onJoin(cat.id, cat.name)}
              disabled={isJoining}
            >
              {isJoining ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  {gameMode === 'ranked' ? 'Joining...' : 'Creating...'}
                </>
              ) : (
                <>
                  {gameMode === 'ranked' ? 'Play Ranked' : 'Create Lobby'}
                </>
              )}
            </Button>
          </div>
        </div>
      </motion.div>
    );
  }
);
CategoryCard.displayName = "CategoryCard";
interface CategorySectionProps {
  title: string;
  categories: Category[];
  joiningId: string | null;
  onJoin: (id: string, name: string) => void;
  userRatings?: Record<string, number>;
  gameMode: 'ranked' | 'private';
}
function CategorySection({ title, categories, joiningId, onJoin, userRatings, gameMode }: CategorySectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const displayCategories = isExpanded ? categories : categories.slice(0, 3);
  const hasMore = categories.length > 3;
  if (categories.length === 0) return null;
  const getBadge = (cat: Category) => {
    if (cat.isFeatured) return { text: 'Hot', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: Flame };
    if (cat.id === 'flags') return { text: 'New', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: Clock };
    if (cat.id === 'science' || cat.id === 'history') return { text: 'Popular', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', icon: Star };
    return undefined;
  };
  return (
    <div className="mb-12">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <span className="w-1.5 h-6 bg-indigo-500 rounded-full" />
          {title}
        </h2>
        {hasMore && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-muted-foreground hover:text-white"
          >
            {isExpanded ? (
              <>Show Less <ChevronUp className="ml-2 w-4 h-4" /></>
            ) : (
              <>See All <ChevronDown className="ml-2 w-4 h-4" /></>
            )}
          </Button>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {displayCategories.map((cat, i) => (
            <CategoryCard
              key={cat.id}
              cat={cat}
              index={i}
              isJoining={joiningId === cat.id}
              onJoin={onJoin}
              userRating={userRatings?.[cat.id]}
              gameMode={gameMode}
              badge={getBadge(cat)}
            />
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
  const [gameMode, setGameMode] = useState<'ranked' | 'private'>(initialMode);
  const pollIntervalRef = useRef<number | null>(null);
  const initMatch = useGameStore(s => s.initMatch);
  const user = useAuthStore(s => s.user);
  const { categories, loading: categoriesLoading } = useCategories();
  // Memoize filtered categories to prevent unnecessary re-renders
  const filtered = useMemo(() => {
    return categories.filter(c =>
      c.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [categories, search]);
  // Prioritize featured category, fallback to first in list
  const featuredCategory = useMemo(() => {
    return categories.find(c => c.isFeatured) || categories[0];
  }, [categories]);
  // Group categories
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
          // Show success state
          setQueueState(prev => prev ? { ...prev, matchFound: true } : null);
          playSfx('match_found');
          // Delay navigation to show the success animation
          setTimeout(() => {
            startMatch(res.matchId!);
          }, 1500);
        }
      } catch (err) {
        console.error("Polling error", err);
      }
    }, 2000); // Poll every 2 seconds
  }, [user, startMatch, stopPolling]);
  const handleJoinQueue = useCallback(async (categoryId: string, categoryName: string) => {
    if (!user) {
      toast.error("Please log in to enter the arena");
      return;
    }
    setJoiningId(categoryId);
    try {
      if (gameMode === 'private') {
        // Create Private Lobby
        const match = await api<MatchState>('/api/match/private/create', {
          method: 'POST',
          body: JSON.stringify({ userId: user.id, categoryId })
        });
        initMatch(match);
        navigate(`/arena/${match.id}`);
      } else {
        // Join Ranked Queue
        const res = await api<{ matchId: string | null }>('/api/queue/join', {
          method: 'POST',
          body: JSON.stringify({ userId: user.id, categoryId })
        });
        if (res.matchId) {
          // Instant match found
          await startMatch(res.matchId);
        } else {
          // Start polling and show modal
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
  // Auto-join effect
  useEffect(() => {
    if (categoriesLoading) return;
    const state = location.state as { autoJoin?: boolean; categoryId?: string; mode?: 'ranked' | 'private' } | null;
    if (state?.autoJoin && state?.categoryId) {
      const cat = categories.find(c => c.id === state.categoryId);
      const catName = cat?.name || 'Unknown Category';
      // Show feedback
      const toastId = toast.loading(`Joining ${catName}...`);
      // Clear state to prevent loop on back navigation
      navigate(location.pathname, { replace: true, state: {} });
      // Trigger join
      handleJoinQueue(state.categoryId, catName).then(() => {
          toast.dismiss(toastId);
      }).catch(() => {
          toast.dismiss(toastId);
      });
    }
  }, [categoriesLoading, location.state, categories, navigate, handleJoinQueue, location.pathname]);
  // Cleanup on unmount
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
      <div className="container mx-auto px-4 py-8 min-h-screen">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row items-end justify-between gap-6 mb-12">
          <div className="space-y-2">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 text-indigo-400 font-medium"
            >
              <Sparkles className="w-4 h-4" />
              <span>Choose Your Battleground</span>
            </motion.div>
            <h1 className="text-4xl md:text-5xl font-display font-bold text-white tracking-tight">
              Category Nexus
            </h1>
            <p className="text-muted-foreground max-w-lg text-lg">
              Select a knowledge domain to compete in.
            </p>
          </div>
          <div className="flex flex-col items-end gap-4 w-full md:w-auto">
            {/* Game Mode Toggle */}
            <Tabs value={gameMode} onValueChange={(v: any) => setGameMode(v)} className="w-full md:w-auto">
              <TabsList className="bg-white/5 border border-white/10 p-1 rounded-full w-full md:w-auto">
                <TabsTrigger value="ranked" className="rounded-full px-6 data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                  <Swords className="w-4 h-4 mr-2" /> Ranked
                </TabsTrigger>
                <TabsTrigger value="private" className="rounded-full px-6 data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
                  <Lock className="w-4 h-4 mr-2" /> Private
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="relative w-full md:w-80">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <Search className="w-4 h-4 text-muted-foreground" />
              </div>
              <Input
                placeholder="Search categories..."
                className="pl-10 h-12 bg-white/5 border-white/10 focus:border-indigo-500/50 focus:ring-indigo-500/20 transition-all rounded-xl"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>
        {/* Featured / Quick Play */}
        {!search && featuredCategory && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-12 relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-900/20 to-purple-900/20 p-8 md:p-12 group cursor-pointer"
            onClick={() => handleJoinQueue(featuredCategory.id, featuredCategory.name)}
          >
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1635070041078-e363dbe005cb?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-10 group-hover:scale-105 transition-transform duration-700" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-transparent" />
            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm font-medium">
                  <Zap className="w-3 h-3 fill-current" /> Featured Event
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-white">{featuredCategory.name} Championship</h2>
                <p className="text-lg text-gray-300 max-w-xl">
                  {featuredCategory.description || `Compete in ${featuredCategory.name} to earn exclusive badges and climb the seasonal leaderboard faster.`}
                </p>
              </div>
              <Button
                size="lg"
                className="h-14 px-8 text-lg rounded-full bg-white text-black hover:bg-indigo-50 shadow-[0_0_30px_rgba(255,255,255,0.1)] group-hover:shadow-[0_0_50px_rgba(255,255,255,0.2)] transition-all"
                disabled={joiningId === featuredCategory.id}
              >
                {joiningId === featuredCategory.id ? (
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                ) : (
                  <ArrowRight className="w-5 h-5 mr-2" />
                )}
                {gameMode === 'ranked' ? 'Enter Arena' : 'Create Lobby'}
              </Button>
            </div>
          </motion.div>
        )}
        {/* Content Area */}
        {search ? (
          // Search Results View
          <div className="space-y-8">
             <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Search className="w-5 h-5 text-indigo-400" />
              Search Results
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence>
                {filtered.map((cat, i) => (
                  <CategoryCard
                    key={cat.id}
                    cat={cat}
                    index={i}
                    isJoining={joiningId === cat.id}
                    onJoin={handleJoinQueue}
                    userRating={user?.categoryElo?.[cat.id]}
                    gameMode={gameMode}
                    badge={cat.isFeatured ? { text: 'Hot', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: Flame } : undefined}
                  />
                ))}
              </AnimatePresence>
            </div>
            {filtered.length === 0 && (
              <div className="text-center py-20">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/5 mb-4">
                  <Search className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">No categories found</h3>
                <p className="text-muted-foreground">Try adjusting your search terms</p>
              </div>
            )}
          </div>
        ) : (
          // Grouped View
          <div className="space-y-4">
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