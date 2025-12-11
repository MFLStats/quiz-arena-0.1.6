import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dices, Check, Palette, User, Smile, Shirt, Loader2, ImageOff, RefreshCw, Ban, Download, Info } from 'lucide-react';
import { AVATAR_OPTIONS, AVATAR_TOPS_SHORT, AVATAR_TOPS_LONG } from '@shared/constants';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
interface AvatarCreatorProps {
  initialUrl?: string;
  onSave: (url: string) => void;
  onCancel: () => void;
}
type AvatarAttributes = {
  top: string;
  accessories: string;
  hairColor: string;
  facialHair: string;
  clothing: string;
  clothingColor: string;
  eyes: string;
  eyebrows: string;
  mouth: string;
  skinColor: string;
};
const DEFAULT_ATTRIBUTES: AvatarAttributes = {
  top: 'shortFlat',
  accessories: 'none',
  hairColor: 'brown',
  facialHair: 'none',
  clothing: 'hoodie',
  clothingColor: 'black',
  eyes: 'default',
  eyebrows: 'default',
  mouth: 'smile',
  skinColor: 'light'
};
// Color Mappings for API (v9 requires hex without #)
const SKIN_COLORS: Record<string, string> = {
  tanned: 'fd9841', yellow: 'f8d25c', pale: 'ffdbb4', light: 'edb98a',
  brown: 'd08b5b', darkBrown: 'ae5d29', black: '614335'
};
const HAIR_COLORS: Record<string, string> = {
  auburn: 'a55728', black: '2c1b18', blonde: 'b58143', blondeGolden: 'd6b370',
  brown: '724133', brownDark: '4a312c', pastelPink: 'f59797', platinum: 'ecdcbf',
  red: 'c93305', silverGray: 'e8e1e1'
};
const CLOTHING_COLORS: Record<string, string> = {
  black: '262e33', blue01: '65c9ff', blue02: '5199e4', blue03: '25557c',
  gray01: 'e6e6e6', gray02: '929598', heather: '3c4f5c', pastelBlue: 'b1e2ff',
  pastelGreen: 'a7ffc4', pastelOrange: 'ffdeb5', pastelRed: 'ffafb9',
  pastelYellow: 'ffffb1', pink: 'ff488e', red: 'ff5c5c', white: 'ffffff'
};
// Helper to find key by value in the color maps (Reverse Mapping)
const findColorName = (map: Record<string, string>, hex: string) => {
  if (!hex) return undefined;
  return Object.keys(map).find(key => map[key].toLowerCase() === hex.toLowerCase());
}
export function AvatarCreator({ initialUrl, onSave, onCancel }: AvatarCreatorProps) {
  // Parse initial URL to get seed/attributes with STRICT VALIDATION
  const parseUrl = (url: string) => {
    try {
      const urlObj = new URL(url);
      if (urlObj.hostname.includes('dicebear.com')) {
        const seed = urlObj.searchParams.get('seed') || 'custom';
        const attributes = { ...DEFAULT_ATTRIBUTES };
        // Check probabilities first (v9 way of handling 'none')
        if (urlObj.searchParams.get('accessoriesProbability') === '0') {
            attributes.accessories = 'none';
        }
        if (urlObj.searchParams.get('facialHairProbability') === '0') {
            attributes.facialHair = 'none';
        }
        // Validate each attribute against allowed options
        Object.keys(DEFAULT_ATTRIBUTES).forEach(key => {
          const k = key as keyof AvatarAttributes;
          let val = urlObj.searchParams.get(k);
          // Handle Legacy/Hex Color Mapping
          if (k === 'skinColor' && val && !AVATAR_OPTIONS.skinColor.includes(val)) {
             const name = findColorName(SKIN_COLORS, val);
             if (name) val = name;
          } else if (k === 'hairColor' && val && !AVATAR_OPTIONS.hairColor.includes(val)) {
             const name = findColorName(HAIR_COLORS, val);
             if (name) val = name;
          } else if (k === 'clothingColor' && val && !AVATAR_OPTIONS.clothingColor.includes(val)) {
             const name = findColorName(CLOTHING_COLORS, val);
             if (name) val = name;
          }
          // Check if value exists in allowed options
          const allowedOptions = AVATAR_OPTIONS[k as keyof typeof AVATAR_OPTIONS];
          // If attribute is already set to 'none' via probability, skip validation against options
          if (attributes[k] === 'none' && (k === 'accessories' || k === 'facialHair')) {
             return;
          }
          if (val && allowedOptions.includes(val)) {
            attributes[k] = val;
          }
        });
        return { seed, attributes };
      }
    } catch (e) {
      // ignore invalid URLs
    }
    return { seed: 'custom', attributes: DEFAULT_ATTRIBUTES };
  };
  const defaults = useMemo(() => initialUrl ? parseUrl(initialUrl) : { seed: 'custom', attributes: DEFAULT_ATTRIBUTES }, [initialUrl]);
  // Determine initial style based on top
  const initialStyle = AVATAR_TOPS_LONG.includes(defaults.attributes.top) ? 'B' : 'A';
  const [avatarStyle, setAvatarStyle] = useState<'A' | 'B'>(initialStyle);
  const [seed, setSeed] = useState(defaults.seed);
  const [attributes, setAttributes] = useState<AvatarAttributes>(defaults.attributes);
  // Preview State
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  // Debounce ref
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  // Handle Style Change
  useEffect(() => {
    const validTops = avatarStyle === 'A' ? AVATAR_TOPS_SHORT : AVATAR_TOPS_LONG;
    // If current top is not valid for new style, pick a random one from valid list
    if (!validTops.includes(attributes.top)) {
      const randomTop = validTops[Math.floor(Math.random() * validTops.length)];
      setAttributes(prev => ({ ...prev, top: randomTop }));
    }
    // If switching to Style B (Feminine), remove facial hair
    if (avatarStyle === 'B') {
      setAttributes(prev => ({ ...prev, facialHair: 'none' }));
    }
  }, [avatarStyle, attributes.top]);
  // Construct the API URL (for saving and fetching)
  const constructApiUrl = useCallback(() => {
    const baseUrl = `https://api.dicebear.com/9.x/avataaars/svg`;
    const params = new URLSearchParams();
    params.set('seed', seed);
    Object.entries(attributes).forEach(([key, value]) => {
      // Handle Optional Attributes (accessories, facialHair)
      if (key === 'accessories' || key === 'facialHair') {
        if (value === 'none') {
          params.set(`${key}Probability`, '0');
          // Do NOT set the key itself, as 'none' is invalid
        } else {
          params.set(`${key}Probability`, '100');
          params.set(key, value);
        }
        return;
      }
      // Map colors to hex codes for v9 API
      if (key === 'skinColor' && SKIN_COLORS[value]) {
        params.set(key, SKIN_COLORS[value]);
      } else if (key === 'hairColor' && HAIR_COLORS[value]) {
        params.set(key, HAIR_COLORS[value]);
      } else if (key === 'clothingColor' && CLOTHING_COLORS[value]) {
        params.set(key, CLOTHING_COLORS[value]);
      } else {
        // Standard attributes
        params.set(key, value);
      }
    });
    return `${baseUrl}?${params.toString()}`;
  }, [seed, attributes]);
  // Fetch Logic
  const fetchAvatar = useCallback(async () => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsLoading(true);
    setHasError(false);
    const url = constructApiUrl();
    // Append retry param only for the fetch request to bust cache if needed
    const fetchUrl = retryCount > 0 ? `${url}&_r=${retryCount}` : url;
    try {
      const res = await fetch(fetchUrl, { signal: controller.signal });
      if (!res.ok) {
        const text = await res.text();
        console.error(`Avatar fetch failed (${res.status}):`, text);
        throw new Error(`Failed to load avatar: ${res.status}`);
      }
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      setPreviewSrc(prev => {
        if (prev) URL.revokeObjectURL(prev); // Cleanup old
        return objectUrl;
      });
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error("Avatar load error:", err);
      setHasError(true);
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [constructApiUrl, retryCount]);
  // Effect: Trigger fetch on change with debounce
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsLoading(true);
    timeoutRef.current = setTimeout(() => {
      fetchAvatar();
    }, 500);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [fetchAvatar]);
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (previewSrc) URL.revokeObjectURL(previewSrc);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [previewSrc]);
  const handleRandomize = () => {
    const newAttrs = { ...attributes };
    Object.keys(AVATAR_OPTIONS).forEach(key => {
      const options = AVATAR_OPTIONS[key as keyof typeof AVATAR_OPTIONS];
      // Filter tops based on style
      let pool = [...options];
      if (key === 'top') {
         pool = avatarStyle === 'A' ? AVATAR_TOPS_SHORT : AVATAR_TOPS_LONG;
      }
      // Add 'none' chance for optional attributes since it's removed from constants
      if (key === 'accessories' || key === 'facialHair') {
         pool.push('none');
         pool.push('none'); // Weight it slightly higher
      }
      const randomOption = pool[Math.floor(Math.random() * pool.length)];
      newAttrs[key as keyof AvatarAttributes] = randomOption;
    });
    // Enforce style constraints
    if (avatarStyle === 'B') {
        newAttrs.facialHair = 'none';
    }
    setAttributes(newAttrs);
    setSeed(Math.random().toString(36).substring(7));
  };
  const updateAttribute = (key: keyof AvatarAttributes, value: string) => {
    setAttributes(prev => ({ ...prev, [key]: value }));
  };
  const handleRetry = () => {
    setRetryCount(c => c + 1);
  };
  const handleSave = () => {
    onSave(constructApiUrl());
  };
  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const url = constructApiUrl();
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `avatar-${seed}.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Download failed", error);
    } finally {
      setIsDownloading(false);
    }
  };
  const currentTops = avatarStyle === 'A' ? AVATAR_TOPS_SHORT : AVATAR_TOPS_LONG;
  return (
    <div className="flex flex-col h-full gap-4 md:gap-6 overflow-hidden">
      {/* Style Toggle */}
      <div className="flex justify-center p-2 bg-white/5 rounded-lg shrink-0">
        <div className="grid grid-cols-2 gap-1 p-1 bg-black/20 rounded-lg w-full max-w-xs">
          <button
            onClick={() => setAvatarStyle('A')}
            className={cn(
              "px-4 py-2 rounded-md text-sm font-medium transition-all",
              avatarStyle === 'A' ? "bg-indigo-600 text-white shadow-lg" : "text-muted-foreground hover:text-white"
            )}
          >
            Type A
          </button>
          <button
            onClick={() => setAvatarStyle('B')}
            className={cn(
              "px-4 py-2 rounded-md text-sm font-medium transition-all",
              avatarStyle === 'B' ? "bg-indigo-600 text-white shadow-lg" : "text-muted-foreground hover:text-white"
            )}
          >
            Type B
          </button>
        </div>
      </div>
      {/* Preview Section */}
      <div className="flex flex-col items-center justify-center gap-4 py-4 bg-gradient-to-b from-white/5 to-transparent rounded-xl border border-white/10 shrink-0">
        <div className="w-32 h-32 rounded-full bg-zinc-900 border-4 border-indigo-500/30 overflow-hidden shadow-xl relative flex items-center justify-center group">
          {/* Loading Overlay */}
          {isLoading && !hasError && (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/80 z-20 backdrop-blur-sm transition-opacity duration-200">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
          )}
          {/* Error State */}
          {hasError ? (
             <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-800 text-muted-foreground p-2 text-center z-10">
                <ImageOff className="w-8 h-8 mb-1 opacity-50" />
                <span className="text-[10px]">Failed to load</span>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-6 text-[10px] mt-1 hover:bg-white/10"
                  onClick={handleRetry}
                >
                  <RefreshCw className="w-3 h-3 mr-1" /> Retry
                </Button>
             </div>
          ) : (
            /* Image Display */
            previewSrc && (
              <img 
                  src={previewSrc} 
                  alt="Avatar Preview" 
                  className="w-full h-full object-cover transition-opacity duration-300"
                  style={{ opacity: isLoading ? 0.5 : 1 }}
              />
            )
          )}
        </div>
        <div className="flex items-center gap-2">
           <Button size="sm" variant="outline" onClick={handleRandomize} className="gap-2 border-white/10 hover:bg-white/5">
             <Dices className="w-4 h-4" /> Randomize
           </Button>
           <Button size="sm" variant="outline" onClick={handleDownload} disabled={isDownloading} className="gap-2 border-white/10 hover:bg-white/5">
             {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
             Download
           </Button>
        </div>
        {/* Specs Info Block */}
        <div className="mt-2 flex items-center gap-4 text-[10px] text-muted-foreground bg-black/20 px-3 py-2 rounded-lg border border-white/5">
          <div className="flex items-center gap-1">
            <span className="font-bold text-white/50">Format:</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger className="flex items-center gap-1 cursor-help hover:text-white transition-colors">
                  SVG (Vector) <Info className="w-3 h-3" />
                </TooltipTrigger>
                <TooltipContent className="bg-zinc-900 border-white/10 text-xs">
                  Scalable Vector Graphics. Looks sharp at any size!
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="w-px h-3 bg-white/10" />
          <div><span className="font-bold text-white/50">Ratio:</span> 1:1</div>
          <div className="w-px h-3 bg-white/10" />
          <div><span className="font-bold text-white/50">Display:</span> 128px - 160px</div>
        </div>
      </div>
      {/* Customization Area */}
      <div className="flex-1 min-h-0 flex flex-col">
        <Tabs defaultValue="base" className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-4 bg-white/5 shrink-0">
            <TabsTrigger value="base"><Palette className="w-4 h-4 md:mr-2" /><span className="hidden md:inline">Base</span></TabsTrigger>
            <TabsTrigger value="head"><User className="w-4 h-4 md:mr-2" /><span className="hidden md:inline">Head</span></TabsTrigger>
            <TabsTrigger value="face"><Smile className="w-4 h-4 md:mr-2" /><span className="hidden md:inline">Face</span></TabsTrigger>
            <TabsTrigger value="outfit"><Shirt className="w-4 h-4 md:mr-2" /><span className="hidden md:inline">Outfit</span></TabsTrigger>
          </TabsList>
          <div className="flex-1 min-h-0 mt-2 relative">
            <ScrollArea className="h-full">
              <div className="pr-4 pb-24">
                {/* BASE TAB */}
                <TabsContent value="base" className="mt-0 space-y-6">
                  <div className="space-y-3">
                    <Label>Skin Tone</Label>
                    <div className="flex flex-wrap gap-2">
                      {AVATAR_OPTIONS.skinColor.map(color => (
                        <button
                          key={color}
                          onClick={() => updateAttribute('skinColor', color)}
                          className={cn(
                            "w-8 h-8 rounded-full border-2 transition-all",
                            attributes.skinColor === color ? "border-indigo-500 scale-110" : "border-transparent hover:scale-105"
                          )}
                          style={{ backgroundColor: `#${SKIN_COLORS[color]}` }}
                          title={color}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label>Hair Color</Label>
                    <div className="flex flex-wrap gap-2">
                      {AVATAR_OPTIONS.hairColor.map(color => (
                        <button
                          key={color}
                          onClick={() => updateAttribute('hairColor', color)}
                          className={cn(
                            "w-8 h-8 rounded-full border-2 transition-all",
                            attributes.hairColor === color ? "border-indigo-500 scale-110" : "border-transparent hover:scale-105"
                          )}
                          style={{ backgroundColor: `#${HAIR_COLORS[color]}` }}
                          title={color}
                        />
                      ))}
                    </div>
                  </div>
                </TabsContent>
                {/* HEAD TAB */}
                <TabsContent value="head" className="mt-0 space-y-6">
                  <div className="space-y-3">
                    <Label>Hair Style</Label>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {currentTops.map(opt => (
                        <OptionButton
                          key={opt}
                          label={opt}
                          selected={attributes.top === opt}
                          onClick={() => updateAttribute('top', opt)}
                        />
                      ))}
                    </div>
                  </div>
                  {avatarStyle === 'A' && (
                    <div className="space-y-3">
                      <Label>Facial Hair</Label>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        <OptionButton
                          label="None"
                          selected={attributes.facialHair === 'none'}
                          onClick={() => updateAttribute('facialHair', 'none')}
                          icon={<Ban className="w-3 h-3" />}
                        />
                        {AVATAR_OPTIONS.facialHair.map(opt => (
                          <OptionButton
                            key={opt}
                            label={opt}
                            selected={attributes.facialHair === opt}
                            onClick={() => updateAttribute('facialHair', opt)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>
                {/* FACE TAB */}
                <TabsContent value="face" className="mt-0 space-y-6">
                  <div className="space-y-3">
                    <Label>Eyes</Label>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {AVATAR_OPTIONS.eyes.map(opt => (
                        <OptionButton
                          key={opt}
                          label={opt}
                          selected={attributes.eyes === opt}
                          onClick={() => updateAttribute('eyes', opt)}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label>Eyebrows</Label>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {AVATAR_OPTIONS.eyebrows.map(opt => (
                        <OptionButton
                          key={opt}
                          label={opt}
                          selected={attributes.eyebrows === opt}
                          onClick={() => updateAttribute('eyebrows', opt)}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label>Mouth</Label>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {AVATAR_OPTIONS.mouth.map(opt => (
                        <OptionButton
                          key={opt}
                          label={opt}
                          selected={attributes.mouth === opt}
                          onClick={() => updateAttribute('mouth', opt)}
                        />
                      ))}
                    </div>
                  </div>
                </TabsContent>
                {/* OUTFIT TAB */}
                <TabsContent value="outfit" className="mt-0 space-y-6">
                  <div className="space-y-3">
                    <Label>Clothing</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {AVATAR_OPTIONS.clothing.map(opt => (
                        <OptionButton
                          key={opt}
                          label={opt}
                          selected={attributes.clothing === opt}
                          onClick={() => updateAttribute('clothing', opt)}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label>Clothing Color</Label>
                    <div className="flex flex-wrap gap-2">
                      {AVATAR_OPTIONS.clothingColor.map(color => (
                        <button
                          key={color}
                          onClick={() => updateAttribute('clothingColor', color)}
                          className={cn(
                            "w-8 h-8 rounded-full border-2 transition-all",
                            attributes.clothingColor === color ? "border-indigo-500 scale-110" : "border-transparent hover:scale-105"
                          )}
                          style={{ backgroundColor: `#${CLOTHING_COLORS[color]}` }}
                          title={color}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label>Accessories</Label>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      <OptionButton
                        label="None"
                        selected={attributes.accessories === 'none'}
                        onClick={() => updateAttribute('accessories', 'none')}
                        icon={<Ban className="w-3 h-3" />}
                      />
                      {AVATAR_OPTIONS.accessories.map(opt => (
                        <OptionButton
                          key={opt}
                          label={opt}
                          selected={attributes.accessories === opt}
                          onClick={() => updateAttribute('accessories', opt)}
                        />
                      ))}
                    </div>
                  </div>
                </TabsContent>
              </div>
            </ScrollArea>
          </div>
        </Tabs>
      </div>
      {/* Footer Actions */}
      <div className="flex gap-3 pt-2 shrink-0 mt-auto">
        <Button variant="ghost" className="flex-1" onClick={onCancel}>
          Cancel
        </Button>
        <Button className="flex-1 gap-2" onClick={handleSave} disabled={hasError || isLoading}>
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          Use Avatar
        </Button>
      </div>
    </div>
  );
}
// Helper Components & Utils
function OptionButton({ label, selected, onClick, icon }: { label: string, selected: boolean, onClick: () => void, icon?: React.ReactNode }) {
  // Format label: camelCase to Title Case
  const displayLabel = label.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-2 py-2 rounded-lg text-xs font-medium border transition-all truncate flex items-center justify-center gap-1",
        selected 
          ? "bg-indigo-500/20 border-indigo-500 text-indigo-300" 
          : "bg-white/5 border-white/10 hover:bg-white/10 text-muted-foreground"
      )}
      title={displayLabel}
    >
      {icon}
      {displayLabel}
    </button>
  );
}