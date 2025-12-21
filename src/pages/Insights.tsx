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
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { InstitutionalHeader } from "@/components/InstitutionalHeader";
import { CleanEmptyState } from "@/components/CleanEmptyState";
import {
  Lightbulb,
  TrendingUp,
  DollarSign,
  BarChart3,
  RefreshCw,
  AlertTriangle,
  Target,
  Award,
  Zap,
  Users,
  ShoppingCart,
  TrendingDown,
  Calendar,
} from "lucide-react";
import { Bar, Line } from 'react-chartjs-2'
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
  Filler
)

// Set default chart colors - will be updated dynamically
ChartJS.defaults.color = "hsl(var(--foreground))";

import { usePriceDistribution } from "@/hooks/usePriceDistribution";

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


  // Update ChartJS defaults and force remount when theme changes
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

  // Fetch additional analytics for richer insights display
  const { data: marketStats } = useQuery({
    queryKey: ["market-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("get-analytics");
      if (error) throw error;
      return data;
    },
    staleTime: 0,
    refetchOnMount: true,
  });

  // Local, accurate price distribution computed from DB
  const { data: priceDistributionLocal } = usePriceDistribution();

  // Fetch recent price trends
  const { data: recentTrends } = useQuery({
    queryKey: ["recent-trends"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("price_data")
        .select(
          `
          *,
          products (brand, category, model, name)
        `
        )
        .gte(
          "date",
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
        )
        .order("date", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return <LoadingSpinner fullScreen size="lg" text="Generando insights..." />
  }

  const getInsightIcon = (type: string) => {
    switch (type) {
      case "price_trend":
        return <TrendingUp className="h-5 w-5 text-primary" />;
      case "best_value":
        return <Award className="h-5 w-5 text-primary" />;
      case "historical_opportunity":
        return <Target className="h-5 w-5 text-green-500" />;
      case "price_max":
        return <DollarSign className="h-5 w-5 text-destructive" />;
      case "price_stability":
        return <BarChart3 className="h-5 w-5 text-primary" />;
      case "category_comparison":
        return <ShoppingCart className="h-5 w-5 text-primary" />;
      default:
        return <Lightbulb className="h-5 w-5 text-primary" />;
    }
  };

  const getPriorityBadge = (priority: number) => {
    switch (priority) {
      case 1:
        return <Badge variant="destructive">Alta Prioridad</Badge>;
      case 2:
        return <Badge variant="secondary">Media Prioridad</Badge>;
      case 3:
        return <Badge variant="outline">Baja Prioridad</Badge>;
      default:
        return <Badge variant="outline">Sin Prioridad</Badge>;
    }
  };

  const renderInsightData = (insight: Insight) => {
    switch (insight.insight_type) {
      case "price_trend":
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">Marca:</span>
              <span>{insight.data.brand}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">Cambio:</span>
              <span
                className={`font-bold ${
                  insight.data.change_percent > 0
                    ? "text-destructive"
                    : "text-primary"
                }`}
              >
                {insight.data.change_percent > 0 ? "+" : ""}
                {insight.data.change_percent}%
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
        );

      case "best_value":
        if (Array.isArray(insight.data)) {
          return (
            <div className="space-y-3">
              {insight.data.map((model: any, index: number) => (
                <div
                  key={index}
                  className="p-4 bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/30 rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex-1">
                      <p className="font-semibold text-lg">
                        {model.brand} {model.model}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {model.name}
                      </p>
                      <div className="flex gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          {model.category}
                        </Badge>
                        <Badge className="text-xs bg-primary">
                          Ahorro {model.savings_vs_median}%
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-2xl font-bold text-primary">
                        {formatPrice(model.price)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        vs mediana
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          );
        }
        return <div>Datos no disponibles</div>;

      case "historical_opportunity":
        if (Array.isArray(insight.data)) {
          return (
            <div className="space-y-3">
              {insight.data.map((model: any, index: number) => (
                <div
                  key={index}
                  className="p-4 bg-gradient-to-r from-green-500/10 to-green-500/5 border border-green-500/30 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex-1">
                      <p className="font-semibold text-lg">
                        {model.brand} {model.model}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {model.name}
                      </p>
                    </div>
                    <Badge className="bg-green-600">Oportunidad</Badge>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
                    <div className="text-center p-2 bg-background/50 rounded">
                      <p className="text-xs text-muted-foreground">Actual</p>
                      <p className="font-bold text-primary">
                        {formatPrice(model.current_price)}
                      </p>
                    </div>
                    <div className="text-center p-2 bg-background/50 rounded">
                      <p className="text-xs text-muted-foreground">Mínimo</p>
                      <p className="font-bold text-green-600">
                        {formatPrice(model.historical_low)}
                      </p>
                    </div>
                    <div className="text-center p-2 bg-background/50 rounded">
                      <p className="text-xs text-muted-foreground">Máximo</p>
                      <p className="font-bold text-red-600">
                        {formatPrice(model.historical_high)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 p-2 bg-green-500/10 rounded text-xs">
                    💚 Variación histórica de {model.range_percent}% - Precio
                    actual cerca del mínimo
                  </div>
                </div>
              ))}
            </div>
          );
        }
        return <div>Datos no disponibles</div>;

      case "price_max":
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
        );

      case "price_stability":
        if (Array.isArray(insight.data)) {
          return (
            <div className="space-y-3">
              {insight.data.map((item: any, index: number) => (
                <div
                  key={index}
                  className="p-3 bg-primary/10 border border-primary/20 rounded-md"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium">
                        {item.brand} {item.model}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Promedio: {formatPrice(item.avg_price)}
                      </p>
                    </div>
                    <Badge
                      variant={
                        item.stability_score < 5
                          ? "default"
                          : item.stability_score < 15
                          ? "secondary"
                          : "destructive"
                      }
                    >
                      {item.stability_score < 5
                        ? "Muy Estable"
                        : item.stability_score < 15
                        ? "Estable"
                        : "Variable"}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Variación: {item.stability_score}%
                  </div>
                </div>
              ))}
            </div>
          );
        }
        return <div>Datos no disponibles</div>;

      case "category_comparison":
        return (
          <div className="space-y-4">
            <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
              <div className="p-4 rounded-lg border border-destructive/20 bg-destructive/10">
                <h4 className="font-semibold text-destructive mb-2 flex items-center gap-2">
                  🔴 Segmento Más Caro
                </h4>
                <p className="font-medium text-lg">
                  {insight.data.most_expensive_category.category}
                </p>
                <div className="space-y-1 mt-2">
                  <p className="text-sm">
                    <span className="font-medium">Promedio:</span>{" "}
                    {formatPrice(
                      insight.data.most_expensive_category.avg_price
                    )}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Modelos:</span>{" "}
                    {insight.data.most_expensive_category.model_count}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Rango:</span>{" "}
                    {formatPrice(
                      insight.data.most_expensive_category.price_range
                    )}
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-lg border border-primary/20 bg-primary/10">
                <h4 className="font-semibold text-primary mb-2 flex items-center gap-2">
                  🟢 Segmento Más Accesible
                </h4>
                <p className="font-medium text-lg">
                  {insight.data.most_affordable_category.category}
                </p>
                <div className="space-y-1 mt-2">
                  <p className="text-sm">
                    <span className="font-medium">Promedio:</span>{" "}
                    {formatPrice(
                      insight.data.most_affordable_category.avg_price
                    )}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Modelos:</span>{" "}
                    {insight.data.most_affordable_category.model_count}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Rango:</span>{" "}
                    {formatPrice(
                      insight.data.most_affordable_category.price_range
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-3 bg-primary/10 border border-primary/20 rounded-md">
              <p className="text-sm text-foreground">
                💡 <strong>Tip para compradores:</strong> Considera el segmento{" "}
                {insight.data.most_affordable_category.category}
                para obtener el mejor valor por tu dinero.
              </p>
            </div>
          </div>
        );

      default:
        return (
          <pre className="text-sm bg-muted p-2 rounded">
            {JSON.stringify(insight.data, null, 2)}
          </pre>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <InstitutionalHeader 
          title="Insights Automáticos" 
          description="Análisis inteligente basado en datos históricos del mercado."
          className="mb-0"
        />
        <Button onClick={() => refetch()} disabled={isRefetching} className="shadow-lg shadow-primary/20 shrink-0">
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
        <div className="grid gap-3 sm:gap-4 grid-cols-1 xs:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Modelos Analizados
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {marketStats.metrics?.total_models || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {marketStats.metrics?.total_brands || 0} marcas diferentes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Precio Promedio
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatPrice(marketStats.metrics?.avg_price || 0)}
              </div>
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
                  : "N/A"}
              </div>
              <p className="text-xs text-muted-foreground">
                Coeficiente de variación
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Actividad Reciente
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {recentTrends?.length || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Actualizaciones últimos 30 días
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Price Distribution Chart */}
      {(priceDistributionLocal ||
        marketStats?.chart_data?.price_distribution) && (
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
            <div className="h-[300px]">
              {mounted && <Line
              key={`area-price-segment-${chartKey}`}
                data={{
                  labels: (priceDistributionLocal || marketStats.chart_data.price_distribution).map((item: any) => {
                    const range = item.range
                    const priceMatch = range.match(/\$[\d,.]+[MK]?/gi)
                    if (priceMatch && priceMatch.length >= 2) {
                      const parsePrice = (priceStr: string): number => {
                        const cleanStr = priceStr.replace("$", "").replace(/,/g, "")
                        if (cleanStr.toUpperCase().includes("M"))
                          return parseFloat(cleanStr.replace(/M/gi, "")) * 1_000_000
                        if (cleanStr.toUpperCase().includes("K"))
                          return parseFloat(cleanStr.replace(/K/gi, "")) * 1_000
                        return parseFloat(cleanStr)
                      }
                      const minPrice = parsePrice(priceMatch[0])
                      const maxPrice = parsePrice(priceMatch[1])
                      return `${formatPrice(minPrice)} - ${formatPrice(maxPrice)}`
                    }
                    return range.split(":")[0].trim()
                  }),
                  datasets: [
                    {
                      label: 'Modelos',
                      data: (priceDistributionLocal || marketStats.chart_data.price_distribution).map((item: any) => item.count),
                      backgroundColor: hslVar('--chart-1', 0.3),
                      borderColor: hslVar('--chart-1'),
                      borderWidth: 2,
                      pointRadius: 4,
                      pointHoverRadius: 6,
                      pointBackgroundColor: hslVar('--chart-1'),
                      pointBorderColor: hslVar('--card'),
                      pointBorderWidth: 2,
                      tension: 0.3,
                      fill: true,
                    }
                  ]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: false
                    },
                    tooltip: {
                      backgroundColor: hslVar('--card'),
                      borderColor: hslVar('--border'),
                      borderWidth: 1,
                      titleColor: hslVar('--foreground'),
                      bodyColor: hslVar('--foreground'),
                      padding: 12,
                      cornerRadius: 8,
                      callbacks: {
                        label: (context) => `${context.parsed.y} modelos`
                      }
                    }
                  },
                  scales: {
                    x: {
                      grid: { color: hslVar('--border'), lineWidth: 0.5 },
                      ticks: { 
                        color: hslVar('--foreground'),
                        font: { size: 11 },
                        maxRotation: 45,
                        minRotation: 45
                      }
                    },
                    y: {
                      grid: { color: hslVar('--border'), lineWidth: 0.5 },
                      ticks: { 
                        color: hslVar('--foreground'),
                        font: { size: 12 },
                        stepSize: 1
                      }
                    }
                  }
                }}
              />}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Best Value Models Spotlight */}
      {marketStats?.chart_data?.best_value_models &&
        marketStats.chart_data.best_value_models.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                Mejores Oportunidades del Mercado
              </CardTitle>
              <CardDescription>
                Los modelos con mejor relación calidad-precio disponibles ahora
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
                {marketStats.chart_data.best_value_models
                  .slice(0, 6)
                  .map((model: any, index: number) => (
                    <div
                      key={index}
                      className="p-4 border rounded-lg bg-muted/50"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold">
                            {model.brand} {model.name}
                          </h3>
                          <Badge variant="outline" className="text-xs mt-1">
                            {model.category}
                          </Badge>
                        </div>
                        <Badge variant="default">-{model.value_rating}%</Badge>
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-2xl font-bold text-primary">
                          {formatPrice(model.price)}
                        </span>
                        <div className="text-right text-xs text-muted-foreground">
                          vs mediana
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
              <div className="mt-4 p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  💡 <strong>Tip:</strong> Estos modelos están priceados por
                  debajo de la mediana del mercado.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

      {insights && insights.length > 0 ? (
        <div className="space-y-4">
          {insights
            .sort((a, b) => a.priority - b.priority)
            .map((insight, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {getInsightIcon(insight.insight_type)}
                      <div>
                        <CardTitle className="text-lg">
                          {insight.title}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {insight.description}
                        </CardDescription>
                      </div>
                    </div>
                    {getPriorityBadge(insight.priority)}
                  </div>
                </CardHeader>
                <CardContent>{renderInsightData(insight)}</CardContent>
              </Card>
            ))}
        </div>
      ) : (
        <CleanEmptyState 
          icon={Lightbulb}
          title="No hay insights disponibles"
          description="Los insights se generan automáticamente cuando hay suficientes datos históricos."
          action={{
            label: isRefetching ? 'Generando...' : 'Generar Insights',
            onClick: () => refetch(),
            disabled: isRefetching
          }}
        />
      )}
    </div>
  );
}
