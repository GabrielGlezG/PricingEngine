import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useCurrency } from "@/contexts/CurrencyContext"
import { useTheme } from "next-themes"
import { hslVar, cn } from "@/lib/utils"
import { getScaleOptions } from "@/config/chartColors"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Scale, DollarSign, Download, FileSpreadsheet, Presentation } from "lucide-react"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { Slider } from "@/components/ui/slider"
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip as ChartTooltip,
  Legend as ChartLegend,
} from 'chart.js'
import { BrandLogo } from "@/components/BrandLogo"
import { BrandHeader } from "@/components/BrandHeader"
import { DashboardFilters } from "@/components/DashboardFilters"
import { useInterconnectedFilters } from "@/hooks/useInterconnectedFilters"
import { InstitutionalHeader } from "@/components/InstitutionalHeader"
import { CleanEmptyState } from "@/components/CleanEmptyState"
import { LoadingSpinner } from "@/components/LoadingSpinner"
import { exportCompareData, exportCompareDataPPT } from "@/lib/exportPages"


ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  ChartTooltip,
  ChartLegend
)

ChartJS.defaults.color = "hsl(var(--foreground))";

interface Product {
  id: string
  brand: string
  category: string
  model: string
  submodel: string
  name: string
  tipo_vehiculo?: string
  latest_price?: number
  min_price?: number
  max_price?: number
  avg_price?: number
  price_history?: Array<{date: string, price: number}>
}

interface ComparisonData {
  product: Product
  priceData: Array<{date: string, [key: string]: string | number}>
}

