import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/contexts/AuthContext"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CalendarIcon, DollarSign, Package, TrendingUp, BarChart3, RefreshCw, Target, Award, AlertTriangle } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, ScatterChart, Scatter, Legend } from 'recharts'
import { useState } from "react"

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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Filtros de Análisis
          </CardTitle>
          <CardDescription>
            Aplica filtros para personalizar el análisis de datos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-7">
            <Select value={filters.brand || "all"} onValueChange={(value) => setFilters(f => ({ ...f, brand: value === "all" ? "" : value }))}>
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

            <Select value={filters.category || "all"} onValueChange={(value) => setFilters(f => ({ ...f, category: value === "all" ? "" : value }))}>
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

            <Select value={filters.model || "all"} onValueChange={(value) => setFilters(f => ({ ...f, model: value === "all" ? "" : value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Todos los modelos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los modelos</SelectItem>
                {models?.map(model => (
                  <SelectItem key={`${model.brand}-${model.model}`} value={model.model}>
                    {model.brand} {model.model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.submodel || "all"} onValueChange={(value) => setFilters(f => ({ ...f, submodel: value === "all" ? "" : value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Todos los submodelos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los submodelos</SelectItem>
                {submodels?.map(submodel => (
                  <SelectItem key={submodel} value={submodel}>
                    {submodel}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.ctx_precio || "all"} onValueChange={(value) => setFilters(f => ({ ...f, ctx_precio: value === "all" ? "" : value }))}>
              <SelectTrigger>
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
              <SelectTrigger>
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

            <Button 
              onClick={() => refetch()} 
              disabled={isRefetching}
              className="w-full"
            >
              {isRefetching ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Actualizar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Métricas principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Modelos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.metrics.total_models}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.metrics.total_brands} marcas activas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Precio Promedio</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(analytics.metrics.avg_price)}</div>
            <p className="text-xs text-muted-foreground">
              CV: {analytics.metrics.variation_coefficient.toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Precio Mediano</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(analytics.metrics.median_price)}</div>
            <p className="text-xs text-muted-foreground">
              Valor central
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rango de Precios</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(analytics.metrics.price_range)}</div>
            <p className="text-xs text-muted-foreground">
              {formatPrice(analytics.metrics.min_price)} - {formatPrice(analytics.metrics.max_price)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Última Actualización</CardTitle>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {analytics.metrics.current_scraping_date ? 
                new Date(analytics.metrics.current_scraping_date).toLocaleDateString() : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              {analytics.metrics.total_scraping_sessions || 0} sesiones total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Datos Históricos</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.historical_data ? analytics.historical_data.length : 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {filters.model ? `Puntos para ${filters.model}` : 'Selecciona modelo'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Q1 - Q3</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {formatPrice(analytics.metrics.lower_quartile)}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatPrice(analytics.metrics.upper_quartile)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Variabilidad</CardTitle>
            {analytics.metrics.variation_coefficient > 50 ? (
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            ) : (
              <Award className="h-4 w-4 text-green-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.metrics.variation_coefficient > 50 ? 'Alta' : 
               analytics.metrics.variation_coefficient > 25 ? 'Media' : 'Baja'}
            </div>
            <p className="text-xs text-muted-foreground">
              {analytics.metrics.variation_coefficient.toFixed(1)}% coef.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Precios Promedio por Marca</CardTitle>
            <CardDescription>Comparación de precios entre marcas</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.chart_data?.prices_by_brand || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="brand" />
                <YAxis 
                  yAxisId="left"
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} 
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  tickFormatter={(value) => `${value.toFixed(0)}%`}
                />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    name === 'avg_price' ? formatPrice(value) : `${value.toFixed(1)}%`,
                    name === 'avg_price' ? 'Precio Promedio' : 'Tendencia'
                  ]}
                  labelFormatter={(label) => `Marca: ${label}`}
                />
                <Bar dataKey="avg_price" yAxisId="left">
                  {(analytics.chart_data?.prices_by_brand || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
                {/* Mostrar tendencia si está disponible */}
                <Bar dataKey="price_trend" fill="rgba(255,0,0,0.3)" yAxisId="right" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Modelos por Categoría</CardTitle>
            <CardDescription>Distribución de modelos por tipo</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics.chart_data?.models_by_category || []}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ category, percent }) => `${category} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {(analytics.chart_data?.models_by_category || []).map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Histórico de Precios por Modelo */}
      {analytics.historical_data && analytics.historical_data.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Evolución de Precios del Modelo Seleccionado</CardTitle>
            <CardDescription>
              Histórico de precios para el modelo {filters.model}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={analytics.historical_data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => new Date(value).toLocaleDateString()}
                />
                <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                <Tooltip 
                  formatter={(value: number) => [formatPrice(value), 'Precio']}
                  labelFormatter={(value) => `Fecha: ${new Date(value).toLocaleDateString()}`}
                />
                <Line 
                  type="monotone" 
                  dataKey="price" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={3}
                  dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: 'hsl(var(--primary))', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Análisis Comparativo por Categorías */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Precios por Categoría</CardTitle>
            <CardDescription>Comparación de rangos de precio por tipo de vehículo</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.chart_data?.prices_by_category || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    formatPrice(value), 
                    name === 'avg_price' ? 'Promedio' : 
                    name === 'min_price' ? 'Mínimo' : 'Máximo'
                  ]} 
                />
                <Bar dataKey="min_price" fill="hsl(var(--muted))" name="min_price" />
                <Bar dataKey="avg_price" fill="hsl(var(--primary))" name="avg_price" />
                <Bar dataKey="max_price" fill="hsl(var(--secondary))" name="max_price" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribución por Rango de Precio</CardTitle>
            <CardDescription>Cantidad de modelos en cada segmento de mercado</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics.chart_data?.price_distribution || []}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ range, percent }) => `${range} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {(analytics.chart_data?.price_distribution || []).map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Bubble Chart - Precio vs Marca */}
      <Card>
        <CardHeader>
          <CardTitle>Análisis Precio vs Marca (Bubble Chart)</CardTitle>
          <CardDescription>
            Tamaño de burbuja proporcional al número de modelos de cada marca
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart data={analytics.chart_data?.prices_by_brand || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                type="category" 
                dataKey="brand" 
                name="Marca"
                tick={{ fontSize: 12 }}
                interval={0}
                angle={-45}
                textAnchor="end"
                height={100}
              />
              <YAxis 
                type="number" 
                dataKey="avg_price" 
                name="Precio Promedio"
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip 
                formatter={(value: number, name: string) => {
                  if (name === 'avg_price') return [formatPrice(value), 'Precio Promedio']
                  if (name === 'count') return [value, 'Número de Modelos']
                  return [value, name]
                }}
                labelFormatter={(label) => `Marca: ${label}`}
              />
              <Scatter 
                dataKey="avg_price" 
                fill="hsl(var(--primary))"
                opacity={0.7}
              />
              {(analytics.chart_data?.prices_by_brand || []).map((entry, index) => (
                <Scatter 
                  key={index}
                  dataKey="avg_price"
                  fill={COLORS[index % COLORS.length]}
                  data={[{
                    brand: entry.brand,
                    avg_price: entry.avg_price,
                    count: entry.count,
                    // El tamaño de la burbuja basado en el número de modelos
                    size: Math.max(entry.count * 50, 100)
                  }]}
                />
              ))}
              <Legend />
            </ScatterChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Modelos por Valor y Análisis de Precio */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-4 w-4 text-green-500" />
              Mejores Oportunidades
            </CardTitle>
            <CardDescription>Modelos con mejor relación calidad-precio</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(analytics.chart_data?.best_value_models || []).map((item, index) => (
                <div key={index} className="flex items-center justify-between border-b pb-2">
                  <div>
                    <p className="font-medium text-sm">{item.brand} {item.name}</p>
                    <div className="flex gap-1 mt-1">
                      <Badge variant="outline" className="text-xs">{item.category}</Badge>
                      <Badge variant="secondary" className="text-xs">-{item.value_rating}%</Badge>
                    </div>
                  </div>
                  <p className="font-bold text-green-600 text-sm">{formatPrice(item.price)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top 5 Más Caros</CardTitle>
            <CardDescription>Los modelos con precios más altos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(analytics.chart_data?.top_5_expensive || []).map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{item.brand} {item.name}</p>
                    <Badge variant="secondary">#{index + 1}</Badge>
                  </div>
                  <p className="font-bold">{formatPrice(item.price)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top 5 Más Económicos</CardTitle>
            <CardDescription>Los modelos con mejores precios</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(analytics.chart_data?.bottom_5_cheap || []).map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{item.brand} {item.name}</p>
                    <Badge variant="outline">#{index + 1}</Badge>
                  </div>
                  <p className="font-bold text-green-600">{formatPrice(item.price)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Variación de Precios por Marca */}
      <Card>
        <CardHeader>
          <CardTitle>Variación de Precio Promedio por Marca</CardTitle>
          <CardDescription>Cambios en precios promedio entre fechas de scraping</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {(analytics.chart_data?.brand_variations || []).map((brand, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex-1">
                  <h4 className="font-semibold">{brand.brand}</h4>
                  <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                    <span>Inicial: {formatPrice(brand.first_avg_price)}</span>
                    <span>Actual: {formatPrice(brand.last_avg_price)}</span>
                    <span>{brand.scraping_sessions} sesiones</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-lg font-bold ${
                    brand.variation_percent > 0 ? 'text-red-600' : 
                    brand.variation_percent < 0 ? 'text-green-600' : 'text-gray-600'
                  }`}>
                    {brand.variation_percent > 0 ? '+' : ''}{brand.variation_percent.toFixed(1)}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Modelos con Mayor Variabilidad Intermensual */}
      <Card>
        <CardHeader>
          <CardTitle>Modelos con Mayor Volatilidad de Precios</CardTitle>
          <CardDescription>Modelos con mayor variación intermensual - útil para detectar oportunidades</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {(analytics.chart_data?.monthly_volatility?.most_volatile || []).map((item, index) => (
              <div key={index} className="flex items-center justify-between border-b pb-2">
                <div>
                  <p className="font-medium">{item.brand} {item.name}</p>
                  <div className="flex gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">{item.data_points} puntos de datos</Badge>
                    <Badge 
                      variant={item.avg_monthly_variation > 20 ? "destructive" : item.avg_monthly_variation > 10 ? "secondary" : "default"} 
                      className="text-xs"
                    >
                      {item.avg_monthly_variation > 20 ? "Alta" : item.avg_monthly_variation > 10 ? "Media" : "Baja"} volatilidad
                    </Badge>
                  </div>
                </div>
                <p className="font-bold text-orange-600 text-sm">
                  {item.avg_monthly_variation.toFixed(1)}% var.
                </p>
              </div>
            ))}
            {(!analytics.chart_data?.monthly_volatility?.most_volatile?.length) && (
              <p className="text-muted-foreground text-sm">No hay suficientes datos históricos para calcular volatilidad</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Análisis de Competitividad por Marca */}
      <Card>
        <CardHeader>
          <CardTitle>Análisis de Competitividad por Marca</CardTitle>
          <CardDescription>Comparación de precios, rangos y posicionamiento de valor</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {(analytics.chart_data?.prices_by_brand || []).map((brand, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h4 className="font-semibold">{brand.brand}</h4>
                    <Badge variant={brand.value_score < -10 ? "default" : brand.value_score > 10 ? "destructive" : "secondary"}>
                      {brand.value_score < -10 ? "Buen Valor" : brand.value_score > 10 ? "Premium" : "Estándar"}
                    </Badge>
                  </div>
                  <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                    <span>Promedio: {formatPrice(brand.avg_price)}</span>
                    <span>Rango: {formatPrice(brand.min_price)} - {formatPrice(brand.max_price)}</span>
                    <span>{brand.count} modelos</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">Score de Valor</p>
                  <p className={`text-lg font-bold ${
                    brand.value_score < -10 ? 'text-green-600' : 
                    brand.value_score > 10 ? 'text-red-600' : 'text-yellow-600'
                  }`}>
                    {brand.value_score > 0 ? '+' : ''}{brand.value_score.toFixed(1)}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Información de filtros aplicados */}
      {analytics.applied_filters && Object.values(analytics.applied_filters).some(Boolean) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              Filtros Aplicados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 flex-wrap">
              {analytics.applied_filters?.brand && (
                <Badge>Marca: {analytics.applied_filters.brand}</Badge>
              )}
              {analytics.applied_filters?.category && (
                <Badge>Categoría: {analytics.applied_filters.category}</Badge>
              )}
              {analytics.applied_filters?.model && (
                <Badge>Modelo: {analytics.applied_filters.model}</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}