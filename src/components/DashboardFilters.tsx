import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Check, ChevronDown, Filter, X, SlidersHorizontal, Car, Tag, Layers, Grid, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import { BrandLogo } from "@/components/BrandLogo"
import { useState } from "react"
import { Separator } from "@/components/ui/separator"



interface FilterState {
  tipoVehiculo: string[];
  brand: string[];
  model: string[];
  submodel: string[];
  [key: string]: any;
}

interface DashboardFiltersProps {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<any>>;
  tiposVehiculo?: string[];
  brands?: string[];
  models?: { model: string }[] | string[];
  submodels?: string[];
  refetchAnalytics?: () => void;
  isRefetchingAnalytics?: boolean;
}

export function DashboardFilters({
  filters,
  setFilters,
  tiposVehiculo = [],
  brands = [],
  models = [],
  submodels = [],
  refetchAnalytics,
  isRefetchingAnalytics = false
}: DashboardFiltersProps) {
  // Local state for popovers
  const [openStates, setOpenStates] = useState({
    tipoVehiculo: false,
    brand: false,
    model: false,
    submodel: false
  });

  const toggleOpen = (key: keyof typeof openStates, value: boolean) => {
    setOpenStates(prev => ({ ...prev, [key]: value }));
  };

  const hasActiveFilters = 
    filters.tipoVehiculo.length > 0 || 
    filters.brand.length > 0 || 
    filters.model.length > 0 || 
    filters.submodel.length > 0;

  const clearFilters = () => {
    setFilters((prev: any) => ({
      ...prev,
      tipoVehiculo: [],
      brand: [],
      model: [],
      submodel: []
    }));
  };

  const updateFilter = (key: keyof typeof filters, item: string) => {
    setFilters(prev => {
      const current = prev[key] as string[];
      const updated = current.includes(item)
        ? current.filter(i => i !== item)
        : [...current, item];
      return { ...prev, [key]: updated };
    });
  };

  return (
    <div className="w-full space-y-4">
      {/* Main Filter Bar */}
      <div className="relative z-20 flex flex-col md:flex-row items-start md:items-center gap-2 p-2 rounded-2xl transition-all duration-300 bg-gradient-to-r from-background/95 via-primary/5 to-background/95 backdrop-blur-xl border border-primary/20 shadow-lg shadow-primary/5 hover:shadow-primary/10 hover:border-primary/30">
        
        {/* Label / Icon Section */}
        <div className="flex items-center gap-2 px-3 py-1.5 md:border-r border-border/50 md:mr-2 text-muted-foreground min-w-fit">
          <div className="p-2 bg-primary/10 rounded-lg">
            <SlidersHorizontal className="w-4 h-4 text-primary" />
          </div>
          <span className="font-heading font-semibold text-sm hidden md:inline-block text-foreground">Filtros</span>
        </div>

        {/* Filters Group - Scrollable on mobile */}
        <div className="flex items-center gap-2 w-full overflow-x-auto pb-2 md:pb-0 scrollbar-hide mask-fade-right">
          
          {/* Categoría Filter */}
          <Popover open={openStates.tipoVehiculo} onOpenChange={(open) => toggleOpen('tipoVehiculo', open)}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-9 px-3 rounded-xl border border-transparent bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground font-normal transition-all",
                  filters.tipoVehiculo.length > 0 && "bg-primary/10 text-primary border-primary/20 hover:bg-primary/15 font-medium shadow-sm ring-1 ring-primary/20"
                )}
              >
                <Grid className="mr-2 h-3.5 w-3.5" />
                Categoría
                {filters.tipoVehiculo.length > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5 min-w-5 px-1.5 bg-background/50 text-foreground text-[10px] shadow-none">
                    {filters.tipoVehiculo.length}
                  </Badge>
                )}
                <ChevronDown className="ml-2 h-3 w-3 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[220px] p-0 rounded-xl shadow-xl border-border/50" align="start">
              <Command>
                <CommandInput placeholder="Buscar categoría..." className="h-9" />
                <CommandList>
                  <CommandEmpty>Sin resultados.</CommandEmpty>
                  <CommandGroup className="p-1.5">
                    {tiposVehiculo.map((tipo) => (
                      <CommandItem
                        key={tipo}
                        onSelect={() => updateFilter('tipoVehiculo', tipo)}
                        className="rounded-lg aria-selected:bg-primary/10 aria-selected:text-primary"
                      >
                        <div className={cn(
                          "mr-2 flex h-4 w-4 items-center justify-center rounded border border-primary/30",
                          filters.tipoVehiculo.includes(tipo) ? "bg-primary text-primary-foreground border-primary" : "opacity-50 [&_svg]:invisible"
                        )}>
                          <Check className="h-3 w-3" />
                        </div>
                        {tipo}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          <Separator orientation="vertical" className="h-4 hidden md:block" />



          {/* Marca Filter */}
          <Popover open={openStates.brand} onOpenChange={(open) => toggleOpen('brand', open)}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                   "h-9 px-3 rounded-xl border border-transparent bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground font-normal transition-all",
                  filters.brand.length > 0 && "bg-primary/10 text-primary border-primary/20 hover:bg-primary/15 font-medium shadow-sm ring-1 ring-primary/20"
                )}
              >
                <Tag className="mr-2 h-3.5 w-3.5" />
                Marca
                {filters.brand.length > 0 && (
                   <Badge variant="secondary" className="ml-2 h-5 min-w-5 px-1.5 bg-background/50 text-foreground text-[10px] shadow-none">
                    {filters.brand.length}
                  </Badge>
                )}
                <ChevronDown className="ml-2 h-3 w-3 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[240px] p-0 rounded-xl shadow-xl border-border/50" align="start">
              <Command>
                <CommandInput placeholder="Buscar marca..." className="h-9" />
                <CommandList>
                  <CommandEmpty>Sin resultados.</CommandEmpty>
                  <CommandGroup className="p-1.5">
                    {brands.map((brand) => (
                      <CommandItem
                        key={brand}
                        onSelect={() => updateFilter('brand', brand)}
                        className="rounded-lg aria-selected:bg-primary/10 aria-selected:text-primary"
                      >
                         <div className={cn(
                          "mr-2 flex h-4 w-4 items-center justify-center rounded border border-primary/30",
                          filters.brand.includes(brand) ? "bg-primary text-primary-foreground border-primary" : "opacity-50 [&_svg]:invisible"
                        )}>
                          <Check className="h-3 w-3" />
                        </div>
                        <BrandLogo brand={brand} size="sm" className="mr-2" showName={false} />
                        <span className="flex-1 truncate">{brand}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {/* Modelo Filter */}
          <Popover open={openStates.model} onOpenChange={(open) => toggleOpen('model', open)}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-9 px-3 rounded-xl border border-transparent bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground font-normal transition-all",
                  filters.model.length > 0 && "bg-primary/10 text-primary border-primary/20 hover:bg-primary/15 font-medium shadow-sm ring-1 ring-primary/20"
                )}
              >
                <Car className="mr-2 h-3.5 w-3.5" />
                Modelo
                {filters.model.length > 0 && (
                   <Badge variant="secondary" className="ml-2 h-5 min-w-5 px-1.5 bg-background/50 text-foreground text-[10px] shadow-none">
                    {filters.model.length}
                  </Badge>
                )}
                <ChevronDown className="ml-2 h-3 w-3 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[240px] p-0 rounded-xl shadow-xl border-border/50" align="start">
              <Command>
                <CommandInput placeholder="Buscar modelo..." className="h-9" />
                <CommandList>
                  <CommandEmpty>Sin resultados.</CommandEmpty>
                  <CommandGroup className="p-1.5">
                    {models.map((item, idx) => {
                      const modelName = typeof item === 'string' ? item : item.model;
                      return (
                      <CommandItem
                        key={`${modelName}-${idx}`}
                        onSelect={() => updateFilter('model', modelName)}
                         className="rounded-lg aria-selected:bg-primary/10 aria-selected:text-primary"
                      >
                        <div className={cn(
                          "mr-2 flex h-4 w-4 items-center justify-center rounded border border-primary/30",
                          filters.model.includes(modelName) ? "bg-primary text-primary-foreground border-primary" : "opacity-50 [&_svg]:invisible"
                        )}>
                          <Check className="h-3 w-3" />
                        </div>
                        {modelName}
                      </CommandItem>
                    )})}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {/* Submodelo Filter */}
          <Popover open={openStates.submodel} onOpenChange={(open) => toggleOpen('submodel', open)}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                   "h-9 px-3 rounded-xl border border-transparent bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground font-normal transition-all",
                  filters.submodel.length > 0 && "bg-primary/10 text-primary border-primary/20 hover:bg-primary/15 font-medium shadow-sm ring-1 ring-primary/20"
                )}
              >
                <Layers className="mr-2 h-3.5 w-3.5" />
                Submodelo
                {filters.submodel.length > 0 && (
                   <Badge variant="secondary" className="ml-2 h-5 min-w-5 px-1.5 bg-background/50 text-foreground text-[10px] shadow-none">
                    {filters.submodel.length}
                  </Badge>
                )}
                <ChevronDown className="ml-2 h-3 w-3 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[240px] p-0 rounded-xl shadow-xl border-border/50" align="start">
              <Command>
                <CommandInput placeholder="Buscar submodelo..." className="h-9" />
                <CommandList>
                  <CommandEmpty>Sin resultados.</CommandEmpty>
                  <CommandGroup className="p-1.5">
                    {submodels.map((sub) => (
                      <CommandItem
                        key={sub}
                        onSelect={() => updateFilter('submodel', sub)}
                         className="rounded-lg aria-selected:bg-primary/10 aria-selected:text-primary"
                      >
                        <div className={cn(
                          "mr-2 flex h-4 w-4 items-center justify-center rounded border border-primary/30",
                          filters.submodel.includes(sub) ? "bg-primary text-primary-foreground border-primary" : "opacity-50 [&_svg]:invisible"
                        )}>
                          <Check className="h-3 w-3" />
                        </div>
                        {sub}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Clear & Refresh Actions */}
        <div className="flex items-center pl-2 md:border-l border-border/50 md:ml-auto gap-2">
           {hasActiveFilters && (
             <Button
              variant="destructive"
              size="sm"
              onClick={clearFilters}
              className="h-8 px-3 rounded-lg text-xs border border-border/50 bg-background/50 text-muted-foreground hover:bg-destructive hover:text-destructive-foreground hover:border-destructive shadow-sm transition-all"
            >
              <X className="mr-2 h-3 w-3" />
              Limpiar
            </Button>
           )}
           
           {refetchAnalytics && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchAnalytics()}
              disabled={isRefetchingAnalytics}
              className="h-8 px-3 rounded-lg text-xs border-border/50 bg-background/50 hover:bg-primary hover:text-primary-foreground hover:border-primary shadow-sm transition-all"
            >
              <RefreshCw className={cn("mr-2 h-3 w-3", isRefetchingAnalytics && "animate-spin")} />
              Actualizar
            </Button>
           )}
        </div>
      </div>

      {/* Active Filters Summary (Optional visual reinforcement) */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 px-1 animate-in fade-in slide-in-from-top-2 duration-300">
           {filters.tipoVehiculo.map(t => (
            <Badge key={t} variant="secondary" className="pl-2 pr-1 py-1 h-7 bg-background border border-border/60 text-muted-foreground hover:bg-muted/50 rounded-lg transition-colors">
              <Grid className="w-3 h-3 mr-1.5 opacity-70" />
              {t}
              <button onClick={() => updateFilter('tipoVehiculo', t)} className="ml-1.5 p-0.5 hover:bg-muted rounded-full text-muted-foreground/50 hover:text-foreground transition-colors">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
          {filters.brand.map(b => (
            <Badge key={b} variant="secondary" className="pl-2 pr-1 py-1 h-7 bg-background border border-border/60 text-muted-foreground hover:bg-muted/50 rounded-lg transition-colors">
              <Tag className="w-3 h-3 mr-1.5 opacity-70" />
              <div className="flex items-center gap-1.5">
                 <BrandLogo brand={b} size="sm" showName={false} />
                 {b}
              </div>
              <button onClick={() => updateFilter('brand', b)} className="ml-1.5 p-0.5 hover:bg-muted rounded-full text-muted-foreground/50 hover:text-foreground transition-colors">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
          {filters.model.map(m => (
            <Badge key={m} variant="secondary" className="pl-2 pr-1 py-1 h-7 bg-background border border-border/60 text-muted-foreground hover:bg-muted/50 rounded-lg transition-colors">
              <Car className="w-3 h-3 mr-1.5 opacity-70" />
              {m}
              <button onClick={() => updateFilter('model', m)} className="ml-1.5 p-0.5 hover:bg-muted rounded-full text-muted-foreground/50 hover:text-foreground transition-colors">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
           {filters.submodel.map(s => (
            <Badge key={s} variant="secondary" className="pl-2 pr-1 py-1 h-7 bg-background border border-border/60 text-muted-foreground hover:bg-muted/50 rounded-lg transition-colors">
              <Layers className="w-3 h-3 mr-1.5 opacity-70" />
              {s}
              <button onClick={() => updateFilter('submodel', s)} className="ml-1.5 p-0.5 hover:bg-muted rounded-full text-muted-foreground/50 hover:text-foreground transition-colors">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
