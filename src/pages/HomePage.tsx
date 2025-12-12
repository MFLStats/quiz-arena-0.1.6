import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, Sparkles, ArrowRight, Calendar, Loader2, HelpCircle, Timer, Users, Megaphone, Flame, Gift, CheckCircle, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AppLayout } from '@/components/layout/AppLayout';
import { api } from '@/lib/api-client';
import { useGameStore } from '@/lib/game-store';
import { useAuthStore } from '@/lib/auth-store';
import { toast } from 'sonner';
import { HowToPlayModal } from '@/components/game/HowToPlayModal';
import { JoinGameModal } from '@/components/game/JoinGameModal';
import { QueueModal } from '@/components/game/QueueModal';
import { useCategories } from '@/hooks/use-categories';
import type { SystemConfig, SystemStats } from '@shared/types';
import { playSfx } from '@/lib/sound-fx';
import { CATEGORY_ICONS } from '@/lib/icons';
// Season Timer Component
function SeasonTimer({ endDate }: { endDate?: string }) {
  const [timeLeft, setTimeLeft] = useState('');
  useEffect(() => {
    // Set target date to 14 days from now (simulated season end) if not provided
    const targetDate = endDate ? new Date(endDate) : new Date();
    if (!endDate) targetDate.setDate(targetDate.getDate() + 14);
    const calculateTimeLeft = () => {
      const now = new Date();
      const difference = targetDate.getTime() - now.getTime();
      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((difference / 1000 / 60) % 60);
        return `${days}d ${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m`;
      }
      return 'Season Ending Soon';
    };
    // Initial set
    setTimeLeft(calculateTimeLeft());
    // Update every minute
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 60000);
    return () => clearInterval(timer);
  }, [endDate]);
  return (
    <span className="font-mono font-bold tracking-wide">{timeLeft}</span>
  );
}
export function HomePage() {
  const navigate = useNavigate();
  const initMatch = useGameStore(s => s.initMatch);
  const user = useAuthStore(s => s.user);
  const { categories, loading: categoriesLoading } = useCategories();
  const [isStartingDaily, setIsStartingDaily] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showJoinGame, setShowJoinGame] = useState(false);
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [stats, setStats] = useState<SystemStats | null>(null);
  // Queue Logic State
  const [queueState, setQueueState] = useState<{ categoryId: string; categoryName: string; matchFound?: boolean } | null>(null);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const pollIntervalRef = useRef<number | null>(null);
  useEffect(() => {
    api<SystemConfig>('/api/config').then(setConfig).catch(console.error);
    api<SystemStats>('/api/stats').then(setStats).catch(console.error);
  }, []);
  // Onboarding Effect: Show How to Play for new users
  useEffect(() => {
    if (user && (user.stats?.matches === 0 || !user.stats)) {
      const hasSeenIntro = sessionStorage.getItem('hasSeenIntro');
      if (!hasSeenIntro) {
        setShowHowToPlay(true);
        sessionStorage.setItem('hasSeenIntro', 'true');
      }
    }
  }, [user]);
  // --- Queue Logic (Duplicated from CategorySelectPage for direct access) ---
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
      // Join Ranked Queue
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
    } catch (err) {
      toast.error('Failed to join. Please try again.');
      console.error(err);
    } finally {
      setJoiningId(null);
    }
  }, [user, startMatch, startPolling]);
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
    return () => stopPolling();
  }, [stopPolling]);
  // --- Daily Challenge ---
  const handleDailyChallenge = async () => {
    if (isStartingDaily || !user) return;
    setIsStartingDaily(true);
    try {
      const match = await api<any>('/api/daily/start', {
        method: 'POST',
        body: JSON.stringify({ userId: user.id })
      });
      initMatch(match);
      navigate(`/arena/${match.id}`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to start Daily Challenge');
      setIsStartingDaily(false);
    }
  };
  // Streak Calculation
  const streak = user?.loginStreak || 0;
  const streakProgress = ((streak % 7) / 7) * 100;
  const today = new Date().toISOString().split('T')[0];
  const isClaimedToday = user?.lastLogin === today;
  return (
    <AppLayout>
      <div className="min-h-screen flex flex-col">
        {/* MOTD Banner */}
        {config?.motd && (
          <div className="bg-indigo-600/20 border-b border-indigo-500/20 text-indigo-200 px-4 py-2 text-center text-sm font-medium backdrop-blur-md flex items-center justify-center gap-2 animate-in slide-in-from-top duration-500">
            <Megaphone className="w-4 h-4 animate-pulse" />
            {config.motd}
          </div>
        )}
        {/* Hero Section */}
        <section className="relative py-12 md:py-24 overflow-hidden">
          {/* Animated Background - Darker & Subtler */}
          <div className="absolute inset-0 bg-background">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-indigo-600/10 blur-[120px] rounded-full animate-pulse" />
            <div className="absolute bottom-0 right-0 w-[800px] h-[600px] bg-purple-600/5 blur-[100px] rounded-full" />
          </div>
          {/* How to Play Trigger */}
          <div className="absolute top-4 right-4 md:top-8 md:right-8 z-20">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-white hover:bg-white/10 gap-2"
              onClick={() => setShowHowToPlay(true)}
            >
              <HelpCircle className="w-4 h-4" />
              <span className="hidden sm:inline">How to Play</span>
            </Button>
          </div>
          <div className="relative z-10 container mx-auto px-4 text-center space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/5 border border-indigo-500/10 text-sm font-medium text-indigo-300 mb-6 md:mb-8 backdrop-blur-md shadow-[0_0_20px_rgba(99,102,241,0.1)]"
              >
                <Timer className="w-4 h-4 text-yellow-400 animate-pulse" />
                <span className="text-white/90 mr-1">Season Ends In:</span>
                <SeasonTimer endDate={config?.seasonEndDate} />
              </motion.div>
              <h1 className="text-4xl sm:text-6xl md:text-8xl lg:text-9xl font-display font-bold tracking-tight text-white mb-4 md:mb-6 drop-shadow-2xl">
                Quiz <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 animate-gradient-x">Arena</span>
              </h1>
              <p className="text-base sm:text-lg md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed font-light px-4">
                The ultimate real-time PvP quiz battle. <br className="hidden md:block" />
                Prove your intellect, climb the ranks, and claim glory.
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 md:gap-6 pt-4 md:pt-8 px-4"
            >
              <Link to="/categories" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto h-14 md:h-16 px-10 text-lg md:text-xl rounded-full bg-white text-black hover:bg-indigo-50 hover:scale-105 transition-all duration-300 shadow-[0_0_40px_rgba(255,255,255,0.2)] font-bold">
                  <Play className="w-6 h-6 mr-2 fill-current" /> Play Now
                </Button>
              </Link>
              <div className="flex gap-4 w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="lg"
                  className="flex-1 sm:flex-none h-14 md:h-16 px-6 text-lg rounded-full border-white/10 bg-white/[0.03] hover:bg-white/[0.08] hover:border-white/20 backdrop-blur-sm transition-all duration-300"
                  onClick={handleDailyChallenge}
                  disabled={isStartingDaily}
                >
                  {isStartingDaily ? (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    <Calendar className="w-5 h-5 mr-2" />
                  )}
                  Daily
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="flex-1 sm:flex-none h-14 md:h-16 px-6 text-lg rounded-full border-white/10 bg-white/[0.03] hover:bg-white/[0.08] hover:border-white/20 backdrop-blur-sm transition-all duration-300"
                  onClick={() => setShowJoinGame(true)}
                >
                  <Users className="w-5 h-5 mr-2" />
                  Join Party
                </Button>
              </div>
            </motion.div>
            {/* Live Stats */}
            {stats && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="flex justify-center gap-8 pt-8 text-sm text-muted-foreground"
              >
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-400" />
                  <span className="font-bold text-white">{stats.userCount}</span> Players
                </div>
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-white">{stats.questionCount}</span> Questions
                </div>
              </motion.div>
            )}
          </div>
        </section>
        {/* Daily Streak Dashboard (Logged In Only) */}
        {user && (
          <section className="container mx-auto px-4 mb-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-orange-900/20 to-red-900/20 p-6 md:p-8 backdrop-blur-md shadow-xl"
            >
              <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1485546246426-74dc88dec4d9?q=80&w=2069&auto=format&fit=crop')] bg-cover bg-center opacity-5 mix-blend-overlay" />
              <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 shadow-lg shadow-orange-500/20">
                    <Flame className="w-8 h-8 text-white fill-white animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                      {streak} Day Streak
                      {streak >= 3 && <span className="text-xs bg-orange-500/20 text-orange-300 px-2 py-0.5 rounded-full border border-orange-500/30">On Fire!</span>}
                    </h3>
                    <p className="text-orange-200/70 text-sm">
                      Keep playing daily to earn bonus XP and Coins!
                    </p>
                  </div>
                </div>
                <div className="flex-1 w-full md:max-w-md space-y-2">
                  <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-orange-200/60">
                    <span>Weekly Bonus</span>
                    <span>{streak % 7} / 7 Days</span>
                  </div>
                  <div className="relative h-3 bg-black/40 rounded-full overflow-hidden border border-white/5">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${streakProgress}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="absolute top-0 left-0 h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-black/20 px-4 py-2 rounded-xl border border-white/5">
                  {isClaimedToday ? (
                    <>
                      <CheckCircle className="w-5 h-5 text-emerald-400" />
                      <div className="text-left">
                        <div className="text-xs text-muted-foreground uppercase font-bold">Today</div>
                        <div className="text-sm font-bold text-emerald-400">Claimed</div>
                      </div>
                    </>
                  ) : (
                    <>
                      <Gift className="w-5 h-5 text-yellow-400 animate-bounce" />
                      <div className="text-left">
                        <div className="text-xs text-muted-foreground uppercase font-bold">Today</div>
                        <div className="text-sm font-bold text-yellow-400">Pending</div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </section>
        )}
        {/* Featured Categories */}
        <section className="py-12 md:py-20 container mx-auto px-4 relative z-10">
          <div className="flex items-center justify-between mb-6 md:mb-10">
            <h2 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
              <Sparkles className="w-6 h-6 md:w-8 md:h-8 text-yellow-400 fill-yellow-400" /> Newest Categories
            </h2>
            <Link to="/categories" className="group text-sm font-medium text-muted-foreground hover:text-white flex items-center gap-2 transition-colors">
              View All <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
          {categoriesLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8">
              {categories.slice().reverse().slice(0, 3).map((cat, i) => {
                const Icon = CATEGORY_ICONS[cat.icon] || CATEGORY_ICONS.Atom;
                // Calculate user-specific Elo for this category, fallback to base Elo
                const userElo = user?.categoryElo?.[cat.id] ?? cat.baseElo;
                const isJoining = joiningId === cat.id;
                return (
                  <motion.div
                    key={cat.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + (i * 0.1) }}
                    className="group relative overflow-hidden rounded-3xl bg-white/[0.03] border border-white/10 p-6 md:p-8 hover:bg-white/[0.08] transition-all duration-500 cursor-pointer hover:-translate-y-2 hover:shadow-[0_10px_40px_rgba(0,0,0,0.5)]"
                    onClick={() => !isJoining && handleJoinQueue(cat.id, cat.name)}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${cat.color} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />
                    {/* Play Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20 backdrop-blur-[2px]">
                      <div className="bg-white text-black px-6 py-3 rounded-full font-bold flex items-center gap-2 transform scale-90 group-hover:scale-100 transition-transform">
                        {isJoining ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5 fill-current" />}
                        {isJoining ? 'Joining...' : 'Play Now'}
                      </div>
                    </div>
                    <div className="relative z-10">
                      <div className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-br ${cat.color} flex items-center justify-center mb-4 md:mb-6 shadow-lg group-hover:scale-110 transition-transform duration-500`}>
                        <Icon className="w-6 h-6 md:w-7 md:h-7 text-white" />
                      </div>
                      <h3 className="text-xl md:text-2xl font-bold mb-2 md:mb-3 group-hover:text-white transition-colors">{cat.name}</h3>
                      <p className="text-sm md:text-base text-muted-foreground mb-4 md:mb-6 leading-relaxed">{cat.description}</p>
                      <div className="flex items-center justify-start pt-4 border-t border-white/5">
                        <span className="text-indigo-300 font-mono text-xs md:text-sm bg-indigo-500/10 px-2 py-1 rounded">Elo {userElo}</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </section>
      </div>
      <HowToPlayModal
        isOpen={showHowToPlay}
        onOpenChange={setShowHowToPlay}
      />
      <JoinGameModal
        isOpen={showJoinGame}
        onOpenChange={setShowJoinGame}
      />
      <QueueModal
        isOpen={!!queueState}
        onCancel={handleCancelQueue}
        categoryName={queueState?.categoryName || ''}
        matchFound={queueState?.matchFound}
      />
    </AppLayout>
  );
}