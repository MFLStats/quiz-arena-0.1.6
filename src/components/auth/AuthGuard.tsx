import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/lib/auth-store';
import { Loader2 } from 'lucide-react';
interface AuthGuardProps {
  children: React.ReactNode;
}
export function AuthGuard({ children }: AuthGuardProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login', { state: { from: location }, replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, location]);
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }
  if (!isAuthenticated) {
    return null; // Will redirect via useEffect
  }
  return <>{children}</>;
}