export default function Compare() {
  const { formatPrice, currency } = useCurrency()
  const { theme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [chartKey, setChartKey] = useState(0)
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const [isExporting, setIsExporting] = useState(false)

  
  const [filters, setFilters] = useState({
    tipoVehiculo: [] as string[],
    brand: [] as string[],
    model: [] as string[],
    submodel: [] as string[],
    priceRange: [0, 2000000] as [number, number]
  })

  useEffect(() => {
    ChartJS.defaults.color = hslVar('--foreground');
    setMounted(false);
    setChartKey((prev) => prev + 1);
    const isMobile = window.innerWidth < 768;
    const delay = isMobile ? 100 : 50;

    const timer = setTimeout(() => setMounted(true), delay);
    return () => clearTimeout(timer);
  }, [theme, currency]);

  useEffect(() => {
    setMounted(true);
  }, []);




  // Fetch filter options using interconnected hook
  const { 
    tiposVehiculo, 
    brands, 
    models, 
    submodels 
  } = useInterconnectedFilters(filters, setFilters, "compare");

  // Fetch products for comparison
  const { data: products } = useQuery({
    queryKey: ['products-for-comparison'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select(`*, price_data (price, date)`)
        .order('brand')
      
      if (error) throw error
      
      return data?.map(product => {
        const prices = product.price_data?.map(p => p.price) || []
        const sortedHistory = product.price_data?.sort((a, b) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
        ) || []
        
        return {
          ...product,
          latest_price: prices.length > 0 ? prices[prices.length - 1] : 0,
          min_price: prices.length > 0 ? Math.min(...prices) : 0,
          max_price: prices.length > 0 ? Math.max(...prices) : 0,
          avg_price: prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0,
          price_history: sortedHistory
        }
      }) || []
    }
  })

  // Calculate min and max prices
  const prices = products?.map(p => p.latest_price || 0).filter(p => p > 0) || []
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 2000000
  
  useEffect(() => {
    if (products && products.length > 0 && filters.priceRange[0] === 0 && filters.priceRange[1] === 2000000 && minPrice > 0 && maxPrice > 0) {
      setFilters(f => ({ ...f, priceRange: [minPrice, maxPrice] }))
    }
  }, [products, minPrice, maxPrice])

  const hasActiveFilters = filters.tipoVehiculo.length > 0 || filters.brand.length > 0 || filters.model.length > 0 || filters.submodel.length > 0

  // Filter products based on current filters
  const filteredProducts = hasActiveFilters ? (products?.filter(product => {
    if (filters.tipoVehiculo.length > 0 && !filters.tipoVehiculo.includes(product.tipo_vehiculo || '')) return false
    if (filters.brand.length > 0 && !filters.brand.includes(product.brand)) return false
    if (filters.model.length > 0 && !filters.model.includes(product.model)) return false
    if (filters.submodel.length > 0 && !filters.submodel.includes(product.submodel || '')) return false
    const price = product.latest_price || 0
    if (price < filters.priceRange[0] || price > filters.priceRange[1]) return false
    return true
  }) || []) : []

  // Auto-select all filtered products
  useEffect(() => {
    if (hasActiveFilters && filteredProducts.length > 0) {
      setSelectedProducts(filteredProducts.map(p => p.id))
    } else {
      setSelectedProducts([])
    }
  }, [hasActiveFilters, JSON.stringify(filteredProducts.map(p => p.id))])

  // Get comparison data for selected products
  const getComparisonData = (productIds: string[]): ComparisonData[] => {
    const selectedData = products?.filter(p => productIds.includes(p.id)) || []
    
    const allDates = new Set<string>()
    selectedData.forEach(product => {
      product.price_history?.forEach(ph => {
        allDates.add(ph.date)
      })
    })
    
    const sortedDates = Array.from(allDates).sort()
    
    const priceData = sortedDates.map(date => {
      const dataPoint: any = { date: new Date(date).toLocaleDateString('es-MX', { month: 'short', year: 'numeric' }) }
      
      selectedData.forEach(product => {
        const priceEntry = product.price_history?.find(ph => ph.date === date)
        const label = `${product.brand} ${product.model} ${product.submodel || ''}`.trim()
        dataPoint[label] = priceEntry?.price || null
      })
      
      return dataPoint
    })
    
    return selectedData.map(product => ({
      product,
      priceData
    }))
  }

  const comparisonData = getComparisonData(selectedProducts)

  const getProductColor = (index: number) => {
    const idx = (index % 8) + 1
    return hslVar(`--chart-${idx}`)
  }

  const clearFilters = () => {
    setSelectedProducts([])
    setFilters({
      tipoVehiculo: [],
      brand: [],
      model: [],
      submodel: [],
      priceRange: [minPrice, maxPrice]
    })
  }

  return (
    <div className="space-y-6">
      <InstitutionalHeader 
        title="Comparador de Vehículos" 
        description="Selecciona y compara las características y precios de diferentes modelos lado a lado."
      />

      {/* Brand Header when brands are selected */}
      {filters.brand.length > 0 && (
        <BrandHeader 
          brands={filters.brand}
          tipoVehiculo={filters.tipoVehiculo}
          models={filters.model}
        />
      )}

      {/* Filters Section - Floating Style */}
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

      {/* Price Range Slider - Only show when we have products */}
      {products && products.length > 0 && (
         <Card className="bg-gradient-to-r from-background/95 via-primary/5 to-background/95 backdrop-blur-xl border border-primary/20 shadow-lg shadow-primary/5 hover:shadow-primary/10 hover:border-primary/30 transition-all duration-300">
            <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-6">
              <div className="flex items-center gap-2 min-w-[150px]">
                 <div className="p-2 bg-primary/10 rounded-full">
                    <DollarSign className="w-4 h-4 text-primary" />
                 </div>
                 <span className="font-medium text-sm">Rango de Precio</span>
              </div>
              
              <div className="flex-1 space-y-3">
                  <Slider
                    value={filters.priceRange}
                    onValueChange={(value) => setFilters(f => ({ ...f, priceRange: value as [number, number] }))}
                    min={minPrice}
                    max={maxPrice}
                    step={10000}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{formatPrice(filters.priceRange[0])}</span>
                    <span>{formatPrice(filters.priceRange[1])}</span>
                  </div>
              </div>
            </div>
         </Card>
      )}

      {/* Active Selection Summary */}
      {hasActiveFilters && selectedProducts.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground px-1">
          <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          <span>Mostrando <strong>{selectedProducts.length}</strong> modelos que coinciden con tu búsqueda</span>
        </div>
      )}

       {!hasActiveFilters && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <Scale className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Comienza tu comparación</h3>
            <p className="text-muted-foreground max-w-sm mx-auto">
              Utiliza la barra de filtros superior para buscar por marca, modelo o categoría.
            </p>
          </CardContent>
        </Card>
       )}

      {/* Comparación Detallada */}
      {comparisonData.length > 0 && (
        <>
          {/* Tabla de Comparación */}
          <Card>
            <div className="p-6">
              <h2 className="card-title mb-2">Comparación Detallada</h2>
              <p className="caption mb-6">Análisis lado a lado de los modelos seleccionados</p>
              
              <div className="overflow-x-auto rounded-lg border border-border/40">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border/60 bg-muted/30">
                      <th className="text-left p-4 font-semibold text-muted-foreground uppercase text-xs tracking-wider">Característica</th>
                      {comparisonData.map((item, index) => (
                        <th key={index} className="text-center p-4 min-w-[200px] border-l border-border/30 bg-background/50 backdrop-blur-sm">
                          <div className="flex flex-col items-center gap-2">
                            <BrandLogo brand={item.product.brand} size="lg" showName={false} />
                            <p className="font-medium text-foreground">{item.product.brand} {item.product.model}</p>
                            {item.product.submodel && (
                              <p className="text-xs text-primary font-medium bg-primary/10 px-2 py-0.5 rounded-full">{item.product.submodel}</p>
                            )}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border">
                      <td className="p-3 label-text">Precio Actual</td>
                      {comparisonData.map((item, index) => (
                        <td key={index} className="p-3 text-center">
                          <span className="stat-number text-primary">
                            {formatPrice(item.product.latest_price || 0)}
                          </span>
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b border-border">
                      <td className="p-3 label-text">Segmento</td>
                      {comparisonData.map((item, index) => (
                        <td key={index} className="p-3 text-center">
                          <Badge variant="default">{item.product.tipo_vehiculo || "Sin Categoría"}</Badge>
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b border-border">
                      <td className="p-3 label-text">Precio Promedio Histórico</td>
                      {comparisonData.map((item, index) => (
                        <td key={index} className="p-3 text-center caption">
                          {formatPrice(item.product.avg_price || 0)}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b border-border">
                      <td className="p-3 label-text">Rango de Precios</td>
                      {comparisonData.map((item, index) => (
                        <td key={index} className="p-3 text-center caption">
                          {formatPrice(item.product.min_price || 0)} - {formatPrice(item.product.max_price || 0)}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </Card>

          {/* Gráfico de Evolución de Precios */}
          <Card>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="card-title mb-2">Evolución de Precios</h2>
                  <p className="caption">Comparación de precios históricos</p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                        disabled={isExporting}
                        variant="outline" 
                        className="gap-2"
                    >
                        {isExporting ? <LoadingSpinner size="sm" /> : <Download className="h-4 w-4" />}
                        Exportar
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem 
                      onClick={async () => {
                        setIsExporting(true);
                        try {
                          await exportCompareData(
                            comparisonData,
                            filters,
                            currency === 'CLP' ? '$' : 'UF',
                            (price) => price
                          );
                        } finally {
                          setIsExporting(false);
                        }
                      }}
                    >
                      <FileSpreadsheet className="mr-2 h-4 w-4" />
                      <span>Exportar Excel (.xlsx)</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={async () => {
                        setIsExporting(true);
                        try {
                          await exportCompareDataPPT(
                            comparisonData,
                            filters,
                            currency === 'CLP' ? '$' : 'UF',
                            (price) => price
                          );
                        } finally {
                          setIsExporting(false);
                        }
                      }}
                    >
                      <Presentation className="mr-2 h-4 w-4" />
                      <span>Exportar PowerPoint (.pptx)</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              <div className="h-[300px] sm:h-[400px]">
                {mounted && <Line

                  key={`compare-price-evolution-${chartKey}`}
                  data={{
                    labels: comparisonData[0]?.priceData.map(d => d.date) || [],
                    datasets: comparisonData.map((item, index) => {
                      const label = `${item.product.brand} ${item.product.model} ${item.product.submodel || ''}`.trim()
                      return {
                        label,
                        data: comparisonData[0]?.priceData.map(d => d[label]) || [],
                        borderColor: getProductColor(index),
                        backgroundColor: getProductColor(index),
                        borderWidth: 2,
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        tension: 0.4,
                        spanGaps: true,
                      }
                    })
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: true,
                        position: 'top' as const,
                        labels: {
                          color: hslVar('--foreground'),
                          padding: 15,
                          font: { size: 12 }
                        }
                      },
                      tooltip: {
                        backgroundColor: hslVar('--card'),
                        borderColor: hslVar('--border'),
                        borderWidth: 1,
                        titleColor: hslVar('--foreground'),
                        bodyColor: hslVar('--foreground'),
                        padding: 12,
                        cornerRadius: 8,
                        callbacks: {
                          label: (context) => {
                            const value = context.parsed.y
                            return value ? `${context.dataset.label}: ${formatPrice(value)}` : ''
                          }
                        }
                      }
                    },
                    scales: {
                      x: getScaleOptions(),
                      y: {
                        ...getScaleOptions(),
                        ticks: {
                          ...getScaleOptions().ticks,
                          callback: (value: any) => formatPrice(value)
                        }
                      }
                    },
                    interaction: {
                      mode: 'index' as const,
                      intersect: false,
                    }
                  }}
                />}
              </div>
            </div>
          </Card>
        </>
      )}

      {comparisonData.length === 0 && hasActiveFilters && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <Scale className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No hay modelos que coincidan</h3>
            <p className="text-muted-foreground max-w-sm mx-auto">
              Intenta ajustar los filtros para encontrar vehículos.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
