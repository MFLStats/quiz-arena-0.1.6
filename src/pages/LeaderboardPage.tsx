import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Search, Globe, Users, Flag, Calendar, Filter } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import type { User } from '@shared/types';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Podium, LeaderboardList } from '@/components/leaderboard/LeaderboardComponents';
import { getFlagEmoji } from '@/lib/utils';
import { useCategories } from '@/hooks/use-categories';
import { Link } from 'react-router-dom';
export function LeaderboardPage() {
  const currentUser = useAuthStore(s => s.user);
  const { categories } = useCategories();
  const [users, setUsers] = useState<User[]>([]);
  const [friends, setFriends] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [addingFriendId, setAddingFriendId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('overall');
  const fetchData = useCallback(async () => {
    if (!currentUser) return;
    try {
      const [leaderboardData, friendsData] = await Promise.all([
        api<User[]>('/api/leaderboard'),
        api<User[]>(`/api/users/${currentUser.id}/friends`)
      ]);
      // CRITICAL FIX: Deduplicate users by ID to prevent key collisions
      const uniqueUsers = Array.from(new Map(leaderboardData.map(u => [u.id, u])).values());
      const uniqueFriends = Array.from(new Map(friendsData.map(f => [f.id, f])).values());
      setUsers(uniqueUsers);
      setFriends(uniqueFriends);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  const handleAddFriend = async (friendId: string) => {
    if (!currentUser) return;
    setAddingFriendId(friendId);
    try {
      await api(`/api/users/${currentUser.id}/friends`, {
        method: 'POST',
        body: JSON.stringify({ friendId })
      });
      toast.success('Friend added!');
      fetchData(); // Refresh to update UI state
    } catch (err) {
      console.error(err);
      toast.error('Failed to add friend');
    } finally {
      setAddingFriendId(null);
    }
  };
  const getDisplayScore = useCallback((user: User) => {
    if (selectedCategory === 'daily') {
      const today = new Date().toISOString().split('T')[0];
      if (user.dailyStats?.date === today) {
        return user.dailyStats.score;
      }
      return 0;
    }
    if (selectedCategory === 'overall') {
      return user.elo;
    }
    return user.categoryElo?.[selectedCategory] ?? 1200;
  }, [selectedCategory]);
  const scoreLabel = selectedCategory === 'daily' ? 'Pts' : (selectedCategory === 'overall' ? 'Elo' : 'Cat. Elo');
  // Filter and Sort Logic
  const processUsers = (userList: User[]) => {
    // 1. Filter by score > 0 if daily
    let filtered = userList;
    if (selectedCategory === 'daily') {
      filtered = userList.filter(u => getDisplayScore(u) > 0);
    }
    // 2. Sort by score descending
    filtered = [...filtered].sort((a, b) => getDisplayScore(b) - getDisplayScore(a));
    // 3. Filter by search
    if (search) {
      filtered = filtered.filter(u => u.name.toLowerCase().includes(search.toLowerCase()));
    }
    return filtered;
  };
  const renderContent = (list: User[], emptyMessage: string) => {
    if (loading) {
      return (
        <div className="p-12 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
        </div>
      );
    }
    const processed = processUsers(list);
    if (processed.length === 0) {
      return (
        <div className="p-12 text-center text-muted-foreground bg-white/5 rounded-2xl border border-dashed border-white/10">
          {emptyMessage}
        </div>
      );
    }
    // Split into Podium (Top 3) and List (Rest)
    // Only show podium if we are NOT searching (search breaks rank continuity visually)
    const showPodium = !search && processed.length > 0;
    const top3 = showPodium ? processed.slice(0, 3) : [];
    const rest = showPodium ? processed.slice(3) : processed;
    const startIndex = showPodium ? 3 : 0;
    return (
      <div className="space-y-8">
        {showPodium && (
          <Podium
            users={top3}
            currentUser={currentUser}
            onAddFriend={handleAddFriend}
            addingFriendId={addingFriendId}
            friends={friends}
            getDisplayScore={getDisplayScore}
            scoreLabel={scoreLabel}
          />
        )}
        <LeaderboardList
          users={rest}
          startIndex={startIndex}
          currentUser={currentUser}
          onAddFriend={handleAddFriend}
          addingFriendId={addingFriendId}
          friends={friends}
          getDisplayScore={getDisplayScore}
          scoreLabel={scoreLabel}
        />
      </div>
    );
  };
  const countryUsers = useMemo(() => 
    users.filter(u => u.country === currentUser?.country),
    [users, currentUser?.country]
  );
  return (
    <AppLayout>
      <div className="container mx-auto px-2 md:px-4 py-4 md:py-8 max-w-5xl min-h-screen">
        {/* Header */}
        <div className="text-center mb-8 md:mb-12 space-y-2 md:space-y-4">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-flex p-3 md:p-4 rounded-full bg-gradient-to-br from-yellow-400/20 to-orange-500/20 border border-yellow-500/30 mb-2 md:mb-4 shadow-[0_0_30px_rgba(234,179,8,0.2)]"
          >
            <Trophy className="w-8 h-8 md:w-12 md:h-12 text-yellow-500" />
          </motion.div>
          <h1 className="text-3xl md:text-6xl font-display font-bold tracking-tight text-white">
            Hall of Fame
          </h1>
          <p className="text-muted-foreground text-sm md:text-lg max-w-2xl mx-auto px-4">
            Rise through the ranks and etch your name in history.
          </p>
        </div>
        {/* Controls */}
        <div className="flex flex-col md:flex-row gap-3 md:gap-4 justify-between items-center mb-6 md:mb-8 sticky top-4 z-30 bg-background/80 backdrop-blur-xl p-3 md:p-4 rounded-2xl border border-white/5 shadow-lg w-full">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search players..."
              className="pl-10 bg-black/20 border-white/10 focus:bg-black/40 transition-colors h-10 md:h-12"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="w-full md:w-56">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="bg-black/20 border-white/10 h-10 md:h-12">
                <div className="flex items-center gap-2">
                  {selectedCategory === 'daily' ? <Calendar className="w-4 h-4 text-amber-400" /> : <Filter className="w-4 h-4 text-muted-foreground" />}
                  <SelectValue placeholder="Category" />
                </div>
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-white/10">
                <SelectItem value="overall">Overall Elo</SelectItem>
                <SelectItem value="daily" className="text-amber-400 font-bold">Daily Challenge</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {/* Tabs & Content */}
        <Tabs defaultValue="global" className="w-full">
          <TabsList className="grid grid-cols-3 w-full max-w-md mx-auto mb-8 md:mb-12 bg-white/5 p-1 rounded-full">
            <TabsTrigger value="global" className="rounded-full flex items-center justify-center gap-1.5 md:gap-2 data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-[10px] sm:text-xs md:text-sm px-1 md:px-3">
              <Globe className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" /> <span>Global</span>
            </TabsTrigger>
            <TabsTrigger value="country" className="rounded-full flex items-center justify-center gap-1.5 md:gap-2 data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-[10px] sm:text-xs md:text-sm px-1 md:px-3">
              <Flag className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" /> 
              <span className="sm:hidden">Country</span>
              <span className="hidden sm:inline">My Country</span>
            </TabsTrigger>
            <TabsTrigger value="friends" className="rounded-full flex items-center justify-center gap-1.5 md:gap-2 data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-[10px] sm:text-xs md:text-sm px-1 md:px-3">
              <Users className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" /> <span>Friends</span>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="global" className="mt-0 focus-visible:outline-none">
            {renderContent(users, `No players found matching "${search}"`)}
          </TabsContent>
          <TabsContent value="country" className="mt-0 focus-visible:outline-none">
            {currentUser?.country ? (
              renderContent(countryUsers, `No other players found in ${getFlagEmoji(currentUser.country)} ${currentUser.country}.`)
            ) : (
              <div className="p-12 text-center text-muted-foreground bg-white/5 rounded-2xl border border-dashed border-white/10">
                Please set your country in your profile to see local rankings.
              </div>
            )}
          </TabsContent>
          <TabsContent value="friends" className="mt-0 focus-visible:outline-none">
            {renderContent(friends, "You haven't added any friends yet.")}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}