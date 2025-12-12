import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAudioStore } from '@/lib/audio-store';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/lib/auth-store';
import { Volume2, Monitor, User, LogOut, VolumeX, Trash2, Loader2, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';
interface SettingsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}
export function SettingsDialog({ isOpen, onOpenChange }: SettingsDialogProps) {
  const { masterVolume, sfxVolume, setMasterVolume, setSfxVolume } = useAudioStore();
  const { isDark, toggleTheme } = useTheme();
  const user = useAuthStore(s => s.user);
  const logout = useAuthStore(s => s.logout);
  const navigate = useNavigate();
  const [isDeleting, setIsDeleting] = useState(false);
  const handleLogout = () => {
    logout();
    onOpenChange(false);
    navigate('/login');
  };
  const handleDeleteAccount = async () => {
    if (!user) return;
    setIsDeleting(true);
    try {
      await api(`/api/users/${user.id}?userId=${user.id}`, {
        method: 'DELETE'
      });
      toast.success("Account deleted successfully");
      handleLogout();
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete account");
      setIsDeleting(false);
    }
  };
  const handleResetApp = () => {
    if (confirm("This will clear all local data and reload the application. You will need to sign in again. Continue?")) {
      localStorage.clear();
      sessionStorage.clear();
      window.location.reload();
    }
  };
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-950/95 border-white/10 backdrop-blur-xl sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-display font-bold text-white">Settings</DialogTitle>
          <DialogDescription>
            Customize your Trivium Arena experience.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="audio" className="w-full mt-4">
          <TabsList className="grid w-full grid-cols-3 bg-white/5">
            <TabsTrigger value="audio">Audio</TabsTrigger>
            <TabsTrigger value="appearance">Visuals</TabsTrigger>
            <TabsTrigger value="account">Account</TabsTrigger>
          </TabsList>
          {/* Audio Settings */}
          <TabsContent value="audio" className="space-y-6 py-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-white flex items-center gap-2">
                    {masterVolume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    Master Volume
                  </Label>
                  <span className="text-xs text-muted-foreground">{Math.round(masterVolume * 100)}%</span>
                </div>
                <Slider
                  value={[masterVolume]}
                  max={1}
                  step={0.01}
                  onValueChange={([v]) => setMasterVolume(v)}
                  className="[&_.bg-primary]:bg-indigo-500"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-white">Sound Effects</Label>
                  <span className="text-xs text-muted-foreground">{Math.round(sfxVolume * 100)}%</span>
                </div>
                <Slider
                  value={[sfxVolume]}
                  max={1}
                  step={0.01}
                  onValueChange={([v]) => setSfxVolume(v)}
                  className="[&_.bg-primary]:bg-emerald-500"
                />
              </div>
            </div>
          </TabsContent>
          {/* Appearance Settings */}
          <TabsContent value="appearance" className="space-y-6 py-4">
            <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5">
              <div className="space-y-1">
                <Label className="text-base text-white flex items-center gap-2">
                  <Monitor className="w-4 h-4" /> Dark Mode
                </Label>
                <p className="text-xs text-muted-foreground">
                  Toggle between light and dark themes.
                </p>
              </div>
              <Switch
                checked={isDark}
                onCheckedChange={toggleTheme}
                className="data-[state=checked]:bg-indigo-500"
              />
            </div>
          </TabsContent>
          {/* Account Settings */}
          <TabsContent value="account" className="space-y-6 py-4">
            {user ? (
              <div className="space-y-6">
                <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-white">{user.name}</div>
                      <div className="text-xs text-muted-foreground">{user.email || 'Guest Account'}</div>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-white/5 flex justify-between text-xs text-muted-foreground">
                    <span>ID: {user.id.substring(0, 8)}...</span>
                    <span>Provider: {user.provider}</span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="w-full gap-2 border-white/10 hover:bg-white/5"
                  onClick={handleLogout}
                >
                  <LogOut className="w-4 h-4" /> Sign Out
                </Button>
                {/* Danger Zone */}
                <div className="pt-4 border-t border-white/10 space-y-3">
                  <h4 className="text-sm font-bold text-red-400 mb-2">Danger Zone</h4>
                  <Button
                    variant="outline"
                    className="w-full border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                    onClick={handleResetApp}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" /> Reset Application
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20">
                        <Trash2 className="w-4 h-4 mr-2" /> Delete Account
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-zinc-950 border-white/10">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-white">Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete your account and remove your data from our servers.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDeleteAccount}
                          className="bg-red-600 hover:bg-red-700 text-white"
                          disabled={isDeleting}
                        >
                          {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete Account'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground">
                Please sign in to view account settings.
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}