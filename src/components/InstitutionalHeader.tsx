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
      "flex flex-col gap-1 pb-6 border-b-2 border-primary/10 mb-8 bg-background",
      className
    )}>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-primary font-heading relative pl-4">
            {/* Decorative vertical bar typical of institutional design */}
            <span className="absolute left-0 top-1 bottom-1 w-1 bg-secondary rounded-full" />
            {title}
          </h1>
          {description && (
            <p className="text-muted-foreground text-lg max-w-3xl pl-4">
              {description}
            </p>
          )}
        </div>
        
        {action && (
          <div className="flex items-center gap-2">
            {action}
          </div>
        )}
      </div>
    </div>
  );
}
