import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ShoppingBag, Coins, Lock, Check, Loader2, Package, Sparkles, Crown, RefreshCw, AlertCircle, LogOut, Image as ImageIcon } from 'lucide-react';
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
import type { User, PurchaseItemRequest, EquipItemRequest, ShopItem, UnequipItemRequest } from '@shared/types';
import { toast } from 'sonner';
import { cn, isImageUrl, getBackgroundStyle } from '@/lib/utils';
import { SeasonPass } from '@/components/shop/SeasonPass';
import { Link, useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { playSfx } from '@/lib/sound-fx';
import { useTheme } from '@/hooks/use-theme';
function EmptyShopState({ title, description }: { title: string, description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-white/10 rounded-xl bg-white/5">
      <div className="p-4 rounded-full bg-white/5 mb-4">
        <ShoppingBag className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-bold text-white mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-xs">{description}</p>
    </div>
  );
}
export function ShopPage() {
  const currentUser = useAuthStore(s => s.user);
  const currentUserId = useAuthStore(s => s.user?.id);
  const updateUser = useAuthStore(s => s.updateUser);
  const logout = useAuthStore(s => s.logout);
  const navigate = useNavigate();
  const { items: shopItems, loading: shopLoading, error: shopError, refresh: refreshShop } = useShop();
  const [userLoading, setUserLoading] = useState(true);
  const [userError, setUserError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [mysteryBoxResult, setMysteryBoxResult] = useState<ShopItem | null>(null);
  const [itemToBuy, setItemToBuy] = useState<ShopItem | null>(null);
  const { reduceMotion } = useTheme();
  const fetchUserData = useCallback(async () => {
    if (!currentUserId) {
      setUserLoading(false);
      return;
    }
    setUserLoading(true);
    setUserError(null);
    try {
      const user = await api<User>(`/api/users/${currentUserId}`);
      updateUser(user);
    } catch (err: any) {
      console.error('Failed to fetch user data:', err);
      setUserError(err.message || 'Failed to load shop data');
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
    if ((currentUser.currency || 0) < item.price) {
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
      playSfx('purchase');
      if (item.type === 'box') {
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
      updateUser(updatedUser);
      if (!reduceMotion) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#fbbf24', '#f59e0b', '#d97706']
        });
      }
      if (item.type === 'box') {
        const oldInv = new Set(currentUser.inventory || []);
        const newInv = updatedUser.inventory || [];
        const awardedId = newInv.find(id => !oldInv.has(id));
        if (awardedId) {
          const awardedItem = shopItems.find(i => i.id === awardedId);
          if (awardedItem) {
            setMysteryBoxResult(awardedItem);
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
  const handleUnequip = async (itemId: string, type: 'frame' | 'banner' | 'title') => {
    if (!currentUser) return;
    setProcessingId(itemId);
    try {
      const req: UnequipItemRequest = { userId: currentUser.id, type };
      const updatedUser = await api<User>('/api/shop/unequip', {
        method: 'POST',
        body: JSON.stringify(req)
      });
      updateUser(updatedUser);
      toast.success(`${type} unequipped!`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to unequip item");
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
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="rounded-xl border border-white/5 bg-white/5 overflow-hidden">
                  <Skeleton className="h-32 w-full bg-white/5" />
                  <div className="p-3 space-y-2">
                    <Skeleton className="h-4 w-3/4 bg-white/5" />
                    <Skeleton className="h-8 w-full bg-white/5 rounded-md mt-2" />
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
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
          <div className="text-center md:text-left">
            <h1 className="text-3xl font-display font-bold mb-1 flex items-center justify-center md:justify-start gap-2">
              <ShoppingBag className="w-8 h-8 text-indigo-400" /> Item Shop
            </h1>
            <p className="text-sm text-muted-foreground">Customize your profile with exclusive cosmetics.</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-full">
            <Coins className="w-5 h-5 text-yellow-500" />
            <span className="text-xl font-bold text-yellow-500 tabular-nums">{currentUser.currency || 0}</span>
          </div>
        </div>
        <Tabs defaultValue="season" className="w-full">
          <div className="w-full overflow-x-auto pb-2 mb-4 scrollbar-hide">
            <TabsList className="flex w-max bg-white/5 p-1">
              <TabsTrigger value="season" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-purple-600 data-[state=active]:text-white px-4">
                <Crown className="w-4 h-4 mr-2" /> Season
              </TabsTrigger>
              <TabsTrigger value="avatars" className="px-4">Avatars</TabsTrigger>
              <TabsTrigger value="banners" className="px-4">Banners</TabsTrigger>
              <TabsTrigger value="frames" className="px-4">Frames</TabsTrigger>
              <TabsTrigger value="boxes" className="px-4">Boxes</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="season" className="mt-0">
            <SeasonPass user={currentUser} />
          </TabsContent>
          <TabsContent value="avatars" className="mt-0">
            {avatars.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {avatars.map((item, i) => (
                  <ShopItemCard
                    key={item.id}
                    item={item}
                    index={i}
                    purchased={currentUser.inventory?.includes(item.id)}
                    equipped={currentUser?.avatar === item.assetUrl}
                    canAfford={(currentUser.currency || 0) >= item.price}
                    isProcessing={processingId === item.id}
                    onBuy={() => initiatePurchase(item)}
                    onEquip={() => handleEquip(item.id, 'avatar')}
                    // Avatar cannot be unequipped to "nothing", so no unequip handler
                  />
                ))}
              </div>
            ) : (
              <EmptyShopState title="No Avatars" description="Check back later!" />
            )}
          </TabsContent>
          <TabsContent value="banners" className="mt-0">
            {banners.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {banners.map((item, i) => (
                  <ShopItemCard
                    key={item.id}
                    item={item}
                    index={i}
                    purchased={currentUser.inventory?.includes(item.id)}
                    equipped={currentUser?.banner === item.assetUrl}
                    canAfford={(currentUser.currency || 0) >= item.price}
                    isProcessing={processingId === item.id}
                    onBuy={() => initiatePurchase(item)}
                    onEquip={() => handleEquip(item.id, 'banner')}
                    onUnequip={() => handleUnequip(item.id, 'banner')}
                  />
                ))}
              </div>
            ) : (
              <EmptyShopState title="No Banners" description="Check back later!" />
            )}
          </TabsContent>
          <TabsContent value="frames" className="mt-0">
            {frames.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {frames.map((item, i) => (
                  <ShopItemCard
                    key={item.id}
                    item={item}
                    index={i}
                    purchased={currentUser.inventory?.includes(item.id)}
                    equipped={currentUser?.frame === item.assetUrl}
                    canAfford={(currentUser.currency || 0) >= item.price}
                    isProcessing={processingId === item.id}
                    onBuy={() => initiatePurchase(item)}
                    onEquip={() => handleEquip(item.id, 'frame')}
                    onUnequip={() => handleUnequip(item.id, 'frame')}
                  />
                ))}
              </div>
            ) : (
              <EmptyShopState title="No Frames" description="Check back later!" />
            )}
          </TabsContent>
          <TabsContent value="boxes" className="mt-0">
            {boxes.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {boxes.map((item, i) => (
                  <ShopItemCard
                    key={item.id}
                    item={item}
                    index={i}
                    purchased={false}
                    equipped={false}
                    canAfford={(currentUser.currency || 0) >= item.price}
                    isProcessing={processingId === item.id}
                    onBuy={() => initiatePurchase(item)}
                    onEquip={() => {}}
                  />
                ))}
              </div>
            ) : (
              <EmptyShopState title="No Boxes" description="Check back later!" />
            )}
          </TabsContent>
        </Tabs>
        <AlertDialog open={!!itemToBuy} onOpenChange={(open) => !open && setItemToBuy(null)}>
          <AlertDialogContent className="bg-zinc-950 border-white/10">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Confirm Purchase</AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground">
                Buy <span className="font-bold text-white">{itemToBuy?.name}</span> for <span className="font-bold text-yellow-500">{itemToBuy?.price} Coins</span>?
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
                    <div className="w-24 h-16 rounded bg-cover bg-center" style={getBackgroundStyle(mysteryBoxResult.assetUrl)} />
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
function ShopItemCard({ item, index, purchased, equipped, canAfford, isProcessing, onBuy, onEquip, onUnequip }: any) {
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
        "overflow-hidden bg-white/5 hover:bg-white/10 transition-all duration-300 group border-2 h-full flex flex-col",
        rarityColors[item.rarity as keyof typeof rarityColors],
        equipped && "border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.2)]"
      )}>
        <div className="aspect-square relative p-4 flex items-center justify-center bg-black/20">
          {item.type === 'avatar' ? (
            <img
              src={item.assetUrl}
              alt={item.name}
              className="w-24 h-24 md:w-32 md:h-32 rounded-full shadow-2xl group-hover:scale-110 transition-transform duration-300"
            />
          ) : item.type === 'box' ? (
            <Package className={cn(
              "w-20 h-20 md:w-24 md:h-24 group-hover:scale-110 transition-transform duration-300",
              item.rarity === 'legendary' ? "text-yellow-400" :
              item.rarity === 'rare' ? "text-blue-400" : "text-white"
            )} />
          ) : item.type === 'frame' ? (
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full flex items-center justify-center relative">
               <div className="w-full h-full rounded-full bg-white/10" />
               {isImageUrl(item.assetUrl) ? (
                   <img src={item.assetUrl} className="absolute inset-0 w-full h-full object-contain scale-110 z-10 pointer-events-none" alt={item.name} />
               ) : (
                   <div className={cn("absolute inset-0 rounded-full z-10 pointer-events-none", item.assetUrl)} />
               )}
            </div>
          ) : (
            <div
              className="w-full h-16 md:h-24 rounded-lg shadow-lg group-hover:scale-105 transition-transform duration-300"
              style={getBackgroundStyle(item.assetUrl)}
            />
          )}
          {equipped && (
            <div className="absolute top-2 right-2 bg-emerald-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-lg">
              EQUIPPED
            </div>
          )}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[9px] md:text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-black/60 text-white/80">
            {item.rarity}
          </div>
        </div>
        <CardHeader className="p-3 md:p-4 flex-1">
          <CardTitle className="flex justify-between items-start text-sm md:text-base">
            <span className="truncate pr-1">{item.name}</span>
            {purchased && !equipped && item.type !== 'box' && <Check className="w-4 h-4 text-indigo-500 flex-shrink-0" />}
          </CardTitle>
          <p className="text-xs text-muted-foreground line-clamp-2 hidden sm:block mt-1">{item.description}</p>
        </CardHeader>
        <CardFooter className="p-3 md:p-4 pt-0">
          {purchased && item.type !== 'box' ? (
            equipped ? (
               <Button
                  className="w-full font-bold h-8 md:h-10 text-xs md:text-sm bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20"
                  variant="outline"
                  disabled={isProcessing}
                  onClick={onUnequip}
                >
                  {isProcessing ? <Loader2 className="w-3 h-3 md:w-4 md:h-4 animate-spin" /> : "Unequip"}
                </Button>
            ) : (
              <Button
                className="w-full font-bold h-8 md:h-10 text-xs md:text-sm bg-indigo-600 hover:bg-indigo-500"
                variant="default"
                disabled={isProcessing}
                onClick={onEquip}
              >
                {isProcessing ? (
                  <Loader2 className="w-3 h-3 md:w-4 md:h-4 animate-spin" />
                ) : (
                  "Equip"
                )}
              </Button>
            )
          ) : (
            <Button
              className="w-full font-bold h-8 md:h-10 text-xs md:text-sm"
              variant={canAfford ? "default" : "secondary"}
              disabled={!canAfford || isProcessing}
              onClick={onBuy}
            >
              {isProcessing ? (
                <Loader2 className="w-3 h-3 md:w-4 md:h-4 animate-spin" />
              ) : (
                <span className="flex items-center gap-1.5">
                  {!canAfford && <Lock className="w-3 h-3" />}
                  {item.price}
                </span>
              )}
            </Button>
          )}
        </CardFooter>
      </Card>
    </motion.div>
  );
}