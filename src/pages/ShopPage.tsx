import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ShoppingBag, Coins, Lock, Check, Loader2, Package, Sparkles, Crown, RefreshCw, AlertCircle, LogOut } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { useShop } from '@/hooks/use-shop';
import type { User, PurchaseItemRequest, EquipItemRequest, ShopItem } from '@shared/types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { SeasonPass } from '@/components/shop/SeasonPass';
import { Link, useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { playSfx } from '@/lib/sound-fx';
export function ShopPage() {
  const currentUser = useAuthStore(s => s.user);
  const currentUserId = useAuthStore(s => s.user?.id);
  const updateUser = useAuthStore(s => s.updateUser);
  const logout = useAuthStore(s => s.logout);
  const navigate = useNavigate();
  const { items: shopItems, loading: shopLoading, error: shopError, refresh: refreshShop } = useShop();
  const [userCurrency, setUserCurrency] = useState(0);
  const [inventory, setInventory] = useState<string[]>([]);
  const [userLoading, setUserLoading] = useState(true);
  const [userError, setUserError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [mysteryBoxResult, setMysteryBoxResult] = useState<ShopItem | null>(null);
  const [itemToBuy, setItemToBuy] = useState<ShopItem | null>(null);
  const fetchUserData = useCallback(async () => {
    if (!currentUserId) {
      setUserLoading(false);
      return;
    }
    setUserLoading(true);
    setUserError(null);
    try {
      const user = await api<User>(`/api/users/${currentUserId}`);
      setUserCurrency(user.currency || 0);
      setInventory(user.inventory || []);
      updateUser(user);
    } catch (err: any) {
      console.error('Failed to fetch user data:', err);
      setUserError(err.message || 'Failed to load shop data');
      const fallbackUser = useAuthStore.getState().user;
      if (fallbackUser) {
        setUserCurrency(fallbackUser.currency || 0);
        setInventory(fallbackUser.inventory || []);
      }
    } finally {
      setUserLoading(false);
    }
  }, [currentUserId, updateUser]);
  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);
  const { avatars, banners, frames, boxes } = useMemo(() => ({
    avatars: shopItems.filter(i => i.type === 'avatar'),
    banners: shopItems.filter(i => i.type === 'banner'),
    frames: shopItems.filter(i => i.type === 'frame'),
    boxes: shopItems.filter(i => i.type === 'box'),
  }), [shopItems]);
  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  const initiatePurchase = (item: ShopItem) => {
    if (!currentUser) return;
    if (userCurrency < item.price) {
      toast.error("Not enough coins!");
      return;
    }
    setItemToBuy(item);
  };
  const confirmPurchase = async () => {
    if (!currentUser || !itemToBuy) return;
    const item = itemToBuy;
    setProcessingId(item.id);
    setItemToBuy(null);
    try {
      const req: PurchaseItemRequest = { userId: currentUser.id, itemId: item.id };
      const updatedUser = await api<User>('/api/shop/purchase', {
        method: 'POST',
        body: JSON.stringify(req)
      });
      // Play purchase sound immediately
      playSfx('purchase');
      // If box, add suspense
      if (item.type === 'box') {
        // Wait for 1.5s to build suspense
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
      setUserCurrency(updatedUser.currency || 0);
      setInventory(updatedUser.inventory || []);
      updateUser(updatedUser);
      // Trigger effects
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#fbbf24', '#f59e0b', '#d97706']
      });
      if (item.type === 'box') {
        const oldInv = new Set(inventory);
        const newInv = updatedUser.inventory || [];
        const awardedId = newInv.find(id => !oldInv.has(id));
        if (awardedId) {
          const awardedItem = shopItems.find(i => i.id === awardedId);
          if (awardedItem) {
            setMysteryBoxResult(awardedItem);
            // Play win sound for the reveal
            playSfx('win'); 
          }
        } else {
          toast.success("Mystery Box opened! Check your inventory.");
        }
      } else {
        toast.success("Item purchased successfully!");
      }
    } catch (err) {
      console.error(err);
      toast.error("Purchase failed");
    } finally {
      setProcessingId(null);
    }
  };
  const handleEquip = async (itemId: string, type: any) => {
    if (!currentUser) return;
    setProcessingId(itemId);
    try {
      const req: EquipItemRequest = { userId: currentUser.id, itemId, type };
      const updatedUser = await api<User>('/api/shop/equip', {
        method: 'POST',
        body: JSON.stringify(req)
      });
      updateUser(updatedUser);
      toast.success(`${type} equipped!`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to equip item");
    } finally {
      setProcessingId(null);
    }
  };
  const loading = shopLoading || userLoading;
  const error = shopError || userError;
  if (loading) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-12">
            <div className="space-y-2">
              <Skeleton className="h-10 w-48 bg-white/10" />
              <Skeleton className="h-4 w-64 bg-white/5" />
            </div>
            <Skeleton className="h-12 w-32 rounded-full bg-white/10" />
          </div>
          <div className="space-y-8">
            <Skeleton className="h-10 w-full max-w-3xl bg-white/5 rounded-lg" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="rounded-xl border border-white/5 bg-white/5 overflow-hidden">
                  <Skeleton className="h-48 w-full bg-white/5" />
                  <div className="p-4 space-y-3">
                    <Skeleton className="h-6 w-3/4 bg-white/5" />
                    <Skeleton className="h-4 w-full bg-white/5" />
                    <Skeleton className="h-10 w-full bg-white/5 rounded-md mt-4" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }
  if (!currentUser) {
    return (
      <AppLayout>
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center px-4">
          <div className="p-4 rounded-full bg-indigo-500/10 border border-indigo-500/20">
            <Lock className="w-8 h-8 text-indigo-400" />
          </div>
          <h2 className="text-xl font-bold text-white">Sign in to Shop</h2>
          <p className="text-muted-foreground max-w-md">You need to be logged in to access the shop and manage your inventory.</p>
          <Link to="/login">
            <Button className="gap-2">
              Sign In
            </Button>
          </Link>
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
            <Button onClick={() => { fetchUserData(); refreshShop(); }} variant="outline" className="gap-2">
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
  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-12">
          <div>
            <h1 className="text-4xl font-display font-bold mb-2 flex items-center gap-3">
              <ShoppingBag className="w-10 h-10 text-indigo-400" /> Item Shop
            </h1>
            <p className="text-muted-foreground">Customize your profile with exclusive cosmetics.</p>
          </div>
          <div className="flex items-center gap-2 px-6 py-3 bg-yellow-500/10 border border-yellow-500/20 rounded-full">
            <Coins className="w-6 h-6 text-yellow-500" />
            <span className="text-2xl font-bold text-yellow-500 tabular-nums">{userCurrency}</span>
          </div>
        </div>
        <Tabs defaultValue="season" className="w-full">
          <TabsList className="grid w-full max-w-3xl grid-cols-5 mb-8 bg-white/5">
            <TabsTrigger value="season" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-purple-600 data-[state=active]:text-white">
              <Crown className="w-4 h-4 mr-2" /> Holiday Season
            </TabsTrigger>
            <TabsTrigger value="avatars">Avatars</TabsTrigger>
            <TabsTrigger value="banners">Banners</TabsTrigger>
            <TabsTrigger value="frames">Frames</TabsTrigger>
            <TabsTrigger value="boxes">Boxes</TabsTrigger>
          </TabsList>
          <TabsContent value="season" className="mt-0">
            <SeasonPass user={currentUser} />
          </TabsContent>
          <TabsContent value="avatars" className="mt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {avatars.map((item, i) => (
                <ShopItemCard
                  key={item.id}
                  item={item}
                  index={i}
                  purchased={inventory.includes(item.id)}
                  equipped={currentUser?.avatar === item.assetUrl}
                  canAfford={userCurrency >= item.price}
                  isProcessing={processingId === item.id}
                  onBuy={() => initiatePurchase(item)}
                  onEquip={() => handleEquip(item.id, 'avatar')}
                />
              ))}
            </div>
          </TabsContent>
          <TabsContent value="banners" className="mt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {banners.map((item, i) => (
                <ShopItemCard
                  key={item.id}
                  item={item}
                  index={i}
                  purchased={inventory.includes(item.id)}
                  equipped={currentUser?.banner === item.assetUrl}
                  canAfford={userCurrency >= item.price}
                  isProcessing={processingId === item.id}
                  onBuy={() => initiatePurchase(item)}
                  onEquip={() => handleEquip(item.id, 'banner')}
                />
              ))}
            </div>
          </TabsContent>
          <TabsContent value="frames" className="mt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {frames.map((item, i) => (
                <ShopItemCard
                  key={item.id}
                  item={item}
                  index={i}
                  purchased={inventory.includes(item.id)}
                  equipped={currentUser?.frame === item.assetUrl}
                  canAfford={userCurrency >= item.price}
                  isProcessing={processingId === item.id}
                  onBuy={() => initiatePurchase(item)}
                  onEquip={() => handleEquip(item.id, 'frame')}
                />
              ))}
            </div>
          </TabsContent>
          <TabsContent value="boxes" className="mt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {boxes.map((item, i) => (
                <ShopItemCard
                  key={item.id}
                  item={item}
                  index={i}
                  purchased={false}
                  equipped={false}
                  canAfford={userCurrency >= item.price}
                  isProcessing={processingId === item.id}
                  onBuy={() => initiatePurchase(item)}
                  onEquip={() => {}}
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>
        <AlertDialog open={!!itemToBuy} onOpenChange={(open) => !open && setItemToBuy(null)}>
          <AlertDialogContent className="bg-zinc-950 border-white/10">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Confirm Purchase</AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground">
                Are you sure you want to buy <span className="font-bold text-white">{itemToBuy?.name}</span> for <span className="font-bold text-yellow-500">{itemToBuy?.price} Coins</span>?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-white/10 bg-white/5 hover:bg-white/10 text-white hover:text-white">Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmPurchase} className="bg-indigo-600 hover:bg-indigo-500 text-white">Confirm</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <Dialog open={!!mysteryBoxResult} onOpenChange={() => setMysteryBoxResult(null)}>
          <DialogContent className="bg-zinc-950 border-white/10 text-center sm:max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-2xl font-display text-white">Item Unlocked!</DialogTitle>
              <DialogDescription className="sr-only">You have unlocked a new item</DialogDescription>
            </DialogHeader>
            {mysteryBoxResult && (
              <div className="py-8 flex flex-col items-center animate-in zoom-in duration-500">
                <div className={cn(
                  "w-32 h-32 rounded-full flex items-center justify-center mb-6 relative",
                  mysteryBoxResult.rarity === 'legendary' ? "bg-yellow-500/20 shadow-[0_0_50px_rgba(234,179,8,0.5)]" :
                  mysteryBoxResult.rarity === 'epic' ? "bg-purple-500/20 shadow-[0_0_50px_rgba(168,85,247,0.5)]" :
                  "bg-blue-500/20"
                )}>
                  <Sparkles className={cn(
                    "absolute -top-4 -right-4 w-8 h-8 animate-bounce",
                    mysteryBoxResult.rarity === 'legendary' ? "text-yellow-400" : "text-white"
                  )} />
                  {mysteryBoxResult.type === 'avatar' ? (
                    <img src={mysteryBoxResult.assetUrl} className="w-24 h-24 rounded-full" />
                  ) : (
                    <div className="w-24 h-16 rounded bg-cover bg-center" style={{ background: mysteryBoxResult.assetUrl }} />
                  )}
                </div>
                <h3 className={cn(
                  "text-xl font-bold mb-1",
                  mysteryBoxResult.rarity === 'legendary' ? "text-yellow-400" :
                  mysteryBoxResult.rarity === 'epic' ? "text-purple-400" :
                  mysteryBoxResult.rarity === 'rare' ? "text-blue-400" : "text-white"
                )}>
                  {mysteryBoxResult.name}
                </h3>
                <p className="text-sm text-muted-foreground uppercase tracking-widest">{mysteryBoxResult.rarity}</p>
              </div>
            )}
            <Button onClick={() => setMysteryBoxResult(null)}>Awesome!</Button>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
