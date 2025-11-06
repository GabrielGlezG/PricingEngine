import { useState, useEffect } from "react"
import { PriceEvolutionChart } from "@/components/PriceEvolutionChart"
import { ModelSubmodelSelector } from "@/components/ModelSubmodelSelector"
import { useTheme } from "next-themes"
import { Chart as ChartJS } from "chart.js"
import { hslVar } from "@/lib/utils"

export default function PriceEvolution() {
  const { theme } = useTheme()
  const [chartKey, setChartKey] = useState(0)
  const [mounted, setMounted] = useState(false)
  
  const [filters, setFilters] = useState({
    brand: '',
    model: '',
    submodel: ''
  })

  // Update ChartJS defaults and force remount when theme changes
  useEffect(() => {
    ChartJS.defaults.color = hslVar("--foreground")
    setMounted(false)
    setChartKey((prev) => prev + 1)
    
    const isMobile = window.innerWidth < 768
    const delay = isMobile ? 100 : 50
    
    const timer = setTimeout(() => setMounted(true), delay)
    return () => clearTimeout(timer)
  }, [theme])

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Evolución de Precios</h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">
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
        showSearchResults
      />

      {mounted && (
        <PriceEvolutionChart
          key={`price-evolution-${chartKey}`}
          selectedBrand={filters.brand}
          selectedCategory=""
          selectedModel={filters.model}
          selectedSubmodel={filters.submodel}
        />
      )}
    </div>
  )
}