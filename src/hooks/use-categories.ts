import { useState, useEffect } from 'react';
import { api } from '@/lib/api-client';
import type { Category } from '@shared/types';
import { MOCK_CATEGORIES } from '@shared/mock-data';
export function useCategories() {
  const [categories, setCategories] = useState<Category[]>(MOCK_CATEGORIES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchCategories = async () => {
    setLoading(true);
    try {
      const data = await api<Category[]>('/api/categories');
      // Deduplicate categories by ID
      const categoryMap = new Map<string, Category>();
      // Initialize with mock data
      MOCK_CATEGORIES.forEach(c => categoryMap.set(c.id, c));
      // Merge fetched data (overwriting mocks if IDs collide)
      if (Array.isArray(data)) {
        data.forEach(c => categoryMap.set(c.id, c));
      }
      setCategories(Array.from(categoryMap.values()));
      setError(null);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
      setError('Failed to load categories');
      // Fallback to mock data is already set as initial state
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchCategories();
  }, []);
  return { categories, loading, error, refresh: fetchCategories };
}