import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/custom/Input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Filter, X, Search, Check, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface ModelSubmodelSelectorProps {
  selectedBrand: string
  selectedCategory: string
  selectedModel: string
  selectedSubmodel: string
  onBrandChange: (brand: string) => void
  onCategoryChange: (category: string) => void
  onModelChange: (model: string) => void
  onSubmodelChange: (submodel: string) => void
  onClearFilters: () => void
  hideCategory?: boolean
  copperClearButton?: boolean
}

export function ModelSubmodelSelector({
  selectedBrand,
  selectedCategory,
  selectedModel,
  selectedSubmodel,
  onBrandChange,
  onCategoryChange,
  onModelChange,
  onSubmodelChange,
  onClearFilters,
  hideCategory = false,
  copperClearButton = false
}: ModelSubmodelSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("")
  
  const { data: brands } = useQuery({
    queryKey: ['brands-selector'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('brand')
        .order('brand')
      
      if (error) throw error
      return [...new Set(data.map(p => p.brand))]
    }
  })

  const { data: categories } = useQuery({
    queryKey: ['categories-selector', selectedBrand],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select('category')
        .order('category')
      
      if (selectedBrand) {
        query = query.eq('brand', selectedBrand)
      }
      
      const { data, error } = await query
      if (error) throw error
      return [...new Set(data.map(p => p.category))]
    }
  })

  const { data: models } = useQuery({
    queryKey: ['models-selector', selectedBrand, selectedCategory],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select('model, name')
        .order('model')
      
      if (selectedBrand) {
        query = query.eq('brand', selectedBrand)
      }
      if (selectedCategory) {
        query = query.eq('category', selectedCategory)
      }
      
      const { data, error } = await query
      if (error) throw error
      return [...new Set(data.map(p => p.model))]
    }
  })

  const { data: submodels } = useQuery({
    queryKey: ['submodels-selector', selectedBrand, selectedCategory, selectedModel],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select('submodel')
        .not('submodel', 'is', null)
        .order('submodel')
      
      if (selectedBrand) {
        query = query.eq('brand', selectedBrand)
      }
      if (selectedCategory) {
        query = query.eq('category', selectedCategory)
      }
      if (selectedModel) {
        query = query.eq('model', selectedModel)
      }
      
      const { data, error } = await query
      if (error) throw error
      return [...new Set(data.map(p => p.submodel).filter(Boolean))]
    }
  })

  const hasActiveFilters = selectedBrand || selectedCategory || selectedModel || selectedSubmodel

  // Filter options based on search query
  const filteredBrands = (brands || []).filter(brand => 
    brand.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredModels = (models || []).filter(model => 
    model.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredSubmodels = (submodels || []).filter(submodel => 
    submodel.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // State to control popover visibility
  const [brandOpen, setBrandOpen] = useState(false)
  const [categoryOpen, setCategoryOpen] = useState(false)
  const [modelOpen, setModelOpen] = useState(false)
  const [submodelOpen, setSubmodelOpen] = useState(false)

  return (
    <div className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border border-border rounded-lg p-4">
      {/* Search Bar */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Buscar marca, modelo o submodelo..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 h-10 bg-background/50"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Filter Pills */}
      <div className="flex flex-wrap gap-2">
        {/* Brand Filter */}
        <Popover open={brandOpen} onOpenChange={setBrandOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-9 border-dashed",
                selectedBrand && "border-solid border-primary bg-primary/10"
              )}
            >
              <Filter className="mr-2 h-3.5 w-3.5" />
              Marca
              {selectedBrand && (
                <>
                  <span className="mx-1">:</span>
                  <span className="font-semibold">{selectedBrand}</span>
                </>
              )}
              <ChevronDown className="ml-2 h-3.5 w-3.5 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Buscar marca..." />
              <CommandList>
                <CommandEmpty>No se encontró marca.</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    onSelect={() => {
                      onBrandChange("")
                      setBrandOpen(false)
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        !selectedBrand ? "opacity-100" : "opacity-0"
                      )}
                    />
                    Todas las marcas
                  </CommandItem>
                  {(searchQuery ? filteredBrands : brands || []).map((brand) => (
                    <CommandItem
                      key={brand}
                      onSelect={() => {
                        onBrandChange(brand)
                        setBrandOpen(false)
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedBrand === brand ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {brand}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Category Filter */}
        {!hideCategory && (
          <Popover open={categoryOpen} onOpenChange={setCategoryOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-9 border-dashed",
                  selectedCategory && "border-solid border-primary bg-primary/10"
                )}
              >
                <Filter className="mr-2 h-3.5 w-3.5" />
                Categoría
                {selectedCategory && (
                  <>
                    <span className="mx-1">:</span>
                    <span className="font-semibold">{selectedCategory}</span>
                  </>
                )}
                <ChevronDown className="ml-2 h-3.5 w-3.5 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Buscar categoría..." />
                <CommandList>
                  <CommandEmpty>No se encontró categoría.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem onSelect={() => {
                      onCategoryChange("")
                      setCategoryOpen(false)
                    }}>
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          !selectedCategory ? "opacity-100" : "opacity-0"
                        )}
                      />
                      Todas las categorías
                    </CommandItem>
                    {categories?.map((category) => (
                      <CommandItem
                        key={category}
                        onSelect={() => {
                          onCategoryChange(category)
                          setCategoryOpen(false)
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedCategory === category ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {category}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        )}

        {/* Model Filter */}
        <Popover open={modelOpen} onOpenChange={setModelOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-9 border-dashed",
                selectedModel && "border-solid border-primary bg-primary/10"
              )}
            >
              <Filter className="mr-2 h-3.5 w-3.5" />
              Modelo
              {selectedModel && (
                <>
                  <span className="mx-1">:</span>
                  <span className="font-semibold truncate max-w-[100px]">{selectedModel}</span>
                </>
              )}
              <ChevronDown className="ml-2 h-3.5 w-3.5 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[250px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Buscar modelo..." />
              <CommandList>
                <CommandEmpty>No se encontró modelo.</CommandEmpty>
                <CommandGroup>
                  <CommandItem onSelect={() => {
                    onModelChange("")
                    setModelOpen(false)
                  }}>
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        !selectedModel ? "opacity-100" : "opacity-0"
                      )}
                    />
                    Todos los modelos
                  </CommandItem>
                  {(searchQuery ? filteredModels : models || []).map((model) => (
                    <CommandItem
                      key={model}
                      onSelect={() => {
                        onModelChange(model)
                        setModelOpen(false)
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedModel === model ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {model}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Submodel Filter */}
        <Popover open={submodelOpen} onOpenChange={setSubmodelOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-9 border-dashed",
                selectedSubmodel && "border-solid border-primary bg-primary/10"
              )}
            >
              <Filter className="mr-2 h-3.5 w-3.5" />
              Submodelo
              {selectedSubmodel && (
                <>
                  <span className="mx-1">:</span>
                  <span className="font-semibold truncate max-w-[80px]">{selectedSubmodel}</span>
                </>
              )}
              <ChevronDown className="ml-2 h-3.5 w-3.5 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[250px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Buscar submodelo..." />
              <CommandList>
                <CommandEmpty>No se encontró submodelo.</CommandEmpty>
                <CommandGroup>
                  <CommandItem onSelect={() => {
                    onSubmodelChange("")
                    setSubmodelOpen(false)
                  }}>
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        !selectedSubmodel ? "opacity-100" : "opacity-0"
                      )}
                    />
                    Todos los submodelos
                  </CommandItem>
                  {(searchQuery ? filteredSubmodels : submodels || []).map((submodel) => (
                    <CommandItem
                      key={submodel}
                      onSelect={() => {
                        onSubmodelChange(submodel)
                        setSubmodelOpen(false)
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedSubmodel === submodel ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {submodel}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Clear Button */}
        {hasActiveFilters && (
          <Button
            variant={copperClearButton ? "copper" : "ghost"}
            size="sm"
            onClick={onClearFilters}
            className="h-9"
          >
            <X className="mr-2 h-3.5 w-3.5" />
            Limpiar
          </Button>
        )}
      </div>

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-border">
          {selectedBrand && (
            <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20">
              {selectedBrand}
              <button
                onClick={() => onBrandChange("")}
                className="ml-1 hover:text-primary/70"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {selectedCategory && (
            <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20">
              {selectedCategory}
              <button
                onClick={() => onCategoryChange("")}
                className="ml-1 hover:text-primary/70"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {selectedModel && (
            <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20">
              {selectedModel}
              <button
                onClick={() => onModelChange("")}
                className="ml-1 hover:text-primary/70"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {selectedSubmodel && (
            <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20">
              {selectedSubmodel}
              <button
                onClick={() => onSubmodelChange("")}
                className="ml-1 hover:text-primary/70"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}