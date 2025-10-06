import { useState } from "react"
import { PriceEvolutionChart } from "@/components/PriceEvolutionChart"
import { ModelSubmodelSelector } from "@/components/ModelSubmodelSelector"

export default function PriceEvolution() {
  const [filters, setFilters] = useState({
    brand: '',
    model: '',
    submodel: ''
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Evolución de Precios</h1>
        <p className="text-muted-foreground">
          Visualiza la evolución histórica de precios de productos específicos
        </p>
      </div>

      <ModelSubmodelSelector
        selectedBrand={filters.brand}
        selectedCategory=""
        selectedModel={filters.model}
        selectedSubmodel={filters.submodel}
        onBrandChange={(brand) => setFilters(f => ({ ...f, brand }))}
        onCategoryChange={() => {}}
        onModelChange={(model) => setFilters(f => ({ ...f, model }))}
        onSubmodelChange={(submodel) => setFilters(f => ({ ...f, submodel }))}
        onClearFilters={() => setFilters({
          brand: '',
          model: '',
          submodel: ''
        })}
        hideCategory
        copperClearButton
      />

      <PriceEvolutionChart
        selectedBrand={filters.brand}
        selectedCategory=""
        selectedModel={filters.model}
        selectedSubmodel={filters.submodel}
      />
    </div>
  )
}
