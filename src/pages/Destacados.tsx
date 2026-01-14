import { useEffect, useState, useMemo, useRef } from 'react'
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
import { InstitutionalHeader } from "@/components/InstitutionalHeader"
import { DataCard } from "@/components/DataCard"
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
  
  // Ref for scrolling to details section
  const detailsRef = useRef<HTMLDivElement>(null);
  const scrollToDetails = () => {
    detailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

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

  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  
  if (loading) {
    return <LoadingSpinner fullScreen size="lg" text="Cargando destacados..." />
  }

  if (!data || !insights || !analytics) return null

  const toggleBrand = (brand: string) => {
    setSelectedBrands(prev => 
      prev.includes(brand) 
        ? prev.filter(b => b !== brand)
        : [...prev, brand]
    );
  };

  const clearSelection = () => setSelectedBrands([]);

  // --- AGGREGATED METRICS CALCULATION ---
  const hasSelection = selectedBrands.length > 0;

  // 1. Price Variation & Average
  const selectedVars = analytics.chart_data.brand_variations.filter(b => selectedBrands.includes(b.brand));
  const avgPriceCurrent = selectedVars.length > 0 
    ? selectedVars.reduce((acc, curr) => acc + curr.last_avg_price, 0) / selectedVars.length 
    : 0;
  const avgPriceInitial = selectedVars.length > 0
    ? selectedVars.reduce((acc, curr) => acc + curr.first_avg_price, 0) / selectedVars.length
    : 0;
  const avgVariation = selectedVars.length > 0
    ? selectedVars.reduce((acc, curr) => acc + curr.variation_percent, 0) / selectedVars.length
    : 0;

  // 2. Volatility
  const selectedVolatileModels = analytics.chart_data.monthly_volatility.most_volatile.filter(b => selectedBrands.includes(b.brand));

  // 3. Active Models & Versions
  const selectedStats = data.allBrands?.filter(b => selectedBrands.includes(b.brand));
  const totalVersions = selectedStats?.reduce((acc, curr) => acc + curr.productCount, 0) || 0;
  // @ts-ignore - modelCount comes from updated backend
  const totalModels = selectedStats?.reduce((acc, curr) => acc + (curr.modelCount || 0), 0) || 0;

  // 4. Best Deals & Insights
  const selectedDeals = data.bestDeals.filter(d => selectedBrands.includes(d.products.brand));
  
  // 5. COMPETITIVE INTELLIGENCE - Find most aggressive and rising competitors
  // Filter brand variations for selected brands
  const selectedBrandVariations = analytics.chart_data.brand_variations.filter(b => selectedBrands.includes(b.brand));
  
  // Need at least 2 brands for meaningful comparison
  const hasMultipleBrands = selectedBrandVariations.length > 1;
  
  // Most aggressive: Brand with biggest NEGATIVE variation (lowering prices) - only if actually negative
  const aggressiveCandidate = selectedBrandVariations.length > 0
    ? selectedBrandVariations.reduce((prev, curr) => (curr.variation_percent < prev.variation_percent) ? curr : prev)
    : null;
  const mostAggressive = (hasMultipleBrands && aggressiveCandidate && aggressiveCandidate.variation_percent < 0) 
    ? aggressiveCandidate 
    : null;
  
  // Rising prices: Brand with biggest POSITIVE variation (raising prices) - only if actually positive
  const risingCandidate = selectedBrandVariations.length > 0
    ? selectedBrandVariations.reduce((prev, curr) => (curr.variation_percent > prev.variation_percent) ? curr : prev)
    : null;
  const risingPrices = (hasMultipleBrands && risingCandidate && risingCandidate.variation_percent > 0) 
    ? risingCandidate 
    : null;
  
  // For single brand selection, show that brand's own trend
  const singleBrandTrend = selectedBrandVariations.length === 1 ? selectedBrandVariations[0] : null;
  
  // 6. Market Trend - Overall direction of selected brands
  const avgMarketTrend = selectedBrandVariations.length > 0
    ? selectedBrandVariations.reduce((acc, b) => acc + b.variation_percent, 0) / selectedBrandVariations.length
    : 0;
  const marketTrendDirection = avgMarketTrend > 1 ? 'subiendo' : avgMarketTrend < -1 ? 'bajando' : 'estable';
  
  // 7. Total Scraping Sessions (data coverage indicator)
  // @ts-ignore - metrics comes from analytics
  const totalScrapingSessions = analytics.metrics?.total_scraping_sessions || 0;
  const totalDataPoints = selectedBrandVariations.reduce((acc, b) => acc + b.scraping_sessions, 0);

  // 8. Recent Changes
  const selectedChanges = data.recentChanges.filter(c => selectedBrands.includes(c.product.brand));


  // --- RENDER ---

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-20 md:pb-12">
      
      {/* 1. Header & Context */}
      <div className="flex flex-col gap-4">
        <InstitutionalHeader
             title="Nuestras Marcas"
             description={`Explora el catálogo histórico y actual de las ${data.allBrands?.length || 0} marcas monitoreadas. Selecciona una o más para ver detalles combinados.`} 
        />
        
        {hasSelection && (
           <div className="flex items-center justify-between animate-in fade-in slide-in-from-top-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={clearSelection}
                  className="rounded-full border-primary/20 bg-background/50 backdrop-blur-sm hover:bg-primary/10 hover:border-primary/50 hover:text-primary transition-all shadow-sm gap-2 pl-4 pr-4"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Limpiar Selección ({selectedBrands.length})
                </Button>
           </div>
        )}
      </div>

       {/* 2. Brand Grid (Always Visible at Top) */}
       <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3 md:gap-4 justify-items-center">
       {data.allBrands?.map((brand, index) => {
            const isSelected = selectedBrands.includes(brand.brand);
            return (
              <button
                 key={brand.brand}
                 onClick={() => toggleBrand(brand.brand)}
                 style={{ animationDelay: `${index * 50}ms` }}
                 className={`group relative w-full aspect-square max-w-[140px] flex flex-col items-center justify-center p-3 md:p-4 rounded-xl md:rounded-2xl 
                   backdrop-blur-md transition-all duration-500 outline-none overflow-hidden animate-in fade-in slide-in-from-bottom-4 fill-mode-backwards
                   ${isSelected 
                      ? "bg-primary/10 border-2 border-primary shadow-[0_0_30px_-5px_hsl(var(--primary)/0.4)] scale-105 z-10" 
                      : "bg-gradient-to-br from-background/80 via-background/40 to-background/20 border border-white/10 dark:border-white/5 hover:border-primary/30 hover:shadow-[0_0_30px_-5px_hsl(var(--primary)/0.2)] hover:-translate-y-1"
                   }
                  `}
              >
                 {/* Ambient Glow Effect */}
                 <div className={`absolute inset-0 bg-gradient-to-tr from-primary/0 via-primary/0 to-primary/0 transition-all duration-700 pointer-events-none 
                    ${isSelected ? "via-primary/10 to-primary/20" : "group-hover:via-primary/5 group-hover:to-primary/10"}`} 
                 />
  
                 <div className={`relative z-10 flex-1 w-full flex items-center justify-center transition-all duration-500 
                    ${isSelected ? "-translate-y-2 md:-translate-y-3 scale-110" : "group-hover:-translate-y-2 group-hover:md:-translate-y-3 group-hover:scale-110"}`}>
                   <BrandLogo 
                     brand={brand.brand} 
                     size="xl" 
                     showName={false}
                     variant="raw"
                     className="w-full h-full justify-center object-contain transition-all duration-500" 
                   />
                 </div>
                 
                 <div className={`relative z-10 absolute bottom-2 md:bottom-3 left-0 right-0 text-center transition-all duration-500 px-2 space-y-0.5
                    ${isSelected ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0"}`}>
                   <h3 className="font-semibold text-xs text-foreground tracking-tight truncate">
                     {brand.brand}
                   </h3>
                   <span className="text-[10px] text-muted-foreground/80 block font-medium">
                     {/* @ts-ignore */}
                     {brand.modelCount || brand.productCount} {brand.modelCount ? "Modelos" : "Versiones"}
                   </span>
                 </div>
                 
                 {/* Selection Indicator */}
                 {isSelected && (
                   <div className="absolute top-2 right-2 w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-primary shadow-[0_0_10px_hsl(var(--primary))] animate-pulse" />
                 )}
              </button>
            );
        })}
        </div>

      {/* 3. Detailed View (Below Grid) */}
      {hasSelection && (
        <div ref={detailsRef} className="space-y-4 md:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pt-8 border-t border-border/40">
            

            {/* --- METRICS ROW --- */}
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
               <DataCard
                 title="Precio Promedio"
                 value={formatPrice(avgPriceCurrent)}
                 subValue={`Inicial: ${formatPrice(avgPriceInitial)}`}
                 icon={Tag}
                 className="col-span-2 sm:col-span-1"
               />

               <DataCard
                 title="Variación"
                 value={`${avgVariation > 0 ? '+' : ''}${avgVariation.toFixed(1)}%`}
                 subValue={data.summary.dateRange ? `${new Date(data.summary.dateRange.from).toLocaleDateString()} - ${new Date(data.summary.dateRange.to).toLocaleDateString()}` : "Histórico"}
                 icon={Activity}
                 className={`col-span-2 sm:col-span-1 ${avgVariation > 0 ? "border-l-4 border-l-destructive/50" : "border-l-4 border-l-emerald-500/50"}`}
               />

               <DataCard
                 title="CATÁLOGO"
                 value={
                   <div className="flex items-baseline gap-2">
                     <span className="text-4xl font-bold tracking-tight text-foreground">{totalModels}</span>
                     <span className="text-lg font-medium text-muted-foreground">Modelos</span>
                   </div>
                 }
                 subValue={`${totalVersions} versiones`}
                 icon={Package}
               />

               <DataCard
                 title="Volatilidad"
                 value={selectedVolatileModels.length > 0 ? "Alta" : "Baja"}
                 subValue={`${selectedVolatileModels.length} inestables`}
                 icon={BarChart3}
                 className={selectedVolatileModels.length > 0 ? "border-destructive/20" : ""}
               />
            </div>

            {/* --- INSIGHTS ROW --- */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                
                {/* COL 1: COMPETITIVE INTELLIGENCE */}
                <Card className="p-4 md:p-5 border-border/50 shadow-sm bg-card/50 backdrop-blur-sm h-full flex flex-col">
                    <h3 className="text-xs md:text-sm font-bold text-muted-foreground uppercase mb-3 md:mb-4 flex items-center gap-2">
                        <TrendingDown className="h-4 w-4" /> {hasMultipleBrands ? 'Inteligencia Competitiva' : 'Tendencia de Marca'}
                    </h3>
                    <div className="space-y-4 md:space-y-5 flex-1">
                         {hasMultipleBrands ? (
                           <>
                             {/* Most Aggressive Competitor */}
                             <div className="flex justify-between items-start gap-4">
                                 <div className="overflow-hidden">
                                    <Badge variant="outline" className="mb-1 md:mb-2 text-[10px] border-red-200 text-red-700 bg-red-50 dark:bg-red-900/10 dark:text-red-400 dark:border-red-900/30">
                                      Mayor Reducción
                                    </Badge>
                                    <p className="font-medium text-xs md:text-sm">{mostAggressive?.brand || "Ninguno bajando"}</p>
                                    <p className="text-[10px] text-muted-foreground">{mostAggressive ? "Mayor variación negativa acumulada" : "Sin bajas significativas"}</p>
                                 </div>
                                 <span className={`font-bold text-base md:text-lg whitespace-nowrap ${mostAggressive ? 'text-red-600' : 'text-muted-foreground'}`}>
                                   {mostAggressive ? `${mostAggressive.variation_percent.toFixed(1)}%` : "-"}
                                 </span>
                             </div>
                             <div className="w-full h-px bg-border/40" />
                             {/* Rising Prices Brand */}
                             <div className="flex justify-between items-start gap-4">
                                 <div className="overflow-hidden">
                                    <Badge variant="outline" className="mb-1 md:mb-2 text-[10px] border-amber-200 text-amber-700 bg-amber-50 dark:bg-amber-900/10 dark:text-amber-400 dark:border-amber-900/30">
                                      Mayor Aumento
                                    </Badge>
                                    <p className="font-medium text-xs md:text-sm">{risingPrices?.brand || "Ninguno subiendo"}</p>
                                    <p className="text-[10px] text-muted-foreground">{risingPrices ? "Mayor variación positiva acumulada" : "Sin alzas significativas"}</p>
                                 </div>
                                 <span className={`font-bold text-base md:text-lg whitespace-nowrap ${risingPrices ? 'text-amber-600' : 'text-muted-foreground'}`}>
                                   {risingPrices ? `+${risingPrices.variation_percent.toFixed(1)}%` : "-"}
                                 </span>
                             </div>
                           </>
                         ) : singleBrandTrend ? (
                           <>
                             {/* Single Brand Trend Info */}
                             <div className="flex justify-between items-start gap-4">
                                 <div className="overflow-hidden">
                                    <Badge variant="outline" className={`mb-1 md:mb-2 text-[10px] ${singleBrandTrend.variation_percent < 0 
                                      ? 'border-emerald-200 text-emerald-700 bg-emerald-50 dark:bg-emerald-900/10' 
                                      : singleBrandTrend.variation_percent > 0 
                                      ? 'border-amber-200 text-amber-700 bg-amber-50 dark:bg-amber-900/10'
                                      : 'border-blue-200 text-blue-700 bg-blue-50 dark:bg-blue-900/10'
                                    }`}>
                                      {singleBrandTrend.variation_percent < 0 ? 'Bajando' : singleBrandTrend.variation_percent > 0 ? 'Subiendo' : 'Estable'}
                                    </Badge>
                                    <p className="font-medium text-xs md:text-sm">{singleBrandTrend.brand}</p>
                                    <p className="text-[10px] text-muted-foreground">Variación en el período</p>
                                 </div>
                                 <span className={`font-bold text-base md:text-lg whitespace-nowrap ${
                                   singleBrandTrend.variation_percent < 0 ? 'text-emerald-600' : 
                                   singleBrandTrend.variation_percent > 0 ? 'text-amber-600' : 'text-muted-foreground'
                                 }`}>
                                   {singleBrandTrend.variation_percent > 0 ? '+' : ''}{singleBrandTrend.variation_percent.toFixed(1)}%
                                 </span>
                             </div>
                             <div className="w-full h-px bg-border/40" />
                             <p className="text-xs text-muted-foreground text-center py-2">
                               Selecciona 2+ marcas para comparar competidores
                             </p>
                           </>
                         ) : (
                           <p className="text-xs text-muted-foreground text-center py-4">Sin datos de variación</p>
                         )}
                         <div className="w-full h-px bg-border/40" />
                         {/* Market Trend & Data Coverage */}
                         <div className="flex justify-between items-center gap-4">
                             <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${marketTrendDirection === 'bajando' ? 'bg-red-500' : marketTrendDirection === 'subiendo' ? 'bg-amber-500' : 'bg-emerald-500'} animate-pulse`} />
                                <span className="text-xs text-muted-foreground">Mercado {marketTrendDirection}</span>
                             </div>
                             <span className="text-xs font-medium text-muted-foreground">
                               {totalDataPoints} puntos de datos
                             </span>
                         </div>
                    </div>
                </Card>

                {/* COL 2: OPPORTUNITIES & RISKS */}
                <Card className="p-4 md:p-5 border-border/50 shadow-sm bg-card/50 backdrop-blur-sm h-full flex flex-col">
                    <h3 className="text-xs md:text-sm font-bold text-muted-foreground uppercase mb-3 md:mb-4 flex items-center gap-2">
                        <Zap className="h-4 w-4 text-amber-500" /> Oportunidades
                    </h3>
                    <div className="space-y-2 md:space-y-3 flex-1 overflow-y-auto max-h-[150px] custom-scrollbar pr-2">
                        {selectedDeals.length > 0 ? selectedDeals.slice(0, 5).map((d, i) => (
                            <div key={i} className="flex justify-between items-center text-sm p-2 rounded bg-emerald-500/10 border border-emerald-500/20">
                                <div className="overflow-hidden">
                                  <span className="truncate font-medium text-emerald-900 dark:text-emerald-100 block text-xs">{d.products.brand}</span>
                                  <span className="truncate text-xs text-muted-foreground ml-1">{d.products.submodel}</span>
                                </div>
                                <span className="font-bold text-emerald-600 mr-1">-{d.discount}%</span>
                            </div>
                        )) : <p className="text-xs text-muted-foreground italic">Sin ofertas destacadas en la selección.</p>}
                    </div>
                    
                    <h3 className="text-xs md:text-sm font-bold text-muted-foreground uppercase mt-4 md:mt-6 mb-3 md:mb-4 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-orange-500" /> Volatilidad
                    </h3>
                    <div className="space-y-2 md:space-y-3 overflow-y-auto max-h-[150px] custom-scrollbar pr-2">
                         {selectedVolatileModels.length > 0 ? selectedVolatileModels.slice(0, 5).map((v, i) => (
                            <div key={i} className="flex justify-between items-center text-sm p-2 rounded bg-orange-500/10 border border-orange-500/20">
                                <div className="overflow-hidden">
                                  <span className="truncate font-medium text-orange-900 dark:text-orange-100 block text-xs">{v.brand}</span>
                                  <span className="truncate text-xs text-muted-foreground ml-1">{v.model}</span>
                                </div>
                                <span className="font-bold text-orange-600 mr-1">±{v.avg_monthly_variation.toFixed(1)}%</span>
                            </div>
                        )) : <p className="text-xs text-muted-foreground italic">Precios estables.</p>}
                    </div>
                </Card>

                {/* COL 3: MARKET ACTIVITY */}
                <Card className="p-4 md:p-5 border-border/50 shadow-sm bg-card/50 backdrop-blur-sm h-full flex flex-col">
                     <h3 className="text-xs md:text-sm font-bold text-muted-foreground uppercase mb-3 md:mb-4 flex items-center gap-2">
                        <Activity className="h-4 w-4" /> Actividad Reciente
                    </h3>
                    <div className="space-y-2 md:space-y-3 flex-1 overflow-y-auto max-h-[250px] md:max-h-[350px] pr-2 custom-scrollbar">
                        {(() => {
                           const changes = selectedChanges.slice(0, 10);
                           if (changes.length === 0) return <p className="text-xs text-muted-foreground italic">Sin cambios recientes.</p>;
                           
                           return changes.map((change, i) => (
                             <div key={i} className="flex flex-col gap-1 p-2 md:p-2.5 rounded bg-muted/40 border border-border/40 text-sm hover:bg-muted/60 transition-colors">
                                 <div className="flex justify-between items-start gap-2">
                                    <div className="overflow-hidden"> 
                                      <span className="text-[10px] font-bold text-muted-foreground uppercase block">{change.product.brand}</span>
                                      <span className="font-medium truncate text-xs">{change.product.submodel}</span>
                                    </div>
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

            {/* --- CATALOG ROW --- */}
            <div className="pt-4 md:pt-6 border-t border-border/40">
               <h2 className="text-lg md:text-xl font-bold flex items-center gap-2 mb-3 md:mb-4">
                 <Package className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                 Catálogo Combinado
               </h2>
               <ModelsTable filters={{ brand: selectedBrands }} />
            </div>
        </div>
      )}

        
        {/* Floating Scroll-to-details */}
        {hasSelection && (
           <div className="fixed bottom-4 right-4 md:bottom-8 md:right-8 z-50 animate-in zoom-in duration-300">
               <Button onClick={scrollToDetails} className="shadow-lg shadow-primary/20 rounded-full px-4 h-10 md:px-6 md:h-12 text-xs md:text-sm">
                  <Activity className="mr-2 h-3 w-3 md:h-4 md:w-4" /> 
                  Ver Análisis de {selectedBrands.length}
               </Button>
           </div>
        )}
    </div>
  )
}