import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/lib/game-store';
import { useAuthStore } from '@/lib/auth-store';
import { api } from '@/lib/api-client';
import { TimerCircle, AnswerButton, ScoreBadge, OpponentAvatar, EmotePicker, EmoteFloater, RoundIntermission } from '@/components/game/GameComponents';
import { MatchLoadingScreen } from '@/components/game/MatchLoadingScreen';
import { toast } from 'sonner';
import { Loader2, Check, AlertTriangle, Flame, Flag, Zap } from 'lucide-react';
import { cn, getFlagEmoji, getBackgroundStyle, calculateStreak } from '@/lib/utils';
import type { FinishMatchResponse, MatchState, ReportReason } from '@shared/types';
import { useIsMobile } from '@/hooks/use-mobile';
import { playSfx } from '@/lib/sound-fx';
import { triggerHaptic } from '@/lib/haptics';
import { useInterval } from '@/hooks/use-interval';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import confetti from 'canvas-confetti';
export function ArenaPage() {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);
  const isMobile = useIsMobile();
  // Selectors
  const questions = useGameStore(s => s.questions);
  const currentIndex = useGameStore(s => s.currentQuestionIndex);
  const myScore = useGameStore(s => s.myScore);
  const opponentScore = useGameStore(s => s.opponentScore);
  const isLocked = useGameStore(s => s.isAnswerLocked);
  const lastCorrect = useGameStore(s => s.lastAnswerCorrect);
  const gameStatus = useGameStore(s => s.status);
  const roomCode = useGameStore(s => s.code);
  const isPrivate = useGameStore(s => s.isPrivate);
  const opponentLastEmote = useGameStore(s => s.opponentLastEmote);
  // Actions
  const initMatch = useGameStore(s => s.initMatch);
  const selectAnswer = useGameStore(s => s.selectAnswer);
  const lockAnswer = useGameStore(s => s.lockAnswer);
  const finishMatch = useGameStore(s => s.finishMatch);
  const syncOpponentState = useGameStore(s => s.syncOpponentState);
  // Local State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittingIndex, setSubmittingIndex] = useState<number | null>(null);
  const [showIntro, setShowIntro] = useState(true);
  const [matchData, setMatchData] = useState<MatchState | null>(null);
  const [streak, setStreak] = useState(0);
  const [now, setNow] = useState(Date.now());
  // Race Condition Guard
  const isFinishingRef = useRef(false);
  // Report State
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState<ReportReason>('other');
  const [isReporting, setIsReporting] = useState(false);
  const currentQuestion = questions[currentIndex];
  const isFinalRound = questions.length > 0 && currentIndex === questions.length - 1;
  // Derived Opponent Stats (Moved up to avoid conditional hook execution)
  const opponentId = matchData && user ? Object.keys(matchData.players).find(id => id !== user.id) : null;
  const opponentStats = opponentId && matchData ? matchData.players[opponentId] : null;
  const opponentName = matchData?.mode === 'daily' ? 'The House' : (opponentStats?.name || 'Opponent');
  const opponentCountry = opponentStats?.country;
  const opponentElo = opponentStats?.elo;
  const opponentTitle = opponentStats?.title;
  const opponentDisplayTitle = opponentStats?.displayTitle;
  const opponentStreak = opponentStats?.answers ? calculateStreak(opponentStats.answers) : 0;
  const opponentFrameConfig = opponentStats?.frameConfig;
  const myStats = matchData && user ? matchData.players[user.id] : null;
  const myTitle = myStats?.title || user?.title;
  const myDisplayTitle = myStats?.displayTitle;
  const isDaily = matchData?.mode === 'daily';
  // Calculate if opponent has answered the current question (Moved up)
  const opponentHasAnswered = useMemo(() => {
    if (!opponentStats || !currentQuestion) return false;
    return opponentStats.answers.some(a => a.questionId === currentQuestion.id);
  }, [opponentStats, currentQuestion]);
  // Force re-render for timer
  useInterval(() => {
    setNow(Date.now());
  }, 100);
  // Derived Timer
  const roundEndTime = matchData?.roundEndTime || 0;
  const timeLeftRaw = Math.max(0, Math.ceil((roundEndTime - now) / 1000));
  const isIntermission = timeLeftRaw > 10;
  // Clamp visual timer to 10s max to avoid showing transition time
  const timeLeft = Math.min(10, timeLeftRaw);
  // Audio: Emote
  useEffect(() => {
    if (opponentLastEmote && Date.now() - opponentLastEmote.timestamp < 2000) {
        playSfx('emote');
    }
  }, [opponentLastEmote]);
  // Audio & Haptics: Double Points (Final Round)
  useEffect(() => {
    if (isFinalRound && !isIntermission && !showIntro && gameStatus === 'playing') {
        // Play sound only once per round transition
        playSfx('double_points');
        triggerHaptic('medium');
    }
  }, [isFinalRound, isIntermission, showIntro, gameStatus]);
  // Confetti for High Streaks
  useEffect(() => {
    if (streak >= 3) {
      const particleCount = streak >= 5 ? 100 : 50;
      const spread = streak >= 5 ? 80 : 60;
      confetti({
        particleCount,
        spread,
        origin: { y: 0.7 },
        colors: ['#f97316', '#fbbf24', '#ef4444'], // Orange/Yellow/Red
        disableForReducedMotion: true
      });
    }
  }, [streak]);
  // Recover match state on refresh
  useEffect(() => {
    if (matchId) {
      api<MatchState>(`/api/match/${matchId}`)
        .then(match => {
          if (match.status === 'finished') {
            navigate(`/results/${matchId}`);
          } else {
            setMatchData(match);
            initMatch(match);
            // Check if we should skip intro (rejoining active match)
            const elapsed = Date.now() - match.startTime;
            if (match.status === 'playing' && elapsed > 4000) {
              setShowIntro(false);
            }
            // Initialize local streak from server data if available
            if (user) {
                const myStats = match.players[user.id];
                if (myStats?.answers) {
                    setStreak(calculateStreak(myStats.answers));
                }
            }
          }
        })
        .catch((err) => {
          console.error('Failed to recover match', err);
          toast.error('Match not found or expired');
          navigate('/');
        });
    }
  }, [matchId, initMatch, navigate, user]);
  // Polling Effect for Sync
  useEffect(() => {
    if (!matchId || !user) return;
    // Poll if playing OR waiting (for private lobby)
    if (gameStatus !== 'playing' && gameStatus !== 'waiting') return;
    const poll = async () => {
      try {
        const latestMatch = await api<MatchState>(`/api/match/${matchId}`);
        // Sync store with dynamic data (scores, status)
        syncOpponentState(latestMatch, user.id);
        // Update local match data reference for UI
        setMatchData(latestMatch);
        // Sync Question Index if server advanced
        const storeIndex = useGameStore.getState().currentQuestionIndex;
        if (latestMatch.currentQuestionIndex > storeIndex) {
            // Reset local round state via store action (using setState directly for now as per plan)
            useGameStore.setState(state => {
                state.currentQuestionIndex = latestMatch.currentQuestionIndex;
                state.selectedAnswerIndex = null;
                state.isAnswerLocked = false;
                state.lastAnswerCorrect = null;
            });
            // Reset local UI state
            setIsSubmitting(false);
            setSubmittingIndex(null);
            playSfx('tick'); // Sound cue for new round
        }
        // Sync Status
        if (latestMatch.status === 'finished' && useGameStore.getState().status !== 'finished') {
             // Prevent duplicate finish calls
             if (isFinishingRef.current) return;
             isFinishingRef.current = true;
             // Trigger finish flow
             try {
                const finishRes = await api<FinishMatchResponse>(`/api/match/${matchId}/finish`, {
                  method: 'POST',
                  body: JSON.stringify({ userId: user.id })
                });
                finishMatch(finishRes);
                navigate(`/results/${matchId}`);
             } catch (finishErr) {
                console.error('Failed to finish match', finishErr);
                // If already finished, just navigate
                navigate(`/results/${matchId}`);
             }
        }
      } catch (err) {
        console.error("Polling failed", err);
      }
    };
    const pollInterval = setInterval(poll, 1000);
    return () => clearInterval(pollInterval);
  }, [matchId, user, gameStatus, syncOpponentState, navigate, finishMatch]);
  // Intro Timer
  useEffect(() => {
    if (showIntro && gameStatus === 'playing') {
      const timer = setTimeout(() => {
        setShowIntro(false);
      }, 3500); // Cinematic delay
      return () => clearTimeout(timer);
    }
  }, [showIntro, gameStatus]);
  // Timer Tick Sound & Haptics
  useEffect(() => {
    if (timeLeft <= 3 && timeLeft > 0 && !isLocked && !showIntro && !isIntermission) {
      playSfx('tick');
      triggerHaptic('light');
    }
  }, [timeLeft, isLocked, showIntro, isIntermission]);
  const handleSubmit = useCallback(async (index: number) => {
    if (isLocked || isSubmitting || !user) return;
    playSfx('click');
    setIsSubmitting(true);
    setSubmittingIndex(index);
    selectAnswer(index); // Update store for consistency
    try {
      const res = await api<any>(`/api/match/${matchId}/answer`, {
        method: 'POST',
        body: JSON.stringify({
          userId: user.id,
          questionIndex: currentIndex,
          answerIndex: index,
          timeRemainingMs: timeLeft * 1000
        })
      });
      if (res.correct) {
        playSfx('correct');
        triggerHaptic('success');
        setStreak(s => {
            const next = s + 1;
            if (next > 1) playSfx('streak');
            return next;
        });
      } else {
        playSfx('wrong');
        triggerHaptic('error');
        setStreak(0);
      }
      lockAnswer(res.correct, res.correctIndex, res.scoreDelta, res.opponentScore);
      // We do NOT manually advance question here anymore.
      // We wait for polling to detect server-side advancement.
    } catch (err) {
      console.error(err);
      toast.error('Connection error');
      setIsSubmitting(false);
      setSubmittingIndex(null);
    }
  }, [isLocked, isSubmitting, matchId, currentIndex, timeLeft, lockAnswer, user, selectAnswer]);
  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isLocked || isSubmitting || showIntro || isReportOpen || gameStatus !== 'playing') return;
      const key = e.key.toLowerCase();
      const keyMap: Record<string, number> = {
        '1': 0, '2': 1, '3': 2, '4': 3,
        'a': 0, 'b': 1, 'c': 2, 'd': 3
      };
      if (key in keyMap) {
        handleSubmit(keyMap[key]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLocked, isSubmitting, showIntro, handleSubmit, isReportOpen, gameStatus]);
  // Auto-submit on timeout (Client-side fallback, server also enforces)
  useEffect(() => {
    if (timeLeft === 0 && !isLocked && !isSubmitting && !showIntro && gameStatus === 'playing' && !isIntermission) {
      handleSubmit(-1); // -1 indicates timeout/no answer
    }
  }, [timeLeft, isLocked, isSubmitting, handleSubmit, showIntro, gameStatus, isIntermission]);
  const handleReport = async () => {
    if (!user || !currentQuestion) return;
    setIsReporting(true);
    try {
      await api('/api/reports', {
        method: 'POST',
        body: JSON.stringify({
          userId: user.id,
          questionId: currentQuestion.id,
          questionText: currentQuestion.text,
          reason: reportReason
        })
      });
      toast.success("Report submitted. Thank you!");
      setIsReportOpen(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to submit report");
    } finally {
      setIsReporting(false);
    }
  };
  const handleSendEmote = async (emoji: string) => {
    if (!user || !matchId) return;
    try {
      await api(`/api/match/${matchId}/emote`, {
        method: 'POST',
        body: JSON.stringify({ userId: user.id, emoji })
      });
    } catch (err) {
      console.error("Failed to send emote", err);
    }
  };
  const copyCode = () => {
    if (roomCode) {
      navigator.clipboard.writeText(roomCode);
      toast.success("Room code copied!");
    }
  };
  if (!matchData || !user) {
    return <MatchLoadingScreen />;
  }
  // LOBBY VIEW (Waiting for opponent)
  if (gameStatus === 'waiting' && isPrivate) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center bg-zinc-950 relative overflow-hidden p-4">
        {/* ... (Lobby UI remains same) ... */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-zinc-950 to-zinc-950 pointer-events-none" />
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 w-full max-w-4xl flex flex-col items-center"
        >
          <div className="mb-8 text-center">
            <h1 className="text-3xl md:text-5xl font-display font-bold text-white mb-2 tracking-tight">Private Lobby</h1>
            <p className="text-indigo-200/70 text-lg">Waiting for opponent to join...</p>
          </div>
          {/* VS Layout for Lobby */}
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16 w-full mb-12">
            {/* Player (You) */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-indigo-500 blur-[40px] opacity-30 rounded-full" />
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.4)] overflow-hidden bg-zinc-900 relative z-10">
                  <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                </div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-white">{user.name}</div>
                <div className="text-sm text-indigo-300 font-mono">Host</div>
              </div>
            </div>
            {/* Room Code Card */}
            <div className="relative z-20">
              <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 md:p-8 text-center shadow-2xl transform md:scale-110">
                <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Room Code</div>
                <div className="text-4xl md:text-6xl font-mono font-bold text-white tracking-[0.2em] mb-6 select-all">
                  {roomCode}
                </div>
                <div className="flex gap-3 justify-center">
                  <Button
                    variant="outline"
                    className="border-white/10 hover:bg-white/5 gap-2"
                    onClick={copyCode}
                  >
                    <Flag className="w-4 h-4" /> Copy
                  </Button>
                </div>
              </div>
            </div>
            {/* Opponent Placeholder */}
            <div className="flex flex-col items-center gap-4 opacity-50">
              <div className="relative">
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-white/10 border-dashed flex items-center justify-center bg-white/5 animate-pulse">
                  <Flag className="w-10 h-10 text-white/30" />
                </div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-white/50">Waiting...</div>
                <div className="text-sm text-white/30 font-mono">Opponent</div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-white/5 px-4 py-2 rounded-full border border-white/5">
            <Loader2 className="w-4 h-4 animate-spin" />
            The game will start automatically when a player joins.
          </div>
        </motion.div>
      </div>
    );
  }
  return (
    <div className="min-h-dvh flex flex-col bg-zinc-950 overflow-hidden relative font-sans selection:bg-indigo-500/30">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-zinc-950 to-zinc-950 pointer-events-none" />
      {/* Cinematic VS Intro Screen */}
      <AnimatePresence>
        {showIntro && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950"
          >
            {/* Split Backgrounds with Banners */}
            <div className="absolute inset-0 flex flex-col md:flex-row pointer-events-none">
              <motion.div
                initial={isMobile ? { y: "-100%" } : { x: "-100%" }}
                animate={isMobile ? { y: 0 } : { x: 0 }}
                exit={isMobile ? { y: "-100%" } : { x: "-100%" }}
                transition={{ duration: 0.5, ease: "circOut" }}
                className={cn("relative w-full h-1/2 md:w-1/2 md:h-full border-b md:border-b-0 md:border-r border-indigo-500/20", !user.banner && "bg-indigo-950/30")}
                style={getBackgroundStyle(user.banner)}
              >
                <div className="absolute inset-0 bg-indigo-950/60 backdrop-blur-sm" />
              </motion.div>
              {!isDaily && (
                <motion.div
                  initial={isMobile ? { y: "100%" } : { x: "100%" }}
                  animate={isMobile ? { y: 0 } : { x: 0 }}
                  exit={isMobile ? { y: "100%" } : { x: "100%" }}
                  transition={{ duration: 0.5, ease: "circOut" }}
                  className={cn("relative w-full h-1/2 md:w-1/2 md:h-full border-t md:border-t-0 md:border-l border-rose-500/20", !opponentStats?.banner && "bg-rose-950/30")}
                  style={getBackgroundStyle(opponentStats?.banner)}
                >
                  <div className="absolute inset-0 bg-rose-950/60 backdrop-blur-sm" />
                </motion.div>
              )}
            </div>
            <div className="relative w-full max-w-6xl h-full flex flex-col md:flex-row items-center justify-between px-4 md:px-20 py-12 md:py-0">
              {/* Left/Top Player (You) */}
              <motion.div
                initial={isMobile ? { y: -100, opacity: 0 } : { x: -200, opacity: 0 }}
                animate={isMobile ? { y: 0, opacity: 1 } : { x: 0, opacity: 1 }}
                transition={{ delay: 0.3, type: "spring", stiffness: 100 }}
                className={cn("flex flex-col items-center gap-4 md:gap-6 z-10", isDaily && "md:col-span-2 mx-auto")}
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-indigo-500 blur-[60px] opacity-40 rounded-full" />
                  <div className="w-24 h-24 md:w-48 md:h-48 rounded-full border-4 border-indigo-500 shadow-[0_0_50px_rgba(99,102,241,0.5)] overflow-hidden bg-zinc-900 relative z-10">
                    <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                  </div>
                </div>
                <div className="text-center">
                  <h2 className="text-2xl md:text-5xl font-bold text-white font-display tracking-wider mb-1 md:mb-2">{user.name}</h2>
                  <div className="px-3 py-0.5 md:px-4 md:py-1 bg-indigo-500/20 border border-indigo-500/30 rounded-full text-indigo-300 font-mono text-sm md:text-base flex items-center justify-center gap-2">
                    <span>{getFlagEmoji(user.country)}</span>
                    <span>ELO {user.elo}</span>
                  </div>
                  {(myDisplayTitle || myTitle) && (
                    <div className="mt-2 text-amber-400 font-bold uppercase tracking-wider text-sm">{myDisplayTitle || myTitle}</div>
                  )}
                </div>
              </motion.div>
              {/* VS Badge */}
              {!isDaily && (
                <motion.div
                  initial={{ scale: 0, rotate: -180, opacity: 0 }}
                  animate={{ scale: 1, rotate: 0, opacity: 1 }}
                  transition={{ delay: 0.8, type: "spring", stiffness: 200, damping: 15 }}
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20"
                >
                  <div className="relative">
                    <div className="absolute inset-0 bg-yellow-500 blur-[80px] opacity-50 rounded-full animate-pulse" />
                    <div className="w-24 h-24 md:w-40 md:h-40 bg-zinc-950 text-white font-black text-4xl md:text-7xl flex items-center justify-center rounded-full border-4 md:border-8 border-yellow-500 shadow-[0_0_60px_rgba(234,179,8,0.6)] italic transform -skew-x-12">
                      <span className="bg-clip-text text-transparent bg-gradient-to-b from-yellow-300 to-yellow-600 drop-shadow-sm">VS</span>
                    </div>
                  </div>
                </motion.div>
              )}
              {/* Right/Bottom Player (Opponent) */}
              {!isDaily && (
                <motion.div
                  initial={isMobile ? { y: 100, opacity: 0 } : { x: 200, opacity: 0 }}
                  animate={isMobile ? { y: 0, opacity: 1 } : { x: 0, opacity: 1 }}
                  transition={{ delay: 0.5, type: "spring", stiffness: 100 }}
                  className="flex flex-col items-center gap-4 md:gap-6 z-10"
                >
                  <div className="relative">
                    <div className="absolute inset-0 bg-rose-500 blur-[60px] opacity-40 rounded-full" />
                    <div className="w-24 h-24 md:w-48 md:h-48 rounded-full border-4 border-rose-500 shadow-[0_0_50px_rgba(244,63,94,0.5)] overflow-hidden bg-zinc-900 relative z-10">
                      {opponentStats?.avatar ? (
                        <img src={opponentStats.avatar} alt={opponentName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-rose-600 to-orange-600 flex items-center justify-center">
                          <span className="text-3xl md:text-4xl font-bold text-white/50">{opponentName[0]}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-center">
                    <h2 className="text-2xl md:text-5xl font-bold text-white font-display tracking-wider mb-1 md:mb-2">{opponentName}</h2>
                    <div className="px-3 py-0.5 md:px-4 md:py-1 bg-rose-500/20 border border-rose-500/30 rounded-full text-rose-300 font-mono text-sm md:text-base flex items-center justify-center gap-2">
                      {opponentCountry && <span>{getFlagEmoji(opponentCountry)}</span>}
                      {opponentElo ? <span>ELO {opponentElo}</span> : <span>CHALLENGER</span>}
                    </div>
                    {(opponentDisplayTitle || opponentTitle) && (
                      <div className="mt-2 text-amber-400 font-bold uppercase tracking-wider text-sm">{opponentDisplayTitle || opponentTitle}</div>
                    )}
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Main Game Content */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: showIntro ? 0 : 1 }}
        transition={{ duration: 0.5 }}
        className="flex-1 flex flex-col h-full max-w-7xl mx-auto w-full overflow-y-auto"
      >
        {/* Header */}
        <header className="relative z-10 p-2 md:p-6 flex items-center justify-between w-full shrink-0">
          <div className={cn("flex items-center gap-2 md:gap-6", isDaily && "mx-auto")}>
            <OpponentAvatar
              name={user.name}
              className="scale-75 md:scale-100 origin-left"
              title={myTitle}
              displayTitle={myDisplayTitle}
              streak={streak}
              avatar={user.avatar}
              frame={user.frame}
              frameConfig={user.frameConfig}
            />
            <ScoreBadge score={myScore} label="You" />
          </div>
          <div className={cn("flex flex-col items-center -mt-2 relative", isDaily && "absolute left-1/2 -translate-x-1/2 top-4")}>
            <div className="flex flex-col items-center gap-1 mb-2 md:mb-4">
                <div className="flex items-center gap-2 px-3 py-1 md:px-4 md:py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md shadow-lg">
                    <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-indigo-500 animate-pulse" />
                    <span className="text-xs md:text-sm font-bold text-indigo-200 uppercase tracking-wider">
                        Round {currentIndex + 1} <span className="text-white/30 mx-1">/</span> {questions.length}
                    </span>
                </div>
                {/* Double Points Badge */}
                <AnimatePresence>
                    {isFinalRound && (
                        <motion.div
                            initial={{ opacity: 0, y: -10, scale: 0.8 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-yellow-500/20 border border-yellow-500/50 text-yellow-400 text-[10px] md:text-xs font-bold uppercase tracking-widest shadow-[0_0_15px_rgba(234,179,8,0.3)] animate-pulse"
                        >
                            <Zap className="w-3 h-3 fill-yellow-400" />
                            2x Points
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            <div className="relative">
                <TimerCircle
                  key={currentQuestion?.id}
                  duration={10}
                  isRunning={!isLocked && !showIntro && gameStatus === 'playing' && !isIntermission}
                  className={cn(
                    "scale-75 md:scale-100",
                    timeLeft < 4 && !isIntermission ? "scale-90 md:scale-110 transition-transform duration-200 drop-shadow-[0_0_15px_rgba(244,63,94,0.5)]" : ""
                  )}
                />
                {isIntermission && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full backdrop-blur-sm z-10">
                        <span className="text-[10px] font-bold text-white uppercase tracking-wider">Next</span>
                    </div>
                )}
            </div>
            {/* Streak Indicator */}
            <AnimatePresence>
                {streak >= 2 && (
                    <motion.div
                        key={streak} // Force re-render for animation
                        initial={{ opacity: 0, y: 10, scale: 0.8 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className={cn(
                          "absolute top-full mt-2 flex items-center gap-1.5 px-3 py-1 rounded-full border font-bold text-sm backdrop-blur-md z-20 animate-shake",
                          streak >= 5
                            ? "bg-red-500/20 border-red-500/40 text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.4)]"
                            : "bg-orange-500/20 border-orange-500/40 text-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.3)]"
                        )}
                    >
                        <Flame className={cn("w-4 h-4 fill-current animate-pulse", streak >= 5 && "text-red-500")} />
                        <span>{streak >= 5 ? "Super Streak!" : `${streak} Streak!`}</span>
                    </motion.div>
                )}
            </AnimatePresence>
          </div>
          {!isDaily && (
            <div className="flex items-center gap-2 md:gap-6 relative">
              <ScoreBadge score={opponentScore} label="Enemy" isOpponent />
              <div className="flex flex-col items-center gap-1 relative">
                <OpponentAvatar
                  name={opponentName}
                  isOpponent
                  className="scale-75 md:scale-100 origin-right"
                  title={opponentTitle}
                  displayTitle={opponentDisplayTitle}
                  streak={opponentStreak}
                  avatar={opponentStats?.avatar}
                  frame={opponentStats?.frame}
                  frameConfig={opponentFrameConfig}
                  hasAnswered={opponentHasAnswered}
                  isBot={matchData.mode === 'practice'}
                />
                {opponentCountry && (
                  <div className="flex items-center gap-1 text-[10px] bg-black/40 px-2 py-0.5 rounded-full border border-white/5">
                    <span>{getFlagEmoji(opponentCountry)}</span>
                    {opponentElo && <span className="text-rose-300 font-mono">{opponentElo}</span>}
                  </div>
                )}
                {/* Opponent Emote Floater */}
                {opponentLastEmote && (
                  <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center pointer-events-none">
                    <EmoteFloater emoji={opponentLastEmote.emoji} timestamp={opponentLastEmote.timestamp} />
                  </div>
                )}
              </div>
            </div>
          )}
        </header>
        {/* Arena */}
        <main className="flex-1 flex flex-col items-center justify-center p-2 md:p-4 w-full relative z-10 pb-20 md:pb-20">
          <AnimatePresence mode="wait">
            {isIntermission && !showIntro && (
               <RoundIntermission
                 key="intermission"
                 roundNumber={Math.min(currentIndex + 1, questions.length)}
                 totalRounds={questions.length}
               />
            )}
            {!isIntermission && currentQuestion && (
              <motion.div
                key={currentQuestion.id}
                initial={{ opacity: 0, y: 40, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -40, scale: 0.95 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="w-full max-w-4xl space-y-2 md:space-y-8"
              >
                {/* Question Card */}
                <div className="glass-panel rounded-2xl md:rounded-[2rem] p-4 md:p-16 text-center relative overflow-hidden group border border-white/10 bg-zinc-900/50 backdrop-blur-xl shadow-2xl">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-50" />
                  {/* Report Button */}
                  <div className="absolute top-3 left-3 md:top-6 md:left-6">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 md:h-8 md:w-8 rounded-full text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                      onClick={() => setIsReportOpen(true)}
                      title="Report Issue"
                    >
                      <Flag className="w-3 h-3 md:w-4 md:h-4" />
                    </Button>
                  </div>
                  {/* Media Content (Flags/Images) */}
                  {currentQuestion.media && (
                    <div className="mb-4 md:mb-8 flex justify-center">
                      {currentQuestion.media.type === 'emoji' ? (
                        <span className="text-6xl md:text-8xl filter drop-shadow-2xl animate-scale-in">
                          {currentQuestion.media.content}
                        </span>
                      ) : (
                        <img
                          src={currentQuestion.media.content}
                          alt="Question Media"
                          className="max-h-32 md:max-h-48 rounded-xl shadow-2xl border border-white/10"
                        />
                      )}
                    </div>
                  )}
                  <h2 className="text-lg md:text-4xl font-bold leading-tight text-white drop-shadow-md font-display min-h-[2em] flex items-center justify-center">
                    {currentQuestion.text}
                  </h2>
                  <div className="absolute -bottom-20 -right-20 w-60 h-60 bg-indigo-500/10 rounded-full blur-[80px] group-hover:bg-indigo-500/20 transition-colors duration-500" />
                  <div className="absolute -top-20 -left-20 w-60 h-60 bg-purple-500/10 rounded-full blur-[80px] group-hover:bg-purple-500/20 transition-colors duration-500" />
                </div>
                {/* Answer Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-6">
                  {currentQuestion.options.map((opt, idx) => (
                    <AnswerButton
                      key={idx}
                      index={idx}
                      text={opt}
                      selected={submittingIndex === idx}
                      locked={isLocked}
                      correct={isLocked ? idx === currentQuestion.correctIndex : undefined}
                      isLoading={isSubmitting && submittingIndex === idx}
                      onClick={() => handleSubmit(idx)}
                    />
                  ))}
                </div>
                {/* Feedback Message (Replaces Lock Button) */}
                <div className="h-16 md:h-20 flex items-center justify-center">
                  <AnimatePresence>
                    {isLocked && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className={cn(
                          "px-6 py-3 md:px-10 md:py-4 rounded-full font-black text-lg md:text-2xl uppercase tracking-widest shadow-2xl border backdrop-blur-xl flex items-center gap-3 md:gap-4",
                          lastCorrect
                            ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400 shadow-emerald-500/20"
                            : "bg-rose-500/20 border-rose-500/50 text-rose-400 shadow-rose-500/20"
                        )}
                      >
                        {lastCorrect ? <Check className="w-6 h-6 md:w-8 md:h-8 stroke-[3]" /> : <AlertTriangle className="w-6 h-6 md:w-8 md:h-8 stroke-[3]" />}
                        {lastCorrect ? "Correct!" : "Incorrect"}
                      </motion.div>
                    )}
                    {/* Waiting for opponent indicator */}
                    {isLocked && !lastCorrect && isSubmitting && !isDaily && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-sm text-muted-foreground mt-2"
                        >
                            Waiting for opponent...
                        </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
        {/* Emote Picker (Bottom Left) */}
        <div className="absolute left-4 bottom-4 z-30 pb-safe">
          <EmotePicker onSelect={handleSendEmote} disabled={gameStatus !== 'playing'} />
        </div>
      </motion.div>
      {/* Report Dialog */}
      <Dialog open={isReportOpen} onOpenChange={setIsReportOpen}>
        <DialogContent className="bg-zinc-950 border-white/10">
          <DialogHeader>
            <DialogTitle>Report Issue</DialogTitle>
            <DialogDescription>
              Help us improve the game by flagging incorrect or inappropriate content.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Reason</Label>
              <Select value={reportReason} onValueChange={(v: ReportReason) => setReportReason(v)}>
                <SelectTrigger className="bg-black/20 border-white/10">
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-white/10">
                  <SelectItem value="wrong_answer">Wrong Answer</SelectItem>
                  <SelectItem value="typo">Typo / Grammar</SelectItem>
                  <SelectItem value="inappropriate">Inappropriate Content</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsReportOpen(false)}>Cancel</Button>
            <Button onClick={handleReport} disabled={isReporting} variant="destructive">
              {isReporting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit Report'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}