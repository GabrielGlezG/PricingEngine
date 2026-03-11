import React, { useState, useEffect } from "react";
import { getBrandInitials, getBrandColor, getBrandSvgUrl, getClearbitLogoUrl } from "@/config/brandLogos";
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
};

const fallbackSizeClasses = {
  sm: "w-5 h-5 text-[10px]",
  md: "w-8 h-8 text-xs",
  lg: "w-12 h-12 text-base",
  xl: "w-20 h-20 text-xl",
};

export function BrandLogo({ brand, size = "md", className = "" }: BrandLogoProps) {
  // First, check for our newly hosted DB logos
  const { getLogo, isLoading } = useBrandLogos();
  const dbLogoUrl = getLogo(brand);

  const [renderMode, setRenderMode] = useState<'db' | 'svg' | 'clearbit' | 'initials'>('db');
  const [imageError, setImageError] = useState(false);

  // Derive all fallback URLs
  const svgUrl = getBrandSvgUrl(brand);
  const clearbitUrl = getClearbitLogoUrl(brand);

  const initials = getBrandInitials(brand);
  const bgColor = getBrandColor(brand);

  // If DB logos are loaded but brand isn't there, immediately skip to SVG mode
  useEffect(() => {
    if (!isLoading) {
      if (!dbLogoUrl && renderMode === 'db') {
         setRenderMode('svg');
      }
    }
  }, [isLoading, dbLogoUrl, renderMode]);

  const handleError = () => {
    if (renderMode === 'db') {
        setRenderMode('svg');
    } else if (renderMode === 'svg') {
      // SVG failed, try Clearbit, otherwise initials
      if (clearbitUrl) setRenderMode('clearbit');
      else setRenderMode('initials');
    } else if (renderMode === 'clearbit') {
      // Clearbit failed
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
    }
  };

  if (renderMode === 'db' && dbLogoUrl) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn(
              "relative flex items-center justify-center bg-white rounded-full overflow-hidden ring-1 ring-border/10 shadow-sm",
              sizeClasses[size],
              className
            )}>
              <img
                src={dbLogoUrl}
                alt={`${brand} logo`}
                title={`${brand} logo`}
                className="w-full h-full object-contain p-[15%] transition-transform hover:scale-110"
                onError={handleError}
                onLoad={handleLoad}
              />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{brand}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (renderMode === 'svg' && svgUrl) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn(
              "relative flex items-center justify-center bg-white rounded-full overflow-hidden ring-1 ring-border/10 shadow-sm p-1.5",
              sizeClasses[size],
              className
            )}>
              <img
                src={svgUrl}
                alt={`${brand} logo`}
                title={`${brand} logo`}
                className="w-full h-full object-contain"
                onError={handleError}
                onLoad={handleLoad}
              />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{brand}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (renderMode === 'clearbit' && clearbitUrl && !imageError) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn(
              "relative flex items-center justify-center bg-white rounded-full overflow-hidden ring-1 ring-border/10 shadow-sm p-1",
              sizeClasses[size],
              className
            )}>
              <img
                src={clearbitUrl}
                alt={`${brand} logo`}
                title={`${brand} logo`}
                className="w-full h-full object-contain"
                onError={handleError}
                onLoad={handleLoad}
              />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{brand}</p>
          </TooltipContent>
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
              "flex-shrink-0 rounded-full flex items-center justify-center font-bold text-white shadow-sm ring-1 ring-border/10",
              fallbackSizeClasses[size],
              className
            )}
            style={{ backgroundColor: bgColor }}
          >
            {initials}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{brand}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
