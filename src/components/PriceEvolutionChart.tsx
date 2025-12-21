import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useTheme } from "next-themes";
import { hslVar } from "@/lib/utils";
import { lineChartColors, tooltipColors, getScaleOptions } from "@/config/chartColors";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip as ChartTooltip,
  Legend as ChartLegend,
  Filler,
} from "chart.js";
import { TrendingUp, Calendar, RefreshCw } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { useState, useEffect, useMemo } from "react";

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  ChartTooltip,
  ChartLegend,
  Filler
);

// Set default chart colors - will be updated dynamically
ChartJS.defaults.color = "hsl(var(--foreground))";

interface PriceEvolutionProps {
  selectedBrand?: string;
  selectedCategory?: string;
  selectedModel?: string;
  selectedSubmodel?: string;
  brandFilters?: string[];
  modelFilters?: string[];
  submodelFilters?: string[];
  tipoVehiculoFilters?: string[];
}

/* Colors are now computed via useMemo inside component for theme reactivity */

export function PriceEvolutionChart({
  selectedBrand,
  selectedCategory,
  selectedModel,
  selectedSubmodel,
  brandFilters = [],
  modelFilters = [],
  submodelFilters = [],
  tipoVehiculoFilters = [],
}: PriceEvolutionProps) {
  const { formatPrice, currency } = useCurrency();
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const chartColors = useMemo(() => 
    lineChartColors.lines.map(fn => fn())
  , [theme]);
  const [timeRange, setTimeRange] = useState("6months");
  const [groupBy, setGroupBy] = useState<"day" | "week" | "month">("week");

  // Determine if we have any filters active
  const hasFilters = selectedBrand || selectedCategory || selectedModel || 
    brandFilters.length > 0 || modelFilters.length > 0 || submodelFilters.length > 0 || tipoVehiculoFilters.length > 0;

  // Update ChartJS defaults and force remount when theme changes
  useEffect(() => {
    ChartJS.defaults.color = hslVar('--foreground');
    setMounted(false);
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, [theme, currency]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const {
    data: evolutionData,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: [
      "price-evolution",
      selectedBrand,
      selectedCategory,
      selectedModel,
      selectedSubmodel,
      brandFilters,
      modelFilters,
      submodelFilters,
      tipoVehiculoFilters,
      timeRange,
      groupBy,
    ],
    queryFn: async () => {
      let query = supabase
        .from("price_data")
        .select(
          `
          date,
          price,
          ctx_precio,
          products!inner (
            id,
            brand,
            category,
            model,
            name,
            submodel,
            tipo_vehiculo
          )
        `
        )
        .order("date", { ascending: true });

      const now = new Date();
      let startDate: Date;
      switch (timeRange) {
        case "1month":
          startDate = new Date(
            now.getFullYear(),
            now.getMonth() - 1,
            now.getDate()
          );
          break;
        case "3months":
          startDate = new Date(
            now.getFullYear(),
            now.getMonth() - 3,
            now.getDate()
          );
          break;
        case "6months":
          startDate = new Date(
            now.getFullYear(),
            now.getMonth() - 6,
            now.getDate()
          );
          break;
        case "1year":
          startDate = new Date(
            now.getFullYear() - 1,
            now.getMonth(),
            now.getDate()
          );
          break;
        case "2years":
          startDate = new Date(
            now.getFullYear() - 2,
            now.getMonth(),
            now.getDate()
          );
          break;
        default:
          startDate = new Date(
            now.getFullYear(),
            now.getMonth() - 6,
            now.getDate()
          );
      }

      query = query.gte("date", startDate.toISOString());

      // Handle multi-select filters or single filters
      if (brandFilters.length > 0) {
        query = query.in("products.brand", brandFilters);
      } else if (selectedBrand) {
        query = query.eq("products.brand", selectedBrand);
      }
      if (selectedCategory) {
        query = query.eq("products.category", selectedCategory);
      }
      if (modelFilters.length > 0) {
        query = query.in("products.model", modelFilters);
      } else if (selectedModel) {
        query = query.eq("products.model", selectedModel);
      }
      if (submodelFilters.length > 0) {
        query = query.in("products.submodel", submodelFilters);
      } else if (selectedSubmodel) {
        query = query.eq("products.submodel", selectedSubmodel);
      }
      
      if (tipoVehiculoFilters.length > 0) {
        query = query.in("products.tipo_vehiculo", tipoVehiculoFilters);
      }

      const { data, error } = await query;

      if (error) throw error;

      const groupedData = new Map<string, Map<string, number[]>>();

      data?.forEach((item) => {
        const date = new Date(item.date);
        let timeKey: string;

        switch (groupBy) {
          case "day":
            timeKey = date.toISOString().split("T")[0];
            break;
          case "week":
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - date.getDay());
            timeKey = weekStart.toISOString().split("T")[0];
            break;
          case "month":
            timeKey = `${date.getFullYear()}-${String(
              date.getMonth() + 1
            ).padStart(2, "0")}`;
            break;
          default:
            timeKey = date.toISOString().split("T")[0];
        }

        const modelKey = selectedSubmodel
          ? `${item.products.brand} ${item.products.name} (${item.products.submodel})`
          : `${item.products.brand} ${item.products.name}`;

        if (!groupedData.has(timeKey)) {
          groupedData.set(timeKey, new Map());
        }

        const timeGroup = groupedData.get(timeKey)!;
        if (!timeGroup.has(modelKey)) {
          timeGroup.set(modelKey, []);
        }

        timeGroup.get(modelKey)!.push(item.price);
      });

      const sortedTimeKeys = Array.from(groupedData.keys()).sort();
      const uniqueModels = new Set<string>();
      
      data?.forEach((item) => {
        const modelKey = selectedSubmodel
          ? `${item.products.brand} ${item.products.name} (${item.products.submodel})`
          : `${item.products.brand} ${item.products.name}`;
        uniqueModels.add(modelKey);
      });

      const models = Array.from(uniqueModels);
      const labels: string[] = [];
      const datasets: any[] = models.map((model, index) => {
        const color = lineChartColors.getLineColor(index);
        return {
          label: model,
          data: [],
          borderColor: color,
          backgroundColor: color,
          borderWidth: lineChartColors.borderWidth,
          pointRadius: lineChartColors.pointRadius,
          pointHoverRadius: lineChartColors.pointHoverRadius,
          pointBackgroundColor: color,
          pointBorderColor: color,
          pointHoverBackgroundColor: color,
          pointHoverBorderColor: color,
          tension: lineChartColors.tension,
        };
      });

      sortedTimeKeys.forEach((timeKey) => {
        labels.push(formatDateForDisplay(timeKey, groupBy));
        const timeGroup = groupedData.get(timeKey)!;

        models.forEach((model, modelIndex) => {
          const prices = timeGroup.get(model) || [];
          const avgPrice = prices.length > 0
            ? Math.round(prices.reduce((sum, price) => sum + price, 0) / prices.length)
            : null;
          datasets[modelIndex].data.push(avgPrice);
        });
      });

      // Calculate statistics
      const statistics = models.map((model) => {
        const modelData = datasets.find(d => d.label === model)?.data.filter((p: number | null) => p !== null) || [];
        
        if (modelData.length === 0) return null;

        const minPrice = Math.min(...modelData);
        const maxPrice = Math.max(...modelData);
        const avgPrice = modelData.reduce((sum: number, price: number) => sum + price, 0) / modelData.length;
        const firstPrice = modelData[0];
        const lastPrice = modelData[modelData.length - 1];
        const totalChange = ((lastPrice - firstPrice) / firstPrice) * 100;

        return {
          model,
          minPrice,
          maxPrice,
          avgPrice,
          totalChange,
          dataPoints: modelData.length
        };
      }).filter(Boolean);

      return {
        labels,
        datasets,
        models,
        statistics,
        totalDataPoints: data?.length || 0,
      };
    },
    enabled: !!(selectedBrand || selectedCategory || selectedModel || brandFilters.length > 0 || modelFilters.length > 0 || tipoVehiculoFilters.length > 0),
  });

  const formatDateForDisplay = (dateKey: string, groupBy: string) => {
    const date = new Date(dateKey);
    switch (groupBy) {
      case "day":
        return date.toLocaleDateString("es-MX", {
          month: "short",
          day: "numeric",
        });
      case "week":
        return `Sem ${date.toLocaleDateString("es-MX", {
          month: "short",
          day: "numeric",
        })}`;
      case "month":
        return date.toLocaleDateString("es-MX", {
          year: "numeric",
          month: "short",
        });
      default:
        return dateKey;
    }
  };

  const getLineColor = (index: number) => {
    return lineChartColors.getLineColor(index);
  };

  if (!hasFilters) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">
            Selecciona filtros para ver evolución
          </h3>
          <p className="text-muted-foreground text-center">
            Aplica filtros de marca, categoría o modelo para visualizar la
            evolución de precios a lo largo del tiempo.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4">
          <div>
            <CardTitle className="card-title flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Evolución de Precios
            </CardTitle>
            <CardDescription>
              Histórico de precios para los filtros seleccionados
              {evolutionData && (
                <span className="block sm:inline sm:ml-2 mt-1 sm:mt-0">
                  • {evolutionData.totalDataPoints} puntos de datos
                </span>
              )}
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-full sm:w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1month">1 Mes</SelectItem>
                <SelectItem value="3months">3 Meses</SelectItem>
                <SelectItem value="6months">6 Meses</SelectItem>
                <SelectItem value="1year">1 Año</SelectItem>
                <SelectItem value="2years">2 Años</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={groupBy}
              onValueChange={(value: "day" | "week" | "month") =>
                setGroupBy(value)
              }
            >
              <SelectTrigger className="w-full sm:w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Por Día</SelectItem>
                <SelectItem value="week">Por Semana</SelectItem>
                <SelectItem value="month">Por Mes</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isRefetching}
              className="w-full sm:w-auto"
            >
              {isRefetching ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="py-12">
            <LoadingSpinner size="lg" text="Cargando evolución de precios..." />
          </div>
        ) : evolutionData && evolutionData.labels.length > 0 ? (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {evolutionData.models.map((model, index) => (
                <Badge key={model} variant="outline" className="text-xs flex items-center gap-2 py-1 pr-3">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: getLineColor(index) }}
                  />
                  <BrandLogo brand={model.split(' ')[0]} size="sm" showName={false} className="mr-1" />
                  {model}
                </Badge>
              ))}
            </div>

            <div className="h-[400px]">
              {mounted && <Line
                data={{
                  labels: evolutionData.labels,
                  datasets: evolutionData.datasets,
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: false
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
                        label: (context) => {
                          return `${context.dataset.label}: ${formatPrice(context.parsed.y)}`;
                        },
                        title: (items) => `Período: ${items[0].label}`
                      }
                    }
                  },
                  scales: {
                     x: {
                      ...getScaleOptions(),
                      ticks: { 
                        ...getScaleOptions().ticks,
                        maxRotation: 45,
                        minRotation: 0
                      }
                    },
                     y: {
                      ...getScaleOptions(),
                      ticks: { 
                        ...getScaleOptions().ticks,
                        callback: (value) => formatPrice(value as number)
                      }
                    }
                  },
                  interaction: {
                    mode: 'index',
                    intersect: false,
                  }
                }}
              />}
            </div>

            <div className="space-y-3">
              {evolutionData.statistics?.map((stat, index) => {
                if (!stat) return null;

                return (
                  <div key={stat.model} className="flex items-center gap-4 p-3 border rounded-lg hover:border-primary/50 transition-colors">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: getLineColor(index) }}
                      />
                      <h4 className="font-medium text-sm truncate">{stat.model}</h4>
                    </div>
                    <div className="flex items-center gap-6 flex-wrap">
                      <div className="text-center">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Promedio</p>
                        <p className="text-sm font-semibold">{formatPrice(stat.avgPrice)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Mín - Máx</p>
                        <p className="text-xs font-medium">
                          {formatPrice(stat.minPrice)} - {formatPrice(stat.maxPrice)}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Cambio</p>
                        <p
                          className={`text-sm font-semibold ${
                            stat.totalChange > 0
                              ? "text-red-500"
                              : stat.totalChange < 0
                              ? "text-green-500"
                              : "text-muted-foreground"
                          }`}
                        >
                          {stat.totalChange > 0 ? "+" : ""}
                          {stat.totalChange.toFixed(1)}%
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Puntos</p>
                        <p className="text-sm font-medium">{stat.dataPoints}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">
              No hay datos históricos
            </h3>
            <p className="text-muted-foreground text-center">
              No se encontraron datos de precios para los filtros y período
              seleccionados. Intenta ajustar los filtros o el rango de tiempo.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
