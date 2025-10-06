import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Lightbulb, TrendingUp, DollarSign, BarChart3, RefreshCw, Target, Award, Users, Calendar } from "lucide-react"
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'
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

  const { data: priceDistributionLocal } = usePriceDistribution()

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
          <div key={i} className="space-y-2">
            <Skeleton className="h-6 w-64" />
            <Skeleton className="h-4 w-96" />
            <Skeleton className="h-16 w-full" />
          </div>
        ))}
      </div>
    )
  }

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'price_trend':
        return <TrendingUp className="h-4 w-4" />
      case 'best_value':
        return <Award className="h-4 w-4" />
      case 'historical_opportunity':
        return <Target className="h-4 w-4" />
      case 'price_max':
        return <DollarSign className="h-4 w-4" />
      case 'price_stability':
        return <BarChart3 className="h-4 w-4" />
      case 'category_comparison':
        return <BarChart3 className="h-4 w-4" />
      default:
        return <Lightbulb className="h-4 w-4" />
    }
  }

  const getPriorityBadge = (priority: number) => {
    switch (priority) {
      case 1:
        return <Badge variant="destructive" className="text-xs">Alta</Badge>
      case 2:
        return <Badge variant="secondary" className="text-xs">Media</Badge>
      case 3:
        return <Badge variant="outline" className="text-xs">Baja</Badge>
      default:
        return null
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
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Marca:</span>
              <p className="font-medium">{insight.data.brand}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Cambio:</span>
              <p className={`font-bold ${insight.data.change_percent > 0 ? 'text-destructive' : 'text-primary'}`}>
                {insight.data.change_percent > 0 ? '+' : ''}{insight.data.change_percent}%
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Precio Actual:</span>
              <p className="font-medium">{formatPrice(insight.data.current_avg)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Precio Anterior:</span>
              <p className="font-medium">{formatPrice(insight.data.previous_avg)}</p>
            </div>
          </div>
        )

      case 'best_value':
        if (Array.isArray(insight.data)) {
          return (
            <div className="space-y-3">
              {insight.data.map((model: any, index: number) => (
                <div key={index} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="flex-1">
                    <p className="font-medium">{model.brand} {model.model}</p>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">{model.category}</Badge>
                      <Badge className="text-xs">Ahorro {model.savings_vs_median}%</Badge>
                    </div>
                  </div>
                  <p className="text-xl font-bold text-primary ml-4">{formatPrice(model.price)}</p>
                </div>
              ))}
            </div>
          )
        }
        return <div className="text-sm text-muted-foreground">Datos no disponibles</div>
      
      case 'historical_opportunity':
        if (Array.isArray(insight.data)) {
          return (
            <div className="space-y-3">
              {insight.data.map((model: any, index: number) => (
                <div key={index} className="py-3 border-b border-border last:border-0">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium">{model.brand} {model.model}</p>
                    <Badge className="text-xs">Oportunidad</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <p className="text-muted-foreground">Actual</p>
                      <p className="font-bold text-primary">{formatPrice(model.current_price)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Mínimo</p>
                      <p className="font-bold">{formatPrice(model.historical_low)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Máximo</p>
                      <p className="font-bold">{formatPrice(model.historical_high)}</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Variación histórica de {model.range_percent}%
                  </p>
                </div>
              ))}
            </div>
          )
        }
        return <div className="text-sm text-muted-foreground">Datos no disponibles</div>

      case 'price_max':
        return (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Marca:</span>
              <p className="font-medium">{insight.data.brand}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Modelo:</span>
              <p className="font-medium">{insight.data.model}</p>
            </div>
            <div className="col-span-2">
              <span className="text-muted-foreground">Precio:</span>
              <p className="text-2xl font-bold text-destructive">{formatPrice(insight.data.price)}</p>
            </div>
          </div>
        )

      case 'price_stability':
        if (Array.isArray(insight.data)) {
          return (
            <div className="space-y-3">
              {insight.data.map((item: any, index: number) => (
                <div key={index} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="font-medium">{item.brand} {item.model}</p>
                    <p className="text-sm text-muted-foreground">
                      Promedio: {formatPrice(item.avg_price)}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant={item.stability_score < 5 ? "default" : item.stability_score < 15 ? "secondary" : "destructive"} className="text-xs">
                      {item.stability_score < 5 ? "Muy Estable" : 
                       item.stability_score < 15 ? "Estable" : "Variable"}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {item.stability_score}% variación
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )
        }
        return <div className="text-sm text-muted-foreground">Datos no disponibles</div>

      case 'category_comparison':
        return (
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 border border-border rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Segmento Más Caro</p>
              <p className="font-semibold text-lg">{insight.data.most_expensive_category.category}</p>
              <div className="space-y-1 mt-2 text-sm">
                <p>
                  <span className="text-muted-foreground">Promedio:</span> {formatPrice(insight.data.most_expensive_category.avg_price)}
                </p>
                <p>
                  <span className="text-muted-foreground">Modelos:</span> {insight.data.most_expensive_category.model_count}
                </p>
              </div>
            </div>
            
            <div className="p-4 border border-border rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Segmento Más Accesible</p>
              <p className="font-semibold text-lg">{insight.data.most_affordable_category.category}</p>
              <div className="space-y-1 mt-2 text-sm">
                <p>
                  <span className="text-muted-foreground">Promedio:</span> {formatPrice(insight.data.most_affordable_category.avg_price)}
                </p>
                <p>
                  <span className="text-muted-foreground">Modelos:</span> {insight.data.most_affordable_category.model_count}
                </p>
              </div>
            </div>
          </div>
        )

      default:
        return <pre className="text-xs bg-muted p-2 rounded overflow-auto">{JSON.stringify(insight.data, null, 2)}</pre>
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold">Insights Automáticos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Análisis inteligente basado en datos históricos del mercado
          </p>
        </div>
        <Button onClick={() => refetch()} disabled={isRefetching} variant="outline" size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {/* Market Stats */}
      {marketStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Users className="h-4 w-4" />
              <span className="text-xs font-medium uppercase">Modelos</span>
            </div>
            <p className="text-2xl font-bold">{marketStats.metrics?.total_models || 0}</p>
            <p className="text-xs text-muted-foreground">{marketStats.metrics?.total_brands || 0} marcas</p>
          </div>

          <div>
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4" />
              <span className="text-xs font-medium uppercase">Promedio</span>
            </div>
            <p className="text-2xl font-bold">{formatPrice(marketStats.metrics?.avg_price || 0)}</p>
            <p className="text-xs text-muted-foreground">Mediana: {formatPrice(marketStats.metrics?.median_price || 0)}</p>
          </div>

          <div>
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs font-medium uppercase">Volatilidad</span>
            </div>
            <p className="text-2xl font-bold">
              {marketStats.metrics?.variation_coefficient 
                ? `${marketStats.metrics.variation_coefficient.toFixed(1)}%`
                : 'N/A'
              }
            </p>
            <p className="text-xs text-muted-foreground">Coef. variación</p>
          </div>

          <div>
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Calendar className="h-4 w-4" />
              <span className="text-xs font-medium uppercase">Actividad</span>
            </div>
            <p className="text-2xl font-bold">{recentTrends?.length || 0}</p>
            <p className="text-xs text-muted-foreground">Últimos 30 días</p>
          </div>
        </div>
      )}

      {/* Price Distribution */}
      {(priceDistributionLocal || marketStats?.chart_data?.price_distribution) && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <h2 className="text-lg font-semibold">Distribución de Precios</h2>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={priceDistributionLocal || marketStats.chart_data.price_distribution}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis 
                dataKey="range" 
                tick={{ fontSize: 12 }}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Area 
                type="monotone" 
                dataKey="count" 
                stroke="hsl(var(--primary))" 
                fill="hsl(var(--primary))" 
                fillOpacity={0.2}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Best Value Models */}
      {marketStats?.chart_data?.best_value_models && marketStats.chart_data.best_value_models.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4" />
            <h2 className="text-lg font-semibold">Mejores Oportunidades</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {marketStats.chart_data.best_value_models.slice(0, 6).map((model: any, index: number) => (
              <div key={index} className="p-4 border border-border rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <p className="font-semibold">{model.brand}</p>
                    <p className="text-sm text-muted-foreground">{model.name}</p>
                    <Badge variant="outline" className="text-xs mt-1">{model.category}</Badge>
                  </div>
                  <Badge className="text-xs">-{model.value_rating}%</Badge>
                </div>
                <p className="text-2xl font-bold text-primary mt-2">{formatPrice(model.price)}</p>
                <p className="text-xs text-muted-foreground">vs mediana</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Insights */}
      {insights && insights.length > 0 ? (
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            <h2 className="text-lg font-semibold">Hallazgos</h2>
          </div>
          {insights
            .sort((a, b) => a.priority - b.priority)
            .map((insight, index) => (
              <div key={index} className="space-y-3 pb-6 border-b border-border last:border-0">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 flex-1">
                    {getInsightIcon(insight.insight_type)}
                    <div>
                      <h3 className="font-semibold">{insight.title}</h3>
                      <p className="text-sm text-muted-foreground">{insight.description}</p>
                    </div>
                  </div>
                  {getPriorityBadge(insight.priority)}
                </div>
                <div className="pl-6">
                  {renderInsightData(insight)}
                </div>
              </div>
            ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Lightbulb className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No hay insights disponibles</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Los insights se generan automáticamente cuando hay suficientes datos.
          </p>
          <Button onClick={() => refetch()} disabled={isRefetching} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
            {isRefetching ? 'Generando...' : 'Generar Insights'}
          </Button>
        </div>
      )}
    </div>
  )
}
