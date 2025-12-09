import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowRight, KeyRound } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { useGameStore } from '@/lib/game-store';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';
import type { MatchState, JoinMatchRequest } from '@shared/types';
interface JoinGameModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}
export function JoinGameModal({ isOpen, onOpenChange }: JoinGameModalProps) {
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);
  const initMatch = useGameStore(s => s.initMatch);
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Please log in to join a game");
      return;
    }
    if (code.length !== 6) {
      toast.error("Code must be 6 characters");
      return;
    }
    setIsLoading(true);
    try {
      const req: JoinMatchRequest = { userId: user.id, code: code.toUpperCase() };
      const match = await api<MatchState>('/api/match/private/join', {
        method: 'POST',
        body: JSON.stringify(req)
      });
      initMatch(match);
      onOpenChange(false);
      navigate(`/arena/${match.id}`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to join game");
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-950 border-white/10 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-display font-bold text-white flex items-center gap-2">
            <KeyRound className="w-6 h-6 text-indigo-400" />
            Join Private Game
          </DialogTitle>
          <DialogDescription>
            Enter the 6-character room code shared by your friend.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleJoin} className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="room-code" className="text-xs uppercase tracking-wider text-muted-foreground">Room Code</Label>
            <Input
              id="room-code"
              placeholder="ABC123"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={6}
              className="bg-black/20 border-white/10 text-center text-2xl font-mono tracking-[0.5em] uppercase h-14"
              autoComplete="off"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isLoading || code.length !== 6} className="bg-indigo-600 hover:bg-indigo-500">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                <>Join Game <ArrowRight className="w-4 h-4 ml-2" /></>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}