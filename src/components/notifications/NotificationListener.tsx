import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Swords, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNotifications } from '@/hooks/use-notifications';
import { useGameStore } from '@/lib/game-store';
import { api } from '@/lib/api-client';
import type { MatchState } from '@shared/types';
import { playSfx } from '@/lib/sound-fx';
import { useAuthStore } from '@/lib/auth-store';
export function NotificationListener() {
  const { notifications, clearNotification } = useNotifications();
  const navigate = useNavigate();
  const initMatch = useGameStore(s => s.initMatch);
  const user = useAuthStore(s => s.user);
  const processedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    notifications.forEach(n => {
      if (n.type === 'challenge' && !processedRef.current.has(n.id)) {
        processedRef.current.add(n.id);
        playSfx('match_found');
        toast.custom((t) => (
          <div className="w-full p-4 rounded-xl bg-zinc-900 border border-indigo-500/50 shadow-2xl flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-indigo-500/20 text-indigo-400">
                <Swords className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-white">Duel Challenge!</h4>
                <p className="text-sm text-muted-foreground">
                  <span className="text-white font-medium">{n.fromUserName}</span> challenges you to a <span className="text-indigo-300">{n.categoryName}</span> duel!
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  clearNotification(n.id);
                  toast.dismiss(t);
                }}
                className="text-muted-foreground hover:text-white"
              >
                Decline
              </Button>
              <Button
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-500"
                onClick={async () => {
                  toast.dismiss(t);
                  if (!user) return;
                  try {
                    // Join the match explicitly
                    const match = await api<MatchState>(`/api/match/${n.matchId}/join`, {
                        method: 'POST',
                        body: JSON.stringify({ userId: user.id })
                    });
                    await clearNotification(n.id);
                    initMatch(match);
                    navigate(`/arena/${n.matchId}`);
                  } catch (e) {
                    console.error(e);
                    toast.error("Failed to join match");
                  }
                }}
              >
                Accept
              </Button>
            </div>
          </div>
        ), { duration: 10000 });
      }
    });
  }, [notifications, user, initMatch, navigate, clearNotification]);
  return null;
}