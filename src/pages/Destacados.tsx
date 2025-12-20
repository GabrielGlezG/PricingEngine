import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown, Tag, Activity, BarChart3, Package, AlertCircle, Zap, ArrowLeft, LayoutGrid } from 'lucide-react'
import { BrandLogo } from '@/components/BrandLogo'
import { BrandHeader } from '@/components/BrandHeader'
import { PriceEvolutionChart } from '@/components/PriceEvolutionChart'
import { ModelsTable } from '@/components/ModelsTable'
import { Button } from '@/components/ui/button'
import { Line, Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip as ChartTooltip,
  Legend as ChartLegend,
  Filler,
} from 'chart.js'
import { useCurrency } from '@/contexts/CurrencyContext'
import { lineChartColors, barChartColors, getTooltipOptions, getScaleOptions, getChartPalette } from '@/config/chartColors'
import { hslVar } from '@/lib/utils'
import { useTheme } from 'next-themes'

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  ChartTooltip,
  ChartLegend,
  Filler
)

// Set default chart colors based on theme
ChartJS.defaults.color = "hsl(var(--foreground))"

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
  allBrands: Array<{ brand: string; productCount: number }>
  recentChanges: Array<any>
}

interface AnalyticsData {
  chart_data: {
    top_5_expensive: Array<{ brand: string; model: string; price: number }>
    bottom_5_cheap: Array<{ brand: string; model: string; price: number }>
    brand_variations: Array<{
      brand: string
      first_avg_price: number
      last_avg_price: number
      variation_percent: number
      scraping_sessions: number
    }>
    monthly_volatility: {
      most_volatile: Array<{
        brand: string
        model: string
        name: string
        avg_monthly_variation: number
        data_points: number
      }>
    }
  }
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
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const { formatPrice, currency } = useCurrency()
  const { theme } = useTheme()
  
  // ✅ Key única para forzar re-render de gráficos cuando cambia el tema
  const [chartKey, setChartKey] = useState(0)
  const [mounted, setMounted] = useState(false)
  const COLORS = useMemo(() => getChartPalette(12), [theme])

  // ✅ Update ChartJS defaults and force remount when theme changes
  useEffect(() => {
    ChartJS.defaults.color = hslVar("--foreground")
    setMounted(false)
    setChartKey((prev) => prev + 1)

    const timer = setTimeout(() => setMounted(true), 50)
    return () => clearTimeout(timer)
  }, [theme, currency])

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [destacadosRes, insightsRes, analyticsRes] = await Promise.all([
        supabase.functions.invoke('get-destacados'),
        supabase.functions.invoke('get-insights'),
        supabase.functions.invoke('get-analytics')
      ])
      
      if (destacadosRes.error) throw destacadosRes.error
      if (insightsRes.error) throw insightsRes.error
      if (analyticsRes.error) throw analyticsRes.error
      
