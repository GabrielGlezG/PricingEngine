import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Chart helpers: resolve CSS HSL variables to concrete color strings for Canvas
export function hslVar(name: string, alpha?: number): string {
  try {
    const doc = typeof document !== 'undefined' ? document : null
    const raw = doc ? getComputedStyle(doc.documentElement).getPropertyValue(name).trim() : ''
    const value = raw || '25 38% 52%'
    if (alpha !== undefined) return `hsl(${value} / ${alpha})`
    return `hsl(${value})`
  } catch {
    const fallback = '25 38% 52%'
    if (alpha !== undefined) return `hsl(${fallback} / ${alpha})`
    return `hsl(${fallback})`
  }
}

export function chartPalette(count = 8, alpha?: number): string[] {
  return Array.from({ length: count }, (_, i) => hslVar(`--chart-${(i % 8) + 1}`, alpha))
}

