import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Plus, Save, Trash2, Pencil, CheckCircle, Calendar, Coins, Crown } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { toast } from 'sonner';
import type { BattlePassSeason, BattlePassLevel, BattlePassReward } from '@shared/types';
const seasonSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  description: z.string().min(5, "Description must be at least 5 characters"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  coinPrice: z.number().min(0, "Price must be positive"),
});
type SeasonFormData = z.infer<typeof seasonSchema>;
export function BattlePassManager() {
  const user = useAuthStore(s => s.user);
  const [seasons, setSeasons] = useState<BattlePassSeason[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingSeason, setEditingSeason] = useState<BattlePassSeason | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm<SeasonFormData>({
    resolver: zodResolver(seasonSchema),
  });
  const fetchSeasons = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const data = await api<BattlePassSeason[]>(`/api/admin/battle-pass?userId=${user.id}`);
      setSeasons(data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load seasons");
    } finally {
      setIsLoading(false);
    }
  }, [user]);
  useEffect(() => {
    fetchSeasons();
  }, [fetchSeasons]);
  const handleCreate = () => {
    setEditingSeason(null);
    reset({
      name: '',
      description: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      coinPrice: 15000
    });
    setIsDialogOpen(true);
  };
  const handleEdit = (season: BattlePassSeason) => {
    setEditingSeason(season);
    reset({
      name: season.name,
      description: season.description,
      startDate: season.startDate.split('T')[0],
      endDate: season.endDate.split('T')[0],
      coinPrice: season.coinPrice
    });
    setIsDialogOpen(true);
  };
  const handleDelete = async (id: string) => {
    if (!user || !confirm("Are you sure? This cannot be undone.")) return;
    try {
      await api(`/api/admin/battle-pass/${id}?userId=${user.id}`, { method: 'DELETE' });
      setSeasons(prev => prev.filter(s => s.id !== id));
      toast.success("Season deleted");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete season");
    }
  };
  const handleActivate = async (id: string) => {
    if (!user) return;
    try {
      await api(`/api/admin/battle-pass/${id}/activate?userId=${user.id}`, { method: 'POST' });
      setSeasons(prev => prev.map(s => ({ ...s, isActive: s.id === id })));
      toast.success("Season activated");
    } catch (err) {
      console.error(err);
      toast.error("Failed to activate season");
    }
  };
  const onSubmit = async (data: SeasonFormData) => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      const payload: Partial<BattlePassSeason> = {
        ...data,
        // If creating new, initialize with empty levels or default structure
        levels: editingSeason ? editingSeason.levels : Array.from({ length: 50 }, (_, i) => ({ level: i + 1, xpRequired: (i + 1) * 100 })),
        isActive: editingSeason ? editingSeason.isActive : false
      };
      if (editingSeason) {
        await api(`/api/admin/battle-pass/${editingSeason.id}?userId=${user.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        toast.success("Season updated");
      } else {
        await api(`/api/admin/battle-pass?userId=${user.id}`, {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        toast.success("Season created");
      }
      setIsDialogOpen(false);
      fetchSeasons();
    } catch (err) {
      console.error(err);
      toast.error("Failed to save season");
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-white">Battle Pass Seasons</h2>
          <p className="text-sm text-muted-foreground">Manage seasonal content and rewards.</p>
        </div>
        <Button onClick={handleCreate} className="gap-2">
          <Plus className="w-4 h-4" /> Create Season
        </Button>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {seasons.map(season => (
            <Card key={season.id} className={`bg-zinc-900/50 border-white/10 ${season.isActive ? 'border-indigo-500/50 ring-1 ring-indigo-500/20' : ''}`}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {season.name}
                      {season.isActive && <span className="text-xs bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-500/30">Active</span>}
                    </CardTitle>
                    <CardDescription>{season.description}</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button size="icon" variant="ghost" onClick={() => handleEdit(season)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="destructive" onClick={() => handleDelete(season.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {new Date(season.startDate).toLocaleDateString()} - {new Date(season.endDate).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-2">
                    <Coins className="w-4 h-4" />
                    {season.coinPrice.toLocaleString()} Coins
                  </div>
                  <div className="flex items-center gap-2">
                    <Crown className="w-4 h-4" />
                    {season.levels.length} Levels
                  </div>
                </div>
                {!season.isActive && (
                  <Button variant="outline" className="w-full mt-4" onClick={() => handleActivate(season.id)}>
                    Set Active
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-zinc-950 border-white/10 max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingSeason ? 'Edit Season' : 'New Season'}</DialogTitle>
            <DialogDescription>Configure season details. Levels can be edited via JSON import/export (Coming Soon).</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input {...register('name')} className="bg-black/20 border-white/10" />
              {errors.name && <p className="text-xs text-red-400">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea {...register('description')} className="bg-black/20 border-white/10" />
              {errors.description && <p className="text-xs text-red-400">{errors.description.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input type="date" {...register('startDate')} className="bg-black/20 border-white/10" />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input type="date" {...register('endDate')} className="bg-black/20 border-white/10" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Price (Coins)</Label>
              <Input type="number" {...register('coinPrice', { valueAsNumber: true })} className="bg-black/20 border-white/10" />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}