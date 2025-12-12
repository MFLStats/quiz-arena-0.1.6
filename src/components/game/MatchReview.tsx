import React from 'react';
import { motion } from 'framer-motion';
import { Check, X, Clock, AlertCircle } from 'lucide-react';
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
  return (
    <div className="space-y-6 w-full max-w-3xl mx-auto">
      <h3 className="text-2xl font-display font-bold text-white text-center mb-6">Match Review</h3>
      <div className="space-y-4">
        {questions.map((q, i) => {
          const answer = answers.find(a => a.questionId === q.id);
          const isCorrect = answer?.correct;
          const selectedIdx = answer?.selectedIndex;
          const timeSeconds = answer ? (answer.timeMs / 1000).toFixed(1) : '-';
          return (
            <motion.div
              key={q.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
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
                  {i + 1}
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
                     // Handled by isTarget block usually, but strictly:
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
        })}
      </div>
    </div>
  );
}