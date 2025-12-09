import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Swords } from 'lucide-react';
import { useCategories } from '@/hooks/use-categories';
import { useAuthStore } from '@/lib/auth-store';
import { useGameStore } from '@/lib/game-store';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';
import { CATEGORY_ICONS } from '@/lib/icons';
import type { MatchState } from '@shared/types';
import { cn } from '@/lib/utils';
interface ChallengeModalProps {
  isOpen: boolean;
  onClose: () => void;
  friendId: string;
  friendName: string;
}
export function ChallengeModal({ isOpen, onClose, friendId, friendName }: ChallengeModalProps) {
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);
  const initMatch = useGameStore(s => s.initMatch);
  const { categories } = useCategories();
  const [isLoading, setIsLoading] = useState(false);
  const handleChallenge = async (categoryId: string) => {
    if (!user) return;
    setIsLoading(true);
    try {
      const match = await api<MatchState>('/api/challenge', {
        method: 'POST',
        body: JSON.stringify({
          userId: user.id,
          opponentId: friendId,
          categoryId
        })
      });
      initMatch(match);
      onClose();
      navigate(`/arena/${match.id}`);
      toast.success(`Challenge sent to ${friendName}!`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to send challenge");
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-zinc-950 border-white/10 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-display font-bold text-white flex items-center gap-2">
            <Swords className="w-6 h-6 text-indigo-400" />
            Challenge {friendName}
          </DialogTitle>
          <DialogDescription>
            Select a category for your duel.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[400px] pr-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {categories.map((cat) => {
                const Icon = CATEGORY_ICONS[cat.icon] || CATEGORY_ICONS.Atom;
                return (
                  <button
                    key={cat.id}
                    onClick={() => handleChallenge(cat.id)}
                    className="flex flex-col items-center p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-indigo-500/50 transition-all group text-center"
                  >
                    <div className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center mb-3 bg-gradient-to-br shadow-lg group-hover:scale-110 transition-transform",
                      cat.color
                    )}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <span className="font-bold text-white text-sm">{cat.name}</span>
                    <span className="text-xs text-muted-foreground mt-1">{cat.group}</span>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}