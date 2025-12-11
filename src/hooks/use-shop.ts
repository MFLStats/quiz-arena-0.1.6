import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api-client';
import type { ShopItem } from '@shared/types';
export function useShop() {
  const [items, setItems] = useState<ShopItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<{ items: ShopItem[] }>('/api/shop/items');
      setItems(data.items || []);
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch shop items:', err);
      setError(err.message || 'Failed to load shop');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    fetchItems();
  }, [fetchItems]);
  return { items, loading, error, refresh: fetchItems };
}