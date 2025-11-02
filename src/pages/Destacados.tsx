import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { TrendingUp, TrendingDown, Tag, Activity, BarChart3, Package } from 'lucide-react'
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

export default function Destacados() {
  const [data, setData] = useState<DestacadosData | null>(null)
  const [loading, setLoading] = useState(true)
  const { formatPrice } = useCurrency()

  useEffect(() => {
    fetchDestacados()
  }, [])

  const fetchDestacados = async () => {
    try {
      setLoading(true)
      const { data: result, error } = await supabase.functions.invoke('get-destacados')
      
      if (error) throw error
      setData(result)
    } catch (error) {
      console.error('Error fetching destacados:', error)
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

  if (!data) return null

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

      {/* Tendencia del Mercado */}
      <Card className="p-6 border-border/50 shadow-md hover:shadow-lg transition-shadow">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Activity className="h-5 w-5 text-[hsl(25,65%,65%)]" />
          Tendencia del Mercado (6 meses)
        </h2>
        <div className="h-[250px]">
          <Line data={marketTrendChart} options={marketTrendOptions} />
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mejores Ofertas */}
        <Card className="p-6 border-border/50 shadow-md hover:shadow-lg transition-shadow">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Tag className="h-5 w-5 text-[hsl(140,35%,70%)]" />
            Mejores Ofertas Actuales
          </h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {data.bestDeals.map((deal, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-[hsl(140,35%,70%)]/10 to-transparent border border-[hsl(140,35%,70%)]/20 hover:border-[hsl(140,35%,70%)]/40 transition-colors">
                <div className="flex-1">
                  <p className="font-medium text-sm">{deal.products.model} {deal.products.submodel}</p>
                  <p className="text-xs text-muted-foreground">{deal.products.category}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-[hsl(140,35%,60%)]">{formatPrice(deal.price)}</p>
                  <p className="text-xs text-[hsl(140,50%,45%)] flex items-center gap-1 justify-end">
                    <TrendingDown className="h-3 w-3" />
                    {deal.discount}% descuento
                  </p>
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

      {/* Marcas Más Activas */}
      <Card className="p-6 border-border/50 shadow-md hover:shadow-lg transition-shadow">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Tag className="h-5 w-5 text-[hsl(25,65%,65%)]" />
          Marcas Más Activas
        </h2>
        <div className="h-[250px]">
          <Bar data={topBrandsChart} options={topBrandsOptions} />
        </div>
      </Card>

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
              <div className={`flex items-center gap-1 font-bold ${
                change.change > 0 ? 'text-[hsl(15,60%,62%)]' : 'text-[hsl(140,35%,60%)]'
              }`}>
                {change.change > 0 ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                {Math.abs(change.change)}%
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Análisis por Categoría */}
      <Card className="p-6 border-border/50 shadow-md hover:shadow-lg transition-shadow">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-[hsl(140,35%,70%)]" />
          Análisis por Categoría
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-3 text-sm font-semibold text-muted-foreground">Categoría</th>
                <th className="text-right p-3 text-sm font-semibold text-muted-foreground">Productos</th>
                <th className="text-right p-3 text-sm font-semibold text-muted-foreground">Precio Promedio</th>
                <th className="text-right p-3 text-sm font-semibold text-muted-foreground">Rango</th>
              </tr>
            </thead>
            <tbody>
              {data.categoryAnalysis.map((cat, idx) => (
                <tr key={idx} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="p-3 font-medium">{cat.category}</td>
                  <td className="text-right p-3">{cat.productCount}</td>
                  <td className="text-right p-3 font-bold text-[hsl(25,65%,65%)]">{formatPrice(cat.avgPrice)}</td>
                  <td className="text-right p-3 text-sm text-muted-foreground">
                    {formatPrice(cat.minPrice)} - {formatPrice(cat.maxPrice)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}