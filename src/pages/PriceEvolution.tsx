import { useState } from "react"
import { PriceEvolutionChart } from "@/components/PriceEvolutionChart"
import { ModelSubmodelSelector } from "@/components/ModelSubmodelSelector"
import { TrendingUp } from "lucide-react"

export default function PriceEvolution() {
  const [selectedBrand, setSelectedBrand] = useState<string>("")
  const [selectedCategory, setSelectedCategory] = useState<string>("")
  const [selectedModel, setSelectedModel] = useState<string>("")
  const [selectedSubmodel, setSelectedSubmodel] = useState<string>("")

  const handleClearFilters = () => {
    setSelectedBrand("")
    setSelectedCategory("")
    setSelectedModel("")
    setSelectedSubmodel("")
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <TrendingUp className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Evolución de Precios</h1>
          <p className="text-muted-foreground">
            Analiza el histórico de precios a lo largo del tiempo
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card/50 border rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">Filtros de Producto</h2>
        <ModelSubmodelSelector
          selectedBrand={selectedBrand}
          selectedCategory={selectedCategory}
          selectedModel={selectedModel}
          selectedSubmodel={selectedSubmodel}
          onBrandChange={setSelectedBrand}
          onCategoryChange={setSelectedCategory}
          onModelChange={setSelectedModel}
          onSubmodelChange={setSelectedSubmodel}
          onClearFilters={handleClearFilters}
        />
      </div>

      {/* Chart */}
      <PriceEvolutionChart
        selectedBrand={selectedBrand}
        selectedCategory={selectedCategory}
        selectedModel={selectedModel}
        selectedSubmodel={selectedSubmodel}
      />
    </div>
  )
}
