import { useState } from "react";
import { getBrandLogo, getBrandInitials, getBrandColor } from "@/config/brandLogos";
import { cn } from "@/lib/utils";

interface BrandLogoProps {
  brand: string;
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
  showName?: boolean;
}

const sizeClasses = {
  sm: "w-5 h-5",
  md: "w-7 h-7",
  lg: "w-10 h-10",
  xl: "w-16 h-16",
  "2xl": "w-24 h-24",
};

const fallbackSizeClasses = {
  sm: "w-5 h-5 text-[10px]",
  md: "w-7 h-7 text-xs",
  lg: "w-10 h-10 text-sm",
  xl: "w-16 h-16 text-xl",
  "2xl": "w-24 h-24 text-3xl",
};

const nameSizeClasses = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
  xl: "text-2xl font-bold",
  "2xl": "text-4xl font-extrabold tracking-tight",
};

export function BrandLogo({ brand, size = "md", className, showName = true }: BrandLogoProps) {
  const [imageError, setImageError] = useState(false);
  const logoUrl = getBrandLogo(brand);
  const initials = getBrandInitials(brand);
  const brandColor = getBrandColor(brand);

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {logoUrl && !imageError ? (
        <div className={cn(
          "relative flex-shrink-0 rounded-xl overflow-hidden bg-white p-1 shadow-sm",
          sizeClasses[size],
          size === "xl" && "p-2 shadow-md",
          size === "2xl" && "p-3 shadow-lg"
        )}>
          <img
            src={logoUrl}
            alt={`${brand} logo`}
            className="w-full h-full object-contain"
            onError={() => setImageError(true)}
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
        <span className={cn("truncate font-heading font-semibold", nameSizeClasses[size])}>
          {brand}
        </span>
      )}
    </div>
  );
}
