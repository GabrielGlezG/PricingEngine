import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useLastUpdate } from "@/contexts/LastUpdateContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CalendarIcon,
  DollarSign,
  Package,
  TrendingUp,
  BarChart3,
  RefreshCw,
  Target,
  Award,
  AlertTriangle,
  Building2,
  Activity,
  TrendingDown,
  X,
} from "lucide-react";
import { Bar, Line, Doughnut, Pie, Bubble } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip as ChartTooltip,
  Legend as ChartLegend,
  Filler,
} from "chart.js";
import { useState, useEffect, useMemo } from "react";
import { usePriceDistribution } from "@/hooks/usePriceDistribution";
// import { CurrencySelector } from "@/components/CurrencySelector";
import { hslVar } from "@/lib/utils";
import {
  getChartPalette,
  barChartColors,
  pieChartColors,
  bubbleChartColors,
  tooltipColors,
  axisColors,
  createMultiColorBarDataset,
  getScaleOptions,
} from "@/config/chartColors";
import { ModelsTable } from "@/components/ModelsTable";
import { useTheme } from "next-themes";

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  ChartTooltip,
  ChartLegend,
  Filler
);

// Set default chart colors based on theme - will be updated dynamically
ChartJS.defaults.color = "hsl(var(--foreground))";

interface AnalyticsData {
  metrics: {
    total_models: number;
    total_brands: number;
    total_categories: number;
    avg_price: number;
    median_price: number;
    min_price: number;
    max_price: number;
    price_std_dev: number;
    price_range: number;
    variation_coefficient: number;
    lower_quartile: number;
    upper_quartile: number;
    current_scraping_date?: string;
    total_scraping_sessions?: number;
  };
  chart_data: {
    prices_by_brand: Array<{
      brand: string;
      avg_price: number;
      min_price: number;
      max_price: number;
      count: number;
      value_score: number;
      price_trend?: number;
    }>;
    prices_by_category: Array<{
      category: string;
      avg_price: number;
      min_price: number;
      max_price: number;
      count: number;
    }>;
    models_by_category: Array<{ category: string; count: number }>;
    models_by_principal: Array<{
      model_principal: string;
      count: number;
      avg_price: number;
      min_price: number;
      max_price: number;
    }>;
    price_distribution: Array<{ range: string; count: number }>;
    best_value_models: Array<{
      brand: string;
      name: string;
      category: string;
      price: number;
      value_rating: string;
    }>;
    top_5_expensive: Array<{ name: string; brand: string; price: number }>;
    bottom_5_cheap: Array<{ name: string; brand: string; price: number }>;
    brand_variations: Array<{
      brand: string;
      first_avg_price: number;
      last_avg_price: number;
      variation_percent: number;
      scraping_sessions: number;
    }>;
    monthly_volatility: {
      most_volatile: Array<{
        brand: string;
        model: string;
        name: string;
        avg_monthly_variation: number;
        data_points: number;
      }>;
    };
  };
  historical_data?: Array<{ date: string; price: number }>;
  applied_filters: {
    brand?: string;
    category?: string;
    model?: string;
    submodel?: string;
    date_from?: string;
    date_to?: string;
    ctx_precio?: string;
    priceRange?: string;
  };
  generated_at: string;
}

