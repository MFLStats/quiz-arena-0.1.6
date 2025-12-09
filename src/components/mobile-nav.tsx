import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Layers, Trophy, ShoppingBag, User } from 'lucide-react';
import { cn } from '@/lib/utils';
export function MobileNav() {
  const location = useLocation();
  const pathname = location.pathname;
  const navItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: Layers, label: 'Play', path: '/categories' },
    { icon: Trophy, label: 'Rank', path: '/leaderboard' },
    { icon: ShoppingBag, label: 'Shop', path: '/shop' },
    { icon: User, label: 'Profile', path: '/profile' },
  ];
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-t border-white/10 pb-[env(safe-area-inset-bottom)]">
      <nav className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full gap-1 transition-colors duration-200",
                isActive ? "text-indigo-400" : "text-muted-foreground hover:text-white"
              )}
            >
              <item.icon className={cn("w-5 h-5", isActive && "fill-current/20")} />
              <span className="text-[10px] font-medium">{item.label}</span>
              {isActive && (
                <span className="absolute bottom-1 w-1 h-1 rounded-full bg-indigo-500" />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}