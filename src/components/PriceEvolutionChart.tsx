import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrency } from "@/contexts/CurrencyContext";
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
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { TrendingUp, Calendar, RefreshCw } from "lucide-react";
import { useState } from "react";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface PriceEvolutionProps {
  selectedBrand?: string;
  selectedCategory?: string;
  selectedModel?: string;
  selectedSubmodel?: string;
}

export function PriceEvolutionChart({
  selectedBrand,
  selectedCategory,
  selectedModel,
  selectedSubmodel,
}: PriceEvolutionProps) {
  const { formatPrice } = useCurrency();
  const [timeRange, setTimeRange] = useState("6months");
  const [groupBy, setGroupBy] = useState<"day" | "week" | "month">("week");

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
            submodel
          )
        `
        )
        .order("date", { ascending: true });

      // Apply date filter
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

      // Apply filters
      if (selectedBrand) {
        query = query.eq("products.brand", selectedBrand);
      }
      if (selectedCategory) {
        query = query.eq("products.category", selectedCategory);
      }
      if (selectedModel) {
        query = query.eq("products.model", selectedModel);
      }
      if (selectedSubmodel) {
        query = query.eq("products.submodel", selectedSubmodel);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Group data by time period and model/submodel
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

      // Convert to chart format
      const chartData: any[] = [];
      const sortedTimeKeys = Array.from(groupedData.keys()).sort();

      sortedTimeKeys.forEach((timeKey) => {
        const timeGroup = groupedData.get(timeKey)!;
        const dataPoint: any = {
          date_key: timeKey,
        };

        timeGroup.forEach((prices, modelKey) => {
          // Calculate average price for this time period
          const avgPrice =
            prices.reduce((sum, price) => sum + price, 0) / prices.length;
          dataPoint[modelKey] = Math.round(avgPrice);
        });

        chartData.push(dataPoint);
      });

      // Get unique models for legend
      const uniqueModels = new Set<string>();
      data?.forEach((item) => {
        const modelKey = selectedSubmodel
          ? `${item.products.brand} ${item.products.name} (${item.products.submodel})`
          : `${item.products.brand} ${item.products.name}`;
        uniqueModels.add(modelKey);
      });

      return {
        chartData,
        models: Array.from(uniqueModels),
        totalDataPoints: data?.length || 0,
      };
    },
    enabled: !!(selectedBrand || selectedCategory || selectedModel),
  });

  const formatDateForDisplay = (dateKey: string) => {
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
    const colors = [
      "hsl(var(--chart-1))",
      "hsl(var(--chart-2))",
      "hsl(var(--chart-3))",
      "hsl(var(--chart-4))",
      "hsl(var(--chart-5))",
    ];
    return colors[index % colors.length];
  };

  if (!selectedBrand && !selectedCategory && !selectedModel) {
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

  const chartData = evolutionData?.chartData || [];
  const models = evolutionData?.models || [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Evolución de Precios
            </CardTitle>
            <CardDescription>
              Histórico de precios para los filtros seleccionados
              {evolutionData && (
                <span className="ml-2">
                  • {evolutionData.totalDataPoints} puntos de datos
                </span>
              )}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-32">
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
              <SelectTrigger className="w-32">
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
          <div className="space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : chartData.length > 0 ? (
          <div className="space-y-4">
            {/* Models Legend */}
            <div className="flex flex-wrap gap-2">
              {models.map((model, index) => (
                <Badge key={model} variant="outline" className="text-xs">
                  <div
                    className="w-2 h-2 rounded-full mr-2"
                    style={{ backgroundColor: getLineColor(index) }}
                  />
                  {model}
                </Badge>
              ))}
            </div>

            {/* Price Evolution Chart */}
            <div className="relative" style={{ height: '400px' }}>
              <Line 
                data={{
                  labels: chartData.map(d => formatDateForDisplay(d.date_key)),
                  datasets: models.map((model, index) => ({
                    label: model,
                    data: chartData.map(d => d[model] as number || null),
                    borderColor: getLineColor(index),
                    backgroundColor: getLineColor(index),
                    borderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    tension: 0.4,
                    spanGaps: true
                  }))
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  interaction: {
                    mode: 'index',
                    intersect: false,
                  },
                  plugins: {
                    legend: {
                      display: true,
                      position: 'bottom' as const,
                      labels: {
                        color: 'hsl(var(--foreground))',
                        padding: 15,
                        usePointStyle: true
                      }
                    },
                    tooltip: {
                      backgroundColor: 'hsl(var(--card))',
                      titleColor: 'hsl(var(--foreground))',
                      bodyColor: 'hsl(var(--foreground))',
                      borderColor: 'hsl(var(--border))',
                      borderWidth: 1,
                      padding: 12,
                      callbacks: {
                        label: (context) => {
                          const value = context.parsed.y;
                          return `${context.dataset.label}: ${formatPrice(value)}`;
                        }
                      }
                    }
                  },
                  scales: {
                    y: {
                      ticks: {
                        color: 'hsl(var(--muted-foreground))',
                        callback: (value) => `$${(Number(value) / 1000).toFixed(0)}k`
                      },
                      grid: {
                        color: 'hsl(var(--border))',
                      },
                      border: {
                        color: 'hsl(var(--muted-foreground))'
                      }
                    },
                    x: {
                      ticks: {
                        color: 'hsl(var(--muted-foreground))'
                      },
                      grid: {
                        color: 'hsl(var(--border))',
                      },
                      border: {
                        color: 'hsl(var(--muted-foreground))'
                      }
                    }
                  }
                }}
              />
            </div>

            {/* Summary Statistics */}
            <div className="grid gap-4 md:grid-cols-3">
              {models.map((model, index) => {
                const modelData = chartData
                  .map((d) => d[model])
                  .filter((price) => price !== undefined && price !== null);

                if (modelData.length === 0) return null;

                const minPrice = Math.min(...modelData);
                const maxPrice = Math.max(...modelData);
                const avgPrice =
                  modelData.reduce((sum, price) => sum + price, 0) /
                  modelData.length;
                const firstPrice = modelData[0];
                const lastPrice = modelData[modelData.length - 1];
                const totalChange =
                  ((lastPrice - firstPrice) / firstPrice) * 100;

                return (
                  <div key={model} className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: getLineColor(index) }}
                      />
                      <h4 className="font-medium text-sm">{model}</h4>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Promedio:</span>
                        <span className="font-medium">
                          {formatPrice(avgPrice)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Rango:</span>
                        <span className="font-medium">
                          {formatPrice(minPrice)} - {formatPrice(maxPrice)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Cambio Total:
                        </span>
                        <span
                          className={`font-medium ${
                            totalChange > 0
                              ? "text-red-500"
                              : totalChange < 0
                              ? "text-green-500"
                              : "text-muted-foreground"
                          }`}
                        >
                          {totalChange > 0 ? "+" : ""}
                          {totalChange.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Puntos:</span>
                        <span className="font-medium">{modelData.length}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12">
            <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">
              No hay datos históricos
            </h3>
            <p className="text-muted-foreground text-center">
              No se encontraron datos de precios para los filtros y período
              seleccionados.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