function ShopItemCard({ item, index, purchased, equipped, canAfford, isProcessing, onBuy, onEquip }: any) {
  const rarityColors = {
    common: "border-white/10",
    rare: "border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.1)]",
    epic: "border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.2)]",
    legendary: "border-yellow-500/50 shadow-[0_0_20px_rgba(234,179,8,0.3)]"
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className={cn(
        "overflow-hidden bg-white/5 hover:bg-white/10 transition-all duration-300 group border-2",
        rarityColors[item.rarity as keyof typeof rarityColors],
        equipped && "border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.2)]"
      )}>
        <div className="aspect-square relative p-8 flex items-center justify-center bg-black/20">
          {item.type === 'avatar' ? (
            <img
              src={item.assetUrl}
              alt={item.name}
              className="w-32 h-32 rounded-full shadow-2xl group-hover:scale-110 transition-transform duration-300"
            />
          ) : item.type === 'box' ? (
            <Package className={cn(
              "w-24 h-24 group-hover:scale-110 transition-transform duration-300",
              item.rarity === 'legendary' ? "text-yellow-400" :
              item.rarity === 'rare' ? "text-blue-400" : "text-white"
            )} />
          ) : item.type === 'frame' ? (
            <div className={cn("w-32 h-32 rounded-full flex items-center justify-center relative", item.assetUrl)}>
               <div className="w-full h-full rounded-full bg-white/10" />
            </div>
          ) : (
            <div
              className="w-full h-24 rounded-lg shadow-lg group-hover:scale-105 transition-transform duration-300"
              style={{ background: item.assetUrl }}
            />
          )}
          {equipped && (
            <div className="absolute top-4 right-4 bg-emerald-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
              EQUIPPED
            </div>
          )}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-black/60 text-white/80">
            {item.rarity}
          </div>
        </div>
        <CardHeader>
          <CardTitle className="flex justify-between items-start">
            <span className="truncate pr-2">{item.name}</span>
            {purchased && !equipped && item.type !== 'box' && <Check className="w-5 h-5 text-indigo-500 flex-shrink-0" />}
          </CardTitle>
          <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5em]">{item.description}</p>
        </CardHeader>
        <CardFooter>
          {purchased && item.type !== 'box' ? (
            <Button
              className={cn(
                "w-full font-bold",
                equipped ? "bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30" : "bg-indigo-600 hover:bg-indigo-500"
              )}
              variant={equipped ? "ghost" : "default"}
              disabled={equipped || isProcessing}
              onClick={onEquip}
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : equipped ? (
                "Equipped"
              ) : (
                "Equip"
              )}
            </Button>
          ) : (
            <Button
              className="w-full font-bold"
              variant={canAfford ? "default" : "secondary"}
              disabled={!canAfford || isProcessing}
              onClick={onBuy}
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <span className="flex items-center gap-2">
                  {!canAfford && <Lock className="w-4 h-4" />}
                  {item.price} Coins
                </span>
              )}
            </Button>
          )}
        </CardFooter>
      </Card>
    </motion.div>
  );
}