import React, { useEffect, useState, useCallback } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import type { User, UpdateUserRequest } from '@shared/types';
import { toast } from 'sonner';
import {
  ProfileBanner,
  StatGrid,
  TopicMastery,
  MatchHistoryList,
  FriendsList,
  AchievementsGrid,
  ActivityHeatmap
} from '@/components/profile/ProfileComponents';
import { Loader2, AlertCircle, RefreshCw, LogOut } from 'lucide-react';
import { useCategories } from '@/hooks/use-categories';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
export function ProfilePage() {
  const currentUser = useAuthStore(s => s.user);
  const updateUser = useAuthStore(s => s.updateUser);
  const logout = useAuthStore(s => s.logout);
  const navigate = useNavigate();
  const { categories } = useCategories();
  const [user, setUser] = useState<User | null>(null);
  const [friends, setFriends] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchData = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    setError(null);
    try {
      // Fetch User
      const userData = await api<User>(`/api/users/${currentUser.id}`);
      setUser(userData);
      // Fetch Friends
      const friendsData = await api<User[]>(`/api/users/${currentUser.id}/friends`);
      setFriends(friendsData);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to load profile data');
      toast.error('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  const handleUpdateProfile = async (data: UpdateUserRequest) => {
    if (!user) return;
    try {
      const updatedUser = await api<User>(`/api/users/${user.id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
      setUser(updatedUser);
      updateUser(updatedUser); // Update global auth store
      toast.success('Profile updated!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to update profile');
      throw err; // Re-throw for component to handle state
    }
  };
  const handleAddFriend = async (friendId: string) => {
    if (!user) return;
    try {
      await api(`/api/users/${user.id}/friends`, {
        method: 'POST',
        body: JSON.stringify({ friendId: friendId.trim() })
      });
      toast.success('Friend added successfully!');
      fetchData(); // Refresh list
    } catch (err) {
      console.error(err);
      toast.error('Failed to add friend. Check ID.');
      throw err;
    }
  };
  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
        </div>
      </AppLayout>
    );
  }
  if (error) {
    return (
      <AppLayout>
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center px-4">
          <div className="p-4 rounded-full bg-red-500/10 border border-red-500/20">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-white">Something went wrong</h2>
          <p className="text-muted-foreground max-w-md">{error}</p>
          <div className="flex gap-4">
            <Button onClick={fetchData} variant="outline" className="gap-2">
                <RefreshCw className="w-4 h-4" /> Retry
            </Button>
            <Button onClick={handleLogout} variant="destructive" className="gap-2">
                <LogOut className="w-4 h-4" /> Sign Out
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }
  if (!user) return null;
  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 max-w-7xl space-y-8">
        {/* Top Section: Banner */}
        <ProfileBanner
          user={user}
          isOwnProfile={true}
          onUpdate={handleUpdateProfile}
        />
        {/* Middle Section: Stats */}
        <StatGrid user={user} />
        {/* Activity Heatmap */}
        <ActivityHeatmap activityMap={user.activityMap} />
        {/* Bottom Section: Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Content: Mastery & Achievements (8 cols) */}
          <div className="lg:col-span-8 space-y-8">
            <TopicMastery
              categories={categories}
              categoryElo={user.categoryElo}
            />
            <AchievementsGrid userAchievements={user.achievements || []} />
          </div>
          {/* Sidebar: History & Friends (4 cols) */}
          <div className="lg:col-span-4 space-y-8">
            <MatchHistoryList history={user.history || []} />
            <FriendsList friends={friends} onAddFriend={handleAddFriend} />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}