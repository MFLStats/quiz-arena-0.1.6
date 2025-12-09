import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Zap, Clock, Trophy, Swords, Calendar } from 'lucide-react';
interface HowToPlayModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}
export function HowToPlayModal({ isOpen, onOpenChange }: HowToPlayModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-950/95 border-white/10 backdrop-blur-xl max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-display font-bold text-white flex items-center gap-2">
            <Zap className="w-6 h-6 text-yellow-400 fill-yellow-400" />
            How to Play
          </DialogTitle>
          <DialogDescription className="text-base text-muted-foreground">
            Master the arena with these rules and tips.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
          {/* Game Loop */}
          <div className="space-y-3 p-4 rounded-xl bg-white/5 border border-white/5">
            <h3 className="font-bold text-white flex items-center gap-2">
              <Swords className="w-4 h-4 text-indigo-400" /> The Duel
            </h3>
            <ul className="space-y-2 text-sm text-gray-300">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 flex-shrink-0" />
                Face off in 5 rapid-fire questions.
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 flex-shrink-0" />
                You have 10 seconds per question.
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 flex-shrink-0" />
                The final question is worth <strong>Double Points</strong>.
              </li>
            </ul>
          </div>
          {/* Scoring */}
          <div className="space-y-3 p-4 rounded-xl bg-white/5 border border-white/5">
            <h3 className="font-bold text-white flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-400" /> Scoring
            </h3>
            <ul className="space-y-2 text-sm text-gray-300">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 mt-1.5 flex-shrink-0" />
                <strong>Base Score:</strong> 100 points per correct answer.
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 mt-1.5 flex-shrink-0" />
                <strong>Speed Bonus:</strong> Up to 50 extra points for answering fast.
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 mt-1.5 flex-shrink-0" />
                Accuracy + Speed = Victory.
              </li>
            </ul>
          </div>
          {/* Modes */}
          <div className="space-y-3 p-4 rounded-xl bg-white/5 border border-white/5">
            <h3 className="font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" /> Game Modes
            </h3>
            <div className="space-y-3 text-sm">
              <div>
                <strong className="text-white block mb-1">Ranked Arena</strong>
                <p className="text-gray-400">Compete for Elo in specific categories. Matchmaking is based on your skill level.</p>
              </div>
              <div>
                <strong className="text-white block mb-1 flex items-center gap-2">
                  <Calendar className="w-3 h-3" /> Daily Challenge
                </strong>
                <p className="text-gray-400">10 curated questions. Same for everyone, every day. Test your consistency.</p>
              </div>
            </div>
          </div>
          {/* Tips */}
          <div className="space-y-3 p-4 rounded-xl bg-gradient-to-br from-indigo-900/20 to-purple-900/20 border border-indigo-500/20">
            <h3 className="font-bold text-white">Pro Tips</h3>
            <p className="text-sm text-indigo-200">
              Don't rush if you aren't sure! A wrong answer gets 0 points. It's better to take 2 extra seconds to be right than to be fast and wrong.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}