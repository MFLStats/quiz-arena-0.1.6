import React, { useEffect, useRef } from 'react';
import { useInterval } from 'react-use';
import { toast } from 'sonner';
import { Swords } from 'lucide-react';
import { useNotificationStore } from '@/lib/notification-store';
import { useAuthStore } from '@/lib/auth-store';
import { playSfx } from '@/lib/sound-fx';
export function NotificationListener() {
  const notifications = useNotificationStore(s => s.notifications);
  const fetchNotifications = useNotificationStore(s => s.fetchNotifications);
  const user = useAuthStore(s => s.user);
  const processedRef = useRef<Set<string>>(new Set());
  // Poll for notifications
  useInterval(() => {
    if (user) {
      fetchNotifications(user.id);
    }
  }, 5000);
  // Handle new notifications (Toast only)
  useEffect(() => {
    notifications.forEach(n => {
      if (n.type === 'challenge' && !processedRef.current.has(n.id)) {
        processedRef.current.add(n.id);
        playSfx('match_found');
        // We only show a simple toast here because the NotificationCenter
        // handles the detailed interaction and persistence.
        toast.custom((t) => (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-zinc-900 border border-indigo-500/50 shadow-2xl w-full max-w-sm">
            <div className="p-2 rounded-full bg-indigo-500/20 text-indigo-400">
              <Swords className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-white text-sm">New Challenge!</h4>
              <p className="text-xs text-muted-foreground">
                <span className="text-white font-medium">{n.fromUserName}</span> challenged you.
              </p>
            </div>
          </div>
        ), { duration: 4000 });
      }
    });
  }, [notifications]);
  return null;
}