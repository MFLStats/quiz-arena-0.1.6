import React from 'react';
import { Bell, Swords, X, Check, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotificationStore } from '@/lib/notification-store';
import { useAuthStore } from '@/lib/auth-store';
import { useGameStore } from '@/lib/game-store';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';
import type { MatchState } from '@shared/types';
export function NotificationCenter() {
  const notifications = useNotificationStore(s => s.notifications);
  const clearNotification = useNotificationStore(s => s.clearNotification);
  const user = useAuthStore(s => s.user);
  const initMatch = useGameStore(s => s.initMatch);
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = React.useState(false);
  const handleAccept = async (n: any) => {
    if (!user) return;
    setIsOpen(false);
    try {
      const match = await api<MatchState>(`/api/match/${n.matchId}/join`, {
          method: 'POST',
          body: JSON.stringify({ userId: user.id })
      });
      await clearNotification(user.id, n.id);
      initMatch(match);
      navigate(`/arena/${n.matchId}`);
      toast.success("Joined match!");
    } catch (e) {
      console.error(e);
      toast.error("Failed to join match. It may have expired.");
      // Clear it anyway if it's invalid
      clearNotification(user.id, n.id);
    }
  };
  const handleDecline = async (n: any) => {
    if (!user) return;
    await clearNotification(user.id, n.id);
    toast.info("Challenge declined");
  };
  const count = notifications.length;
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-full hover:bg-white/10">
          <Bell className="w-5 h-5 text-white" />
          {count > 0 && (
            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-zinc-950 animate-pulse" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 bg-zinc-950 border-white/10 backdrop-blur-xl" align="end">
        <div className="p-3 border-b border-white/5 font-medium text-sm text-white flex items-center justify-between">
          <span>Notifications</span>
          {count > 0 && <span className="text-xs text-muted-foreground">{count} pending</span>}
        </div>
        <ScrollArea className="h-[300px]">
          {count === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground gap-2">
              <Inbox className="w-8 h-8 opacity-50" />
              <span className="text-xs">No new notifications</span>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {notifications.map((n) => (
                <div key={n.id} className="p-3 hover:bg-white/5 transition-colors">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="p-2 rounded-full bg-indigo-500/20 text-indigo-400 shrink-0">
                      <Swords className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm text-white font-medium leading-none mb-1">Duel Challenge</p>
                      <p className="text-xs text-muted-foreground">
                        <span className="text-indigo-300 font-bold">{n.fromUserName}</span> wants to play <span className="text-white">{n.categoryName}</span>!
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1 opacity-70">
                        {new Date(n.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 pl-11">
                    <Button
                      size="sm"
                      className="h-7 text-xs bg-indigo-600 hover:bg-indigo-500 flex-1"
                      onClick={() => handleAccept(n)}
                    >
                      <Check className="w-3 h-3 mr-1" /> Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs border-white/10 hover:bg-white/10 flex-1"
                      onClick={() => handleDecline(n)}
                    >
                      <X className="w-3 h-3 mr-1" /> Decline
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}