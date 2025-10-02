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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, ScatterChart, Scatter, Legend, ZAxis, ComposedChart } from 'recharts'
import { useState } from "react"
import { PriceEvolutionChart } from "@/components/PriceEvolutionChart"
import { ModelSubmodelSelector } from "@/components/ModelSubmodelSelector"

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

  // Debug de autenticación
  const { user, profile, isAdmin, hasActiveSubscription } = useAuth()
  console.log('Dashboard Auth Debug:', {
    user: !!user,
    profile: !!profile,
    isAdmin,
    hasActiveSubscription,
    profileData: profile
  })

  const { data: analytics, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['analytics', filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value)
      })
      
      const { data, error } = await supabase.functions.invoke('get-analytics', {
        body: { params: params.toString() }
      })
      
      if (error) throw error
      return data as AnalyticsData
    },
    retry: (failureCount, error) => {
      console.error('Analytics query error:', error)
      return failureCount < 2
    }
  })

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
      return data.map(p => ({ model: p.model, name: p.name, brand: p.brand }))
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
  }

  if (!analytics) {
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
      <ModelSubmodelSelector
        selectedBrand={filters.brand}
        selectedCategory={filters.category}
        selectedModel={filters.model}
        selectedSubmodel={filters.submodel}
        onBrandChange={(brand) => setFilters(f => ({ ...f, brand }))}
        onCategoryChange={(category) => setFilters(f => ({ ...f, category }))}
        onModelChange={(model) => setFilters(f => ({ ...f, model }))}
        onSubmodelChange={(submodel) => setFilters(f => ({ ...f, submodel }))}
        onClearFilters={() => setFilters({
          brand: '',
          category: '',
          model: '',
          submodel: '',
          date_from: '',
          date_to: '',
          ctx_precio: '',
          priceRange: ''
        })}
      />

      {/* Filtros Adicionales */}
      <Card className="border-border/50 shadow-md">
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="h-5 w-5 text-primary" />
            Filtros Adicionales
          </CardTitle>
          <CardDescription>
            Refina tu análisis con criterios específicos de precio
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
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
                onClick={() => refetch()} 
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
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-primary/90 border-primary shadow-lg hover:shadow-xl transition-all hover:scale-[1.02]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-primary-foreground">Total Modelos</CardTitle>
            <Package className="h-5 w-5 text-primary-foreground/80" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-primary-foreground">{analytics.metrics.total_models}</div>
            <p className="text-xs text-primary-foreground/70 mt-2">
              {analytics.metrics.total_brands} marcas activas
            </p>
          </CardContent>
        </Card>

        <Card className="bg-primary/90 border-primary shadow-lg hover:shadow-xl transition-all hover:scale-[1.02]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-primary-foreground">Precio Promedio</CardTitle>
            <DollarSign className="h-5 w-5 text-primary-foreground/80" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-primary-foreground">{formatPrice(analytics.metrics.avg_price)}</div>
            <p className="text-xs text-primary-foreground/70 mt-2">
              Variación: {analytics.metrics.variation_coefficient.toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card className="bg-primary/90 border-primary shadow-lg hover:shadow-xl transition-all hover:scale-[1.02]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-primary-foreground">Precio Mínimo</CardTitle>
            <TrendingDown className="h-5 w-5 text-primary-foreground/80" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-primary-foreground">{formatPrice(analytics.metrics.min_price)}</div>
            <p className="text-xs text-primary-foreground/70 mt-2">Valor más accesible</p>
          </CardContent>
        </Card>

        <Card className="bg-primary/90 border-primary shadow-lg hover:shadow-xl transition-all hover:scale-[1.02]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-primary-foreground">Precio Máximo</CardTitle>
            <TrendingUp className="h-5 w-5 text-primary-foreground/80" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-primary-foreground">{formatPrice(analytics.metrics.max_price)}</div>
            <p className="text-xs text-primary-foreground/70 mt-2">Valor premium</p>
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
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={analytics.chart_data?.models_by_category || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis 
                      dataKey="category" 
                      className="text-xs"
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '12px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                      }}
                      labelStyle={{ color: 'hsl(var(--foreground))' }}
                    />
                    <Bar dataKey="count" fill="hsl(var(--primary))" name="Cantidad" radius={[8, 8, 0, 0]} />
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
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart>
                    <Pie
                      data={analytics.chart_data?.price_distribution || []}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ range, percent }) => `${range} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={110}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {(analytics.chart_data?.price_distribution || []).map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '12px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                      }}
                    />
                  </PieChart>
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
              <ResponsiveContainer width="100%" height={380}>
                <BarChart data={(analytics.chart_data?.models_by_principal || []).slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis 
                    dataKey="model_principal" 
                    className="text-xs" 
                    angle={-45} 
                    textAnchor="end" 
                    height={100}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '12px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                    }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--chart-2))" name="Cantidad" radius={[8, 8, 0, 0]} />
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
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={analytics.chart_data?.top_5_expensive || []} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis type="number" tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} stroke="hsl(var(--muted-foreground))" />
                    <YAxis dataKey="name" type="category" width={150} className="text-xs" stroke="hsl(var(--muted-foreground))" />
                    <Tooltip 
                      formatter={(value: number) => formatPrice(value)}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '12px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                      }}
                    />
                    <Bar dataKey="price" fill="hsl(var(--chart-5))" name="Precio" radius={[0, 8, 8, 0]} />
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
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={analytics.chart_data?.bottom_5_cheap || []} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis type="number" tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} stroke="hsl(var(--muted-foreground))" />
                    <YAxis dataKey="name" type="category" width={150} className="text-xs" stroke="hsl(var(--muted-foreground))" />
                    <Tooltip 
                      formatter={(value: number) => formatPrice(value)}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '12px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                      }}
                    />
                    <Bar dataKey="price" fill="hsl(var(--chart-2))" name="Precio" radius={[0, 8, 8, 0]} />
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
              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart data={analytics.chart_data?.prices_by_category || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="category" stroke="hsl(var(--muted-foreground))" />
                  <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    formatter={(value: number) => formatPrice(value)}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '12px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="min_price" fill="hsl(var(--chart-6))" name="Mínimo" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="avg_price" fill="hsl(var(--primary))" name="Promedio" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="max_price" fill="hsl(var(--chart-5))" name="Máximo" radius={[8, 8, 0, 0]} />
                  <Line type="monotone" dataKey="avg_price" stroke="hsl(var(--chart-3))" strokeWidth={3} />
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
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={analytics.chart_data?.prices_by_brand || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis 
                    dataKey="brand" 
                    angle={-45} 
                    textAnchor="end" 
                    height={100} 
                    className="text-xs"
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    formatter={(value: number) => formatPrice(value)}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '12px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                    }}
                  />
                  <Bar dataKey="avg_price" name="Precio Promedio" radius={[8, 8, 0, 0]}>
                    {(analytics.chart_data?.prices_by_brand || []).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
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
              <ResponsiveContainer width="100%" height={380}>
                <BarChart data={analytics.chart_data?.brand_variations || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis 
                    dataKey="brand" 
                    angle={-45} 
                    textAnchor="end" 
                    height={100} 
                    className="text-xs"
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <YAxis tickFormatter={(value) => `${value}%`} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    formatter={(value: number) => `${value.toFixed(2)}%`}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '12px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                    }}
                  />
                  <Bar dataKey="variation_percent" fill="hsl(var(--chart-6))" name="Variación %" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Tendencias */}
        <TabsContent value="tendencias" className="space-y-6">
          <PriceEvolutionChart
            selectedBrand={filters.brand}
            selectedCategory={filters.category}
            selectedModel={filters.model}
            selectedSubmodel={filters.submodel}
          />

          <Card className="border-border/50 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Modelos con Mayor Volatilidad
              </CardTitle>
              <CardDescription>Detección de cambios intermensual de precios</CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <ResponsiveContainer width="100%" height={380}>
                <BarChart data={analytics.chart_data?.monthly_volatility?.most_volatile || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis 
                    dataKey="name" 
                    angle={-45} 
                    textAnchor="end" 
                    height={120} 
                    className="text-xs"
                    interval={0}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <YAxis tickFormatter={(value) => `${value}%`} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    formatter={(value: number) => `${value.toFixed(2)}%`}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '12px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                    }}
                  />
                  <Bar dataKey="avg_monthly_variation" fill="hsl(var(--chart-7))" name="Volatilidad %" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}