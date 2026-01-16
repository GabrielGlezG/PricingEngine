import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface DataCardProps {
  title: string;
  value: string | number | React.ReactNode;
  subValue?: string;
  icon?: LucideIcon;
  trend?: {
    value: number;
    label: string;
    positive?: boolean;
  };
  className?: string;
}

export function DataCard({
  title,
  value,
  subValue,
  icon: Icon,
  trend,
  className
}: DataCardProps) {
  return (
    <Card className={cn(
      "border border-primary/10 shadow-md rounded-xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-primary/20 group relative bg-gradient-to-br from-card to-card/50",
      className
    )}>
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-primary/5 to-secondary/5 opacity-50 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-transparent relative z-10 gap-4">
        <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-widest truncate min-w-0" title={title}>
          {title}
        </CardTitle>
        {Icon && (
          <div className="shrink-0 p-2.5 bg-primary/10 text-primary rounded-xl group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300 shadow-sm">
             <Icon className="h-5 w-5" />
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-2 relative z-10">
        
        {/* Contenedor para medir el ancho disponible */}
        <div 
          className="w-full" 
          style={{ containerType: 'inline-size' }}
        >
          <div 
            className="font-bold text-foreground font-heading tracking-tight mb-2 whitespace-nowrap"
            style={{ 
              /**
               * AJUSTE DE TAMAÑO:
               * - Min: 1.25rem (aprox 20px) -> Para que no sea ilegiblemente pequeño.
               * - Ideal: 13cqw -> Crece suavemente con el ancho de la tarjeta.
               * - Max: 2.25rem (aprox 36px) -> Tope máximo para que no se vea gigante en desktop.
               */
              fontSize: "clamp(1.25rem, 13cqw, 2.25rem)" 
            }}
          >
            {value}
          </div>
        </div>
        
        {(subValue || trend) && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs md:text-sm">
            {trend && (
              <span className={cn(
                "font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0",
                trend.positive 
                  ? "bg-green-500/10 text-green-700 dark:text-green-400" 
                  : "bg-red-500/10 text-red-700 dark:text-red-400"
              )}>
                {trend.value > 0 ? "+" : ""}{trend.value}%
              </span>
            )}
            {subValue && (
              <p className="text-muted-foreground font-medium truncate min-w-0">
                {subValue}
              </p>
            )}
          </div>
        )}
      </CardContent>
      
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-secondary transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
    </Card>
  );
}