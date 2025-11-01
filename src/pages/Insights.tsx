import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, DollarSign, AlertCircle, Target, Activity, Award, Sparkles } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";

export default function Insights() {
  const { formatPrice } = useCurrency();

  const { data: insightsData, isLoading: insightsLoading } = useQuery({
    queryKey: ['insights'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-insights');
      if (error) throw error;
      return data;
    },
  });

  const { data: analyticsData, isLoading: analyticsLoading } = useQuery({
    queryKey: ['analytics-summary'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-analytics');
      if (error) throw error;
      return data;
    },
  });

  if (insightsLoading || analyticsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-96" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  const insights = insightsData?.insights || [];
  const analytics = analyticsData?.metrics || {};
  const topExpensive = analyticsData?.top_5_expensive || [];
  const topCheapest = analyticsData?.top_5_cheapest || [];
  const brandVariations = analyticsData?.brand_variations || [];

  // Extract key insights
  const priceTrends = insights.filter((i: any) => i.insight_type === 'price_trend').sort((a: any, b: any) => a.priority - b.priority);
  const bestValue = insights.find((i: any) => i.insight_type === 'best_value');
  const priceStability = insights.find((i: any) => i.insight_type === 'price_stability');
  const historicalOpp = insights.find((i: any) => i.insight_type === 'historical_opportunity');
  const categoryComp = insights.find((i: any) => i.insight_type === 'category_comparison');

  // Helper to format large numbers
  const formatLargeNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}k`;
    return num.toString();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Destacados del Mercado</h1>
        <p className="text-muted-foreground">
          Análisis automático basado en {insightsData?.data_analyzed?.total_records || 0} registros históricos de {insightsData?.data_analyzed?.products_tracked || 0} productos
        </p>
      </div>

      {/* Market Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Modelos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.total_models || 0}</div>
            <p className="text-xs text-muted-foreground">{analytics.total_brands || 0} marcas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Precio Promedio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(analytics.avg_price || 0)}</div>
            <p className="text-xs text-muted-foreground">Mediana: {formatPrice(analytics.median_price || 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Más Caro</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatPrice(analytics.max_price || 0)}</div>
            {topExpensive[0] && (
              <p className="text-xs text-muted-foreground">{topExpensive[0].brand} {topExpensive[0].model}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Más Accesible</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatPrice(analytics.min_price || 0)}</div>
            {topCheapest[0] && (
              <p className="text-xs text-muted-foreground">{topCheapest[0].brand} {topCheapest[0].model}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Key Insights - Automatic Highlights */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Insights Históricos Automáticos</h2>

        {/* Price Trends - Automatic Detection */}
        {priceTrends.length > 0 && (
          <div className="space-y-3">
            {priceTrends.map((insight: any, idx: number) => {
              const isReduction = insight.data.direction === 'down';
              const changePercent = Math.abs(insight.data.change_percent);
              
              return (
                <Card 
                  key={idx} 
                  className={isReduction ? "border-red-500/50 bg-red-500/5" : "border-green-500/50 bg-green-500/5"}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {isReduction ? 
                          <TrendingDown className="h-5 w-5 text-red-500" /> : 
                          <TrendingUp className="h-5 w-5 text-green-500" />
                        }
                        <div>
                          <CardTitle className="text-lg">
                            {isReduction ? '🔥 ' : ''}{insight.data.brand}: {isReduction ? 'Reducción' : 'Incremento'} de Precios
                          </CardTitle>
                          <CardDescription>
                            Los precios de {insight.data.brand} {isReduction ? 'bajaron' : 'subieron'} <span className={isReduction ? 'text-red-500 font-bold' : 'text-green-500 font-bold'}>{changePercent.toFixed(1)}%</span> en los últimos 30 días
                          </CardDescription>
                        </div>
                      </div>
                      <Badge variant={isReduction ? "destructive" : "default"} className="text-lg font-bold">
                        {isReduction ? '-' : '+'}{changePercent.toFixed(1)}%
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Precio Promedio Anterior (hace 30 días)</p>
                        <p className="font-semibold text-lg">{formatPrice(insight.data.previous_avg)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Precio Promedio Actual</p>
                        <p className={`font-semibold text-lg ${isReduction ? 'text-red-500' : 'text-green-500'}`}>
                          {formatPrice(insight.data.current_avg)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Historical Opportunities */}
        {historicalOpp && historicalOpp.data && historicalOpp.data.length > 0 && (
          <Card className="border-amber-500/50 bg-amber-500/5">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-500" />
                <div>
                  <CardTitle className="text-lg">{historicalOpp.title}</CardTitle>
                  <CardDescription>{historicalOpp.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {historicalOpp.data.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center p-4 bg-background rounded-lg border">
                    <div>
                      <p className="font-semibold text-lg">{item.brand} {item.model}</p>
                      <p className="text-sm text-muted-foreground">{item.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-xl text-amber-500">{formatPrice(item.current_price)}</p>
                      <p className="text-xs text-muted-foreground">
                        Rango histórico: {formatPrice(item.historical_low)} - {formatPrice(item.historical_high)}
                      </p>
                      <Badge variant="secondary" className="mt-1">
                        Variación histórica: {item.range_percent}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Best Value Models */}
        {bestValue && bestValue.data && bestValue.data.length > 0 && (
          <Card className="border-blue-500/50 bg-blue-500/5">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-blue-500" />
                <div>
                  <CardTitle className="text-lg">{bestValue.title}</CardTitle>
                  <CardDescription>{bestValue.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-3">
                {bestValue.data.slice(0, 6).map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center p-3 bg-background rounded border">
                    <div>
                      <p className="font-semibold">{item.brand} {item.model}</p>
                      <p className="text-xs text-muted-foreground">{item.name} - {item.category}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">{formatPrice(item.price)}</p>
                      <Badge variant="secondary" className="text-xs">
                        {item.savings_vs_median}% bajo mediana
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Price Stability */}
        {priceStability && priceStability.data && priceStability.data.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle className="text-lg">{priceStability.title}</CardTitle>
                  <CardDescription>
                    Modelos con menor variación de precio en su historial (coeficiente de variación más bajo)
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {priceStability.data.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center p-3 bg-background rounded border">
                    <div>
                      <p className="font-semibold">{item.brand} {item.model}</p>
                      <p className="text-xs text-muted-foreground">{item.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{formatPrice(item.avg_price)}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.data_points} registros | Estabilidad: {item.stability_score.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Brand Variations - Historical Trends */}
        {brandVariations && brandVariations.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle className="text-lg">Variaciones Históricas por Marca</CardTitle>
                  <CardDescription>
                    Cambio porcentual acumulado desde el primer registro hasta el último
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-3">
                {brandVariations
                  .filter((b: any) => b.scraping_sessions > 1)
                  .sort((a: any, b: any) => Math.abs(b.variation_percent) - Math.abs(a.variation_percent))
                  .slice(0, 6)
                  .map((brand: any, idx: number) => {
                    const isIncrease = brand.variation_percent > 0;
                    return (
                      <div key={idx} className="p-3 bg-background rounded border">
                        <div className="flex justify-between items-start mb-2">
                          <p className="font-semibold">{brand.brand}</p>
                          <Badge variant={isIncrease ? "default" : "destructive"}>
                            {isIncrease ? '+' : ''}{brand.variation_percent.toFixed(1)}%
                          </Badge>
                        </div>
                        <div className="text-xs space-y-1">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Primer registro:</span>
                            <span>{formatPrice(brand.first_avg_price)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Último registro:</span>
                            <span className={isIncrease ? 'text-green-500' : 'text-red-500'}>
                              {formatPrice(brand.last_avg_price)}
                            </span>
                          </div>
                          <p className="text-muted-foreground">{brand.scraping_sessions} sesiones de datos</p>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Category Comparison */}
        {categoryComp && categoryComp.data && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle className="text-lg">{categoryComp.title}</CardTitle>
                  <CardDescription>{categoryComp.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 bg-background rounded-lg border border-primary/30">
                  <p className="text-sm text-muted-foreground mb-2">Segmento Más Caro</p>
                  <p className="font-bold text-2xl">{categoryComp.data.most_expensive_category.category}</p>
                  <p className="text-sm font-semibold text-primary mt-2">
                    Promedio: {formatPrice(categoryComp.data.most_expensive_category.avg_price)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {categoryComp.data.most_expensive_category.model_count} modelos
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Rango de precios: {formatPrice(categoryComp.data.most_expensive_category.price_range)}
                  </p>
                </div>
                <div className="p-4 bg-background rounded-lg border border-green-500/30">
                  <p className="text-sm text-muted-foreground mb-2">Segmento Más Accesible</p>
                  <p className="font-bold text-2xl">{categoryComp.data.most_affordable_category.category}</p>
                  <p className="text-sm font-semibold text-green-500 mt-2">
                    Promedio: {formatPrice(categoryComp.data.most_affordable_category.avg_price)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {categoryComp.data.most_affordable_category.model_count} modelos
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Rango de precios: {formatPrice(categoryComp.data.most_affordable_category.price_range)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Top Extremes */}
        {(topExpensive.length > 0 || topCheapest.length > 0) && (
          <div className="grid md:grid-cols-2 gap-4">
            {topExpensive.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Top 5 Modelos Más Caros</CardTitle>
                  <CardDescription>Los vehículos con los precios más altos registrados actualmente</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {topExpensive.slice(0, 5).map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center p-2 bg-background rounded border">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{idx + 1}</Badge>
                          <div>
                            <p className="font-semibold text-sm">{item.brand} {item.model}</p>
                          </div>
                        </div>
                        <p className="font-bold">{formatPrice(item.price)}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            {topCheapest.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Top 5 Modelos Más Accesibles</CardTitle>
                  <CardDescription>Los vehículos con los precios más bajos registrados actualmente</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {topCheapest.slice(0, 5).map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center p-2 bg-background rounded border">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{idx + 1}</Badge>
                          <div>
                            <p className="font-semibold text-sm">{item.brand} {item.model}</p>
                          </div>
                        </div>
                        <p className="font-bold">{formatPrice(item.price)}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
