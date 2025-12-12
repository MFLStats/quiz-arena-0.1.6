import React from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { cn, isImageUrl } from '@/lib/utils';
import type { FrameConfig } from '@shared/types';
interface AvatarWithFrameProps {
  src?: string;
  fallback?: string;
  frameSrc?: string;
  frameConfig?: FrameConfig;
  className?: string;
  isOpponent?: boolean;
}
export function AvatarWithFrame({
  src,
  fallback,
  frameSrc,
  frameConfig,
  className,
  isOpponent
}: AvatarWithFrameProps) {
  // Default values: centered (0,0) and 135% scale
  const { x = 0, y = 0, scale = 1.35 } = frameConfig || {};
  return (
    <div className={cn("relative inline-block", className)}>
      <Avatar className="w-full h-full border-2 border-white/10">
        <AvatarImage src={src} className="object-cover" />
        <AvatarFallback className="bg-zinc-800 text-white font-bold">
          {fallback?.substring(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      {frameSrc && isImageUrl(frameSrc) && (
        <img
          src={frameSrc}
          className="absolute top-1/2 left-1/2 z-20 object-contain pointer-events-none transition-transform duration-200"
          style={{
            width: '100%',
            height: '100%',
            transform: `translate(-50%, -50%) translate(${x}%, ${y}%) scale(${scale})`
          }}
          alt="frame"
        />
      )}
      {frameSrc && !isImageUrl(frameSrc) && (
         <div className={cn("absolute inset-0 rounded-full pointer-events-none z-20", frameSrc)} />
      )}
    </div>
  );
}