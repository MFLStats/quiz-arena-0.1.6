import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, X, Clock, AlertCircle, Filter, Eye, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Question } from '@shared/types';
interface AnswerRecord {
  questionId: string;
  timeMs: number;
  correct: boolean;
  selectedIndex?: number;
}
interface MatchReviewProps {
  questions: Question[];
  answers: AnswerRecord[];
}
export function MatchReview({ questions, answers }: MatchReviewProps) {
  const [showIncorrectOnly, setShowIncorrectOnly] = useState(false);
  const filteredQuestions = showIncorrectOnly
    ? questions.filter(q => {
        const answer = answers.find(a => a.questionId === q.id);
        // If no answer (timeout), it's incorrect, so show it.
        // If answer exists and correct is false, show it.
        return !answer || !answer.correct;
      })
    : questions;
  return (
    <div className="space-y-6 w-full max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-display font-bold text-white">Match Review</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowIncorrectOnly(!showIncorrectOnly)}
          className={cn(
            "gap-2 border-white/10 hover:bg-white/5 transition-colors",
            showIncorrectOnly && "bg-indigo-500/20 text-indigo-300 border-indigo-500/50 hover:bg-indigo-500/30"
          )}
        >
          {showIncorrectOnly ? <Eye className="w-4 h-4" /> : <Filter className="w-4 h-4" />}
          {showIncorrectOnly ? "Show All" : "Missed Only"}
        </Button>
      </div>
      <div className="space-y-4">
        {showIncorrectOnly && filteredQuestions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center bg-emerald-500/5 border border-emerald-500/20 rounded-xl animate-in fade-in zoom-in duration-300">
            <div className="p-3 rounded-full bg-emerald-500/10 mb-3">
              <CheckCircle className="w-8 h-8 text-emerald-400" />
            </div>
            <h4 className="text-lg font-bold text-emerald-400 mb-1">Perfect Game!</h4>
            <p className="text-sm text-emerald-200/70">You answered everything correctly.</p>
          </div>
        ) : (
          filteredQuestions.map((q) => {
            // Find original index for display
            const originalIndex = questions.findIndex(orig => orig.id === q.id);
            const answer = answers.find(a => a.questionId === q.id);
            const isCorrect = answer?.correct;
            const selectedIdx = answer?.selectedIndex;
            const timeSeconds = answer ? (answer.timeMs / 1000).toFixed(1) : '-';
            return (
              <motion.div
                key={q.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: originalIndex * 0.05 }}
                className="bg-zinc-900/50 border border-white/10 rounded-xl overflow-hidden"
              >
                {/* Question Header */}
                <div className="p-4 border-b border-white/5 flex gap-4 items-start bg-white/5">
                  <div className={cn(
                    "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border",
                    isCorrect
                      ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400"
                      : "bg-rose-500/20 border-rose-500/50 text-rose-400"
                  )}>
                    {originalIndex + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-white text-lg leading-snug">{q.text}</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground bg-black/20 px-2 py-1 rounded">
                    <Clock className="w-3 h-3" />
                    {timeSeconds}s
                  </div>
                </div>
                {/* Options Grid */}
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                  {q.options.map((opt, idx) => {
                    const isSelected = selectedIdx === idx;
                    const isTarget = q.correctIndex === idx;
                    let stateClass = "bg-black/20 border-white/5 text-muted-foreground";
                    let icon = null;
                    if (isTarget) {
                      stateClass = "bg-emerald-500/10 border-emerald-500/30 text-emerald-300 font-medium";
                      icon = <Check className="w-4 h-4 text-emerald-400" />;
                    } else if (isSelected && !isCorrect) {
                      stateClass = "bg-rose-500/10 border-rose-500/30 text-rose-300";
                      icon = <X className="w-4 h-4 text-rose-400" />;
                    } else if (isSelected && isCorrect) {
                       stateClass = "bg-emerald-500/10 border-emerald-500/30 text-emerald-300 font-medium";
                       icon = <Check className="w-4 h-4 text-emerald-400" />;
                    }
                    return (
                      <div
                        key={idx}
                        className={cn(
                          "relative flex items-center justify-between p-3 rounded-lg border text-sm transition-colors",
                          stateClass
                        )}
                      >
                        <span>{opt}</span>
                        {icon}
                      </div>
                    );
                  })}
                </div>
                {!answer && (
                  <div className="px-4 pb-4 text-xs text-orange-400 flex items-center gap-2">
                    <AlertCircle className="w-3 h-3" />
                    <span>Time ran out</span>
                  </div>
                )}
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}