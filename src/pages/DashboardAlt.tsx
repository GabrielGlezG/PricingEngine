import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/custom/Card"
import { Button } from "@/components/custom/Button"
import { Select } from "@/components/custom/Select"
import { Badge } from "@/components/custom/Badge"
import { 
  BarChart, Bar, LineChart, Line, ScatterChart, Scatter, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell 
} from 'recharts'
import { TrendingUp, TrendingDown, DollarSign, Package, Building2, RefreshCw, Percent } from "lucide-react"
import { useState } from "react"

interface Analytics {
  metrics: {
    total_models: number
    total_brands: number
    avg_price: number
    median_price: number
    min_price: number
    max_price: number
    price_std_dev: number
    price_range: number
    variation_coefficient: number
    lower_quartile: number
    upper_quartile: number
    current_scraping_date?: string
    total_scraping_sessions?: number
  }
  chart_data: {
    prices_by_brand: Array<{brand: string, avg_price: number, min_price: number, max_price: number, count: number, value_score: number, price_trend?: number}>
    prices_by_category: Array<{category: string, avg_price: number, min_price: number, max_price: number, count: number}>
    models_by_category: Array<{category: string, count: number}>
    models_by_principal: Array<{model_principal: string, count: number, avg_price: number, min_price: number, max_price: number}>
    price_distribution: Array<{range: string, count: number}>
    best_value_models: Array<{brand: string, name: string, category: string, price: number, value_rating: string}>
    top_5_expensive: Array<{brand: string, name: string, price: number}>
    bottom_5_cheap: Array<{brand: string, name: string, price: number}>
    brand_variations: Array<{brand: string, first_avg_price: number, last_avg_price: number, variation_percent: number, scraping_sessions: number}>
    monthly_volatility: {
      most_volatile: Array<{brand: string, model: string, name: string, avg_monthly_variation: number, data_points: number}>
    }
  }
}

