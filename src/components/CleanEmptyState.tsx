import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CleanEmptyStateProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function CleanEmptyState({
  title,
  description,
  icon: Icon,
  action,
  className
}: CleanEmptyStateProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-16 px-4 text-center border-2 border-dashed border-muted-foreground/20 rounded-lg bg-muted/5",
      className
    )}>
      {Icon && (
        <div className="p-4 bg-background rounded-full border border-border shadow-sm mb-4">
          <Icon className="h-8 w-8 text-muted-foreground" />
        </div>
      )}
      
      <h3 className="text-lg font-semibold text-primary mb-2">
        {title}
      </h3>
      
      <p className="text-muted-foreground max-w-sm mb-6">
        {description}
      </p>
      
      {action && (
        <Button 
          onClick={action.onClick}
          variant="outline"
          className="border-primary text-primary hover:bg-primary hover:text-white transition-colors"
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}
