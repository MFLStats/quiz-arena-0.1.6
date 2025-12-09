import React, { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';
import type { User } from '@shared/types';
export function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const hydrateUser = useAuthStore((s) => s.hydrateUser);
  const processedRef = useRef(false);
  useEffect(() => {
    if (processedRef.current) return;
    processedRef.current = true;
    const userId = searchParams.get('userId');
    const error = searchParams.get('error');
    if (error) {
      console.error('OAuth Error:', error);
      toast.error(`Login failed: ${error}`);
      navigate('/login', { replace: true });
      return;
    }
    if (!userId) {
      toast.error('Invalid login response');
      navigate('/login', { replace: true });
      return;
    }
    const completeLogin = async () => {
      try {
        // Fetch full user profile to ensure we have the latest data
        const user = await api<User>(`/api/users/${userId}?requesterId=${userId}`);
        hydrateUser(user);
        toast.success(`Welcome back, ${user.name}!`);
        navigate('/', { replace: true });
      } catch (err) {
        console.error('Failed to hydrate user:', err);
        toast.error('Failed to complete login');
        navigate('/login', { replace: true });
      }
    };
    completeLogin();
  }, [searchParams, navigate, hydrateUser]);
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 text-white">
      <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mb-4" />
      <h2 className="text-xl font-display font-bold">Finalizing login...</h2>
      <p className="text-muted-foreground text-sm mt-2">Please wait while we secure your session.</p>
    </div>
  );
}