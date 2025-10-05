import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Lightbulb, TrendingUp, DollarSign, BarChart3, RefreshCw, AlertTriangle, Target, Award, Zap, Users, ShoppingCart, TrendingDown, Calendar } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell } from 'recharts'

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
    }
  })

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
        return <DollarSign className="h-5 w-5 text-primary" />
      case 'price_max':
        return <DollarSign className="h-5 w-5 text-destructive" />
      case 'price_stability':
        return <BarChart3 className="h-5 w-5 text-primary" />
      case 'category_comparison':
        return <BarChart3 className="h-5 w-5 text-primary" />
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
              {insight.data.slice(0, 3).map((model: any, index: number) => (
                <div key={index} className="p-3 bg-primary/10 border border-primary/20 rounded-md">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium">{model.brand} {model.model}</p>
                      <div className="flex gap-1 mt-1">
                        <Badge variant="outline" className="text-xs">{model.category}</Badge>
                        <Badge variant="default" className="text-xs bg-primary">
                          -{model.savings_vs_median}% vs mediana
                        </Badge>
                      </div>
                    </div>
                    <p className="font-bold text-primary">{formatPrice(model.price)}</p>
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Insights Automáticos</h1>
          <p className="text-muted-foreground">
            Análisis inteligente basado en los datos de precios
          </p>
        </div>
        <Button onClick={() => refetch()} disabled={isRefetching}>
          {isRefetching ? (
            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Actualizar
        </Button>
      </div>

      {/* Market Overview Cards */}
      {marketStats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Modelos Analizados</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{marketStats.metrics?.total_models || 0}</div>
              <p className="text-xs text-muted-foreground">
                {marketStats.metrics?.total_brands || 0} marcas diferentes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Precio Promedio</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPrice(marketStats.metrics?.avg_price || 0)}</div>
              <p className="text-xs text-muted-foreground">
                Mediana: {formatPrice(marketStats.metrics?.median_price || 0)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Volatilidad</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {marketStats.metrics?.variation_coefficient 
                  ? `${marketStats.metrics.variation_coefficient.toFixed(1)}%`
                  : 'N/A'
                }
              </div>
              <p className="text-xs text-muted-foreground">
                Coeficiente de variación
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Actividad Reciente</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{recentTrends?.length || 0}</div>
              <p className="text-xs text-muted-foreground">
                Actualizaciones últimos 30 días
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Price Distribution Chart */}
      {marketStats?.chart_data?.price_distribution && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Distribución de Precios por Segmento
            </CardTitle>
            <CardDescription>
              Cantidad de modelos en cada rango de precio del mercado
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={marketStats.chart_data.price_distribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="range" />
                <YAxis />
                <Tooltip />
                <Area 
                  type="monotone" 
                  dataKey="count" 
                  stroke="hsl(var(--primary))" 
                  fill="hsl(var(--primary))" 
                  fillOpacity={0.6}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Best Value Models Spotlight */}
      {marketStats?.chart_data?.best_value_models && marketStats.chart_data.best_value_models.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-green-500" />
              Spotlight: Mejores Oportunidades del Mercado
            </CardTitle>
            <CardDescription>
              Los modelos con mejor relación calidad-precio disponibles ahora
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {marketStats.chart_data.best_value_models.slice(0, 6).map((model: any, index: number) => (
                <div key={index} className="p-4 border rounded-lg bg-primary/10 border-primary/20">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-primary">{model.brand} {model.name}</h3>
                      <Badge variant="outline" className="text-xs mt-1">{model.category}</Badge>
                    </div>
                    <Badge variant="default" className="bg-primary">
                      -{model.value_rating}%
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-primary">{formatPrice(model.price)}</span>
                    <div className="text-right text-xs text-muted-foreground">
                      vs mediana del mercado
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-primary/10 border border-primary/20 rounded-lg">
              <p className="text-sm text-foreground">
                💡 <strong>Tip de compra:</strong> Estos modelos están priceados por debajo de la mediana del mercado, 
                representando excelentes oportunidades de inversión.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {insights && insights.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="h-5 w-5 text-amber-500" />
            <h2 className="text-xl font-semibold">Insights Automáticos</h2>
          </div>
          {insights
            .sort((a, b) => a.priority - b.priority)
            .map((insight, index) => (
              <Card key={index} className="transition-all hover:shadow-md">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {getInsightIcon(insight.insight_type)}
                      <div>
                        <CardTitle className="text-lg">{insight.title}</CardTitle>
                        <CardDescription className="mt-1">
                          {insight.description}
                        </CardDescription>
                      </div>
                    </div>
                    {getPriorityBadge(insight.priority)}
                  </div>
                </CardHeader>
                <CardContent>
                  {renderInsightData(insight)}
                </CardContent>
              </Card>
            ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No hay insights disponibles</h3>
            <p className="text-muted-foreground text-center mb-4">
              Los insights se generan automáticamente cuando hay suficientes datos.<br />
              Asegúrate de haber cargado datos de precios primero.
            </p>
            <Button onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Generar Insights
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}