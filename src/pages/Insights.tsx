import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Lightbulb, TrendingUp, DollarSign, BarChart3, RefreshCw, AlertTriangle, Target, Award, Zap, Users, ShoppingCart, TrendingDown, Calendar } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell } from 'recharts'
import { usePriceDistribution } from "@/hooks/usePriceDistribution"

interface Insight {
  insight_type: string
  title: string
  description: string
  data: any
  priority: number
}

export default function Insights() {
  const { data: insights, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['insights'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-insights')
      
      if (error) throw error
      return data.insights as Insight[]
    }
  })

  // Fetch additional analytics for richer insights display
  const { data: marketStats } = useQuery({
    queryKey: ['market-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-analytics')
      if (error) throw error
      return data
    },
    staleTime: 0,
    refetchOnMount: true,
  })

  // Local, accurate price distribution computed from DB
  const { data: priceDistributionLocal } = usePriceDistribution()


  // Fetch recent price trends
  const { data: recentTrends } = useQuery({
    queryKey: ['recent-trends'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('price_data')
        .select(`
          *,
          products (brand, category, model, name)
        `)
        .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('date', { ascending: false })
        .limit(100)
      
      if (error) throw error
      return data
    }
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-24" />
        </div>
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-64" />
              <Skeleton className="h-4 w-96" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'price_trend':
        return <TrendingUp className="h-5 w-5 text-primary" />
      case 'best_value':
        return <Award className="h-5 w-5 text-primary" />
      case 'historical_opportunity':
        return <Target className="h-5 w-5 text-green-500" />
      case 'price_max':
        return <DollarSign className="h-5 w-5 text-destructive" />
      case 'price_stability':
        return <BarChart3 className="h-5 w-5 text-primary" />
      case 'category_comparison':
        return <ShoppingCart className="h-5 w-5 text-primary" />
      default:
        return <Lightbulb className="h-5 w-5 text-primary" />
    }
  }

  const getPriorityBadge = (priority: number) => {
    switch (priority) {
      case 1:
        return <Badge variant="destructive">Alta Prioridad</Badge>
      case 2:
        return <Badge variant="secondary">Media Prioridad</Badge>
      case 3:
        return <Badge variant="outline">Baja Prioridad</Badge>
      default:
        return <Badge variant="outline">Sin Prioridad</Badge>
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  }

  const renderInsightData = (insight: Insight) => {
    switch (insight.insight_type) {
      case 'price_trend':
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">Marca:</span>
              <span>{insight.data.brand}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">Cambio:</span>
              <span className={`font-bold ${insight.data.change_percent > 0 ? 'text-destructive' : 'text-primary'}`}>
                {insight.data.change_percent > 0 ? '+' : ''}{insight.data.change_percent}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">Precio Actual:</span>
              <span>{formatPrice(insight.data.current_avg)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">Precio Anterior:</span>
              <span>{formatPrice(insight.data.previous_avg)}</span>
            </div>
          </div>
        )

      case 'best_value':
        if (Array.isArray(insight.data)) {
          return (
            <div className="space-y-3">
              {insight.data.map((model: any, index: number) => (
                <div key={index} className="p-4 bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/30 rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex-1">
                      <p className="font-semibold text-lg">{model.brand} {model.model}</p>
                      <p className="text-sm text-muted-foreground">{model.name}</p>
                      <div className="flex gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">{model.category}</Badge>
                        <Badge className="text-xs bg-primary">
                          Ahorro {model.savings_vs_median}%
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-2xl font-bold text-primary">{formatPrice(model.price)}</p>
                      <p className="text-xs text-muted-foreground">vs mediana</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        }
        return <div>Datos no disponibles</div>
      
      case 'historical_opportunity':
        if (Array.isArray(insight.data)) {
          return (
            <div className="space-y-3">
              {insight.data.map((model: any, index: number) => (
                <div key={index} className="p-4 bg-gradient-to-r from-green-500/10 to-green-500/5 border border-green-500/30 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex-1">
                      <p className="font-semibold text-lg">{model.brand} {model.model}</p>
                      <p className="text-sm text-muted-foreground">{model.name}</p>
                    </div>
                    <Badge className="bg-green-600">Oportunidad</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div className="text-center p-2 bg-background/50 rounded">
                      <p className="text-xs text-muted-foreground">Actual</p>
                      <p className="font-bold text-primary">{formatPrice(model.current_price)}</p>
                    </div>
                    <div className="text-center p-2 bg-background/50 rounded">
                      <p className="text-xs text-muted-foreground">Mínimo</p>
                      <p className="font-bold text-green-600">{formatPrice(model.historical_low)}</p>
                    </div>
                    <div className="text-center p-2 bg-background/50 rounded">
                      <p className="text-xs text-muted-foreground">Máximo</p>
                      <p className="font-bold text-red-600">{formatPrice(model.historical_high)}</p>
                    </div>
                  </div>
                  <div className="mt-2 p-2 bg-green-500/10 rounded text-xs">
                    💚 Variación histórica de {model.range_percent}% - Precio actual cerca del mínimo
                  </div>
                </div>
              ))}
            </div>
          )
        }
        return <div>Datos no disponibles</div>

      case 'price_max':
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">Marca:</span>
              <span>{insight.data.brand}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">Modelo:</span>
              <span>{insight.data.model}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">Nombre:</span>
              <span>{insight.data.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">Precio:</span>
              <span className="text-2xl font-bold text-destructive">
                {formatPrice(insight.data.price)}
              </span>
            </div>
          </div>
        )

      case 'price_stability':
        if (Array.isArray(insight.data)) {
          return (
            <div className="space-y-3">
              {insight.data.map((item: any, index: number) => (
                <div key={index} className="p-3 bg-primary/10 border border-primary/20 rounded-md">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium">{item.brand} {item.model}</p>
                      <p className="text-sm text-muted-foreground">
                        Promedio: {formatPrice(item.avg_price)}
                      </p>
                    </div>
                    <Badge variant={item.stability_score < 5 ? "default" : item.stability_score < 15 ? "secondary" : "destructive"}>
                      {item.stability_score < 5 ? "Muy Estable" : 
                       item.stability_score < 15 ? "Estable" : "Variable"}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Variación: {item.stability_score}%
                  </div>
                </div>
              ))}
            </div>
          )
        }
        return <div>Datos no disponibles</div>

      case 'category_comparison':
        return (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="p-4 rounded-lg border border-destructive/20 bg-destructive/10">
                <h4 className="font-semibold text-destructive mb-2 flex items-center gap-2">
                  🔴 Segmento Más Caro
                </h4>
                <p className="font-medium text-lg">{insight.data.most_expensive_category.category}</p>
                <div className="space-y-1 mt-2">
                  <p className="text-sm">
                    <span className="font-medium">Promedio:</span> {formatPrice(insight.data.most_expensive_category.avg_price)}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Modelos:</span> {insight.data.most_expensive_category.model_count}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Rango:</span> {formatPrice(insight.data.most_expensive_category.price_range)}
                  </p>
                </div>
              </div>
              
              <div className="p-4 rounded-lg border border-primary/20 bg-primary/10">
                <h4 className="font-semibold text-primary mb-2 flex items-center gap-2">
                  🟢 Segmento Más Accesible
                </h4>
                <p className="font-medium text-lg">{insight.data.most_affordable_category.category}</p>
                <div className="space-y-1 mt-2">
                  <p className="text-sm">
                    <span className="font-medium">Promedio:</span> {formatPrice(insight.data.most_affordable_category.avg_price)}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Modelos:</span> {insight.data.most_affordable_category.model_count}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Rango:</span> {formatPrice(insight.data.most_affordable_category.price_range)}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="p-3 bg-primary/10 border border-primary/20 rounded-md">
              <p className="text-sm text-foreground">
                💡 <strong>Tip para compradores:</strong> Considera el segmento {insight.data.most_affordable_category.category} 
                para obtener el mejor valor por tu dinero.
              </p>
            </div>
          </div>
        )

      default:
        return <pre className="text-sm bg-muted p-2 rounded">{JSON.stringify(insight.data, null, 2)}</pre>
    }
  }

  return (
    <div className="space-y-8 p-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-background border border-primary/20 p-8">
        <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,black)]" />
        <div className="relative flex items-center justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-primary/20 backdrop-blur-sm">
                <Lightbulb className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  Insights Automáticos
                </h1>
                <p className="text-muted-foreground mt-1">
                  Análisis inteligente basado en datos históricos del mercado
                </p>
              </div>
            </div>
          </div>
          <Button 
            onClick={() => refetch()} 
            disabled={isRefetching}
            size="lg"
            className="shadow-lg hover:shadow-xl transition-shadow"
          >
            {isRefetching ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                Actualizando...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Actualizar
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Market Overview Cards */}
      {marketStats && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-none shadow-lg bg-gradient-to-br from-blue-500/10 to-blue-600/5 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold">Modelos Analizados</CardTitle>
              <div className="p-2 rounded-lg bg-blue-500/20">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{marketStats.metrics?.total_models || 0}</div>
              <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                <ShoppingCart className="h-3 w-3" />
                {marketStats.metrics?.total_brands || 0} marcas diferentes
              </p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-green-500/10 to-green-600/5 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold">Precio Promedio</CardTitle>
              <div className="p-2 rounded-lg bg-green-500/20">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{formatPrice(marketStats.metrics?.avg_price || 0)}</div>
              <p className="text-sm text-muted-foreground mt-1">
                Mediana: {formatPrice(marketStats.metrics?.median_price || 0)}
              </p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-orange-500/10 to-orange-600/5 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold">Volatilidad</CardTitle>
              <div className="p-2 rounded-lg bg-orange-500/20">
                <TrendingUp className="h-5 w-5 text-orange-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">
                {marketStats.metrics?.variation_coefficient 
                  ? `${marketStats.metrics.variation_coefficient.toFixed(1)}%`
                  : 'N/A'
                }
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Coeficiente de variación
              </p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-purple-500/10 to-purple-600/5 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold">Actividad Reciente</CardTitle>
              <div className="p-2 rounded-lg bg-purple-500/20">
                <Calendar className="h-5 w-5 text-purple-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{recentTrends?.length || 0}</div>
              <p className="text-sm text-muted-foreground mt-1">
                Actualizaciones últimos 30 días
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Price Distribution Chart */}
       {(priceDistributionLocal || marketStats?.chart_data?.price_distribution) && (
        <Card className="border-none shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-transparent">
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 rounded-lg bg-primary/10">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              Distribución de Precios por Segmento
            </CardTitle>
            <CardDescription className="text-base mt-2">
              Cantidad de modelos en cada rango de precio del mercado
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={priceDistributionLocal || marketStats.chart_data.price_distribution}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis 
                  dataKey="range" 
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={{ stroke: 'hsl(var(--border))' }}
                />
                <YAxis 
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={{ stroke: 'hsl(var(--border))' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="count" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  fill="url(#colorCount)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Best Value Models Spotlight */}
      {marketStats?.chart_data?.best_value_models && marketStats.chart_data.best_value_models.length > 0 && (
        <Card className="border-none shadow-lg bg-gradient-to-br from-green-500/5 to-emerald-500/5">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 rounded-lg bg-green-500/20">
                <Award className="h-6 w-6 text-green-600" />
              </div>
              Spotlight: Mejores Oportunidades del Mercado
            </CardTitle>
            <CardDescription className="text-base mt-2">
              Los modelos con mejor relación calidad-precio disponibles ahora
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {marketStats.chart_data.best_value_models.slice(0, 6).map((model: any, index: number) => (
                <div key={index} className="group p-5 border rounded-xl bg-gradient-to-br from-primary/5 to-transparent border-primary/20 hover:border-primary/40 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">{model.brand}</h3>
                      <p className="text-sm text-muted-foreground mt-0.5">{model.name}</p>
                      <Badge variant="outline" className="text-xs mt-2">{model.category}</Badge>
                    </div>
                    <Badge className="bg-green-600 hover:bg-green-700 shadow-md">
                      -{model.value_rating}%
                    </Badge>
                  </div>
                  <div className="flex items-end justify-between mt-4 pt-4 border-t border-border/50">
                    <div>
                      <span className="text-3xl font-bold text-primary">{formatPrice(model.price)}</span>
                      <p className="text-xs text-muted-foreground mt-1">vs mediana del mercado</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl">
              <p className="text-sm text-foreground flex items-start gap-2">
                <Zap className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Tip de compra:</strong> Estos modelos están priceados por debajo de la mediana del mercado, 
                  representando excelentes oportunidades de inversión.
                </span>
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {insights && insights.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-bold">Hallazgos Clave</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {insights
              .sort((a, b) => a.priority - b.priority)
              .map((insight, index) => (
                <Card 
                  key={index} 
                  className="border-none shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-card to-card/50"
                >
                  <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-transparent">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="p-2 rounded-lg bg-primary/10">
                          {getInsightIcon(insight.insight_type)}
                        </div>
                        <CardTitle className="text-lg leading-tight">{insight.title}</CardTitle>
                      </div>
                      {getPriorityBadge(insight.priority)}
                    </div>
                    <CardDescription className="text-sm">{insight.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">{renderInsightData(insight)}</CardContent>
                </Card>
              ))}
          </div>
        </div>
      ) : (
        <Card className="border-none shadow-lg">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="p-4 rounded-full bg-muted mb-4">
              <Lightbulb className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No hay insights disponibles</h3>
            <p className="text-muted-foreground mb-6 text-center max-w-md">
              Haz clic en el botón para generar nuevos insights basados en los datos históricos
            </p>
            <Button 
              onClick={() => refetch()} 
              disabled={isRefetching}
              size="lg"
              className="shadow-lg"
            >
              {isRefetching ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  Generando...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Generar Insights
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}