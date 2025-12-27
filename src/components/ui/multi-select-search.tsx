
import * as React from "react"
import { Check, ChevronDown, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface MultiSelectSearchProps {
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  className?: string;
  renderOption?: (option: string) => React.ReactNode;
}

export function MultiSelectSearch({
  options,
  selected,
  onChange,
  placeholder = "Seleccionar...",
  searchPlaceholder = "Buscar...",
  emptyMessage = "Sin resultados.",
  className,
  renderOption
}: MultiSelectSearchProps) {
  const [open, setOpen] = React.useState(false)

  const handleSelect = (item: string) => {
    if (selected.includes(item)) {
      onChange(selected.filter((i) => i !== item))
    } else {
      onChange([...selected, item])
    }
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange([])
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("h-8 w-full justify-between text-xs px-2", className)}
        >
          <div className="flex items-center gap-1 truncate">
            {selected.length === 0 && <span className="text-muted-foreground">{placeholder}</span>}
            {selected.length > 0 && selected.length <= 2 && (
              <span className="truncate">
                 {selected.join(", ")}
              </span>
            )}
            {selected.length > 2 && (
              <span className="truncate">
                {selected.length} seleccionados
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-1 opacity-50 shrink-0">
             {selected.length > 0 && (
                <div 
                   role="button"
                   tabIndex={0}
                   onClick={handleClear} 
                   className="hover:bg-destructive/10 hover:text-destructive rounded-full p-0.5 transition-colors"
                >
                   <X className="h-3 w-3" />
                </div>
             )}
             <ChevronDown className="h-3 w-3" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="end">
        <Command>
          <CommandInput placeholder={searchPlaceholder} className="h-8 text-xs" />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup className="max-h-[200px] overflow-y-auto">
              {options.map((option) => (
                <CommandItem
                  key={option}
                  value={option}
                  onSelect={() => handleSelect(option)}
                  className="text-xs"
                >
                  <div
                    className={cn(
                      "mr-2 flex h-3 w-3 items-center justify-center rounded-sm border border-primary",
                      selected.includes(option)
                        ? "bg-primary text-primary-foreground"
                        : "opacity-50 [&_svg]:invisible"
                    )}
                  >
                    <Check className={cn("h-3 w-3")} />
                  </div>
                  {renderOption ? renderOption(option) : option}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
