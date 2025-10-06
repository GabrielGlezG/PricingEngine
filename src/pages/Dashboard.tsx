import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/contexts/AuthContext"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CalendarIcon, DollarSign, Package, TrendingUp, BarChart3, RefreshCw, Target, Award, AlertTriangle, Building2, Activity, TrendingDown } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, ScatterChart, Scatter, Legend, ZAxis, ComposedChart } from 'recharts'
import { useState, useMemo } from "react"


interface AnalyticsData {
  metrics: {
    total_models: number
    total_brands: number
    total_categories: number
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
    top_5_expensive: Array<{name: string, brand: string, price: number}>
    bottom_5_cheap: Array<{name: string, brand: string, price: number}>
    brand_variations: Array<{brand: string, first_avg_price: number, last_avg_price: number, variation_percent: number, scraping_sessions: number}>
    monthly_volatility: {
      most_volatile: Array<{brand: string, model: string, name: string, avg_monthly_variation: number, data_points: number}>
    }
  }
  historical_data?: Array<{date: string, price: number}>
  applied_filters: {
    brand?: string
    category?: string
    model?: string
    submodel?: string
    date_from?: string
    date_to?: string
    ctx_precio?: string
    priceRange?: string
  }
  generated_at: string
}

const COLORS = [
  'hsl(var(--chart-1))', 
  'hsl(var(--chart-2))', 
  'hsl(var(--chart-3))', 
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))', 
  'hsl(var(--chart-6))', 
  'hsl(var(--chart-7))', 
  'hsl(var(--chart-8))',
  'hsl(var(--chart-9))', 
  'hsl(var(--chart-10))', 
  'hsl(var(--chart-11))', 
  'hsl(var(--chart-12))'
]

