import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, RegisterRequest, LoginEmailRequest } from '@shared/types';
import { api } from '@/lib/api-client';
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (provider: 'google' | 'apple' | 'guest', email?: string) => Promise<void>;
  loginEmail: (data: LoginEmailRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
  hydrateUser: (user: User) => void;
}
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: async (provider, email) => {
        set({ isLoading: true });
        try {
          const user = await api<User>('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ provider, email }),
          });
          set({ user, isAuthenticated: true, isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },
      loginEmail: async (data) => {
        set({ isLoading: true });
        try {
          const user = await api<User>('/api/auth/login-email', {
            method: 'POST',
            body: JSON.stringify(data),
          });
          set({ user, isAuthenticated: true, isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },
      register: async (data) => {
        set({ isLoading: true });
        try {
          const user = await api<User>('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify(data),
          });
          set({ user, isAuthenticated: true, isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },
      logout: () => set({ user: null, isAuthenticated: false }),
      updateUser: (user) => set({ user }),
      hydrateUser: (user) => set({ user, isAuthenticated: true, isLoading: false }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);