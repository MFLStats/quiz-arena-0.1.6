import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api-client';
import type { BattlePassSeason } from '@shared/types';
export function useBattlePass() {
  const [season, setSeason] = useState<BattlePassSeason | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchSeason = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<BattlePassSeason>('/api/battle-pass/active');
      setSeason(data);
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch active battle pass:', err);
      setError(err.message || 'Failed to load battle pass');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    fetchSeason();
  }, [fetchSeason]);
  return { season, loading, error, refresh: fetchSeason };
}