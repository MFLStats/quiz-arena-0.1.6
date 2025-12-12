import { create } from 'zustand';
import { persist } from 'zustand/middleware';
interface ThemeState {
  isDark: boolean;
  reduceMotion: boolean;
  toggleTheme: () => void;
  setTheme: (isDark: boolean) => void;
  toggleReduceMotion: () => void;
}
export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      isDark: true, // Default to dark mode as requested
      reduceMotion: false,
      toggleTheme: () => set((state) => ({ isDark: !state.isDark })),
      setTheme: (isDark: boolean) => set({ isDark }),
      toggleReduceMotion: () => set((state) => ({ reduceMotion: !state.reduceMotion })),
    }),
    {
      name: 'theme-storage',
    }
  )
);
// Backward compatibility hook to minimize refactoring in components using the old hook pattern
export function useTheme() {
  const isDark = useThemeStore((state) => state.isDark);
  const reduceMotion = useThemeStore((state) => state.reduceMotion);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);
  const setTheme = useThemeStore((state) => state.setTheme);
  const toggleReduceMotion = useThemeStore((state) => state.toggleReduceMotion);
  return { isDark, reduceMotion, toggleTheme, setTheme, toggleReduceMotion };
}