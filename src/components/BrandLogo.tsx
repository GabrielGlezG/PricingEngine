import React, { useState, useEffect } from "react";
import { getBrandInitials, getBrandColor, getBrandSvgUrl, getClearbitLogoUrl, getBrandLogo } from "@/config/brandLogos";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useBrandLogos } from "@/hooks/useBrandLogos";
import { cn } from "@/lib/utils";

interface BrandLogoProps {
  brand: string;
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
  showName?: boolean;
  variant?: "default" | "raw";
}

const sizeClasses = {
  sm: "w-5 h-5",
  md: "w-8 h-8",
  lg: "w-12 h-12",
  xl: "w-20 h-20",
  "2xl": "w-32 h-32",
};

const fallbackSizeClasses = {
  sm: "w-5 h-5 text-[10px]",
  md: "w-8 h-8 text-xs",
  lg: "w-12 h-12 text-base",
  xl: "w-20 h-20 text-xl",
  "2xl": "w-32 h-32 text-3xl",
};

// Global set to prevent duplicate save requests within a session
const savingSet = new Set<string>();

/**
 * Calls the fetch-brand-logo Edge Function to download and persist a logo in the DB.
 * Called silently when a fallback logo loads successfully.
 */
async function saveFallbackLogoToDb(brand: string) {
  const key = brand.trim().toUpperCase();
  if (savingSet.has(key)) return;
  savingSet.add(key);
  try {
    const supabaseUrl = "https://beybdwxmocwaeuizghnf.supabase.co";
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!supabaseKey) return;
    await fetch(`${supabaseUrl}/functions/v1/fetch-brand-logo`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseKey}`,
        "apikey": supabaseKey,
      },
      body: JSON.stringify({ brand }),
    });
  } catch {
    // Silent fail – do not affect UI
  }
}

// Fallback chain: db → staticPng → svg → clearbit → initials
type RenderMode = 'db' | 'staticPng' | 'svg' | 'clearbit' | 'initials';

export function BrandLogo({ brand, size = "md", className = "", variant = "default" }: BrandLogoProps) {
  const { getLogo, isLoading } = useBrandLogos();
  const dbLogoUrl = getLogo(brand);

  // staticPng is from the hardcoded brandLogoMap (car-logos-dataset CDN) — reliable for known brands
  const staticPngUrl = getBrandLogo(brand);
  const svgUrl = getBrandSvgUrl(brand);
  const clearbitUrl = getClearbitLogoUrl(brand);

  const initials = getBrandInitials(brand);
  const bgColor = getBrandColor(brand);

  const [renderMode, setRenderMode] = useState<RenderMode>('db');
  const [imageError, setImageError] = useState(false);

  // Once DB loads, determine the right starting mode
  useEffect(() => {
    if (!isLoading) {
      if (!dbLogoUrl && renderMode === 'db') {
        // Skip to staticPng if available, otherwise svg
        if (staticPngUrl) setRenderMode('staticPng');
        else setRenderMode('svg');
      }
    }
  }, [isLoading, dbLogoUrl, renderMode, staticPngUrl]);

  const handleError = () => {
    if (renderMode === 'db') {
      if (staticPngUrl) setRenderMode('staticPng');
      else setRenderMode('svg');
    } else if (renderMode === 'staticPng') {
      setRenderMode('svg');
    } else if (renderMode === 'svg') {
      if (clearbitUrl) setRenderMode('clearbit');
      else setRenderMode('initials');
    } else if (renderMode === 'clearbit') {
      setImageError(true);
      setRenderMode('initials');
    } else {
      setImageError(true);
      setRenderMode('initials');
    }
  };

  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.naturalWidth <= 1 || img.naturalHeight <= 1) {
      handleError();
      return;
    }
    // When fallback logo loads successfully, persist in DB for future use everywhere
    if ((renderMode === 'staticPng' || renderMode === 'svg' || renderMode === 'clearbit') && !dbLogoUrl) {
      saveFallbackLogoToDb(brand);
    }
  };

  // Shared image container style
  const containerClass = (extra?: string) => cn(
    "relative flex items-center justify-center",
    variant === "default" && "bg-white rounded-full overflow-hidden ring-1 ring-border/10 shadow-sm",
    extra && variant === "default" && extra,
    sizeClasses[size],
    className
  );

  if (renderMode === 'db' && dbLogoUrl) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={containerClass()}>
              <img
                src={dbLogoUrl}
                alt={`${brand} logo`}
                className="w-full h-full object-contain p-[15%] transition-transform hover:scale-110"
                onError={handleError}
                onLoad={handleLoad}
              />
            </div>
          </TooltipTrigger>
          <TooltipContent><p>{brand}</p></TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (renderMode === 'staticPng' && staticPngUrl) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={containerClass()}>
              <img
                src={staticPngUrl}
                alt={`${brand} logo`}
                className="w-full h-full object-contain p-[10%] transition-transform hover:scale-110"
                onError={handleError}
                onLoad={handleLoad}
              />
            </div>
          </TooltipTrigger>
          <TooltipContent><p>{brand}</p></TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (renderMode === 'svg' && svgUrl) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={containerClass("p-1.5")}>
              <img
                src={svgUrl}
                alt={`${brand} logo`}
                className="w-full h-full object-contain"
                onError={handleError}
                onLoad={handleLoad}
              />
            </div>
          </TooltipTrigger>
          <TooltipContent><p>{brand}</p></TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (renderMode === 'clearbit' && clearbitUrl && !imageError) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={containerClass("p-1")}>
              <img
                src={clearbitUrl}
                alt={`${brand} logo`}
                className="w-full h-full object-contain"
                onError={handleError}
                onLoad={handleLoad}
              />
            </div>
          </TooltipTrigger>
          <TooltipContent><p>{brand}</p></TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Final fallback: Initials
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "flex-shrink-0 flex items-center justify-center font-bold text-white shadow-sm",
              variant === "default" && "rounded-full ring-1 ring-border/10",
              fallbackSizeClasses[size],
              className
            )}
            style={{ backgroundColor: bgColor }}
          >
            {initials}
          </div>
        </TooltipTrigger>
        <TooltipContent><p>{brand}</p></TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}