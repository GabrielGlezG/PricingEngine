import { useState, useEffect } from "react";
import { getBrandLogo, getBrandInitials, getBrandColor, getBrandSvgUrl } from "@/config/brandLogos";
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
  "2xl": "w-32 h-32 text-4xl",
};

const nameSizeClasses = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
  xl: "text-2xl font-bold",
  "2xl": "text-4xl font-extrabold tracking-tight",
};

export function BrandLogo({ brand, size = "md", className, showName = true, variant = "default" }: BrandLogoProps) {
  // Optimize: Use PNG (fast CDN) for small sizes to avoid SVG 404 overhead
  // Use SVG for large sizes (quality)
  const initialMode = (size === 'sm' || size === 'md') ? 'png' : 'svg';
  const [renderMode, setRenderMode] = useState<'svg' | 'png' | 'initials'>(initialMode);
  
  const svgUrl = getBrandSvgUrl(brand);
  const pngUrl = getBrandLogo(brand);
  const initials = getBrandInitials(brand);
  const brandColor = getBrandColor(brand);

  useEffect(() => {
    setRenderMode(initialMode);
  }, [brand, initialMode]);

  const handleError = () => {
    if (renderMode === 'svg') {
      // SVG failed, try PNG if available, otherwise initials
      if (pngUrl) setRenderMode('png');
      else setRenderMode('initials');
    } else if (renderMode === 'png') {
      // PNG failed (or wasn't available), use initials
      setRenderMode('initials');
    } else {
        setRenderMode('initials');
    }
  };

  const showImage = renderMode !== 'initials';
  const currentUrl = renderMode === 'svg' ? svgUrl : pngUrl;

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {showImage && currentUrl ? (
        <div className={cn(
          "relative flex-shrink-0 flex items-center justify-center",
          variant === "default" && "rounded-xl overflow-hidden bg-white shadow-sm",
          sizeClasses[size],
          variant === "default" && size === "xl" && "shadow-md",
          variant === "default" && size === "2xl" && "shadow-lg",
          variant === "default" && (renderMode === 'svg' ? "p-1.5" : "p-1"),
          variant === "raw" && "object-contain"
        )}>
          <img
            key={`${brand}-${renderMode}`} // Force re-render on mode change
            src={currentUrl}
            alt={`${brand} logo`}
            className="w-full h-full object-contain"
            onError={handleError}
            loading="lazy"
          />
        </div>
      ) : (
        <div
          className={cn(
            "flex-shrink-0 rounded-xl flex items-center justify-center font-bold text-white shadow-sm",
            fallbackSizeClasses[size],
            size === "xl" && "shadow-md",
            size === "2xl" && "shadow-lg"
          )}
          style={{ backgroundColor: brandColor }}
        >
          {initials}
        </div>
      )}
      {showName && (
        <span className={cn("truncate font-heading font-semibold text-foreground/80", nameSizeClasses[size])}>
          {brand}
        </span>
      )}
    </div>
  );
}
