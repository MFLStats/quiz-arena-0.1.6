import React, { useEffect } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { HomePage } from '@/pages/HomePage';
import { CategorySelectPage } from '@/pages/CategorySelectPage';
import { ArenaPage } from '@/pages/ArenaPage';
import { ResultsPage } from '@/pages/ResultsPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { LeaderboardPage } from '@/pages/LeaderboardPage';
import { ShopPage } from '@/pages/ShopPage';
import { LoginPage } from '@/pages/LoginPage';
import { AdminPage } from '@/pages/AdminPage';
import { RouteErrorBoundary } from '@/components/RouteErrorBoundary';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { Toaster } from '@/components/ui/sonner';
import { useTheme } from '@/hooks/use-theme';
const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/",
    element: (
      <AuthGuard>
        <HomePage />
      </AuthGuard>
    ),
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/categories",
    element: (
      <AuthGuard>
        <CategorySelectPage />
      </AuthGuard>
    ),
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/arena/:matchId",
    element: (
      <AuthGuard>
        <ArenaPage />
      </AuthGuard>
    ),
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/results/:matchId",
    element: (
      <AuthGuard>
        <ResultsPage />
      </AuthGuard>
    ),
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/profile",
    element: (
      <AuthGuard>
        <ProfilePage />
      </AuthGuard>
    ),
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/profile/:userId",
    element: (
      <AuthGuard>
        <ProfilePage />
      </AuthGuard>
    ),
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/leaderboard",
    element: (
      <AuthGuard>
        <LeaderboardPage />
      </AuthGuard>
    ),
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/shop",
    element: (
      <AuthGuard>
        <ShopPage />
      </AuthGuard>
    ),
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/admin",
    element: (
      <AuthGuard>
        <AdminPage />
      </AuthGuard>
    ),
    errorElement: <RouteErrorBoundary />,
  },
]);
export function App() {
  const { isDark } = useTheme();
  useEffect(() => {
    // Synchronize the DOM with the Zustand store state
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(isDark ? 'dark' : 'light');
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'theme-color');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', isDark ? '#09090b' : '#ffffff');
  }, [isDark]);
  return (
    <>
      <RouterProvider router={router} />
      <Toaster position="top-center" theme={isDark ? "dark" : "light"} richColors />
    </>
  );
}