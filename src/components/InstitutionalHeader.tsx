import { cn } from "@/lib/utils";

interface InstitutionalHeaderProps {
  title: string;
  description?: string;
  className?: string;
  action?: React.ReactNode;
}

export function InstitutionalHeader({ 
  title, 
  description, 
  className,
  action 
}: InstitutionalHeaderProps) {
  return (
    <div className={cn(
      "relative overflow-hidden rounded-2xl p-6 md:p-8 mb-8 border border-border/50",
      "bg-gradient-to-br from-background/80 via-background/50 to-muted/20 backdrop-blur-xl shadow-sm",
      className
    )}>
      {/* Decorative Elements */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-secondary/5 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4 pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-4 max-w-4xl">
          <div className="flex gap-4">
             {/* Gradient Vertical Bar */}
            <div className="shrink-0 w-1.5 rounded-full bg-gradient-to-b from-primary via-primary/70 to-primary/30" />
            
            <div className="space-y-2">
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight font-heading text-transparent bg-clip-text bg-gradient-to-r from-foreground to-foreground/70">
                {title}
              </h1>
              {description && (
                <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
                  {description}
                </p>
              )}
            </div>
          </div>
        </div>
        
        {action && (
          <div className="flex items-center gap-2 shrink-0">
            {action}
          </div>
        )}
      </div>
    </div>
  );
}
