import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useTheme } from "next-themes";
import { hslVar } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Lightbulb,
  TrendingUp,
  DollarSign,
  BarChart3,
  RefreshCw,
  Target,
  Award,
  Users,
  ShoppingCart,
  TrendingDown,
  Calendar,
  Zap,
  ArrowDown,
  ArrowUp,
} from "lucide-react";
import { Bar, Line, Doughnut } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip as ChartTooltip,
  Legend as ChartLegend,
  Filler,
  ArcElement,
} from 'chart.js'
import { useEffect, useState } from "react";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  ChartTooltip,
  ChartLegend,
  Filler,
  ArcElement
)

ChartJS.defaults.color = "hsl(var(--foreground))";

interface Insight {
  insight_type: string;
  title: string;
  description: string;
  data: any;
  priority: number;
}

export default function Insights() {
  const { formatPrice } = useCurrency();
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [chartKey, setChartKey] = useState(0);

  useEffect(() => {
    ChartJS.defaults.color = hslVar('--foreground');
    setMounted(false);
    setChartKey((prev) => prev + 1);
    const isMobile = window.innerWidth < 768;
    const delay = isMobile ? 100 : 50;
  
    const timer = setTimeout(() => setMounted(true), delay);
    return () => clearTimeout(timer);
  }, [theme]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const {
    data: insights,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["insights"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("get-insights");
      if (error) throw error;
      return data.insights as Insight[];
    },
  });

  const { data: marketStats } = useQuery({
    queryKey: ["market-stats-destacados"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("get-analytics");
      if (error) throw error;
      return data;
    },
    staleTime: 0,
    refetchOnMount: true,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // Extract price reduction insights (highlighted in red)
  const priceReductions = insights?.filter(i => 
    i.insight_type === 'price_trend' && i.data.direction === 'down'
  ) || [];

  const priceIncreases = insights?.filter(i => 
    i.insight_type === 'price_trend' && i.data.direction === 'up'
  ) || [];

  const bestValues = insights?.find(i => i.insight_type === 'best_value');
  const historicalOpportunities = insights?.find(i => i.insight_type === 'historical_opportunity');
  const categoryComparison = insights?.find(i => i.insight_type === 'category_comparison');
  const priceStability = insights?.find(i => i.insight_type === 'price_stability');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Destacados del Mercado
          </h1>
          <p className="text-muted-foreground">
            Información clave y análisis destacados para compradores inteligentes
          </p>
        </div>
        <Button onClick={() => refetch()} disabled={isRefetching} size="sm">
          {isRefetching ? (
            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Actualizar
        </Button>
      </div>

      {/* Quick Stats Overview */}
      {marketStats && (
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Modelos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {marketStats.metrics?.total_models || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {marketStats.metrics?.total_brands || 0} marcas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Precio Promedio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatPrice(marketStats.metrics?.avg_price || 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Mediana: {formatPrice(marketStats.metrics?.median_price || 0)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Rango
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">
                {formatPrice(marketStats.metrics?.min_price || 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Max: {formatPrice(marketStats.metrics?.max_price || 0)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Sesiones
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {marketStats.metrics?.total_scraping_sessions || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                de scraping
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* HIGHLIGHTED: Price Reductions (RED) */}
      {priceReductions.length > 0 && (
        <Card className="border-red-500/50 bg-gradient-to-br from-red-500/10 to-red-500/5">
          <CardHeader>
            <CardTitle className="text-red-600 dark:text-red-400 flex items-center gap-2">
              <TrendingDown className="h-5 w-5" />
              🔥 Reducciones de Precio Detectadas
            </CardTitle>
            <CardDescription>
              Marcas con bajadas significativas en los últimos 30 días
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {priceReductions.slice(0, 6).map((insight, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-lg border border-red-500/30 bg-card"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold">{insight.data.brand}</h3>
                    <Badge variant="destructive" className="bg-red-600">
                      <ArrowDown className="h-3 w-3 mr-1" />
                      {Math.abs(insight.data.change_percent).toFixed(1)}%
                    </Badge>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Actual:</span>
                      <span className="font-medium">{formatPrice(insight.data.current_avg)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Anterior:</span>
                      <span className="line-through text-muted-foreground">{formatPrice(insight.data.previous_avg)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Price Increases */}
      {priceIncreases.length > 0 && (
        <Card className="border-orange-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
              <TrendingUp className="h-5 w-5" />
              Incrementos de Precio
            </CardTitle>
            <CardDescription>
              Marcas con subidas en los últimos 30 días
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {priceIncreases.slice(0, 4).map((insight, idx) => (
                <div key={idx} className="p-3 rounded-lg border bg-muted/50">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-sm">{insight.data.brand}</h3>
                    <Badge variant="secondary" className="text-orange-600">
                      <ArrowUp className="h-3 w-3 mr-1" />
                      +{insight.data.change_percent.toFixed(1)}%
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatPrice(insight.data.previous_avg)} → {formatPrice(insight.data.current_avg)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Historical Opportunities */}
      {historicalOpportunities && Array.isArray(historicalOpportunities.data) && (
        <Card className="border-green-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <Target className="h-5 w-5" />
              Cerca de Mínimos Históricos
            </CardTitle>
            <CardDescription>
              Modelos con precios cercanos a sus registros más bajos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {historicalOpportunities.data.slice(0, 3).map((model: any, idx: number) => (
                <div key={idx} className="p-4 rounded-lg border border-green-500/30 bg-gradient-to-br from-green-500/10 to-green-500/5">
                  <div className="mb-3">
                    <h3 className="font-semibold">{model.brand} {model.model}</h3>
                    <p className="text-xs text-muted-foreground">{model.name}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="text-center p-2 bg-card rounded">
                      <p className="text-muted-foreground">Actual</p>
                      <p className="font-bold text-sm">{formatPrice(model.current_price)}</p>
                    </div>
                    <div className="text-center p-2 bg-card rounded">
                      <p className="text-muted-foreground">Mín</p>
                      <p className="font-bold text-green-600 text-sm">{formatPrice(model.historical_low)}</p>
                    </div>
                    <div className="text-center p-2 bg-card rounded">
                      <p className="text-muted-foreground">Máx</p>
                      <p className="font-bold text-red-600 text-sm">{formatPrice(model.historical_high)}</p>
                    </div>
                  </div>
                  <Badge className="mt-2 w-full justify-center bg-green-600">
                    Rango histórico: {model.range_percent}%
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Best Value Models */}
      {bestValues && Array.isArray(bestValues.data) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              Mejores Oportunidades de Compra
            </CardTitle>
            <CardDescription>
              Modelos con precios por debajo de la mediana del mercado
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {bestValues.data.slice(0, 6).map((model: any, idx: number) => (
                <div key={idx} className="p-3 rounded-lg border bg-primary/5">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-sm">{model.brand} {model.model}</h3>
                      <p className="text-xs text-muted-foreground">{model.name}</p>
                    </div>
                    <Badge className="bg-primary">
                      -{model.savings_vs_median}%
                    </Badge>
                  </div>
                  <div className="text-lg font-bold text-primary mt-2">
                    {formatPrice(model.price)}
                  </div>
                  <Badge variant="outline" className="text-xs mt-1">
                    {model.category}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Compact Charts Section */}
      {marketStats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Price by Brand */}
          {marketStats.chart_data?.prices_by_brand && marketStats.chart_data.prices_by_brand.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Precio por Marca
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  {mounted && (
                    <Bar
                      key={`brand-chart-${chartKey}`}
                      data={{
                        labels: marketStats.chart_data.prices_by_brand.slice(0, 8).map((d: any) => d.brand),
                        datasets: [{
                          label: 'Precio Promedio',
                          data: marketStats.chart_data.prices_by_brand.slice(0, 8).map((d: any) => d.avg_price),
                          backgroundColor: hslVar('--chart-1', 0.8),
                        }]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: {
                          x: { ticks: { font: { size: 10 } } },
                          y: { ticks: { font: { size: 10 } } }
                        }
                      }}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Price by Category */}
          {marketStats.chart_data?.prices_by_category && marketStats.chart_data.prices_by_category.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  Precio por Categoría
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  {mounted && (
                    <Bar
                      key={`category-chart-${chartKey}`}
                      data={{
                        labels: marketStats.chart_data.prices_by_category.map((d: any) => d.category),
                        datasets: [{
                          label: 'Promedio',
                          data: marketStats.chart_data.prices_by_category.map((d: any) => d.avg_price),
                          backgroundColor: hslVar('--chart-2', 0.8),
                        }]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: {
                          x: { ticks: { font: { size: 10 } } },
                          y: { ticks: { font: { size: 10 } } }
                        }
                      }}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Models by Category */}
          {marketStats.chart_data?.models_by_category && marketStats.chart_data.models_by_category.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Modelos por Categoría
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  {mounted && (
                    <Doughnut
                      key={`models-category-${chartKey}`}
                      data={{
                        labels: marketStats.chart_data.models_by_category.map((d: any) => d.category),
                        datasets: [{
                          data: marketStats.chart_data.models_by_category.map((d: any) => d.count),
                          backgroundColor: [
                            hslVar('--chart-1', 0.8),
                            hslVar('--chart-2', 0.8),
                            hslVar('--chart-3', 0.8),
                            hslVar('--chart-4', 0.8),
                            hslVar('--chart-5', 0.8),
                          ],
                        }]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: 'bottom',
                            labels: { font: { size: 10 } }
                          }
                        }
                      }}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Top 5 Most Expensive */}
          {marketStats.chart_data?.top_5_expensive && marketStats.chart_data.top_5_expensive.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Top 5 Más Caros
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  {mounted && (
                    <Bar
                      key={`top-expensive-${chartKey}`}
                      data={{
                        labels: marketStats.chart_data.top_5_expensive.map((d: any) => `${d.brand} ${d.model}`),
                        datasets: [{
                          label: 'Precio',
                          data: marketStats.chart_data.top_5_expensive.map((d: any) => d.price),
                          backgroundColor: hslVar('--chart-3', 0.8),
                        }]
                      }}
                      options={{
                        indexAxis: 'y',
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: {
                          x: { ticks: { font: { size: 9 } } },
                          y: { ticks: { font: { size: 9 } } }
                        }
                      }}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Top 5 Cheapest */}
          {marketStats.chart_data?.bottom_5_cheap && marketStats.chart_data.bottom_5_cheap.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingDown className="h-4 w-4" />
                  Top 5 Más Baratos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  {mounted && (
                    <Bar
                      key={`bottom-cheap-${chartKey}`}
                      data={{
                        labels: marketStats.chart_data.bottom_5_cheap.map((d: any) => `${d.brand} ${d.model}`),
                        datasets: [{
                          label: 'Precio',
                          data: marketStats.chart_data.bottom_5_cheap.map((d: any) => d.price),
                          backgroundColor: hslVar('--chart-4', 0.8),
                        }]
                      }}
                      options={{
                        indexAxis: 'y',
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: {
                          x: { ticks: { font: { size: 9 } } },
                          y: { ticks: { font: { size: 9 } } }
                        }
                      }}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Brand Variations */}
          {marketStats.chart_data?.brand_variations && marketStats.chart_data.brand_variations.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Variación por Marca
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  {mounted && (
                    <Bar
                      key={`variations-${chartKey}`}
                      data={{
                        labels: marketStats.chart_data.brand_variations.slice(0, 8).map((d: any) => d.brand),
                        datasets: [{
                          label: 'Variación %',
                          data: marketStats.chart_data.brand_variations.slice(0, 8).map((d: any) => d.variation_percent),
                          backgroundColor: marketStats.chart_data.brand_variations.slice(0, 8).map((d: any) => 
                            d.variation_percent > 0 ? hslVar('--chart-5', 0.8) : hslVar('--destructive', 0.8)
                          ),
                        }]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: {
                          x: { ticks: { font: { size: 9 } } },
                          y: { ticks: { font: { size: 10 } } }
                        }
                      }}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Category Comparison */}
      {categoryComparison && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Comparación de Segmentos
            </CardTitle>
            <CardDescription>
              Diferencias entre categorías de vehículos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="p-4 rounded-lg border border-red-500/30 bg-red-500/5">
                <h4 className="font-semibold text-red-600 dark:text-red-400 mb-2 flex items-center gap-2">
                  🔴 Segmento Más Caro
                </h4>
                <p className="font-medium text-lg mb-2">
                  {categoryComparison.data.most_expensive_category.category}
                </p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Promedio:</span>
                    <span className="font-medium">{formatPrice(categoryComparison.data.most_expensive_category.avg_price)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Modelos:</span>
                    <span>{categoryComparison.data.most_expensive_category.model_count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Rango:</span>
                    <span>{formatPrice(categoryComparison.data.most_expensive_category.price_range)}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
                <h4 className="font-semibold text-primary mb-2 flex items-center gap-2">
                  🟢 Segmento Más Accesible
                </h4>
                <p className="font-medium text-lg mb-2">
                  {categoryComparison.data.most_affordable_category.category}
                </p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Promedio:</span>
                    <span className="font-medium">{formatPrice(categoryComparison.data.most_affordable_category.avg_price)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Modelos:</span>
                    <span>{categoryComparison.data.most_affordable_category.model_count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Rango:</span>
                    <span>{formatPrice(categoryComparison.data.most_affordable_category.price_range)}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Price Stability */}
      {priceStability && Array.isArray(priceStability.data) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Modelos con Precios Estables
            </CardTitle>
            <CardDescription>
              Vehículos con menor variación de precio
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {priceStability.data.map((item: any, idx: number) => (
                <div key={idx} className="p-3 rounded-lg border bg-muted/50">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-sm">{item.brand} {item.model}</h3>
                      <p className="text-xs text-muted-foreground">Prom: {formatPrice(item.avg_price)}</p>
                    </div>
                    <Badge variant={item.stability_score < 5 ? "default" : "secondary"}>
                      {item.stability_score < 5 ? "Muy Estable" : "Estable"}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Variación: {item.stability_score}%
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
