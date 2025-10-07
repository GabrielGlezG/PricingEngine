import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/custom/Input"
import { Car, Filter, X, Search } from "lucide-react"

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

  return (
    <Card className="border-border/50 shadow-md">
      <CardHeader className="space-y-1 pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Filter className="h-5 w-5 text-primary" />
          Filtros de Búsqueda
        </CardTitle>
        <CardDescription>
          Filtra por marca, categoría, modelo y submodelo para análisis específico
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Search Input */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar marca, modelo o submodelo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div className={`grid gap-4 ${hideCategory ? 'md:grid-cols-4' : 'md:grid-cols-5'}`}>
          <Select value={selectedBrand || "all"} onValueChange={(value) => {
            onBrandChange(value === "all" ? "" : value)
          }}>
            <SelectTrigger className="bg-card border-border">
              <SelectValue placeholder="Todas las marcas" />
            </SelectTrigger>
            <SelectContent key={`brands-${searchQuery}`}>
              <SelectItem value="all">Todas las marcas</SelectItem>
              {filteredBrands.map(brand => (
                <SelectItem key={brand} value={brand}>{brand}</SelectItem>
              ))}
              {searchQuery && filteredBrands.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-2">
                  No se encontraron marcas
                </div>
              )}
            </SelectContent>
          </Select>

          {!hideCategory && (
            <Select value={selectedCategory || "all"} onValueChange={(value) => onCategoryChange(value === "all" ? "" : value)}>
              <SelectTrigger className="bg-card border-border">
                <SelectValue placeholder="Todas las categorías" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {categories?.map(category => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Select value={selectedModel || "all"} onValueChange={(value) => {
            onModelChange(value === "all" ? "" : value)
          }}>
            <SelectTrigger className="bg-card border-border">
              <SelectValue placeholder="Todos los modelos" />
            </SelectTrigger>
            <SelectContent key={`models-${searchQuery}`}>
              <SelectItem value="all">Todos los modelos</SelectItem>
              {filteredModels.map(model => (
                <SelectItem key={model} value={model}>{model}</SelectItem>
              ))}
              {searchQuery && filteredModels.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-2">
                  No se encontraron modelos
                </div>
              )}
            </SelectContent>
          </Select>

          <Select value={selectedSubmodel || "all"} onValueChange={(value) => {
            onSubmodelChange(value === "all" ? "" : value)
          }}>
            <SelectTrigger className="bg-card border-border">
              <SelectValue placeholder="Todos los submodelos" />
            </SelectTrigger>
            <SelectContent key={`submodels-${searchQuery}`}>
              <SelectItem value="all">Todos los submodelos</SelectItem>
              {filteredSubmodels.map(submodel => (
                <SelectItem key={submodel} value={submodel}>{submodel}</SelectItem>
              ))}
              {searchQuery && filteredSubmodels.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-2">
                  No se encontraron submodelos
                </div>
              )}
            </SelectContent>
          </Select>

          <Button 
            variant={copperClearButton ? "copper" : (hasActiveFilters ? "default" : "outline")}
            onClick={onClearFilters}
            className="w-full"
          >
            {hasActiveFilters ? (
              <>
                <X className="h-4 w-4 mr-2" />
                Limpiar
              </>
            ) : (
              <>
                <Filter className="h-4 w-4 mr-2" />
                Sin filtros
              </>
            )}
          </Button>
        </div>

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border">
            <span className="text-sm text-muted-foreground font-medium">Filtros activos:</span>
            {selectedBrand && (
              <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30">
                Marca: {selectedBrand}
                <X 
                  className="h-3 w-3 ml-1 cursor-pointer hover:opacity-70" 
                  onClick={() => onBrandChange("")}
                />
              </Badge>
            )}
            {selectedCategory && (
              <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30">
                Categoría: {selectedCategory}
                <X 
                  className="h-3 w-3 ml-1 cursor-pointer hover:opacity-70" 
                  onClick={() => onCategoryChange("")}
                />
              </Badge>
            )}
            {selectedModel && (
              <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30">
                Modelo: {selectedModel}
                <X 
                  className="h-3 w-3 ml-1 cursor-pointer hover:opacity-70" 
                  onClick={() => onModelChange("")}
                />
              </Badge>
            )}
            {selectedSubmodel && (
              <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30">
                Submodelo: {selectedSubmodel}
                <X 
                  className="h-3 w-3 ml-1 cursor-pointer hover:opacity-70" 
                  onClick={() => onSubmodelChange("")}
                />
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}