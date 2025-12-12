import { useState, useEffect, useCallback } from 'react';
import { useInterval } from 'react-use';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import type { Notification } from '@shared/types';
export function useNotifications() {
  const user = useAuthStore(s => s.user);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const data = await api<Notification[]>(`/api/notifications?userId=${user.id}`);
      // Simple equality check to avoid re-renders
      setNotifications(prev => {
        if (JSON.stringify(prev) === JSON.stringify(data)) return prev;
        return data;
      });
    } catch (e) {
      console.error("Failed to fetch notifications", e);
    }
  }, [user]);
  useInterval(fetchNotifications, 5000); // Poll every 5 seconds
  const clearNotification = async (id: string) => {
    if (!user) return;
    try {
      // Optimistic update
      setNotifications(prev => prev.filter(n => n.id !== id));
      await api('/api/notifications/clear', {
        method: 'POST',
        body: JSON.stringify({ userId: user.id, notificationIds: [id] })
      });
    } catch (e) {
      console.error("Failed to clear notification", e);
      fetchNotifications(); // Revert on error
    }
  };
  return { notifications, clearNotification };
}