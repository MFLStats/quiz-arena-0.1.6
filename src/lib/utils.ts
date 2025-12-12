import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import React from "react"
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
export function getFlagEmoji(countryCode?: string) {
  if (!countryCode) return '🌐';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}
/**
 * Checks if a string is likely an image URL (HTTP/HTTPS or Data URI).
 */
export function isImageUrl(value?: string): boolean {
  if (!value) return false;
  return value.startsWith('http') || value.startsWith('data:image');
}
/**
 * Returns a React style object for background rendering.
 * Handles both image URLs (wrapping in url()) and CSS gradients.
 */
export function getBackgroundStyle(value?: string): React.CSSProperties {
  if (!value) return {};
  if (isImageUrl(value)) {
    return { 
      backgroundImage: `url(${value})`, 
      backgroundSize: 'cover', 
      backgroundPosition: 'center' 
    };
  }
  if (value.startsWith('linear') || value.startsWith('radial')) {
    return { background: value };
  }
  return {};
}