export default function Dashboard() {
  const [filters, setFilters] = useState({
    brand: '',
    category: '',
    model: '',
    submodel: '',
    date_from: '',
    date_to: '',
    ctx_precio: '',
    priceRange: ''
  })
  const [refreshTick, setRefreshTick] = useState(0)

  // Debug de autenticación
  const { user, profile, isAdmin, hasActiveSubscription } = useAuth()
  console.log('Dashboard Auth Debug:', {
    user: !!user,
    profile: !!profile,
    isAdmin,
    hasActiveSubscription,
    profileData: profile
  })

const { data: analytics, isLoading, refetch, isRefetching, error: queryError } = useQuery({
    queryKey: ['analytics-v2', filters, refreshTick],
    queryFn: async () => {
      console.log('Fetching analytics with filters:', filters)
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value)
      })

      // Try v2 first, fallback to v1 if it fails
      const tryInvoke = async (fnName: string) => {
        return await supabase.functions.invoke(fnName, {
          body: { params: params.toString() }
        })
      }

      let data: any = null
      let error: any = null
      try {
        const resV2 = await tryInvoke('get-analytics-v2')
        data = resV2.data
        error = resV2.error
        console.log('Analytics v2 response:', { data, error })
      } catch (e) {
        console.warn('get-analytics-v2 failed, will try fallback:', e)
      }

      if (!data) {
        try {
          const resV1 = await tryInvoke('get-analytics')
          data = resV1.data
          error = resV1.error
          console.log('Analytics v1 fallback response:', { data, error })
        } catch (e) {
          console.error('Fallback get-analytics failed:', e)
        }
      }

      if (error) {
        console.error('Edge function error:', error)
      }

      if (!data) {
        console.warn('No data returned from any edge function')
        return null
      }

      return data as AnalyticsData
    },
    retry: (failureCount, error) => {
      console.error('Analytics query error:', error)
      return failureCount < 2
    }
  })

  // Log query errors
  if (queryError) {
    console.error('Query error:', queryError)
  }

  // Debug: log price distribution and timestamp when analytics change
  if (analytics) {
    console.log('Analytics generated_at:', analytics.generated_at)
    console.log('Price distribution (server):', analytics.chart_data?.price_distribution)
  }

  const { data: brands } = useQuery({
    queryKey: ['brands'],
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
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('category')
        .order('category')
      
      if (error) throw error
      return [...new Set(data.map(p => p.category))]
    }
  })

  const { data: models } = useQuery({
    queryKey: ['models', filters.brand, filters.category],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select('model, name, brand')
        .order('model')
      
      if (filters.brand) {
        query = query.eq('brand', filters.brand)
      }
      if (filters.category) {
        query = query.eq('category', filters.category)
      }
      
      const { data, error } = await query
      if (error) throw error
      
      // Remove duplicates by model name
      const uniqueModels = Array.from(
        new Map(data.map(p => [p.model, { model: p.model, name: p.name, brand: p.brand }])).values()
      )
      return uniqueModels
    }
  })

  const { data: submodels } = useQuery({
    queryKey: ['submodels', filters.brand, filters.category, filters.model],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select('submodel, brand, model')
        .not('submodel', 'is', null)
        .order('submodel')
      
      if (filters.brand) {
        query = query.eq('brand', filters.brand)
      }
      if (filters.category) {
        query = query.eq('category', filters.category)
      }
      if (filters.model) {
        query = query.eq('model', filters.model)
      }
      
      const { data, error } = await query
      if (error) throw error
      return [...new Set(data.map(p => p.submodel).filter(Boolean))]
    }
  })

  // Fallback local analytics computation if edge functions fail
  const { data: localAnalytics } = useQuery({
    queryKey: ['analytics-local', filters, refreshTick],
    enabled: true, // Always run as fallback
    queryFn: async () => {
      console.warn('Using local fallback analytics computation')
      const { data, error } = await supabase
        .from('price_data')
        .select(`
          id, price, date, ctx_precio, precio_num, precio_lista_num, bono_num, precio_texto,
          products!inner ( id, brand, category, model, name, submodel )
        `)
        .order('date', { ascending: false })
        .limit(2000)

      if (error) throw error

      const latestMap = new Map<string, any>()
      data?.forEach((item: any) => {
        const pid = (item.products as any)?.id
        if (!pid) return
        if (!latestMap.has(pid) || new Date(item.date) > new Date(latestMap.get(pid).date)) {
          latestMap.set(pid, item)
        }
      })
      let rows = Array.from(latestMap.values())

      if (filters.brand) rows = rows.filter(r => r.products?.brand === filters.brand)
      if (filters.category) rows = rows.filter(r => r.products?.category === filters.category)
      if (filters.model) rows = rows.filter(r => r.products?.model === filters.model)
      if (filters.submodel) rows = rows.filter(r => r.products?.submodel === filters.submodel)
      if (filters.ctx_precio) rows = rows.filter(r => r.ctx_precio === filters.ctx_precio)

      const getPrice = (it: any) => {
        const primary = Number(it?.precio_num ?? it?.precio_lista_num)
        if (!Number.isNaN(primary) && primary > 0) return primary
        const cleaned = String(it?.price ?? '').replace(/[^0-9.-]/g, '')
        const parsed = Number(cleaned)
        return Number.isNaN(parsed) ? 0 : parsed
      }
      const prices = rows.map(getPrice).filter((p: number) => p > 0)
      if (prices.length === 0) return { chart_data: { price_distribution: [] } }

      const sorted = [...prices].sort((a, b) => a - b)
      const min = sorted[0]
      const max = sorted[sorted.length - 1]
      const q1 = sorted[Math.floor(sorted.length * 0.25)]
      const med = sorted.length % 2 ? sorted[Math.floor(sorted.length / 2)] : (sorted[sorted.length/2 - 1] + sorted[sorted.length/2]) / 2
      const q3 = sorted[Math.floor(sorted.length * 0.75)]

      const bounds = [min, q1, med, q3, max].map(n => Math.max(0, Number(n))).sort((a,b)=>a-b)
      const unique = [...new Set(bounds)]

      const formatPriceForRange = (price: number) => price >= 1_000_000 ? `$${(price/1_000_000).toFixed(1)}M` : `$${(price/1_000).toFixed(0)}k`

      let segments: Array<{label:string; min:number; max:number}>
      if (unique.length < 5 || bounds[0] === bounds[4]) {
        const step = (max - min) / 4 || 1
        segments = [
          { label: 'Muy Bajo', min, max: min + step },
          { label: 'Bajo', min: min + step, max: min + step*2 },
          { label: 'Medio', min: min + step*2, max: min + step*3 },
          { label: 'Alto', min: min + step*3, max },
        ]
      } else {
        segments = [
          { label: 'Muy Bajo', min: bounds[0], max: bounds[1] },
          { label: 'Bajo', min: bounds[1], max: bounds[2] },
          { label: 'Medio', min: bounds[2], max: bounds[3] },
          { label: 'Alto', min: bounds[3], max: bounds[4] },
        ]
      }

      const price_distribution = segments.map((s, idx) => ({
        range: `${s.label} (${formatPriceForRange(s.min)}-${formatPriceForRange(s.max)})`,
        count: prices.filter(p => p >= s.min && (idx === segments.length -1 ? p <= s.max : p < s.max)).length,
        min_value: s.min,
        max_value: s.max,
      }))

      console.log('Local analytics price_distribution calculated:', price_distribution)

      return { chart_data: { price_distribution } }
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-3 w-32 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  if (!analytics) {
    if (localAnalytics?.chart_data?.price_distribution) {
      return (
        <div className="space-y-6">
          <Card className="border-border/50 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                Distribución por Rango de Precio
              </CardTitle>
              <CardDescription>Modelos en cada segmento de mercado</CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={localAnalytics.chart_data.price_distribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} />
                  <XAxis 
                    dataKey="range" 
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      color: 'hsl(var(--foreground))'
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" name="Cantidad" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )
    }

    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">No hay datos disponibles para mostrar</p>
            <p className="text-sm text-muted-foreground mt-2">
              Sube archivos JSON desde la página de Upload para comenzar el análisis
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card className="border-border/50 shadow-md">
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="h-5 w-5 text-primary" />
            Filtros
          </CardTitle>
          <CardDescription>
            Refina tu análisis con criterios específicos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-6">
            <Select value={filters.brand || "all"} onValueChange={(value) => setFilters(f => ({ ...f, brand: value === "all" ? "" : value }))}>
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

            <Select value={filters.model || "all"} onValueChange={(value) => setFilters(f => ({ ...f, model: value === "all" ? "" : value }))}>
              <SelectTrigger className="bg-card border-border">
                <SelectValue placeholder="Todos los modelos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los modelos</SelectItem>
                {models?.map((m, idx) => (
                  <SelectItem key={`${m.model}-${idx}`} value={m.model}>{m.model}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.submodel || "all"} onValueChange={(value) => setFilters(f => ({ ...f, submodel: value === "all" ? "" : value }))}>
              <SelectTrigger className="bg-card border-border">
                <SelectValue placeholder="Todos los submodelos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los submodelos</SelectItem>
                {submodels?.map(sub => (
                  <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filters.ctx_precio || "all"} onValueChange={(value) => setFilters(f => ({ ...f, ctx_precio: value === "all" ? "" : value }))}>
              <SelectTrigger className="bg-card border-border">
                <SelectValue placeholder="Tipo de precio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                <SelectItem value="financiamiento:marca">Financiamiento Marca</SelectItem>
                <SelectItem value="contado">Contado</SelectItem>
                <SelectItem value="promocion">Promoción</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.priceRange || "all"} onValueChange={(value) => setFilters(f => ({ ...f, priceRange: value === "all" ? "" : value }))}>
              <SelectTrigger className="bg-card border-border">
                <SelectValue placeholder="Rango de precios" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los precios</SelectItem>
                <SelectItem value="0-20000000">$0 - $20M</SelectItem>
                <SelectItem value="20000000-40000000">$20M - $40M</SelectItem>
                <SelectItem value="40000000-60000000">$40M - $60M</SelectItem>
                <SelectItem value="60000000+">$60M+</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex gap-2 md:col-span-2">
              <Button 
                onClick={() => { setRefreshTick((t) => t + 1); refetch(); }} 
                disabled={isRefetching}
                className="flex-1"
              >
                {isRefetching ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Actualizar Datos
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Métricas principales - Diseño inspirado en referencia */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-primary border-none shadow-md rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary-foreground">Total Modelos</CardTitle>
            <Package className="h-4 w-4 text-primary-foreground/70" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary-foreground">{analytics.metrics.total_models}</div>
            <p className="text-xs text-primary-foreground/70 mt-1">
              {analytics.metrics.total_brands} marcas activas
            </p>
          </CardContent>
        </Card>

        <Card className="bg-primary border-none shadow-md rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary-foreground">Precio Promedio</CardTitle>
            <DollarSign className="h-4 w-4 text-primary-foreground/70" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary-foreground">{formatPrice(analytics.metrics.avg_price)}</div>
            <p className="text-xs text-primary-foreground/70 mt-1">
              Variación: {analytics.metrics.variation_coefficient.toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card className="bg-primary border-none shadow-md rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary-foreground">Precio Mínimo</CardTitle>
            <TrendingDown className="h-4 w-4 text-primary-foreground/70" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary-foreground">{formatPrice(analytics.metrics.min_price)}</div>
            <p className="text-xs text-primary-foreground/70 mt-1">Valor más accesible</p>
          </CardContent>
        </Card>

        <Card className="bg-primary border-none shadow-md rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary-foreground">Precio Máximo</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary-foreground/70" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary-foreground">{formatPrice(analytics.metrics.max_price)}</div>
            <p className="text-xs text-primary-foreground/70 mt-1">Valor premium</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs con visualizaciones organizadas */}
      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 h-auto bg-card border border-border">
          <TabsTrigger value="general" className="text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Visión General
          </TabsTrigger>
          <TabsTrigger value="precios" className="text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Análisis de Precios
          </TabsTrigger>
          <TabsTrigger value="marcas" className="text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Por Marca
          </TabsTrigger>
          <TabsTrigger value="tendencias" className="text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Tendencias
          </TabsTrigger>
        </TabsList>

        {/* Tab: Visión General */}
        <TabsContent value="general" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-border/50 shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="space-y-1 pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  Modelos por Categoría
                </CardTitle>
                <CardDescription>Distribución de vehículos según tipo</CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={analytics.chart_data?.models_by_category || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} />
                    <XAxis 
                      dataKey="category" 
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        color: 'hsl(var(--foreground))'
                      }}
                      labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
                      itemStyle={{ color: 'hsl(var(--foreground))' }}
                    />
                    <Bar dataKey="count" fill="hsl(var(--primary))" name="Cantidad" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-border/50 shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="space-y-1 pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  Distribución por Rango de Precio
                </CardTitle>
                <CardDescription>Modelos en cada segmento de mercado</CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={(localAnalytics?.chart_data?.price_distribution ?? analytics?.chart_data?.price_distribution ?? [])}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} />
                    <XAxis 
                      dataKey="range" 
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        color: 'hsl(var(--foreground))'
                      }}
                      labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
                      itemStyle={{ color: 'hsl(var(--foreground))' }}
                    />
                    <Bar dataKey="count" fill="hsl(var(--primary))" name="Cantidad" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card className="border-border/50 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Modelos por Línea Principal
              </CardTitle>
              <CardDescription>Top 10 modelos más populares del inventario</CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={(analytics.chart_data?.models_by_principal || []).slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} />
                  <XAxis 
                    dataKey="model_principal" 
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} 
                    angle={-45} 
                    textAnchor="end" 
                    height={100}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      color: 'hsl(var(--foreground))'
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--chart-2))" name="Cantidad" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Análisis de Precios */}
        <TabsContent value="precios" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-border/50 shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="space-y-1 pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Top 5 Modelos Más Caros
                </CardTitle>
                <CardDescription>Vehículos de mayor valor en el inventario</CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={analytics.chart_data?.top_5_expensive || []} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} />
                    <XAxis type="number" tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip 
                      formatter={(value: number) => formatPrice(value)}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        color: 'hsl(var(--foreground))'
                      }}
                      labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
                      itemStyle={{ color: 'hsl(var(--foreground))' }}
                    />
                    <Bar dataKey="price" fill="hsl(var(--chart-5))" name="Precio" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-border/50 shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="space-y-1 pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-primary" />
                  Top 5 Modelos Más Económicos
                </CardTitle>
                <CardDescription>Vehículos de menor valor disponibles</CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={analytics.chart_data?.bottom_5_cheap || []} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} />
                    <XAxis type="number" tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip 
                      formatter={(value: number) => formatPrice(value)}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        color: 'hsl(var(--foreground))'
                      }}
                      labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
                      itemStyle={{ color: 'hsl(var(--foreground))' }}
                    />
                    <Bar dataKey="price" fill="hsl(var(--chart-2))" name="Precio" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card className="border-border/50 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Precios por Categoría
              </CardTitle>
              <CardDescription>Comparación de rangos de precio por tipo de vehículo</CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <ResponsiveContainer width="100%" height={320}>
                <ComposedChart data={analytics.chart_data?.prices_by_category || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} />
                  <XAxis dataKey="category" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    formatter={(value: number) => formatPrice(value)}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      color: 'hsl(var(--foreground))'
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Legend />
                  <Bar dataKey="min_price" fill="hsl(var(--chart-6))" name="Mínimo" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="avg_price" fill="hsl(var(--primary))" name="Promedio" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="max_price" fill="hsl(var(--chart-5))" name="Máximo" radius={[6, 6, 0, 0]} />
                  <Line type="monotone" dataKey="avg_price" stroke="hsl(var(--chart-3))" strokeWidth={2} />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Por Marca */}
        <TabsContent value="marcas" className="space-y-6">
          <Card className="border-border/50 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Precios Promedio por Marca
              </CardTitle>
              <CardDescription>Comparación de precios entre fabricantes</CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={analytics.chart_data?.prices_by_brand || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} />
                  <XAxis 
                    dataKey="brand" 
                    angle={-45} 
                    textAnchor="end" 
                    height={100} 
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    formatter={(value: number) => formatPrice(value)}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      color: 'hsl(var(--foreground))'
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                   <Bar dataKey="avg_price" name="Precio Promedio" radius={[6, 6, 0, 0]} fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Variación de Precios por Marca
              </CardTitle>
              <CardDescription>Cambios entre periodos de scraping</CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.chart_data?.brand_variations || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} />
                  <XAxis 
                    dataKey="brand" 
                    angle={-45} 
                    textAnchor="end" 
                    height={100} 
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <YAxis tickFormatter={(value) => `${value}%`} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    formatter={(value: number) => `${value.toFixed(2)}%`}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      color: 'hsl(var(--foreground))'
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Bar dataKey="variation_percent" fill="hsl(var(--chart-6))" name="Variación %" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Tendencias */}
        <TabsContent value="tendencias" className="space-y-6">
          <Card className="border-border/50 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Modelos con Mayor Volatilidad
              </CardTitle>
              <CardDescription>Detección de cambios intermensual de precios</CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.chart_data?.monthly_volatility?.most_volatile || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} />
                  <XAxis 
                    dataKey="name" 
                    angle={-45} 
                    textAnchor="end" 
                    height={120} 
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    interval={0}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <YAxis tickFormatter={(value) => `${value}%`} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    formatter={(value: number) => `${value.toFixed(2)}%`}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      color: 'hsl(var(--foreground))'
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Bar dataKey="avg_monthly_variation" fill="hsl(var(--chart-7))" name="Volatilidad %" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
}