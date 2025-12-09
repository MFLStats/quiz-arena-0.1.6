import React from 'react';
import { Link } from 'react-router-dom';
import { Zap } from 'lucide-react';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuthStore } from '@/lib/auth-store';
export function TopNav() {
  const user = useAuthStore(s => s.user);
  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/5 bg-black/50 backdrop-blur-xl supports-[backdrop-filter]:bg-black/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 md:h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 group-hover:shadow-[0_0_15px_rgba(99,102,241,0.5)] transition-all duration-300">
              <Zap className="w-4 h-4 md:w-5 md:h-5 text-white fill-white" />
            </div>
            <span className="font-display font-bold text-lg md:text-xl tracking-tight text-white">
              Quiz <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Arena</span>
            </span>
          </Link>
          {/* Right Actions */}
          <div className="flex items-center gap-2 md:gap-4">
            {user && (
              <>
                <NotificationCenter />
                <Link to="/profile">
                  <Avatar className="h-8 w-8 md:h-9 md:w-9 border border-white/10 hover:border-indigo-500/50 transition-colors">
                    <AvatarImage src={user.avatar} />
                    <AvatarFallback className="bg-zinc-800 text-xs">
                      {user.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}