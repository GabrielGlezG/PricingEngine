import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
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
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  Legend,
  ZAxis,
  ComposedChart,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useState } from "react";
import { usePriceDistribution } from "@/hooks/usePriceDistribution";

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

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--chart-6))",
  "hsl(var(--chart-7))",
  "hsl(var(--chart-8))",
  "hsl(var(--chart-9))",
  "hsl(var(--chart-10))",
  "hsl(var(--chart-11))",
  "hsl(var(--chart-12))",
];

export default function Dashboard() {
  const { formatPrice } = useCurrency();
  const [filters, setFilters] = useState({
    brand: "",
    model: "",
    submodel: "",
  });
  const [refreshTick, setRefreshTick] = useState(0);

  // Debug de autenticación
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
    staleTime: 0, // Force refetch to get updated dynamic price ranges
    refetchOnMount: true,
  });

  // Log query errors
  if (queryError) {
    console.error("Query error:", queryError);
  }

  // Local, accurate price distribution from DB (quartiles)
  const { data: priceDistributionLocal } = usePriceDistribution(filters);

  // Debug: log price distribution and timestamp when analytics change
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

      // Remove duplicates by model name
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

  // Removed local analytics fallback - now always uses dynamic backend data

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
      {/* Filtros */}
      <Card className="border-border/50 shadow-md">
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <BarChart3 className="h-4 md:h-5 w-4 md:w-5 text-primary" />
            Filtros
          </CardTitle>
          <CardDescription className="text-xs md:text-sm">
            Refina tu análisis con criterios específicos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
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

      {/* Métricas principales - Diseño inspirado en referencia */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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

      {/* Tabs con visualizaciones organizadas */}
      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 h-auto bg-card border border-border">
          <TabsTrigger
            value="general"
            className="text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            Visión General
          </TabsTrigger>
          <TabsTrigger
            value="precios"
            className="text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            Análisis de Precios
          </TabsTrigger>
          <TabsTrigger
            value="marcas"
            className="text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            Por Marca
          </TabsTrigger>
        </TabsList>

        {/* Tab: Visión General */}
        <TabsContent value="general" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
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
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart
                    data={analytics.chart_data?.models_by_category || []}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(var(--border))"
                      opacity={0.2}
                    />
                    <XAxis
                      dataKey="category"
                      tick={{
                        fontSize: 11,
                        fill: "hsl(var(--muted-foreground))",
                      }}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <YAxis
                      tick={{
                        fontSize: 11,
                        fill: "hsl(var(--muted-foreground))",
                      }}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <Tooltip
                      cursor={false}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        color: "hsl(var(--foreground))",
                      }}
                      labelStyle={{
                        color: "hsl(var(--foreground))",
                        fontWeight: 600,
                      }}
                      itemStyle={{ color: "hsl(var(--foreground))" }}
                    />
                    <Bar
                      dataKey="count"
                      fill="hsl(var(--primary))"
                      name="Cantidad"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
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
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={
                        priceDistributionLocal ||
                        analytics.chart_data?.price_distribution ||
                        []
                      }
                      dataKey="count"
                      nameKey="range"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={(entry) => {
                        const data =
                          priceDistributionLocal ||
                          analytics.chart_data?.price_distribution ||
                          [];
                        const total = data.reduce(
                          (sum, item) => sum + item.count,
                          0
                        );
                        const percentage = (
                          (entry.count / total) *
                          100
                        ).toFixed(1);
                        return `${percentage}%`;
                      }}
                      labelLine={true}
                    >
                      {(
                        priceDistributionLocal ||
                        analytics.chart_data?.price_distribution ||
                        []
                      ).map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        color: "hsl(var(--foreground))",
                      }}
                      labelStyle={{
                        color: "hsl(var(--foreground))",
                        fontWeight: 600,
                      }}
                      itemStyle={{ color: "hsl(var(--foreground))" }}
                      formatter={(value: number, name: string, props: any) => {
                        const data =
                          priceDistributionLocal ||
                          analytics.chart_data?.price_distribution ||
                          [];
                        const total = data.reduce(
                          (sum, item) => sum + item.count,
                          0
                        );
                        const percentage = ((value / total) * 100).toFixed(1);

                        const range = props.payload.range;
                        const priceMatch = range.match(/\$[\d,.]+[MK]?/gi);

                        if (priceMatch && priceMatch.length >= 2) {
                          const parsePrice = (priceStr: string): number => {
                            const cleanStr = priceStr
                              .replace("$", "")
                              .replace(/,/g, "");
                            if (cleanStr.toUpperCase().includes("M")) {
                              return (
                                parseFloat(cleanStr.replace(/M/gi, "")) *
                                1000000
                              );
                            } else if (cleanStr.toUpperCase().includes("K")) {
                              return (
                                parseFloat(cleanStr.replace(/K/gi, "")) * 1000
                              );
                            }
                            return parseFloat(cleanStr);
                          };

                          const minPrice = parsePrice(priceMatch[0]);
                          const maxPrice = parsePrice(priceMatch[1]);

                          return [
                            `${percentage}%`,
                            `${formatPrice(minPrice)} - ${formatPrice(
                              maxPrice
                            )}`,
                          ];
                        }

                        const priceRange = range.split(":")[0].trim();
                        return [`${percentage}%`, priceRange];
                      }}
                    />
                    <Legend
                      formatter={(value, entry: any) => {
                        const data =
                          priceDistributionLocal ||
                          analytics.chart_data?.price_distribution ||
                          [];
                        const total = data.reduce(
                          (sum, item) => sum + item.count,
                          0
                        );
                        const percentage = (
                          (entry.payload.count / total) *
                          100
                        ).toFixed(1);

                        const range = entry.payload.range;
                        const priceMatch = range.match(/\$[\d,.]+[MK]?/gi);

                        if (priceMatch && priceMatch.length >= 2) {
                          const parsePrice = (priceStr: string): number => {
                            const cleanStr = priceStr
                              .replace("$", "")
                              .replace(/,/g, "");
                            if (cleanStr.toUpperCase().includes("M")) {
                              return (
                                parseFloat(cleanStr.replace(/M/gi, "")) *
                                1000000
                              );
                            } else if (cleanStr.toUpperCase().includes("K")) {
                              return (
                                parseFloat(cleanStr.replace(/K/gi, "")) * 1000
                              );
                            }
                            return parseFloat(cleanStr);
                          };

                          const minPrice = parsePrice(priceMatch[0]);
                          const maxPrice = parsePrice(priceMatch[1]);

                          return `${formatPrice(minPrice)} a ${formatPrice(
                            maxPrice
                          )})`;
                        }

                        const priceRange = range.split(":")[0].trim();
                        return `${priceRange}`;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
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
              <ResponsiveContainer width="100%" height={400}>
                <ScatterChart
                  margin={{ top: 20, right: 20, bottom: 80, left: 60 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                    opacity={0.2}
                  />
                  <XAxis
                    type="number"
                    dataKey="index"
                    name="Modelo"
                    tick={{
                      fontSize: 11,
                      fill: "hsl(var(--muted-foreground))",
                    }}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <YAxis
                    type="number"
                    dataKey="avg_price"
                    name="Precio Promedio"
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                    tick={{
                      fontSize: 11,
                      fill: "hsl(var(--muted-foreground))",
                    }}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <ZAxis
                    type="number"
                    dataKey="count"
                    range={[100, 1000]}
                    name="Volumen"
                  />
                  <Tooltip
                    cursor={{ strokeDasharray: "3 3" }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div
                            style={{
                              backgroundColor: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "8px",
                              padding: "12px",
                              color: "hsl(var(--foreground))",
                            }}
                          >
                            <p style={{ fontWeight: 600, marginBottom: "8px" }}>
                              {data.model_principal}
                            </p>
                            <p style={{ fontSize: "13px" }}>
                              Precio Promedio: {formatPrice(data.avg_price)}
                            </p>
                            <p style={{ fontSize: "13px" }}>
                              Volumen: {data.count} variantes
                            </p>
                            <p style={{ fontSize: "13px" }}>
                              Rango: {formatPrice(data.min_price)} -{" "}
                              {formatPrice(data.max_price)}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Scatter
                    name="Modelo Principal"
                    data={(analytics.chart_data?.models_by_principal || []).map(
                      (item, index) => ({ ...item, index: index + 1 })
                    )}
                    fill="hsl(var(--primary))"
                    opacity={0.7}
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Análisis de Precios */}
        <TabsContent value="precios" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
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
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart
                    data={analytics.chart_data?.top_5_expensive || []}
                    layout="vertical"
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(var(--border))"
                      opacity={0.2}
                    />
                    <XAxis
                      type="number"
                      tickFormatter={(value) =>
                        `$${(value / 1000).toFixed(0)}k`
                      }
                      tick={{
                        fontSize: 11,
                        fill: "hsl(var(--muted-foreground))",
                      }}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={150}
                      tick={{
                        fontSize: 11,
                        fill: "hsl(var(--muted-foreground))",
                      }}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <Tooltip
                      cursor={false}
                      formatter={(value: number) => formatPrice(value)}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        color: "hsl(var(--foreground))",
                      }}
                      labelStyle={{
                        color: "hsl(var(--foreground))",
                        fontWeight: 600,
                      }}
                      itemStyle={{ color: "hsl(var(--foreground))" }}
                    />
                    <Bar
                      dataKey="price"
                      fill="hsl(var(--chart-5))"
                      name="Precio"
                      radius={[0, 6, 6, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
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
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart
                    data={analytics.chart_data?.bottom_5_cheap || []}
                    layout="vertical"
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(var(--border))"
                      opacity={0.2}
                    />
                    <XAxis
                      type="number"
                      tickFormatter={(value) =>
                        `$${(value / 1000).toFixed(0)}k`
                      }
                      tick={{
                        fontSize: 11,
                        fill: "hsl(var(--muted-foreground))",
                      }}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={150}
                      tick={{
                        fontSize: 11,
                        fill: "hsl(var(--muted-foreground))",
                      }}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <Tooltip
                      cursor={false}
                      formatter={(value: number) => formatPrice(value)}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        color: "hsl(var(--foreground))",
                      }}
                      labelStyle={{
                        color: "hsl(var(--foreground))",
                        fontWeight: 600,
                      }}
                      itemStyle={{ color: "hsl(var(--foreground))" }}
                    />
                    <Bar
                      dataKey="price"
                      fill="hsl(var(--chart-2))"
                      name="Precio"
                      radius={[0, 6, 6, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
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
              <ResponsiveContainer width="100%" height={320}>
                <ComposedChart
                  data={analytics.chart_data?.prices_by_category || []}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                    opacity={0.2}
                  />
                  <XAxis
                    dataKey="category"
                    tick={{
                      fontSize: 11,
                      fill: "hsl(var(--muted-foreground))",
                    }}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <YAxis
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                    tick={{
                      fontSize: 11,
                      fill: "hsl(var(--muted-foreground))",
                    }}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <Tooltip
                    formatter={(value: number) => formatPrice(value)}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--foreground))",
                    }}
                    labelStyle={{
                      color: "hsl(var(--foreground))",
                      fontWeight: 600,
                    }}
                    itemStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  <Legend />
                  <Bar
                    dataKey="min_price"
                    fill="hsl(var(--chart-6))"
                    name="Mínimo"
                    radius={[6, 6, 0, 0]}
                  />
                  <Bar
                    dataKey="avg_price"
                    fill="hsl(var(--primary))"
                    name="Promedio"
                    radius={[6, 6, 0, 0]}
                  />
                  <Bar
                    dataKey="max_price"
                    fill="hsl(var(--chart-5))"
                    name="Máximo"
                    radius={[6, 6, 0, 0]}
                  />
                  <Line
                    type="monotone"
                    dataKey="avg_price"
                    name="avg_precio"
                    stroke="hsl(var(--chart-3))"
                    strokeWidth={2}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Por Marca */}
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
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={analytics.chart_data?.prices_by_brand || []}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                    opacity={0.2}
                  />
                  <XAxis
                    dataKey="brand"
                    angle={-45}
                    textAnchor="end"
                    height={100}
                    tick={{
                      fontSize: 11,
                      fill: "hsl(var(--muted-foreground))",
                    }}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <YAxis
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                    tick={{
                      fontSize: 11,
                      fill: "hsl(var(--muted-foreground))",
                    }}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <Tooltip
                    cursor={false}
                    formatter={(value: number) => formatPrice(value)}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--foreground))",
                    }}
                    labelStyle={{
                      color: "hsl(var(--foreground))",
                      fontWeight: 600,
                    }}
                    itemStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  <Bar
                    dataKey="avg_price"
                    name="Precio Promedio"
                    radius={[6, 6, 0, 0]}
                    fill="hsl(var(--primary))"
                  />
                </BarChart>
              </ResponsiveContainer>
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
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.chart_data?.brand_variations || []}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                    opacity={0.2}
                  />
                  <XAxis
                    dataKey="brand"
                    angle={-45}
                    textAnchor="end"
                    height={100}
                    tick={{
                      fontSize: 11,
                      fill: "hsl(var(--muted-foreground))",
                    }}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <YAxis
                    tickFormatter={(value) => `${value}%`}
                    tick={{
                      fontSize: 11,
                      fill: "hsl(var(--muted-foreground))",
                    }}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <Tooltip
                    cursor={false}
                    formatter={(value: number) => `${value.toFixed(2)}%`}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--foreground))",
                    }}
                    labelStyle={{
                      color: "hsl(var(--foreground))",
                      fontWeight: 600,
                    }}
                    itemStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  <Bar
                    dataKey="variation_percent"
                    fill="hsl(var(--chart-6))"
                    name="Variación %"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
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
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={
                    analytics.chart_data?.monthly_volatility?.most_volatile ||
                    []
                  }
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                    opacity={0.2}
                  />
                  <XAxis
                    dataKey="model"
                    angle={-45}
                    textAnchor="end"
                    height={120}
                    tick={{
                      fontSize: 11,
                      fill: "hsl(var(--muted-foreground))",
                    }}
                    interval={0}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <YAxis
                    tickFormatter={(value) => `${value}%`}
                    tick={{
                      fontSize: 11,
                      fill: "hsl(var(--muted-foreground))",
                    }}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <Tooltip
                    cursor={false}
                    formatter={(value: number) => `${value.toFixed(2)}%`}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--foreground))",
                    }}
                    labelStyle={{
                      color: "hsl(var(--foreground))",
                      fontWeight: 600,
                    }}
                    itemStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  <Bar
                    dataKey="avg_monthly_variation"
                    fill="hsl(var(--chart-7))"
                    name="Volatilidad %"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
