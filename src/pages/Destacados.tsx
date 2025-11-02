import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown, Tag, Activity, BarChart3, Package, AlertCircle, Zap } from 'lucide-react'
import { Line, Bar } from 'react-chartjs-2'
import { useCurrency } from '@/contexts/CurrencyContext'
import { lineChartColors, barChartColors, getTooltipOptions, getScaleOptions } from '@/config/chartColors'
import { hslVar } from '@/lib/utils'

interface DestacadosData {
  generatedAt: string
  summary: {
    totalProducts: number
    totalDataPoints: number
    categoriesCount: number
    brandsCount: number
    dateRange: { from: string; to: string }
  }
  marketTrend: Array<{ month: string; avgPrice: number }>
  bestDeals: Array<any>
  mostMonitored: Array<any>
  categoryAnalysis: Array<any>
  topBrands: Array<any>
  recentChanges: Array<any>
}

interface InsightData {
  insights: Array<{
    insight_type: string
    title: string
    description: string
    data?: any
    priority: number
  }>
  generated_at: string
  data_analyzed: {
    total_records: number
    products_tracked: number
    date_range: { from: string; to: string } | null
  }
}

export default function Destacados() {
  const [data, setData] = useState<DestacadosData | null>(null)
  const [insights, setInsights] = useState<InsightData | null>(null)
  const [loading, setLoading] = useState(true)
  const { formatPrice } = useCurrency()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [destacadosRes, insightsRes] = await Promise.all([
        supabase.functions.invoke('get-destacados'),
        supabase.functions.invoke('get-insights')
      ])
      
      if (destacadosRes.error) throw destacadosRes.error
      if (insightsRes.error) throw insightsRes.error
      
      setData(destacadosRes.data)
      setInsights(insightsRes.data)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    )
  }

  if (!data || !insights) return null

  const getInsightIcon = (type: string) => {
    switch(type) {
      case 'price_trend': return TrendingUp
      case 'best_value': return Tag
      case 'price_stability': return Activity
      case 'historical_opportunity': return Zap
      default: return AlertCircle
    }
  }

  const getInsightImpact = (insight: any): 'positive' | 'negative' | 'neutral' => {
    if (insight.insight_type === 'price_trend' && insight.data?.direction === 'down') return 'positive'
    if (insight.insight_type === 'price_trend' && insight.data?.direction === 'up') return 'negative'
    if (insight.insight_type === 'best_value') return 'positive'
    if (insight.insight_type === 'historical_opportunity') return 'positive'
    return 'neutral'
  }

  const getInsightColor = (impact: 'positive' | 'negative' | 'neutral') => {
    switch(impact) {
      case 'positive': return 'text-[hsl(142,76%,36%)]' // verde
      case 'negative': return 'text-[hsl(0,84%,60%)]' // rojo
      default: return 'text-[hsl(25,65%,65%)]' // naranja
    }
  }

  const marketTrendChart = {
    labels: data.marketTrend.map(m => {
      const [year, month] = m.month.split('-')
      return `${month}/${year.slice(2)}`
    }),
    datasets: [{
      label: 'Precio Promedio del Mercado',
      data: data.marketTrend.map(m => m.avgPrice),
      borderColor: lineChartColors.getLineColor(0),
      backgroundColor: hslVar('--chart-1', 0.1),
      fill: true,
      tension: lineChartColors.tension,
      borderWidth: lineChartColors.borderWidth,
      pointRadius: lineChartColors.pointRadius,
      pointHoverRadius: lineChartColors.pointHoverRadius,
    }]
  }

  const marketTrendOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { 
      legend: { display: false },
      tooltip: getTooltipOptions()
    },
    scales: {
      x: getScaleOptions(),
      y: getScaleOptions()
    }
  }

  const topBrandsChart = {
    labels: data.topBrands.map(b => b.brand),
    datasets: [{
      label: 'Número de Modelos',
      data: data.topBrands.map(b => b.productCount),
      backgroundColor: barChartColors.multiBar(data.topBrands.length),
      borderRadius: 6,
    }]
  }

  const topBrandsOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { 
      legend: { display: false },
      tooltip: getTooltipOptions()
    },
    scales: {
      x: getScaleOptions(),
      y: getScaleOptions()
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Destacados del Mercado</h1>
        <p className="text-muted-foreground mt-1">
          Resumen histórico completo de {data.summary.totalProducts} productos con {data.summary.totalDataPoints.toLocaleString()} puntos de datos
        </p>
      </div>

      {/* Resumen General - Estilo cards modernas con iconos circulares */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="group relative bg-white dark:bg-card rounded-2xl p-6 shadow-md hover:shadow-xl transition-all duration-300 border border-border/50">
          <div className="flex items-start justify-between mb-4">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-[hsl(25,65%,65%)] to-[hsl(25,65%,55%)] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <Package className="h-6 w-6 text-white" />
            </div>
            <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-full">
              Total
            </span>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Productos</p>
            <h3 className="text-3xl font-bold text-foreground mb-2">
              {data.summary.totalProducts}
            </h3>
            <p className="text-xs text-muted-foreground">
              En el mercado
            </p>
          </div>
        </div>

        <div className="group relative bg-white dark:bg-card rounded-2xl p-6 shadow-md hover:shadow-xl transition-all duration-300 border border-border/50">
          <div className="flex items-start justify-between mb-4">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-[hsl(140,35%,70%)] to-[hsl(140,35%,60%)] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <Activity className="h-6 w-6 text-white" />
            </div>
            <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-full">
              Datos
            </span>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Puntos de Datos</p>
            <h3 className="text-3xl font-bold text-foreground mb-2">
              {data.summary.totalDataPoints.toLocaleString()}
            </h3>
            <p className="text-xs text-muted-foreground">
              Registros históricos
            </p>
          </div>
        </div>

        <div className="group relative bg-white dark:bg-card rounded-2xl p-6 shadow-md hover:shadow-xl transition-all duration-300 border border-border/50">
          <div className="flex items-start justify-between mb-4">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-[hsl(35,55%,75%)] to-[hsl(35,55%,65%)] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <BarChart3 className="h-6 w-6 text-white" />
            </div>
            <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-full">
              Tipos
            </span>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Categorías</p>
            <h3 className="text-3xl font-bold text-foreground mb-2">
              {data.summary.categoriesCount}
            </h3>
            <p className="text-xs text-muted-foreground">
              Tipos de vehículos
            </p>
          </div>
        </div>

        <div className="group relative bg-white dark:bg-card rounded-2xl p-6 shadow-md hover:shadow-xl transition-all duration-300 border border-border/50">
          <div className="flex items-start justify-between mb-4">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-[hsl(15,60%,72%)] to-[hsl(15,60%,62%)] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <Tag className="h-6 w-6 text-white" />
            </div>
            <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-full">
              Fabricantes
            </span>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Marcas</p>
            <h3 className="text-3xl font-bold text-foreground mb-2">
              {data.summary.brandsCount}
            </h3>
            <p className="text-xs text-muted-foreground">
              En inventario
            </p>
          </div>
        </div>
      </div>

      {/* Insights Automáticos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {insights.insights.slice(0, 6).map((insight, idx) => {
          const Icon = getInsightIcon(insight.insight_type)
          const impact = getInsightImpact(insight)
          const colorClass = getInsightColor(impact)
          
          return (
            <Card key={idx} className="p-5 border-border/50 shadow-md hover:shadow-lg transition-all">
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${impact === 'positive' ? 'bg-[hsl(142,76%,36%)]/10' : impact === 'negative' ? 'bg-[hsl(0,84%,60%)]/10' : 'bg-[hsl(25,65%,65%)]/10'}`}>
                  <Icon className={`h-5 w-5 ${colorClass}`} />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm mb-1">{insight.title}</h3>
                  <p className={`text-xs ${colorClass} font-medium`}>{insight.description}</p>
                  
                  {/* Mostrar datos adicionales según el tipo */}
                  {insight.insight_type === 'price_trend' && insight.data && (
                    <div className="mt-2 pt-2 border-t border-border/30">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Cambio promedio:</span>
                        <span className={`font-bold ${colorClass}`}>
                          {insight.data.direction === 'up' ? '+' : ''}{insight.data.change_percent}%
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {insight.insight_type === 'best_value' && Array.isArray(insight.data) && insight.data.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-border/30 space-y-1">
                      {insight.data.slice(0, 2).map((item: any, i: number) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground truncate">{item.brand} {item.model}</span>
                          <Badge variant="outline" className="text-[hsl(142,76%,36%)] border-[hsl(142,76%,36%)]/30 bg-[hsl(142,76%,36%)]/10 text-[10px] px-1">
                            -{item.savings_vs_median}%
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {insight.insight_type === 'price_stability' && Array.isArray(insight.data) && insight.data.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-border/30 space-y-1">
                      {insight.data.slice(0, 2).map((item: any, i: number) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground truncate">{item.brand} {item.model}</span>
                          <span className="text-[10px] text-muted-foreground">{item.stability_score}% var.</span>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {insight.insight_type === 'historical_opportunity' && Array.isArray(insight.data) && insight.data.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-border/30 space-y-1">
                      {insight.data.slice(0, 2).map((item: any, i: number) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground truncate">{item.brand} {item.model}</span>
                          <Badge variant="outline" className="text-[hsl(142,76%,36%)] border-[hsl(142,76%,36%)]/30 bg-[hsl(142,76%,36%)]/10 text-[10px] px-1">
                            cerca mínimo
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Gráficos Compactos Lado a Lado */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Tendencia del Mercado */}
        <Card className="p-5 border-border/50 shadow-md hover:shadow-lg transition-shadow">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Activity className="h-4 w-4 text-[hsl(25,65%,65%)]" />
            Tendencia del Mercado (6 meses)
          </h2>
          <div className="h-[180px]">
            <Line data={marketTrendChart} options={marketTrendOptions} />
          </div>
        </Card>

        {/* Marcas Más Activas */}
        <Card className="p-5 border-border/50 shadow-md hover:shadow-lg transition-shadow">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Tag className="h-4 w-4 text-[hsl(25,65%,65%)]" />
            Marcas Más Activas
          </h2>
          <div className="h-[180px]">
            <Bar data={topBrandsChart} options={topBrandsOptions} />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Mejores Ofertas */}
        <Card className="p-6 border-border/50 shadow-md hover:shadow-lg transition-shadow">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Tag className="h-5 w-5 text-[hsl(140,35%,70%)]" />
            Mejores Ofertas Actuales
          </h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {data.bestDeals.map((deal, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-[hsl(142,76%,36%)]/5 to-transparent border border-[hsl(142,76%,36%)]/20 hover:border-[hsl(142,76%,36%)]/40 transition-colors">
                <div className="flex-1">
                  <p className="font-medium text-sm">{deal.products.model} {deal.products.submodel}</p>
                  <p className="text-xs text-muted-foreground">{deal.products.category}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-foreground">{formatPrice(deal.price)}</p>
                  <Badge variant="outline" className="text-xs text-[hsl(142,76%,36%)] border-[hsl(142,76%,36%)]/30 bg-[hsl(142,76%,36%)]/10 flex items-center gap-1 w-fit ml-auto mt-1">
                    <TrendingDown className="h-3 w-3" />
                    -{deal.discount}%
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Modelos Más Monitoreados */}
        <Card className="p-6 border-border/50 shadow-md hover:shadow-lg transition-shadow">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5 text-[hsl(35,55%,75%)]" />
            Modelos Más Monitoreados
          </h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {data.mostMonitored.map((product, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-[hsl(35,55%,75%)]/10 to-transparent border border-[hsl(35,55%,75%)]/20 hover:border-[hsl(35,55%,75%)]/40 transition-colors">
                <div className="flex-1">
                  <p className="font-medium text-sm">{product.products.model} {product.products.submodel}</p>
                  <p className="text-xs text-muted-foreground">{product.dataPoints} registros</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-foreground">{formatPrice(product.price)}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>


      {/* Cambios Recientes Significativos */}
      <Card className="p-6 border-border/50 shadow-md hover:shadow-lg transition-shadow">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-[hsl(15,60%,72%)]" />
          Cambios Significativos (últimos 30 días)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data.recentChanges.map((change, idx) => (
            <div key={idx} className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/50 hover:border-border transition-colors">
              <div className="flex-1">
                <p className="font-medium text-sm">{change.product.brand} {change.product.submodel}</p>
                <p className="text-xs text-muted-foreground">
                  {formatPrice(change.previousPrice)} → {formatPrice(change.currentPrice)}
                </p>
              </div>
              <Badge 
                variant="outline" 
                className={`flex items-center gap-1 font-bold ${
                  change.change > 0 
                    ? 'text-[hsl(0,84%,60%)] border-[hsl(0,84%,60%)]/30 bg-[hsl(0,84%,60%)]/10' 
                    : 'text-[hsl(142,76%,36%)] border-[hsl(142,76%,36%)]/30 bg-[hsl(142,76%,36%)]/10'
                }`}
              >
                {change.change > 0 ? (
                  <>
                    <TrendingUp className="h-3 w-3" />
                    +{Math.abs(change.change)}%
                  </>
                ) : (
                  <>
                    <TrendingDown className="h-3 w-3" />
                    -{Math.abs(change.change)}%
                  </>
                )}
              </Badge>
            </div>
          ))}
        </div>
      </Card>

      {/* Análisis por Categoría - más compacto */}
      <Card className="p-5 border-border/50 shadow-md hover:shadow-lg transition-shadow">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-[hsl(140,35%,70%)]" />
          Análisis por Categoría
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-2 text-xs font-semibold text-muted-foreground">Categoría</th>
                <th className="text-right p-2 text-xs font-semibold text-muted-foreground">Productos</th>
                <th className="text-right p-2 text-xs font-semibold text-muted-foreground">Precio Promedio</th>
                <th className="text-right p-2 text-xs font-semibold text-muted-foreground">Rango</th>
              </tr>
            </thead>
            <tbody>
              {data.categoryAnalysis.map((cat, idx) => (
                <tr key={idx} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="p-2 font-medium text-sm">{cat.category}</td>
                  <td className="text-right p-2 text-sm">{cat.productCount}</td>
                  <td className="text-right p-2 font-bold text-sm text-[hsl(25,65%,65%)]">{formatPrice(cat.avgPrice)}</td>
                  <td className="text-right p-2 text-xs text-muted-foreground">
                    {formatPrice(cat.minPrice)} - {formatPrice(cat.maxPrice)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Información adicional de insights: Comparación de categorías */}
      {insights.insights.find(i => i.insight_type === 'category_comparison') && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {(() => {
            const catInsight = insights.insights.find(i => i.insight_type === 'category_comparison');
            return (
              <>
                <Card className="p-5 border-border/50 shadow-md hover:shadow-lg transition-shadow">
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-[hsl(0,84%,60%)]" />
                    Segmento Más Costoso
                  </h3>
                  <div className="space-y-2">
                    <p className="text-2xl font-bold text-foreground">{catInsight.data.most_expensive_category.category}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Precio Promedio:</span>
                      <span className="text-lg font-bold text-[hsl(0,84%,60%)]">{formatPrice(catInsight.data.most_expensive_category.avg_price)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Modelos:</span>
                      <span className="text-sm font-semibold">{catInsight.data.most_expensive_category.model_count}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Rango de Precios:</span>
                      <span className="text-sm font-semibold">{formatPrice(catInsight.data.most_expensive_category.price_range)}</span>
                    </div>
                  </div>
                </Card>

                <Card className="p-5 border-border/50 shadow-md hover:shadow-lg transition-shadow">
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-[hsl(142,76%,36%)]" />
                    Segmento Más Accesible
                  </h3>
                  <div className="space-y-2">
                    <p className="text-2xl font-bold text-foreground">{catInsight.data.most_affordable_category.category}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Precio Promedio:</span>
                      <span className="text-lg font-bold text-[hsl(142,76%,36%)]">{formatPrice(catInsight.data.most_affordable_category.avg_price)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Modelos:</span>
                      <span className="text-sm font-semibold">{catInsight.data.most_affordable_category.model_count}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Rango de Precios:</span>
                      <span className="text-sm font-semibold">{formatPrice(catInsight.data.most_affordable_category.price_range)}</span>
                    </div>
                  </div>
                </Card>
              </>
            );
          })()}
        </div>
      )}
    </div>
  )
}