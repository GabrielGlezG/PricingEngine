import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Car, Filter, X } from "lucide-react"

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
  onClearFilters
}: ModelSubmodelSelectorProps) {
  
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
        <div className="grid gap-4 md:grid-cols-5">
          <Select value={selectedBrand || "all"} onValueChange={(value) => onBrandChange(value === "all" ? "" : value)}>
            <SelectTrigger className="bg-card border-border">
              <SelectValue placeholder="Todas las marcas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las marcas</SelectItem>
              {brands?.map(brand => (
                <SelectItem key={brand} value={brand}>{brand}</SelectItem>
              ))}
            </SelectContent>
          </Select>

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

          <Select value={selectedModel || "all"} onValueChange={(value) => onModelChange(value === "all" ? "" : value)}>
            <SelectTrigger className="bg-card border-border">
              <SelectValue placeholder="Todos los modelos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los modelos</SelectItem>
              {models?.map(model => (
                <SelectItem key={model} value={model}>{model}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedSubmodel || "all"} onValueChange={(value) => onSubmodelChange(value === "all" ? "" : value)}>
            <SelectTrigger className="bg-card border-border">
              <SelectValue placeholder="Todos los submodelos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los submodelos</SelectItem>
              {submodels?.map(submodel => (
                <SelectItem key={submodel} value={submodel}>{submodel}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button 
            variant={hasActiveFilters ? "default" : "outline"}
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