export default function DashboardAlt() {
  const [selectedBrand, setSelectedBrand] = useState('')
  const [selectedModel, setSelectedModel] = useState('')
  const [selectedSubmodel, setSelectedSubmodel] = useState('')

  const { data: analytics, isLoading, refetch, isRefetching, error: queryError } = useQuery({
    queryKey: ['analytics-alt', selectedBrand, selectedModel, selectedSubmodel],
    queryFn: async () => {
      console.log('Fetching analytics ALT with filters:', { selectedBrand, selectedModel, selectedSubmodel })
      const params = new URLSearchParams()
      if (selectedBrand) params.append('brand', selectedBrand)
      if (selectedModel) params.append('model', selectedModel)
      if (selectedSubmodel) params.append('submodel', selectedSubmodel)
      
      const { data, error } = await supabase.functions.invoke('get-analytics-v2', {
        body: { params: params.toString() }
      })
      
      console.log('Analytics ALT response:', { data, error })
      
      if (error) {
        console.error('Edge function error (ALT):', error)
        throw error
      }
      
      if (!data) {
        console.warn('No data returned from edge function (ALT)')
        return null
      }
      
      return data as Analytics
    }
  })

  // Log query errors
  if (queryError) {
    console.error('Query error (ALT):', queryError)
  }

  // Debug: log price distribution and timestamp when analytics change
  if (analytics) {
    console.log('Analytics ALT generated_at:', (analytics as any)?.generated_at)
    console.log('Price distribution ALT (server):', (analytics as any)?.chart_data?.price_distribution)
  }

  const { data: products } = useQuery({
    queryKey: ['products-filters'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('brand, model, submodel')
      
      if (error) throw error
      return data
    }
  })

  const brands = Array.from(new Set(products?.map(p => p.brand).filter(Boolean))).sort()
  const models = Array.from(new Set(
    products?.filter(p => !selectedBrand || p.brand === selectedBrand)
      .map(p => p.model).filter(Boolean)
  )).sort()
  const submodels = Array.from(new Set(
    products?.filter(p => 
      (!selectedBrand || p.brand === selectedBrand) && 
      (!selectedModel || p.model === selectedModel)
    ).map(p => p.submodel).filter(Boolean)
  )).sort()

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  }

  const clearFilters = () => {
    setSelectedBrand('')
    setSelectedModel('')
    setSelectedSubmodel('')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#121212] p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-[#B17A50] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-[#D0D0D0]">Cargando datos...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#121212] p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Panel de Análisis</h1>
            <p className="text-[#D0D0D0]">Análisis completo de precios automotrices</p>
          </div>
          <Button 
            onClick={() => refetch()} 
            disabled={isRefetching}
            variant="secondary"
          >
            {isRefetching ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Actualizando...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Actualizar
              </>
            )}
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
            <CardDescription>Filtra los datos por marca, modelo y submodelo</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Select
                value={selectedBrand}
                onChange={(value) => {
                  setSelectedBrand(value)
                  setSelectedModel('')
                  setSelectedSubmodel('')
                }}
                options={brands.map(b => ({ value: b, label: b }))}
                placeholder="Todas las marcas"
              />
              <Select
                value={selectedModel}
                onChange={(value) => {
                  setSelectedModel(value)
                  setSelectedSubmodel('')
                }}
                options={models.map(m => ({ value: m, label: m }))}
                placeholder="Todos los modelos"
              />
              <Select
                value={selectedSubmodel}
                onChange={setSelectedSubmodel}
                options={submodels.map(s => ({ value: s, label: s }))}
                placeholder="Todos los submodelos"
              />
              <Button onClick={clearFilters} variant="outline">
                Limpiar Filtros
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-[#B17A50]">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/80 mb-1">Modelos Totales</p>
                  <p className="text-3xl font-bold text-white">{analytics?.metrics.total_models || 0}</p>
                </div>
                <Package className="h-12 w-12 text-white/60" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#B17A50]">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/80 mb-1">Marcas Activas</p>
                  <p className="text-3xl font-bold text-white">{analytics?.metrics.total_brands || 0}</p>
                </div>
                <Building2 className="h-12 w-12 text-white/60" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#B17A50]">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/80 mb-1">Precio Promedio</p>
                  <p className="text-2xl font-bold text-white">{formatPrice(analytics?.metrics.avg_price || 0)}</p>
                </div>
                <DollarSign className="h-12 w-12 text-white/60" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#B17A50]">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/80 mb-1">Volatilidad</p>
                  <p className="text-3xl font-bold text-white">
                    {analytics?.metrics.variation_coefficient?.toFixed(1) || 0}%
                  </p>
                </div>
                <Percent className="h-12 w-12 text-white/60" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-[#D0D0D0] mb-1">Precio Mínimo</p>
              <p className="text-2xl font-bold text-white">{formatPrice(analytics?.metrics.min_price || 0)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-[#D0D0D0] mb-1">Precio Máximo</p>
              <p className="text-2xl font-bold text-white">{formatPrice(analytics?.metrics.max_price || 0)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-[#D0D0D0] mb-1">Desviación Estándar</p>
              <p className="text-2xl font-bold text-white">{formatPrice(analytics?.metrics.price_std_dev || 0)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Top 5 Expensive and Cheapest */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-[#B17A50]" />
                Top 5 Modelos Más Caros
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics?.chart_data.top_5_expensive?.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-[#121212] rounded-lg border border-[#2A2A2A]">
                    <div>
                      <p className="font-medium text-white">{item.brand}</p>
                      <p className="text-sm text-[#D0D0D0]">{item.name}</p>
                    </div>
                    <p className="text-lg font-bold text-[#B17A50]">{formatPrice(item.price)}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-green-500" />
                Top 5 Modelos Más Baratos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics?.chart_data.bottom_5_cheap?.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-[#121212] rounded-lg border border-[#2A2A2A]">
                    <div>
                      <p className="font-medium text-white">{item.brand}</p>
                      <p className="text-sm text-[#D0D0D0]">{item.name}</p>
                    </div>
                    <p className="text-lg font-bold text-green-500">{formatPrice(item.price)}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bubble Chart - Price vs Model Principal */}
        <Card>
          <CardHeader>
            <CardTitle>Precio vs Modelo Principal</CardTitle>
            <CardDescription>Distribución de precios por línea de modelo (tamaño = cantidad de variantes)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
                <XAxis 
                  dataKey="index" 
                  tick={{ fill: '#D0D0D0', fontSize: 12 }}
                  tickFormatter={(value) => analytics?.chart_data.models_by_principal?.[value]?.model_principal || ''}
                />
                <YAxis 
                  dataKey="avg_price"
                  tick={{ fill: '#D0D0D0', fontSize: 12 }}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1E1E1E', border: '1px solid #2A2A2A', borderRadius: '8px' }}
                  labelStyle={{ color: '#FFFFFF' }}
                  itemStyle={{ color: '#B17A50' }}
                  formatter={(value: number, name: string, props: any) => {
                    const item = analytics?.chart_data.models_by_principal?.[props.payload.index]
                    return [
                      `${item?.model_principal}: ${formatPrice(value)} (${item?.count} variantes)`,
                      ''
                    ]
                  }}
                />
                <Scatter 
                  data={analytics?.chart_data.models_by_principal?.map((item, index) => ({
                    ...item,
                    index
                  }))}
                  fill="#B17A50"
                >
                  {analytics?.chart_data.models_by_principal?.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill="#B17A50" 
                      r={Math.max(6, Math.min(entry.count * 2, 20))}
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Brand Variations */}
        <Card>
          <CardHeader>
            <CardTitle>Variación de Precio por Marca</CardTitle>
            <CardDescription>Cambio de precio promedio entre el primer y último scraping</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={analytics?.chart_data.brand_variations?.filter(b => b.scraping_sessions > 1)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
                <XAxis 
                  dataKey="brand" 
                  tick={{ fill: '#D0D0D0', fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis tick={{ fill: '#D0D0D0', fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1E1E1E', border: '1px solid #2A2A2A', borderRadius: '8px' }}
                  labelStyle={{ color: '#FFFFFF' }}
                  formatter={(value: number) => [`${value.toFixed(2)}%`, 'Variación']}
                />
                <Bar dataKey="variation_percent">
                  {analytics?.chart_data.brand_variations?.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.variation_percent > 0 ? '#ef4444' : '#22c55e'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Monthly Volatility */}
        <Card>
          <CardHeader>
            <CardTitle>Modelos con Mayor Volatilidad</CardTitle>
            <CardDescription>Modelos con mayor variación de precio promedio mensual</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics?.chart_data.monthly_volatility?.most_volatile?.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-[#121212] rounded-lg border border-[#2A2A2A]">
                  <div className="flex-1">
                    <p className="font-medium text-white">{item.brand} {item.model}</p>
                    <p className="text-sm text-[#D0D0D0]">{item.name}</p>
                    <p className="text-xs text-[#D0D0D0] mt-1">{item.data_points} puntos de datos</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="warning">
                      {item.avg_monthly_variation.toFixed(2)}% variación promedio
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Prices by Brand - Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Precios por Marca</CardTitle>
            <CardDescription>Comparación de precios promedio, mínimos y máximos por marca</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={analytics?.chart_data.prices_by_brand}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
                <XAxis 
                  dataKey="brand" 
                  tick={{ fill: '#D0D0D0', fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis 
                  tick={{ fill: '#D0D0D0', fontSize: 12 }}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1E1E1E', border: '1px solid #2A2A2A', borderRadius: '8px' }}
                  labelStyle={{ color: '#FFFFFF' }}
                  formatter={(value: number) => formatPrice(value)}
                />
                <Bar dataKey="avg_price" fill="#B17A50" name="Promedio" />
                <Bar dataKey="min_price" fill="#22c55e" name="Mínimo" />
                <Bar dataKey="max_price" fill="#ef4444" name="Máximo" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Price Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Distribución de Precios</CardTitle>
            <CardDescription>Cantidad de modelos por rango de precio</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={analytics?.chart_data.price_distribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
                <XAxis 
                  dataKey="range" 
                  tick={{ fill: '#D0D0D0', fontSize: 12 }}
                />
                <YAxis tick={{ fill: '#D0D0D0', fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1E1E1E', border: '1px solid #2A2A2A', borderRadius: '8px' }}
                  labelStyle={{ color: '#FFFFFF' }}
                  itemStyle={{ color: '#B17A50' }}
                />
                <Bar dataKey="count" fill="#B17A50" name="Cantidad" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}