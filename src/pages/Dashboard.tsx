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
import { Bar, Line, Pie, Bubble } from "react-chartjs-2";
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
import { useState, useEffect } from "react";
import { usePriceDistribution } from "@/hooks/usePriceDistribution";
import { CurrencySelector } from "@/components/CurrencySelector";
import { hslVar, chartPalette } from "@/lib/utils";

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

// Ensure all default text (legend, labels) is white on dark backgrounds
ChartJS.defaults.color = "#FFFFFF";

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

const COLORS = chartPalette(12);

export default function Dashboard() {
  const { formatPrice } = useCurrency();
  const { setLastUpdate } = useLastUpdate();
  const [filters, setFilters] = useState({
    brand: "",
    model: "",
    submodel: "",
  });
  const [refreshTick, setRefreshTick] = useState(0);

  const { user, profile, isAdmin, hasActiveSubscription } = useAuth();
  console.log("Dashboard Auth Debug:", {
    user: !!user,
    profile: !!profile,
    isAdmin,
    hasActiveSubscription,
    profileData: profile,
  });

  const {
    data: analytics,
    isLoading,
    refetch,
    isRefetching,
    error: queryError,
  } = useQuery({
    queryKey: ["analytics", filters, refreshTick],
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
    staleTime: 0,
    refetchOnMount: true,
  });

  if (queryError) {
    console.error("Query error:", queryError);
  }

  // Update last update date when analytics data changes
  useEffect(() => {
    const fetchLastUploadDate = async () => {
      const { data, error } = await supabase
        .from("scraping_jobs")
        .select("completed_at")
        .eq("status", "completed")
        .order("completed_at", { ascending: false })
        .limit(1)
        .single();

      if (!error && data?.completed_at) {
        setLastUpdate(data.completed_at);
      }
    };

    fetchLastUploadDate();
  }, [setLastUpdate]);

  const { data: priceDistributionLocal } = usePriceDistribution(filters);

  if (analytics) {
    console.log("Analytics generated_at:", analytics.generated_at);
    console.log(
      "Price distribution (server):",
      analytics.chart_data?.price_distribution
    );
  }
  if (priceDistributionLocal) {
    console.log("Price distribution (local DB):", priceDistributionLocal);
  }

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
      <div className="flex justify-center">
        <CurrencySelector />
      </div>

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
              onClick={() => {
                setRefreshTick((t) => t + 1);
                refetch();
              }}
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
        <Card className="bg-primary border-none shadow-md rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary-foreground">
              Total Modelos
            </CardTitle>
            <Package className="h-4 w-4 text-primary-foreground/70" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary-foreground">
              {analytics.metrics.total_models}
            </div>
            <p className="text-xs text-primary-foreground/70 mt-1">
              {analytics.metrics.total_brands} marcas activas
            </p>
          </CardContent>
        </Card>

        <Card className="bg-primary border-none shadow-md rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary-foreground">
              Precio Promedio
            </CardTitle>
            <DollarSign className="h-4 w-4 text-primary-foreground/70" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary-foreground">
              {formatPrice(analytics.metrics.avg_price)}
            </div>
            <p className="text-xs text-primary-foreground/70 mt-1">
              Variación: {analytics.metrics.variation_coefficient.toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card className="bg-primary border-none shadow-md rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary-foreground">
              Precio Mínimo
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-primary-foreground/70" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary-foreground">
              {formatPrice(analytics.metrics.min_price)}
            </div>
            <p className="text-xs text-primary-foreground/70 mt-1">
              Valor más accesible
            </p>
          </CardContent>
        </Card>

        <Card className="bg-primary border-none shadow-md rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary-foreground">
              Precio Máximo
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-primary-foreground/70" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary-foreground">
              {formatPrice(analytics.metrics.max_price)}
            </div>
            <p className="text-xs text-primary-foreground/70 mt-1">
              Valor premium
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 h-auto bg-card border border-border">
          <TabsTrigger
            value="general"
            className="text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-2 sm:py-2.5"
          >
            <span className="hidden sm:inline">Visión General</span>
            <span className="sm:hidden">General</span>
          </TabsTrigger>
          <TabsTrigger
            value="precios"
            className="text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-2 sm:py-2.5"
          >
            <span className="hidden sm:inline">Análisis de Precios</span>
            <span className="sm:hidden">Precios</span>
          </TabsTrigger>
          <TabsTrigger
            value="marcas"
            className="text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-2 sm:py-2.5"
          >
            <span className="hidden sm:inline">Por Marca</span>
            <span className="sm:hidden">Marcas</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
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
                  <Bar
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
                          backgroundColor: hslVar("--primary"),
                          borderRadius: 6,
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { display: false },
                        tooltip: {
                          backgroundColor: hslVar("--card"),
                          borderColor: hslVar("--border"),
                          borderWidth: 1,
                          titleColor: hslVar("--foreground"),
                          bodyColor: hslVar("--foreground"),
                          padding: 12,
                          cornerRadius: 8,
                        },
                      },
                      scales: {
                        x: {
                          grid: { color: hslVar("--border"), lineWidth: 0.5 },
                          ticks: {
                            color: hslVar("--foreground"),
                            font: { size: 11 },
                          },
                        },
                        y: {
                          grid: { color: hslVar("--border"), lineWidth: 0.5 },
                          ticks: {
                            color: hslVar("--foreground"),
                            font: { size: 11 },
                          },
                        },
                      },
                    }}
                  />
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
                  <Pie
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
                          backgroundColor: COLORS,
                          borderWidth: 2,
                          borderColor: hslVar("--card"),
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: "bottom",
                          labels: {
                            color: "#FFFFFF",
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
                                  const value =
                                    (dataset.data as number[])[i] || 0;
                                  const percentage =
                                    totals > 0
                                      ? ((value / totals) * 100).toFixed(1)
                                      : "0.0";

                                  const priceMatch =
                                    label.match(/\$[\d.,]+[MK]?/gi);
                                  let formattedLabel = label;

                                  if (priceMatch && priceMatch.length >= 2) {
                                    const parsePrice = (
                                      priceStr: string
                                    ): number => {
                                      const clean = priceStr
                                        .replace(/\$/g, "")
                                        .replace(/,/g, "");
                                      if (/M/i.test(clean))
                                        return (
                                          parseFloat(clean.replace(/M/gi, "")) *
                                          1_000_000
                                        );
                                      if (/K/i.test(clean))
                                        return (
                                          parseFloat(clean.replace(/K/gi, "")) *
                                          1_000
                                        );
                                      return parseFloat(clean);
                                    };

                                    const min = parsePrice(priceMatch[0]);
                                    const max = parsePrice(priceMatch[1]);
                                    formattedLabel = `${formatPrice(
                                      min
                                    )} - ${formatPrice(max)}`;
                                  } else {
                                    const onlyNumbers = (
                                      label.match(/[\d,.MK]+/gi) || []
                                    ).join(" - ");
                                    if (onlyNumbers)
                                      formattedLabel = onlyNumbers;
                                  }

                                  return {
                                    text: `${formattedLabel} (${percentage}%)`,
                                    fillStyle: COLORS[i % COLORS.length],
                                    fontColor: "#FFFFFF", // <- forzar blanco
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
                          backgroundColor: "hsl(var(--card))",
                          borderColor: "hsl(var(--border))",
                          borderWidth: 1,
                          titleColor: "#FFFFFF", // <- blanco también
                          bodyColor: "#FFFFFF", // <- texto blanco
                          padding: 12,
                          cornerRadius: 8,
                          callbacks: {
                            label: (context: any) => {
                              const total = (
                                context.dataset.data as number[]
                              ).reduce(
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
                </div>
              </CardContent>
            </Card>
          </div>

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
              <div className="h-[400px]">
                <Bubble
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
                        backgroundColor: hslVar("--primary"),
                        borderColor: hslVar("--primary"),
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        backgroundColor: hslVar("--card"),
                        borderColor: hslVar("--border"),
                        borderWidth: 1,
                        titleColor: hslVar("--foreground"),
                        bodyColor: hslVar("--foreground"),
                        padding: 12,
                        cornerRadius: 8,
                        callbacks: {
                          label: (context) => {
                            const item = (analytics.chart_data
                              ?.models_by_principal || [])[context.dataIndex];
                            return [
                              `Modelo: ${item.model_principal}`,
                              `Precio Promedio: ${formatPrice(item.avg_price)}`,
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
                        grid: { color: hslVar("--border"), lineWidth: 0.5 },
                        ticks: {
                          color: hslVar("--foreground"),
                          font: { size: 11 },
                        },
                        title: {
                          display: true,
                          text: "Modelo",
                          color: hslVar("--foreground"),
                        },
                      },
                      y: {
                        grid: { color: hslVar("--border"), lineWidth: 0.5 },
                        ticks: {
                          color: hslVar("--foreground"),
                          font: { size: 11 },
                          callback: (value) =>
                            `$${((value as number) / 1000).toFixed(0)}k`,
                        },
                        title: {
                          display: true,
                          text: "Precio Promedio",
                          color: hslVar("--foreground"),
                        },
                      },
                    },
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="precios" className="space-y-6">
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
                  <Bar
                    data={{
                      labels: (analytics.chart_data?.top_5_expensive || []).map(
                        (d) => d.name
                      ),
                      datasets: [
                        {
                          label: "Precio",
                          data: (
                            analytics.chart_data?.top_5_expensive || []
                          ).map((d) => d.price),
                          backgroundColor: hslVar("--chart-5"),
                          borderRadius: 6,
                        },
                      ],
                    }}
                    options={{
                      indexAxis: "y",
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { display: false },
                        tooltip: {
                          backgroundColor: hslVar("--card"),
                          borderColor: hslVar("--border"),
                          borderWidth: 1,
                          titleColor: hslVar("--foreground"),
                          bodyColor: hslVar("--foreground"),
                          padding: 12,
                          cornerRadius: 8,
                          callbacks: {
                            label: (context) => formatPrice(context.parsed.x),
                          },
                        },
                      },
                      scales: {
                        x: {
                          grid: { color: hslVar("--border"), lineWidth: 0.5 },
                          ticks: {
                            color: hslVar("--foreground"),
                            font: { size: 11 },
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
                  <Bar
                    data={{
                      labels: (analytics.chart_data?.bottom_5_cheap || []).map(
                        (d) => d.name
                      ),
                      datasets: [
                        {
                          label: "Precio",
                          data: (
                            analytics.chart_data?.bottom_5_cheap || []
                          ).map((d) => d.price),
                          backgroundColor: hslVar("--chart-2"),
                          borderRadius: 6,
                        },
                      ],
                    }}
                    options={{
                      indexAxis: "y",
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { display: false },
                        tooltip: {
                          backgroundColor: hslVar("--card"),
                          borderColor: hslVar("--border"),
                          borderWidth: 1,
                          titleColor: hslVar("--foreground"),
                          bodyColor: hslVar("--foreground"),
                          padding: 12,
                          cornerRadius: 8,
                          callbacks: {
                            label: (context) => formatPrice(context.parsed.x),
                          },
                        },
                      },
                      scales: {
                        x: {
                          grid: { color: hslVar("--border"), lineWidth: 0.5 },
                          ticks: {
                            color: hslVar("--foreground"),
                            font: { size: 11 },
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
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-border/50 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Precios por Categoría
              </CardTitle>
              <CardDescription>
                Comparación de rangos de precio por tipo de vehículo
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="h-[320px]">
                <Bar
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
                        backgroundColor: hslVar("--chart-6"),
                        borderRadius: 6,
                      },
                      {
                        label: "Promedio",
                        data: (
                          analytics.chart_data?.prices_by_category || []
                        ).map((d) => d.avg_price),
                        backgroundColor: hslVar("--primary"),
                        borderRadius: 6,
                      },
                      {
                        label: "Máximo",
                        data: (
                          analytics.chart_data?.prices_by_category || []
                        ).map((d) => d.max_price),
                        backgroundColor: hslVar("--chart-5"),
                        borderRadius: 6,
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
                          padding: 12,
                          font: { size: 11 },
                        },
                      },
                      tooltip: {
                        backgroundColor: hslVar("--card"),
                        borderColor: hslVar("--border"),
                        borderWidth: 1,
                        titleColor: hslVar("--foreground"),
                        bodyColor: hslVar("--foreground"),
                        padding: 12,
                        cornerRadius: 8,
                        callbacks: {
                          label: (context) =>
                            `${context.dataset.label}: ${formatPrice(
                              context.parsed.y
                            )}`,
                        },
                      },
                    },
                    scales: {
                      x: {
                        grid: { color: hslVar("--border"), lineWidth: 0.5 },
                        ticks: {
                          color: hslVar("--foreground"),
                          font: { size: 11 },
                        },
                      },
                      y: {
                        grid: { color: hslVar("--border"), lineWidth: 0.5 },
                        ticks: {
                          color: hslVar("--foreground"),
                          font: { size: 11 },
                          callback: (value) =>
                            `$${((value as number) / 1000).toFixed(0)}k`,
                        },
                      },
                    },
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="marcas" className="space-y-6">
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
              <div className="h-[280px] sm:h-[320px]">
                <Bar
                  data={{
                    labels: (analytics.chart_data?.prices_by_brand || []).map(
                      (d) => d.brand
                    ),
                    datasets: [
                      {
                        label: "Precio Promedio",
                        data: (analytics.chart_data?.prices_by_brand || []).map(
                          (d) => d.avg_price
                        ),
                        backgroundColor: hslVar("--primary"),
                        borderRadius: 6,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        backgroundColor: hslVar("--card"),
                        borderColor: hslVar("--border"),
                        borderWidth: 1,
                        titleColor: hslVar("--foreground"),
                        bodyColor: hslVar("--foreground"),
                        padding: 12,
                        cornerRadius: 8,
                        callbacks: {
                          label: (context) => formatPrice(context.parsed.y),
                        },
                      },
                    },
                    scales: {
                      x: {
                        grid: { color: hslVar("--border"), lineWidth: 0.5 },
                        ticks: {
                          color: hslVar("--foreground"),
                          font: { size: 11 },
                          maxRotation: 45,
                          minRotation: 45,
                        },
                      },
                      y: {
                        grid: { color: hslVar("--border"), lineWidth: 0.5 },
                        ticks: {
                          color: hslVar("--foreground"),
                          font: { size: 11 },
                          callback: (value) =>
                            `$${((value as number) / 1000).toFixed(0)}k`,
                        },
                      },
                    },
                  }}
                />
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
              <div className="h-[260px] sm:h-[300px]">
                <Bar
                  data={{
                    labels: (analytics.chart_data?.brand_variations || []).map(
                      (d) => d.brand
                    ),
                    datasets: [
                      {
                        label: "Variación %",
                        data: (
                          analytics.chart_data?.brand_variations || []
                        ).map((d) => d.variation_percent),
                        backgroundColor: hslVar("--chart-6"),
                        borderRadius: 6,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        backgroundColor: hslVar("--card"),
                        borderColor: hslVar("--border"),
                        borderWidth: 1,
                        titleColor: hslVar("--foreground"),
                        bodyColor: hslVar("--foreground"),
                        padding: 12,
                        cornerRadius: 8,
                        callbacks: {
                          label: (context) => `${context.parsed.y.toFixed(2)}%`,
                        },
                      },
                    },
                    scales: {
                      x: {
                        grid: { color: hslVar("--border"), lineWidth: 0.5 },
                        ticks: {
                          color: hslVar("--foreground"),
                          font: { size: 11 },
                          maxRotation: 45,
                          minRotation: 45,
                        },
                      },
                      y: {
                        grid: { color: hslVar("--border"), lineWidth: 0.5 },
                        ticks: {
                          color: hslVar("--foreground"),
                          font: { size: 11 },
                          callback: (value) => `${value}%`,
                        },
                      },
                    },
                  }}
                />
              </div>
            </CardContent>
          </Card>

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
              <div className="h-[300px]">
                <Bar
                  data={{
                    labels: (
                      analytics.chart_data?.monthly_volatility?.most_volatile ||
                      []
                    ).map((d) => d.model),
                    datasets: [
                      {
                        label: "Volatilidad %",
                        data: (
                          analytics.chart_data?.monthly_volatility
                            ?.most_volatile || []
                        ).map((d) => d.avg_monthly_variation),
                        backgroundColor: hslVar("--chart-7"),
                        borderRadius: 6,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        backgroundColor: hslVar("--card"),
                        borderColor: hslVar("--border"),
                        borderWidth: 1,
                        titleColor: hslVar("--foreground"),
                        bodyColor: hslVar("--foreground"),
                        padding: 12,
                        cornerRadius: 8,
                        callbacks: {
                          label: (context) => `${context.parsed.y.toFixed(2)}%`,
                        },
                      },
                    },
                    scales: {
                      x: {
                        grid: { color: hslVar("--border"), lineWidth: 0.5 },
                        ticks: {
                          color: hslVar("--foreground"),
                          font: { size: 11 },
                          maxRotation: 45,
                          minRotation: 45,
                        },
                      },
                      y: {
                        grid: { color: hslVar("--border"), lineWidth: 0.5 },
                        ticks: {
                          color: hslVar("--foreground"),
                          font: { size: 11 },
                          callback: (value) => `${value}%`,
                        },
                      },
                    },
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