      setData(destacadosRes.data)
      setInsights(insightsRes.data)
      setAnalytics(analyticsRes.data)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);

  if (loading) {
    return <LoadingSpinner fullScreen size="lg" text="Cargando destacados..." />
  }

  if (!data || !insights || !analytics) return null

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
      y: {
        ...getScaleOptions(),
        ticks: {
          ...getScaleOptions().ticks,
          callback: (value: any) => formatPrice(value)
        }
      }
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


  if (selectedBrand) {
    return (
      <div className="p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setSelectedBrand(null)}
            className="gap-2 group hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            Volver a Destacados
          </Button>
        </div>

        <BrandHeader brands={[selectedBrand]} />



        {(() => {
           // --- DATA PREPARATION ---
           const brandVar = analytics.chart_data.brand_variations.find(b => b.brand === selectedBrand);
           const brandVol = analytics.chart_data.monthly_volatility.most_volatile.filter(b => b.brand === selectedBrand);
           const brandModels = data.allBrands?.find(b => b.brand === selectedBrand);
           const brandDeals = data.bestDeals.filter(d => d.products.brand === selectedBrand);
           const brandInsights = insights.insights.filter(i => i.title.includes(selectedBrand!) || (i.data && Array.isArray(i.data) && i.data.some((d: any) => d.brand === selectedBrand)));
           
           // Category Distribution
           const brandCategories = data.categoryAnalysis.reduce((acc: any, cat: any) => {
              // This is an estimation since we don't have per-brand-per-category counts directly exposed, 
              // but we can infer from Best Deals or Monitored if available, or just skip if data is missing.
              // A better proxy is filtering the full products list if we had it, but we have ModelsTable.
              // For now, let's use 'Most Monitored' as a proxy for category distribution interest.
              const inCat = data.mostMonitored.filter(m => m.products.brand === selectedBrand && m.products.category === cat.category).length;
              if (inCat > 0) acc.push({ name: cat.category, value: inCat });
              return acc;
           }, []);

           // Price Extremes for this brand
           const mostExpensive = analytics.chart_data.top_5_expensive.filter(m => m.brand === selectedBrand);
           const cheapest = analytics.chart_data.bottom_5_cheap.filter(m => m.brand === selectedBrand);

           return (
             <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
                
                {/* --- ROW 1: KEY STATS --- */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                   <Card className="p-4 border-border/50 shadow-sm bg-card/50 backdrop-blur-sm overflow-hidden group hover:border-primary/50 transition-colors">
                     <div className="flex justify-between items-start mb-2">
                       <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Precio Promedio</p>
                       <Tag className="h-5 w-5 text-primary/40 group-hover:text-primary transition-colors" />
                     </div>
                     <div className="flex items-baseline gap-2 mb-1">
                       <span className="text-2xl font-bold">{brandVar ? formatPrice(brandVar.last_avg_price) : "N/A"}</span>
                     </div>
                     <p className="text-[10px] text-muted-foreground">
                       {brandVar ? `Inicial: ${formatPrice(brandVar.first_avg_price)}` : ""}
                     </p>
                   </Card>

                   <Card className="p-4 border-border/50 shadow-sm bg-card/50 backdrop-blur-sm overflow-hidden group hover:border-primary/50 transition-colors">
                     <div className="flex justify-between items-start mb-2">
                       <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Variación Total</p>
                       <Activity className="h-5 w-5 text-primary/40 group-hover:text-primary transition-colors" />
                     </div>
                     <div className="flex items-baseline gap-2 mb-1">
                       <span className={`text-2xl font-bold ${brandVar && brandVar.variation_percent > 0 ? 'text-destructive' : 'text-emerald-600'}`}>
                         {brandVar ? `${brandVar.variation_percent > 0 ? '+' : ''}${brandVar.variation_percent.toFixed(1)}%` : "0%"}
                       </span>
                     </div>
                     <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <span className="font-medium text-foreground/80">Periodo:</span>
                        {brandVar && data.summary.dateRange ? (
                          `${new Date(data.summary.dateRange.from).toLocaleDateString()} - ${new Date(data.summary.dateRange.to).toLocaleDateString()}`
                        ) : "En todo el historial"}
                     </p>
                   </Card>

                   <Card className="p-4 border-border/50 shadow-sm bg-card/50 backdrop-blur-sm overflow-hidden group hover:border-primary/50 transition-colors">
                     <div className="flex justify-between items-start mb-2">
                       <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Modelos</p>
                       <Package className="h-5 w-5 text-primary/40 group-hover:text-primary transition-colors" />
                     </div>
                     <div className="flex items-baseline gap-2 mb-1">
                       <span className="text-2xl font-bold">{brandModels?.productCount || 0}</span>
                     </div>
                     <p className="text-[10px] text-muted-foreground">En catálogo actual</p>
                   </Card>

                   <Card className="p-4 border-border/50 shadow-sm bg-card/50 backdrop-blur-sm overflow-hidden group hover:border-primary/50 transition-colors">
                     <div className="flex justify-between items-start mb-2">
                       <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Volatilidad</p>
                       <BarChart3 className="h-5 w-5 text-primary/40 group-hover:text-primary transition-colors" />
                     </div>
                     <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-2xl font-bold">{brandVol.length > 0 ? "Alta" : "Baja"}</span>
                     </div>
                     <p className="text-[10px] text-muted-foreground">
                        {brandVol.length} modelos inestables
                     </p>
                   </Card>
                </div>

                {/* --- ROW 2: CHART & SIDEBAR --- */}
                {/* --- ROW 2: DETAILED INSIGHTS (REPLACED CHART) --- */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    
                    {/* COL 1: PRICE DOMAIN */}
                    <Card className="p-5 border-border/50 shadow-sm bg-card/50 backdrop-blur-sm h-full flex flex-col">
                        <h3 className="text-sm font-bold text-muted-foreground uppercase mb-4 flex items-center gap-2">
                            <TrendingUp className="h-4 w-4" /> Rangos de Precio
                        </h3>
                        <div className="space-y-6 flex-1">
                             {/* Expensive */}
                             <div className="flex justify-between items-start gap-4">
                                 <div className="overflow-hidden">
                                    <Badge variant="outline" className="mb-2 text-[10px] border-red-200 text-red-700 bg-red-50 dark:bg-red-900/10 dark:text-red-400 dark:border-red-900/30">Techo</Badge>
                                    <p className="font-medium text-sm truncate" title={mostExpensive[0]?.model}>{mostExpensive[0]?.model || "N/A"}</p>
                                 </div>
                                 <span className="font-bold text-lg whitespace-nowrap">{mostExpensive[0] ? formatPrice(mostExpensive[0].price) : "-"}</span>
                             </div>
                             <div className="w-full h-px bg-border/40" />
                             {/* Cheap */}
                             <div className="flex justify-between items-start gap-4">
                                 <div className="overflow-hidden">
                                    <Badge variant="outline" className="mb-2 text-[10px] border-emerald-200 text-emerald-700 bg-emerald-50 dark:bg-emerald-900/10 dark:text-emerald-400 dark:border-emerald-900/30">Piso</Badge>
                                    <p className="font-medium text-sm truncate" title={cheapest[0]?.model}>{cheapest[0]?.model || "N/A"}</p>
                                 </div>
                                 <span className="font-bold text-lg whitespace-nowrap">{cheapest[0] ? formatPrice(cheapest[0].price) : "-"}</span>
                             </div>
                        </div>
                    </Card>

                    {/* COL 2: OPPORTUNITIES & RISKS */}
                    <Card className="p-5 border-border/50 shadow-sm bg-card/50 backdrop-blur-sm h-full flex flex-col">
                        <h3 className="text-sm font-bold text-muted-foreground uppercase mb-4 flex items-center gap-2">
                            <Zap className="h-4 w-4 text-amber-500" /> Oportunidades
                        </h3>
                        <div className="space-y-3 flex-1">
                            {brandDeals.length > 0 ? brandDeals.slice(0, 3).map((d, i) => (
                                <div key={i} className="flex justify-between items-center text-sm p-2 rounded bg-emerald-500/10 border border-emerald-500/20">
                                    <span className="truncate font-medium text-emerald-900 dark:text-emerald-100 max-w-[120px] ml-1">{d.products.submodel}</span>
                                    <span className="font-bold text-emerald-600 mr-1">-{d.discount}%</span>
                                </div>
                            )) : <p className="text-xs text-muted-foreground italic">Sin ofertas destacadas.</p>}
                        </div>
                        
                        <h3 className="text-sm font-bold text-muted-foreground uppercase mt-6 mb-4 flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-orange-500" /> Volatilidad
                        </h3>
                        <div className="space-y-3">
                             {brandVol.length > 0 ? brandVol.slice(0, 3).map((v, i) => (
                                <div key={i} className="flex justify-between items-center text-sm p-2 rounded bg-orange-500/10 border border-orange-500/20">
                                    <span className="truncate font-medium text-orange-900 dark:text-orange-100 max-w-[120px] ml-1">{v.model}</span>
                                    <span className="font-bold text-orange-600 mr-1">±{v.avg_monthly_variation.toFixed(1)}%</span>
                                </div>
                            )) : <p className="text-xs text-muted-foreground italic">Precios estables.</p>}
                        </div>
                    </Card>

                    {/* COL 3: MARKET ACTIVITY */}
                    <Card className="p-5 border-border/50 shadow-sm bg-card/50 backdrop-blur-sm h-full flex flex-col">
                         <h3 className="text-sm font-bold text-muted-foreground uppercase mb-4 flex items-center gap-2">
                            <Activity className="h-4 w-4" /> Actividad Reciente
                        </h3>
                        <div className="space-y-3 flex-1 overflow-y-auto max-h-[220px] pr-2 custom-scrollbar">
                            {(() => {
                               const changes = data.recentChanges.filter(c => c.product.brand === selectedBrand).slice(0, 6);
                               if (changes.length === 0) return <p className="text-xs text-muted-foreground italic">Sin cambios recientes.</p>;
                               
                               return changes.map((change, i) => (
                                 <div key={i} className="flex flex-col gap-1 p-2.5 rounded bg-muted/40 border border-border/40 text-sm hover:bg-muted/60 transition-colors">
                                     <div className="flex justify-between items-start gap-2">
                                        <span className="font-medium truncate text-xs">{change.product.submodel}</span>
                                        <span className={`text-xs font-bold ${change.change > 0 ? 'text-destructive' : 'text-emerald-600'}`}>
                                            {change.change > 0 ? '+' : ''}{change.change}%
                                        </span>
                                     </div>
                                     <span className="text-[10px] text-muted-foreground">
                                        {formatPrice(change.previousPrice)} → {formatPrice(change.currentPrice)}
                                     </span>
                                 </div>
                               ));
                            })()}
                        </div>
                    </Card>
                </div>

                {/* --- ROW 4: CATALOG --- */}
                <div className="pt-6 border-t border-border/40">
                   <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
                     <Package className="h-5 w-5 text-primary" />
                     Catálogo Completo
                   </h2>
                   <ModelsTable filters={{ brand: selectedBrand }} />
                </div>
             </div>
           );
        })()}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="display-text mb-2">Nuestras Marcas</h1>
        <p className="subtitle">
          Explora toda la información histórica y actual de nuestras {data.allBrands?.length || 0} marcas disponibles.
        </p>
      </div>

       {/* Nuestras Marcas - Grid de Logos Clean */}
       <div className="bg-card/30 rounded-3xl p-8 border border-border/40 backdrop-blur-sm">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-8 gap-y-12">
          {data.allBrands?.map((brand) => (
            <button
               key={brand.brand}
               onClick={() => setSelectedBrand(brand.brand)}
               className="group flex flex-col items-center gap-4 transition-all duration-300 outline-none"
            >
               <div className="w-full aspect-[3/2] flex items-center justify-center p-4 rounded-2xl bg-white dark:bg-white/5 border border-transparent group-hover:border-border/50 group-hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] group-hover:-translate-y-1 transition-all duration-300">
                  <BrandLogo brand={brand.brand} size="xl" showName={false} className="w-full h-full object-contain filter grayscale group-hover:grayscale-0 transition-all duration-500 opacity-80 group-hover:opacity-100 scale-90 group-hover:scale-100" />
               </div>
               
               <div className="text-center space-y-1">
                 <h3 className="font-semibold text-foreground/80 group-hover:text-primary transition-colors">
                   {brand.brand}
                 </h3>
                 <span className="text-xs text-muted-foreground block opacity-0 group-hover:opacity-100 transition-opacity -translate-y-1 group-hover:translate-y-0">
                   {brand.productCount} modelos
                 </span>
               </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}