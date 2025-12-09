import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Layers, Trophy, ShoppingBag, User, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/lib/auth-store';
export function BottomNav() {
  const location = useLocation();
  const pathname = location.pathname;
  const user = useAuthStore(s => s.user);
  const isAdmin = user?.isAdmin;
  const navItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: Layers, label: 'Play', path: '/categories' },
    { icon: Trophy, label: 'Rank', path: '/leaderboard' },
    { icon: ShoppingBag, label: 'Shop', path: '/shop' },
    { icon: User, label: 'Profile', path: '/profile' },
  ];
  if (isAdmin) {
    navItems.push({ icon: Shield, label: 'Admin', path: '/admin' });
  }
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-t border-white/10 pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex items-center justify-around h-16 md:h-20">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex flex-col items-center justify-center w-full h-full gap-1 transition-all duration-200 group relative",
                  isActive ? "text-indigo-400" : "text-muted-foreground hover:text-white"
                )}
              >
                <div className={cn(
                  "p-1.5 rounded-xl transition-all duration-200",
                  isActive ? "bg-indigo-500/10" : "group-hover:bg-white/5"
                )}>
                  <item.icon className={cn("w-5 h-5 md:w-6 md:h-6", isActive && "fill-current/20")} />
                </div>
                <span className="text-[10px] md:text-xs font-medium">{item.label}</span>
                {isActive && (
                  <span className="absolute bottom-1 w-1 h-1 rounded-full bg-indigo-500" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}