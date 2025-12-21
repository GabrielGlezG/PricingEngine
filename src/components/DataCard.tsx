import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface DataCardProps {
  title: string;
  value: string | number;
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
      "border border-border/60 shadow-sm rounded-xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-primary/20 group relative bg-card",
      className
    )}>
      {/* Subtle Gradient Overlay on Hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-primary/5 to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-transparent relative z-10">
        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
          {title}
        </CardTitle>
        {Icon && (
          <div className="p-2 bg-primary/5 text-primary rounded-lg group-hover:bg-primary/10 group-hover:scale-110 transition-all duration-300">
             <Icon className="h-4 w-4" />
          </div>
        )}
      </CardHeader>
      <CardContent className="pt-2 relative z-10">
        <div className="text-3xl font-bold text-foreground font-heading tracking-tight mb-1">
          {value}
        </div>
        
        {(subValue || trend) && (
          <div className="flex items-center gap-3 text-xs md:text-sm">
            {trend && (
              <span className={cn(
                "font-semibold px-2 py-0.5 rounded-full flex items-center gap-1",
                trend.positive 
                  ? "bg-green-500/10 text-green-700 dark:text-green-400" 
                  : "bg-red-500/10 text-red-700 dark:text-red-400"
              )}>
                {trend.value > 0 ? "+" : ""}{trend.value}%
              </span>
            )}
            {subValue && (
              <p className="text-muted-foreground/80 font-medium">
                {subValue}
              </p>
            )}
          </div>
        )}
      </CardContent>
      
      {/* Animated Bottom Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-secondary transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
    </Card>
  );
}
