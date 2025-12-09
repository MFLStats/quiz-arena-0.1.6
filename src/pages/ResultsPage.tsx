import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trophy, Home, RotateCcw, Activity, Share2, Loader2, Star, Coins, ArrowUpCircle, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGameStore } from '@/lib/game-store';
import { useAuthStore } from '@/lib/auth-store';
import { api } from '@/lib/api-client';
import { playSfx } from '@/lib/sound-fx';
import { toast } from 'sonner';
import type { GameResult, MatchState, User } from '@shared/types';
import confetti from 'canvas-confetti';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
export function ResultsPage() {
  const { matchId } = useParams();
  const user = useAuthStore(s => s.user);
  const storeResult = useGameStore(s => s.gameResult);
  const [result, setResult] = useState<GameResult | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const loadData = async () => {
      // 1. Use store result if available and matches current ID (immediate post-game)
      if (storeResult && storeResult.matchId === matchId) {
        setResult(storeResult);
        setLoading(false);
        if (storeResult.won) {
            playSfx('win');
            triggerConfetti();
        } else {
            playSfx('lose');
        }
        if (storeResult.levelUp) {
            setTimeout(() => triggerLevelUpConfetti(), 1000);
        }
        return;
      }
      // 2. Otherwise fetch from API (archive view)
      if (!user || !matchId) return;
      try {
        const [match, userData] = await Promise.all([
          api<MatchState>(`/api/match/${matchId}`),
          api<User>(`/api/users/${user.id}`)
        ]);
        const myStats = match.players[user.id];
        if (!myStats) throw new Error("You were not in this match");
        const opponentId = Object.keys(match.players).find(id => id !== user.id);
        const opponentStats = opponentId ? match.players[opponentId] : null;
        const historyItem = userData.history?.find(h => h.matchId === matchId);
        // Reconstruct result for archive view
        const reconstructed: GameResult = {
          matchId: match.id,
          won: historyItem ? historyItem.result === 'win' : myStats.score > (opponentStats?.score || 0),
          score: myStats.score,
          opponentScore: opponentStats?.score || 0,
          eloChange: historyItem?.eloChange || 0,
          newElo: userData.elo,
          reactionTimes: myStats.answers.map((a, i) => ({
            question: i + 1,
            time: a.timeMs
          })),
          xpEarned: 0,
          coinsEarned: 0,
          xpBreakdown: [],
          coinsBreakdown: [],
          isPrivate: match.isPrivate,
          categoryId: match.categoryId // Added for Play Again
        };
        setResult(reconstructed);
      } catch (err) {
        console.error(err);
        toast.error("Could not load match results");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [matchId, user, storeResult]);
  const triggerConfetti = () => {
    const duration = 3000;
    const end = Date.now() + duration;
    (function frame() {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#6366f1', '#8b5cf6', '#ec4899']
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#6366f1', '#8b5cf6', '#ec4899']
      });
      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    }());
  };
  const triggerLevelUpConfetti = () => {
      confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#fbbf24', '#f59e0b', '#d97706']
      });
  };
  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast.success("Result link copied to clipboard!");
  };
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }
  if (!result) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 gap-4">
        <h2 className="text-xl font-bold text-white">Match not found</h2>
        <Link to="/">
          <Button>Return Home</Button>
        </Link>
      </div>
    );
  }
  const chartData = result.reactionTimes?.map(rt => ({
    question: `Q${rt.question}`,
    time: (rt.time / 1000).toFixed(1),
  })) || [];
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/20 via-background to-background pointer-events-none" />
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative z-10 max-w-4xl w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-12 text-center shadow-2xl overflow-y-auto max-h-[90vh]"
      >
        {/* Level Up Celebration */}
        {result.levelUp && (
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            className="absolute top-4 left-4 z-20 bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold px-4 py-2 rounded-full shadow-lg flex items-center gap-2"
          >
            <ArrowUpCircle className="w-6 h-6 animate-bounce" />
            LEVEL UP! {result.newLevel}
          </motion.div>
        )}
        {/* Header */}
        <div className="mb-8 relative">
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0 text-muted-foreground hover:text-white"
            onClick={handleShare}
            title="Share Result"
          >
            <Share2 className="w-5 h-5" />
          </Button>
          <motion.div
            initial={{ y: -20 }}
            animate={{ y: 0 }}
            className="inline-flex p-4 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 shadow-lg mb-6"
          >
            <Trophy className="w-12 h-12 text-white" />
          </motion.div>
          <h1 className="text-4xl md:text-6xl font-display font-bold mb-2 text-white">
            {result.won ? "Victory!" : result.eloChange === 0 ? "Draw" : "Defeat"}
          </h1>
          <div className="flex items-center justify-center gap-2">
            <p className="text-xl text-muted-foreground">
              {result.won ? "You dominated the arena!" : "Better luck next time."}
            </p>
            {result.isPrivate && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                <Lock className="w-3 h-3" /> Private
              </span>
            )}
          </div>
        </div>
        {/* Rewards Grid */}
        {(result.xpEarned > 0 || result.coinsEarned > 0) && (
          <div className="grid grid-cols-2 gap-4 mb-8 max-w-lg mx-auto">
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 flex flex-col items-center"
            >
              <div className="flex items-center gap-2 text-indigo-300 mb-1">
                <Star className="w-4 h-4 fill-indigo-300" /> XP Gained
              </div>
              <div className="text-3xl font-bold text-white">+{result.xpEarned}</div>
              <div className="text-xs text-muted-foreground mt-2 space-y-1">
                {result.xpBreakdown.map((item, i) => (
                  <div key={i} className="flex justify-between w-full gap-4">
                    <span>{item.source}</span>
                    <span>+{item.amount}</span>
                  </div>
                ))}
              </div>
            </motion.div>
            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 flex flex-col items-center"
            >
              <div className="flex items-center gap-2 text-yellow-300 mb-1">
                <Coins className="w-4 h-4 fill-yellow-300" /> Coins Earned
              </div>
              <div className="text-3xl font-bold text-white">+{result.coinsEarned}</div>
              <div className="text-xs text-muted-foreground mt-2 space-y-1">
                {result.coinsBreakdown.map((item, i) => (
                  <div key={i} className="flex justify-between w-full gap-4">
                    <span>{item.source}</span>
                    <span>+{item.amount}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
        {/* Score Comparison */}
        <div className="grid grid-cols-2 gap-8 mb-12">
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
            <div className="text-sm text-muted-foreground uppercase tracking-wider mb-2">You</div>
            <div className="text-4xl font-bold text-white">{result.score}</div>
          </div>
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
            <div className="text-sm text-muted-foreground uppercase tracking-wider mb-2">Opponent</div>
            <div className="text-4xl font-bold text-white">{result.opponentScore}</div>
          </div>
        </div>
        {/* Reaction Time Chart */}
        {chartData.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center justify-center gap-2 mb-4 text-muted-foreground">
              <Activity className="w-4 h-4" />
              <span className="text-sm font-medium uppercase tracking-wider">Reaction Speed (Seconds)</span>
            </div>
            <div className="h-64 w-full bg-black/20 rounded-xl p-4 border border-white/5">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorTime" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  <XAxis
                    dataKey="question"
                    stroke="#ffffff50"
                    tick={{fill: '#ffffff50', fontSize: 12}}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#ffffff50"
                    tick={{fill: '#ffffff50', fontSize: 12}}
                    tickLine={false}
                    axisLine={false}
                    unit="s"
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #ffffff20', borderRadius: '8px' }}
                    itemStyle={{ color: '#fff' }}
                    labelStyle={{ color: '#a1a1aa' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="time"
                    stroke="#818cf8"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorTime)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
        {/* Elo Change */}
        <div className="mb-12">
          <div className="text-sm text-muted-foreground mb-2">Rating Update</div>
          <div className="flex items-center justify-center gap-3">
            <span className="text-3xl font-bold text-white">{result.newElo}</span>
            <span className={result.eloChange > 0 ? "text-emerald-400" : result.eloChange < 0 ? "text-rose-400" : "text-yellow-400"}>
              ({result.eloChange > 0 ? "+" : ""}{result.eloChange})
            </span>
          </div>
        </div>
        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/categories" state={{ autoJoin: true, mode: result.isPrivate ? 'private' : 'ranked', categoryId: result.categoryId }}>
            <Button size="lg" className="w-full sm:w-auto h-12 px-8 rounded-full bg-white text-black hover:bg-gray-100 font-bold">
              <RotateCcw className="w-4 h-4 mr-2" /> Play Again
            </Button>
          </Link>
          <Link to="/">
            <Button variant="outline" size="lg" className="w-full sm:w-auto h-12 px-8 rounded-full border-white/10 hover:bg-white/5">
              <Home className="w-4 h-4 mr-2" /> Home
            </Button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}