import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { PriceEvolutionChart } from "@/components/PriceEvolutionChart"
import { useTheme } from "next-themes"
import { Chart as ChartJS } from "chart.js"
import { hslVar, cn } from "@/lib/utils"

import { BrandLogo } from "@/components/BrandLogo"
import { BrandHeader } from "@/components/BrandHeader"
import { DashboardFilters } from "@/components/DashboardFilters"
import { useInterconnectedFilters } from "@/hooks/useInterconnectedFilters"
import { InstitutionalHeader } from "@/components/InstitutionalHeader"
import { CleanEmptyState } from "@/components/CleanEmptyState"

export default function PriceEvolution() {
  const { theme } = useTheme()
  const [chartKey, setChartKey] = useState(0)
  const [mounted, setMounted] = useState(false)
  
  const [filters, setFilters] = useState({
    tipoVehiculo: [] as string[],
    brand: [] as string[],
    model: [] as string[],
    submodel: [] as string[]
  })

  // State to control popover visibility
  const [tipoVehiculoOpen, setTipoVehiculoOpen] = useState(false)
  const [brandOpen, setBrandOpen] = useState(false)
  const [modelOpen, setModelOpen] = useState(false)
  const [submodelOpen, setSubmodelOpen] = useState(false)

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

  // Fetch filter options using interconnected hook
  const { 
    tiposVehiculo, 
    brands, 
    models, 
    submodels 
  } = useInterconnectedFilters(filters, setFilters, "evolution");

  const hasActiveFilters = filters.tipoVehiculo.length > 0 || filters.brand.length > 0 || filters.model.length > 0 || filters.submodel.length > 0

  const clearFilters = () => {
    setFilters({
      tipoVehiculo: [],
      brand: [],
      model: [],
      submodel: []
    })
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <InstitutionalHeader 
        title="Evolución de Precios"
        description="Análisis histórico de tendencias y comportamiento del mercado."
      />

      {/* Brand Header when brands are selected */}
      {filters.brand.length > 0 && (
        <BrandHeader 
          brands={filters.brand}
          tipoVehiculo={filters.tipoVehiculo}
          models={filters.model}
        />
      )}

      {/* Filters - Sticky */}
      <div className="sticky top-4 z-40">
          <DashboardFilters
            filters={filters}
            setFilters={setFilters}
            tiposVehiculo={tiposVehiculo}
            brands={brands}
            models={models}
            submodels={submodels}
          />
      </div>

      {mounted && (
        <PriceEvolutionChart
          key={`price-evolution-${chartKey}`}
          selectedBrand={filters.brand.length === 1 ? filters.brand[0] : ''}
          selectedCategory=""
          selectedModel={filters.model.length === 1 ? filters.model[0] : ''}
          selectedSubmodel={filters.submodel.length === 1 ? filters.submodel[0] : ''}
          brandFilters={filters.brand}
          modelFilters={filters.model}
          submodelFilters={filters.submodel}
          tipoVehiculoFilters={filters.tipoVehiculo}
        />
      )}
    </div>
  )
}
