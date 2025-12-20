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

  // Fetch filter options
  const { data: tiposVehiculo } = useQuery({
    queryKey: ['tiposVehiculo-evolution'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('tipo_vehiculo')
        .not('tipo_vehiculo', 'is', null)
        .order('tipo_vehiculo')

      if (error) throw error
      return [...new Set(data.map((p) => p.tipo_vehiculo).filter(Boolean))] as string[]
    }
  })

  const { data: brands } = useQuery({
    queryKey: ['brands-evolution', filters.tipoVehiculo],
    queryFn: async () => {
      let query = supabase.from('products').select('brand').order('brand')
      if (filters.tipoVehiculo.length > 0) {
        query = query.in('tipo_vehiculo', filters.tipoVehiculo)
      }
      const { data, error } = await query
      if (error) throw error
      return [...new Set(data.map((p) => p.brand))]
    }
  })

  const { data: models } = useQuery({
    queryKey: ['models-evolution', filters.brand],
    queryFn: async () => {
      let query = supabase.from('products').select('model').order('model')
      if (filters.brand.length > 0) {
        query = query.in('brand', filters.brand)
      }
      const { data, error } = await query
      if (error) throw error
      return [...new Set(data.map((p) => p.model))]
    }
  })

  const { data: submodels } = useQuery({
    queryKey: ['submodels-evolution', filters.brand, filters.model],
    queryFn: async () => {
      let query = supabase.from('products').select('submodel').not('submodel', 'is', null).order('submodel')
      if (filters.brand.length > 0) {
        query = query.in('brand', filters.brand)
      }
      if (filters.model.length > 0) {
        query = query.in('model', filters.model)
      }
      const { data, error } = await query
      if (error) throw error
      return [...new Set(data.map((p) => p.submodel).filter(Boolean))]
    }
  })

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
      <div className="flex flex-col gap-2 pb-6 border-b border-border/40">
        <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
          Evolución de Precios
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl">
          Visualiza y analiza cómo han cambiado los precios históricos de cada modelo en el tiempo.
        </p>
      </div>

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