export default function Dashboard() {
  const { formatPrice } = useCurrency();
  const { setLastUpdate } = useLastUpdate();
  const { theme } = useTheme();

  // ✅ Key única para forzar re-render de gráficos cuando cambia el tema
  const [chartKey, setChartKey] = useState(0);
  const [mounted, setMounted] = useState(false);
  const COLORS = useMemo(() => getChartPalette(12), [theme]);

  // ✅ Estado para controlar el tab activo
  const [activeTab, setActiveTab] = useState("general");

  const [filters, setFilters] = useState({
    brand: "",
    model: "",
    submodel: "",
  });

  // ✅ Update ChartJS defaults and force remount when theme changes
  useEffect(() => {
    ChartJS.defaults.color = hslVar("--foreground");
    setMounted(false);
    // Incrementa la key para forzar remount de TODOS los gráficos
    setChartKey((prev) => prev + 1);

    // Delay más largo en mobile para mejor renderizado
    const isMobile = window.innerWidth < 768;
    const delay = isMobile ? 100 : 50;

    const timer = setTimeout(() => setMounted(true), delay);
    return () => clearTimeout(timer);
  }, [theme]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { user, profile, isAdmin, hasActiveSubscription } = useAuth();

  const {
    data: analytics,
    isLoading,
    refetch,
    isRefetching,
    error: queryError,
  } = useQuery({
    queryKey: ["analytics", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      const { data, error } = await supabase.functions.invoke("get-analytics", {
        body: { params: params.toString() },
      });

      if (error) {
        console.error("Edge function error:", error);
        throw error;
      }

      return data as AnalyticsData;
    },
    retry: (failureCount, error) => {
      console.error("Analytics query error:", error);
      return failureCount < 2;
    },
    staleTime: 5 * 60 * 1000,
    refetchOnMount: false,
    placeholderData: (previousData) => previousData,
  });

  if (queryError) {
    console.error("Query error:", queryError);
  }

  // Update last update date when analytics data changes
  useEffect(() => {
    const fetchLastUploadDate = async () => {
      const { data, error } = await supabase
        .from("price_data")
        .select("created_at")
        .order("created_at", { ascending: false })
        .limit(1);

      if (!error && data && data.length > 0 && data[0].created_at) {
        setLastUpdate(data[0].created_at);
      }
    };

    fetchLastUploadDate();
  }, [setLastUpdate]);

  const { data: priceDistributionLocal } = usePriceDistribution(filters);

  const { data: brands } = useQuery({
    queryKey: ["brands"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("brand")
        .order("brand");

      if (error) throw error;
      return [...new Set(data.map((p) => p.brand))];
    },
  });

  const { data: models } = useQuery({
    queryKey: ["models", filters.brand],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select("model, name, brand")
        .order("model");

      if (filters.brand) {
        query = query.eq("brand", filters.brand);
      }

      const { data, error } = await query;
      if (error) throw error;

      const uniqueModels = Array.from(
        new Map(
          data.map((p) => [
            p.model,
            { model: p.model, name: p.name, brand: p.brand },
          ])
        ).values()
      );
      return uniqueModels;
    },
  });

  const { data: submodels } = useQuery({
    queryKey: ["submodels", filters.brand, filters.model],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select("submodel, brand, model")
        .not("submodel", "is", null)
        .order("submodel");

      if (filters.brand) {
        query = query.eq("brand", filters.brand);
      }
      if (filters.model) {
        query = query.eq("model", filters.model);
      }

      const { data, error } = await query;
      if (error) throw error;
      return [...new Set(data.map((p) => p.submodel).filter(Boolean))];
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-3 sm:gap-4 grid-cols-1 xs:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-3 w-32 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">
              No hay datos disponibles para mostrar
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Sube archivos JSON desde la página de Upload para comenzar el
              análisis
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-center">{/* <CurrencySelector /> */}</div>

      <Card className="border-border/50 shadow-md">
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="h-5 w-5 text-primary" />
            Filtros
          </CardTitle>
          <CardDescription>
            Refina tu análisis con criterios específicos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
            <Select
              value={filters.brand || "all"}
              onValueChange={(value) =>
                setFilters((f) => ({
                  ...f,
                  brand: value === "all" ? "" : value,
                }))
              }
            >
              <SelectTrigger className="bg-card border-border">
                <SelectValue placeholder="Todas las marcas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las marcas</SelectItem>
                {brands?.map((brand) => (
                  <SelectItem key={brand} value={brand}>
                    {brand}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.model || "all"}
              onValueChange={(value) =>
                setFilters((f) => ({
                  ...f,
                  model: value === "all" ? "" : value,
                }))
              }
            >
              <SelectTrigger className="bg-card border-border">
                <SelectValue placeholder="Todos los modelos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los modelos</SelectItem>
                {models?.map((m, idx) => (
                  <SelectItem key={`${m.model}-${idx}`} value={m.model}>
                    {m.model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.submodel || "all"}
              onValueChange={(value) =>
                setFilters((f) => ({
                  ...f,
                  submodel: value === "all" ? "" : value,
                }))
              }
            >
              <SelectTrigger className="bg-card border-border">
                <SelectValue placeholder="Todos los submodelos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los submodelos</SelectItem>
                {submodels?.map((sub) => (
                  <SelectItem key={sub} value={sub}>
                    {sub}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="dark"
              onClick={() => setFilters({ brand: "", model: "", submodel: "" })}
              className="w-full"
            >
              <X className="h-4 w-4 mr-2" />
              Limpiar Filtros
            </Button>

            <Button
              onClick={() => refetch()}
              disabled={isRefetching}
              className="w-full"
            >
              {isRefetching ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Actualizar Datos
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:gap-4 grid-cols-1 xs:grid-cols-2 lg:grid-cols-4">
  <div className="group relative bg-white dark:bg-card rounded-2xl p-6 shadow-md hover:shadow-xl transition-all duration-300 border border-border/50">
    <div className="flex items-start justify-between mb-4">
      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-[hsl(25,65%,65%)] to-[hsl(25,65%,55%)] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
        <Package className="h-6 w-6 text-white" />
      </div>
      <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-full">
        Inventario
      </span>
    </div>
    <div>
      <p className="text-sm text-muted-foreground mb-1">Total Modelos</p>
      <h3 className="text-3xl font-bold text-foreground mb-2">
        {analytics.metrics.total_models}
      </h3>
      <p className="text-xs text-muted-foreground">
        {analytics.metrics.total_brands} marcas activas
      </p>
    </div>
  </div>

  <div className="group relative bg-white dark:bg-card rounded-2xl p-6 shadow-md hover:shadow-xl transition-all duration-300 border border-border/50">
    <div className="flex items-start justify-between mb-4">
      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-[hsl(140,35%,70%)] to-[hsl(140,35%,60%)] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
        <DollarSign className="h-6 w-6 text-white" />
      </div>
      <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-full">
        Promedio
      </span>
    </div>
    <div>
      <p className="text-sm text-muted-foreground mb-1">Precio Promedio</p>
      <h3 className="text-3xl font-bold text-foreground mb-2">
        {formatPrice(analytics.metrics.avg_price)}
      </h3>
      <p className="text-xs text-muted-foreground">
        Variación: {analytics.metrics.variation_coefficient.toFixed(1)}%
      </p>
    </div>
  </div>

  <div className="group relative bg-white dark:bg-card rounded-2xl p-6 shadow-md hover:shadow-xl transition-all duration-300 border border-border/50">
    <div className="flex items-start justify-between mb-4">
      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-[hsl(35,55%,75%)] to-[hsl(35,55%,65%)] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
        <TrendingDown className="h-6 w-6 text-white" />
      </div>
      <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-full">
        Mínimo
      </span>
    </div>
    <div>
      <p className="text-sm text-muted-foreground mb-1">Precio Mínimo</p>
      <h3 className="text-3xl font-bold text-foreground mb-2">
        {formatPrice(analytics.metrics.min_price)}
      </h3>
      <p className="text-xs text-muted-foreground">Valor más accesible</p>
    </div>
  </div>

  <div className="group relative bg-white dark:bg-card rounded-2xl p-6 shadow-md hover:shadow-xl transition-all duration-300 border border-border/50">
    <div className="flex items-start justify-between mb-4">
      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-[hsl(15,60%,72%)] to-[hsl(15,60%,62%)] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
        <TrendingUp className="h-6 w-6 text-white" />
      </div>
      <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-full">
        Máximo
      </span>
    </div>
    <div>
      <p className="text-sm text-muted-foreground mb-1">Precio Máximo</p>
      <h3 className="text-3xl font-bold text-foreground mb-2">
        {formatPrice(analytics.metrics.max_price)}
      </h3>
      <p className="text-xs text-muted-foreground">Valor premium</p>
    </div>
  </div>
</div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-2 h-auto bg-card border border-border">
          <TabsTrigger
            value="general"
            className="text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-2 sm:py-2.5"
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Visión General
          </TabsTrigger>
          <TabsTrigger
            value="modelos"
            className="text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-2 sm:py-2.5"
          >
            <Package className="h-4 w-4 mr-2" />
            Modelos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          {/* Sección: Distribución y Categorías */}
          <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
            <Card className="border-border/50 shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="space-y-1 pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  Modelos por Categoría
                </CardTitle>
                <CardDescription>
                  Distribución de vehículos según tipo
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="h-[220px] sm:h-[260px]">
                  {mounted && (
                    <Line
                      key={`line-category-${chartKey}`}
                      data={{
                        labels: (
                          analytics.chart_data?.models_by_category || []
                        ).map((d) => d.category),
                        datasets: [
                          {
                            label: "Cantidad",
                            data: (
                              analytics.chart_data?.models_by_category || []
                            ).map((d) => d.count),
                            borderColor: hslVar("--chart-1"),
                            backgroundColor: hslVar("--chart-1", 0.1),
                            borderWidth: 2,
                            pointRadius: 4,
                            pointHoverRadius: 6,
                            tension: 0.3,
                            fill: false,
                          },
                        ],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { display: false },
                          tooltip: {
                            backgroundColor: tooltipColors.backgroundColor(),
                            borderColor: tooltipColors.borderColor(),
                            borderWidth: tooltipColors.borderWidth,
                            titleColor: tooltipColors.titleColor(),
                            bodyColor: tooltipColors.bodyColor(),
                            padding: tooltipColors.padding,
                            cornerRadius: tooltipColors.cornerRadius,
                          },
                        },
                        scales: {
                          x: getScaleOptions(),
                          y: getScaleOptions(),
                        },
                      }}
                    />
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50 shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="space-y-1 pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  Distribución por Rango de Precio
                </CardTitle>
                <CardDescription>
                  Modelos en cada segmento de mercado
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
  <div className="h-[220px] sm:h-[260px]">
    {mounted && (
      <Doughnut
        key={`pie-distribution-${chartKey}`}
        data={{
          labels: (
            priceDistributionLocal ||
            analytics.chart_data?.price_distribution ||
            []
          ).map((d) => d.range),
          datasets: [
            {
              data: (
                priceDistributionLocal ||
                analytics.chart_data?.price_distribution ||
                []
              ).map((d) => d.count),
              backgroundColor: pieChartColors.palette(
                (
                  priceDistributionLocal ||
                  analytics.chart_data?.price_distribution ||
                  []
                ).length
              ),
              borderWidth: pieChartColors.borderWidth,
              borderColor: pieChartColors.borderColor(),
            },
          ],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          cutout: "65%",
          plugins: {
            legend: {
              position: "bottom",
              labels: {
                color: hslVar("--foreground"),
                padding: 14,
                font: { size: 12 },
                generateLabels: (chart: any) => {
                  const data = chart.data;
                  const dataset = data.datasets[0];
                  const totals = (dataset.data as number[]).reduce(
                    (sum, val) => sum + val,
                    0
                  );
                  return (data.labels || []).map(
                    (label: string, i: number) => {
                      const value = (dataset.data as number[])[i] || 0;
                      const percentage =
                        totals > 0
                          ? ((value / totals) * 100).toFixed(1)
                          : "0.0";

                      const priceMatch = label.match(/\$[\d.,]+[MK]?/gi);
                      let formattedLabel = label;

                      if (priceMatch && priceMatch.length >= 2) {
                        const parsePrice = (priceStr: string): number => {
                          const clean = priceStr
                            .replace(/\$/g, "")
                            .replace(/,/g, "");
                          if (/M/i.test(clean))
                            return (
                              parseFloat(clean.replace(/M/gi, "")) * 1_000_000
                            );
                          if (/K/i.test(clean))
                            return parseFloat(clean.replace(/K/gi, "")) * 1_000;
                          return parseFloat(clean);
                        };

                        const min = parsePrice(priceMatch[0]);
                        const max = parsePrice(priceMatch[1]);
                        formattedLabel = `${formatPrice(min)} - ${formatPrice(
                          max
                        )}`;
                      } else {
                        const onlyNumbers = (
                          label.match(/[\d,.MK]+/gi) || []
                        ).join(" - ");
                        if (onlyNumbers) formattedLabel = onlyNumbers;
                      }

                      return {
                        text: `${formattedLabel} (${percentage}%)`,
                        fillStyle: COLORS[i % COLORS.length],
                        fontColor: hslVar("--foreground"),
                        strokeStyle: "transparent",
                        hidden: false,
                        index: i,
                      };
                    }
                  );
                },
              },
            },
            tooltip: {
              backgroundColor: tooltipColors.backgroundColor(),
              borderColor: tooltipColors.borderColor(),
              borderWidth: tooltipColors.borderWidth,
              titleColor: tooltipColors.titleColor(),
              bodyColor: tooltipColors.bodyColor(),
              padding: tooltipColors.padding,
              cornerRadius: tooltipColors.cornerRadius,
              callbacks: {
                label: (context: any) => {
                  const total = (context.dataset.data as number[]).reduce(
                    (sum: number, val) => sum + (val as number),
                    0
                  );
                  const percentage =
                    total > 0
                      ? ((context.parsed / total) * 100).toFixed(1)
                      : "0.0";
                  return `${percentage}% (${context.parsed} modelos)`;
                },
              },
            },
          },
        }}
      />
    )}
  </div>
</CardContent>

            </Card>
          </div>

          {/* Sección: Top Modelos */}
          <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
            <Card className="border-border/50 shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="space-y-1 pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Top 5 Modelos Más Caros
                </CardTitle>
                <CardDescription>
                  Vehículos de mayor valor en el inventario
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="h-[220px] sm:h-[260px]">
                  {mounted && (
                    <Bar
                      key={`bar-expensive-${chartKey}`}
                      data={{
                        labels: (
                          analytics.chart_data?.top_5_expensive || []
                        ).map((d) => d.name),
                        datasets: [
                          createMultiColorBarDataset(
                            (analytics.chart_data?.top_5_expensive || []).map(
                              (d) => d.price
                            ),
                            "Precio"
                          ),
                        ],
                      }}
                      options={{
                        indexAxis: "y",
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { display: false },
                          tooltip: {
                            backgroundColor: tooltipColors.backgroundColor(),
                            borderColor: tooltipColors.borderColor(),
                            borderWidth: tooltipColors.borderWidth,
                            titleColor: tooltipColors.titleColor(),
                            bodyColor: tooltipColors.bodyColor(),
                            padding: tooltipColors.padding,
                            cornerRadius: tooltipColors.cornerRadius,
                            callbacks: {
                              label: (context) => formatPrice(context.parsed.x),
                            },
                          },
                        },
                        scales: {
                          x: {
                            ...getScaleOptions(),
                            ticks: {
                              ...getScaleOptions().ticks,
                              callback: (value) =>
                                `$${((value as number) / 1000).toFixed(0)}k`,
                            },
                          },
                          y: {
                            grid: { display: false },
                            ticks: {
                              color: hslVar("--foreground"),
                              font: { size: 11 },
                            },
                          },
                        },
                      }}
                    />
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50 shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="space-y-1 pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-primary" />
                  Top 5 Modelos Más Económicos
                </CardTitle>
                <CardDescription>
                  Vehículos de menor valor disponibles
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="h-[220px] sm:h-[260px]">
                  {mounted && (
                    <Bar
                      key={`bar-cheap-${chartKey}`}
                      data={{
                        labels: (
                          analytics.chart_data?.bottom_5_cheap || []
                        ).map((d) => d.name),
                        datasets: [
                          createMultiColorBarDataset(
                            (analytics.chart_data?.bottom_5_cheap || []).map(
                              (d) => d.price
                            ),
                            "Precio"
                          ),
                        ],
                      }}
                      options={{
                        indexAxis: "y",
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { display: false },
                          tooltip: {
                            backgroundColor: tooltipColors.backgroundColor(),
                            borderColor: tooltipColors.borderColor(),
                            borderWidth: tooltipColors.borderWidth,
                            titleColor: tooltipColors.titleColor(),
                            bodyColor: tooltipColors.bodyColor(),
                            padding: tooltipColors.padding,
                            cornerRadius: tooltipColors.cornerRadius,
                            callbacks: {
                              label: (context) => formatPrice(context.parsed.x),
                            },
                          },
                        },
                        scales: {
                          x: {
                            ...getScaleOptions(),
                            ticks: {
                              ...getScaleOptions().ticks,
                              callback: (value) =>
                                `$${((value as number) / 1000).toFixed(0)}k`,
                            },
                          },
                          y: {
                            grid: { display: false },
                            ticks: {
                              color: hslVar("--foreground"),
                              font: { size: 11 },
                            },
                          },
                        },
                      }}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sección: Precio vs Modelo Principal (Bubble Chart Grande) */}
          <Card className="border-border/50 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Precio vs Modelo Principal
              </CardTitle>
              <CardDescription>
                Tamaño proporcional al volumen de variantes
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="h-[450px]">
                {mounted && (
                  <Bubble
                    key={`bubble-principal-${chartKey}`}
                    data={{
                      datasets: [
                        {
                          label: "Modelo Principal",
                          data: (
                            analytics.chart_data?.models_by_principal || []
                          ).map((item, index) => ({
                            x: index + 1,
                            y: item.avg_price,
                            r: Math.sqrt(item.count) * 3,
                          })),
                          backgroundColor: bubbleChartColors.primary(),
                          borderColor: bubbleChartColors.primary(),
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { display: false },
                        tooltip: {
                          backgroundColor: tooltipColors.backgroundColor(),
                          borderColor: tooltipColors.borderColor(),
                          borderWidth: tooltipColors.borderWidth,
                          titleColor: tooltipColors.titleColor(),
                          bodyColor: tooltipColors.bodyColor(),
                          padding: tooltipColors.padding,
                          cornerRadius: tooltipColors.cornerRadius,
                          callbacks: {
                            label: (context) => {
                              const item = (analytics.chart_data
                                ?.models_by_principal || [])[
                                context.dataIndex
                              ];
                              return [
                                `Modelo: ${item.model_principal}`,
                                `Precio Promedio: ${formatPrice(
                                  item.avg_price
                                )}`,
                                `Volumen: ${item.count} variantes`,
                                `Rango: ${formatPrice(
                                  item.min_price
                                )} - ${formatPrice(item.max_price)}`,
                              ];
                            },
                          },
                        },
                      },
                      scales: {
                        x: {
                          ...getScaleOptions(),
                          title: {
                            display: true,
                            text: "Modelo",
                            color: axisColors.tickColor(),
                          },
                        },
                        y: {
                          ...getScaleOptions(),
                          ticks: {
                            color: axisColors.tickColor(),
                            font: { size: axisColors.tickFontSize },
                            callback: (value) =>
                              `$${((value as number) / 1000).toFixed(0)}k`,
                          },
                          title: {
                            display: true,
                            text: "Precio Promedio",
                            color: axisColors.tickColor(),
                          },
                        },
                      },
                    }}
                  />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Sección: Análisis de Precios y Análisis por Marca */}
          <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
            {/* Precios por Categoría - Boxplot Pequeño */}
            <Card className="border-border/50 shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="space-y-1 pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Precios por Categoría
                </CardTitle>
                <CardDescription>
                  Mediana y dispersión de precios por tipo
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="h-[280px]">
                  {mounted && (
                    <Bar
                      key={`boxplot-price-category-${chartKey}`}
                      data={{
                        labels: (
                          analytics.chart_data?.prices_by_category || []
                        ).map((d) => d.category),
                        datasets: [
                          {
                            label: "Mínimo",
                            data: (
                              analytics.chart_data?.prices_by_category || []
                            ).map((d) => d.min_price),
                            backgroundColor: hslVar("--chart-4", 0.7),
                            borderColor: hslVar("--chart-4"),
                            borderWidth: 1,
                          },
                          {
                            label: "Promedio",
                            data: (
                              analytics.chart_data?.prices_by_category || []
                            ).map((d) => d.avg_price),
                            backgroundColor: hslVar("--chart-1", 0.7),
                            borderColor: hslVar("--chart-1"),
                            borderWidth: 1,
                          },
                          {
                            label: "Máximo",
                            data: (
                              analytics.chart_data?.prices_by_category || []
                            ).map((d) => d.max_price),
                            backgroundColor: hslVar("--chart-5", 0.7),
                            borderColor: hslVar("--chart-5"),
                            borderWidth: 1,
                          },
                        ],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: "top",
                            labels: {
                              color: hslVar("--foreground"),
                              padding: 8,
                              font: { size: 10 },
                            },
                          },
                          tooltip: {
                            backgroundColor: tooltipColors.backgroundColor(),
                            borderColor: tooltipColors.borderColor(),
                            borderWidth: tooltipColors.borderWidth,
                            titleColor: tooltipColors.titleColor(),
                            bodyColor: tooltipColors.bodyColor(),
                            padding: tooltipColors.padding,
                            cornerRadius: tooltipColors.cornerRadius,
                            callbacks: {
                              label: (context: any) => {
                                return `${context.dataset.label}: ${formatPrice(
                                  context.parsed.y
                                )}`;
                              },
                            },
                          },
                        },
                        scales: {
                          x: {
                            ...getScaleOptions(),
                            ticks: {
                              ...getScaleOptions().ticks,
                              maxRotation: 45,
                              minRotation: 45,
                              font: { size: 10 },
                            },
                          },
                          y: {
                            ...getScaleOptions(),
                            ticks: {
                              ...getScaleOptions().ticks,
                              callback: (value) =>
                                `$${((value as number) / 1000).toFixed(0)}k`,
                            },
                          },
                        },
                      }}
                    />
                  )}
                </div>
              </CardContent>
            </Card>

          {/* Precios Promedio por Marca */}
            <Card className="border-border/50 shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="space-y-1 pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  Precios Promedio por Marca
                </CardTitle>
                <CardDescription>
                  Comparación de precios entre fabricantes
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="h-[280px]">
                  {mounted && (
                    <Line
                      key={`line-brand-${chartKey}`}
                      data={{
                        labels: (
                          analytics.chart_data?.prices_by_brand || []
                        ).map((d) => d.brand),
                        datasets: [
                          {
                            label: "Precio Promedio",
                            data: (
                              analytics.chart_data?.prices_by_brand || []
                            ).map((d) => d.avg_price),
                            borderColor: hslVar("--chart-2"),
                            backgroundColor: hslVar("--chart-2", 0.1),
                            borderWidth: 2,
                            pointRadius: 4,
                            pointHoverRadius: 6,
                            pointBackgroundColor: hslVar("--chart-2"),
                            pointBorderColor: hslVar("--card"),
                            pointBorderWidth: 2,
                            tension: 0.3,
                            fill: false,
                          },
                        ],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { display: false },
                          tooltip: {
                            backgroundColor: tooltipColors.backgroundColor(),
                            borderColor: tooltipColors.borderColor(),
                            borderWidth: tooltipColors.borderWidth,
                            titleColor: tooltipColors.titleColor(),
                            bodyColor: tooltipColors.bodyColor(),
                            padding: tooltipColors.padding,
                            cornerRadius: tooltipColors.cornerRadius,
                            callbacks: {
                              label: (context) => formatPrice(context.parsed.y),
                            },
                          },
                        },
                        scales: {
                          x: {
                            ...getScaleOptions(),
                            ticks: {
                              ...getScaleOptions().ticks,
                              maxRotation: 45,
                              minRotation: 45,
                            },
                          },
                          y: {
                            ...getScaleOptions(),
                            ticks: {
                              ...getScaleOptions().ticks,
                              callback: (value) =>
                                `$${((value as number) / 1000).toFixed(0)}k`,
                            },
                          },
                        },
                      }}
                    />
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50 shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="space-y-1 pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  Variación de Precios por Marca
                </CardTitle>
                <CardDescription>
                  Cambios entre periodos de scraping
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="h-[280px]">
                  {mounted && (
                    <Line
                      key={`area-variation-${chartKey}`}
                      data={{
                        labels: (
                          analytics.chart_data?.brand_variations || []
                        ).map((d) => d.brand),
                        datasets: [
                          {
                            label: "Variación %",
                            data: (
                              analytics.chart_data?.brand_variations || []
                            ).map((d) => d.variation_percent),
                            borderColor: hslVar("--chart-3"),
                            backgroundColor: hslVar("--chart-3", 0.3),
                            borderWidth: 2,
                            pointRadius: 4,
                            pointHoverRadius: 6,
                            pointBackgroundColor: hslVar("--chart-3"),
                            pointBorderColor: hslVar("--card"),
                            pointBorderWidth: 2,
                            tension: 0.3,
                            fill: true,
                          },
                        ],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { display: false },
                          tooltip: {
                            backgroundColor: tooltipColors.backgroundColor(),
                            borderColor: tooltipColors.borderColor(),
                            borderWidth: tooltipColors.borderWidth,
                            titleColor: tooltipColors.titleColor(),
                            bodyColor: tooltipColors.bodyColor(),
                            padding: tooltipColors.padding,
                            cornerRadius: tooltipColors.cornerRadius,
                            callbacks: {
                              label: (context) =>
                                `${context.parsed.y.toFixed(2)}%`,
                            },
                          },
                        },
                        scales: {
                          x: {
                            ...getScaleOptions(),
                            ticks: {
                              ...getScaleOptions().ticks,
                              maxRotation: 45,
                              minRotation: 45,
                            },
                          },
                          y: {
                            ...getScaleOptions(),
                            ticks: {
                              ...getScaleOptions().ticks,
                              callback: (value) => `${value}%`,
                            },
                          },
                        },
                      }}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sección: Modelos con Mayor Volatilidad */}
          <Card className="border-border/50 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Modelos con Mayor Volatilidad
              </CardTitle>
              <CardDescription>
                Detección de cambios intermensual de precios
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="h-[320px]">
                {mounted && (
                  <Bar
                    key={`bar-volatility-${chartKey}`}
                    data={{
                      labels: (
                        analytics.chart_data?.monthly_volatility
                          ?.most_volatile || []
                      ).map((d) => d.model),
                      datasets: [
                        createMultiColorBarDataset(
                          (
                            analytics.chart_data?.monthly_volatility
                              ?.most_volatile || []
                          ).map((d) => d.avg_monthly_variation),
                          "Volatilidad %"
                        ),
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { display: false },
                        tooltip: {
                          backgroundColor: tooltipColors.backgroundColor(),
                          borderColor: tooltipColors.borderColor(),
                          borderWidth: tooltipColors.borderWidth,
                          titleColor: tooltipColors.titleColor(),
                          bodyColor: tooltipColors.bodyColor(),
                          padding: tooltipColors.padding,
                          cornerRadius: tooltipColors.cornerRadius,
                          callbacks: {
                            label: (context) =>
                              `${context.parsed.y.toFixed(2)}%`,
                          },
                        },
                      },
                      scales: {
                        x: {
                          ...getScaleOptions(),
                          ticks: {
                            ...getScaleOptions().ticks,
                            maxRotation: 45,
                            minRotation: 45,
                          },
                        },
                        y: {
                          ...getScaleOptions(),
                          ticks: {
                            ...getScaleOptions().ticks,
                            callback: (value) => `${value}%`,
                          },
                        },
                      },
                    }}
                  />
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="modelos" className="space-y-6">
          <ModelsTable filters={filters} statusFilter="active" />

          <Card className="border-border/50 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                Modelos Inactivos
              </CardTitle>
              <CardDescription>
                Vehículos descontinuados o fuera de stock
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <ModelsTable filters={filters} statusFilter="inactive" />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
