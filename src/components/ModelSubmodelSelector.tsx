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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Selector de Modelo y Submodelo
        </CardTitle>
        <CardDescription>
          Selecciona marca, categoría, modelo y submodelo para análisis detallado
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-5">
          <Select value={selectedBrand || "all"} onValueChange={(value) => onBrandChange(value === "all" ? "" : value)}>
            <SelectTrigger>
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
            <SelectTrigger>
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
            <SelectTrigger>
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
            <SelectTrigger>
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
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
            <span className="text-sm text-muted-foreground">Filtros activos:</span>
            {selectedBrand && (
              <Badge variant="secondary">
                Marca: {selectedBrand}
                <X 
                  className="h-3 w-3 ml-1 cursor-pointer" 
                  onClick={() => onBrandChange("")}
                />
              </Badge>
            )}
            {selectedCategory && (
              <Badge variant="secondary">
                Categoría: {selectedCategory}
                <X 
                  className="h-3 w-3 ml-1 cursor-pointer" 
                  onClick={() => onCategoryChange("")}
                />
              </Badge>
            )}
            {selectedModel && (
              <Badge variant="secondary">
                Modelo: {selectedModel}
                <X 
                  className="h-3 w-3 ml-1 cursor-pointer" 
                  onClick={() => onModelChange("")}
                />
              </Badge>
            )}
            {selectedSubmodel && (
              <Badge variant="secondary">
                Submodelo: {selectedSubmodel}
                <X 
                  className="h-3 w-3 ml-1 cursor-pointer" 
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