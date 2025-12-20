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
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
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
  Filter,
  Check,
  ChevronDown,
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
import { DateRange } from "react-day-picker";
import { usePriceDistribution } from "@/hooks/usePriceDistribution";
// import { CurrencySelector } from "@/components/CurrencySelector";
import { hslVar, cn } from "@/lib/utils";
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
import { BrandLogo } from "@/components/BrandLogo";
import { BrandHeader } from "@/components/BrandHeader";
import { DashboardFilters } from "@/components/DashboardFilters";

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
    prices_by_segment_breakdown?: Record<string, Array<{ brand: string; avg_price: number; count: number }>>;
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
      startDate?: string;
      endDate?: string;
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
    volatility_timeseries: Array<{
      entity: string;
      score: number;
      data: Array<{ date: string; variation: number; avg_price: number }>;
    }>;
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
  available_dates?: string[];
  generated_at: string;
}

export default function Dashboard() {
  const { formatPrice, currency } = useCurrency();
  const { setLastUpdate } = useLastUpdate();
  const { theme } = useTheme();

  // ✅ Key única para forzar re-render de gráficos cuando cambia el tema
  // ✅ Key única para forzar re-render de gráficos cuando cambia el tema
  const [chartKey, setChartKey] = useState(0);
  const [mounted, setMounted] = useState(false);
  const COLORS = useMemo(() => getChartPalette(12), [theme]);
  const COLORS_BG = useMemo(() => getChartPalette(12, 0.8), [theme]);

  // ✅ State for explicit chart text colors (Fix for Legend/Axis black issue)
  const [axisColor, setAxisColor] = useState(hslVar('--muted-foreground'));
  const [legendColor, setLegendColor] = useState(hslVar('--foreground'));

  // ✅ Estado para controlar el tab activo
  const [activeTab, setActiveTab] = useState("general");
  // ✅ Estado para controlar el segmento seleccionado
  const [selectedPriceSegment, setSelectedPriceSegment] = useState<string | "all">("all");
  
  // ✅ Estado para Volatilidad
  const [volatilityPeriod, setVolatilityPeriod] = useState<'total' | 'month'>('total');
  const [volatilityStartMonthId, setVolatilityStartMonthId] = useState<string>("");
  const [volatilityEndMonthId, setVolatilityEndMonthId] = useState<string>("");
  const [volatilityStartDate, setVolatilityStartDate] = useState<string>("all");
  const [volatilityEndDate, setVolatilityEndDate] = useState<string>("all");
  // const [volatilityBrand, setVolatilityBrand] = useState<string | "all">("all"); used in query? 
  // Line 212 was: const [volatilityBrand, setVolatilityBrand] = useState<string | "all">("all");
  // I should keep volatilityBrand if it's used elsewhere (Step 862 showed usage in UI but logic seemed confused).
  // I'll keep it for now.
  const [volatilityBrand, setVolatilityBrand] = useState<string | "all">("all");
  
  // ✅ Estado para Variación de Precios
  const [variationPeriod, setVariationPeriod] = useState<'total' | 'month'>('total');
  const [variationStartMonthId, setVariationStartMonthId] = useState<string>("");
  const [variationEndMonthId, setVariationEndMonthId] = useState<string>("");
  const [variationStartDate, setVariationStartDate] = useState<string>("all");
  const [variationEndDate, setVariationEndDate] = useState<string>("all");





  const [filters, setFilters] = useState({
    tipoVehiculo: [] as string[],
    brand: [] as string[],
    model: [] as string[],
    submodel: [] as string[],
  });

  // State to control popover visibility
  const [tipoVehiculoOpen, setTipoVehiculoOpen] = useState(false);
  const [brandOpen, setBrandOpen] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);
  const [submodelOpen, setSubmodelOpen] = useState(false);

  // ✅ Update ChartJS defaults and force remount when theme changes
  useEffect(() => {
    ChartJS.defaults.color = hslVar("--foreground");
    setMounted(false);
    // Incrementa la key para forzar remount de TODOS los gráficos
    setChartKey((prev) => prev + 1);

    // Delay más largo en mobile para mejor renderizado
    const isMobile = window.innerWidth < 768;
    const delay = isMobile ? 100 : 50;

    const timer = setTimeout(() => {
      // Resolve colors AFTER the DOM has likely updated class names
      setAxisColor(hslVar('--muted-foreground'));
      setLegendColor(hslVar('--foreground'));
      setMounted(true);
    }, delay);
    return () => clearTimeout(timer);
  }, [theme, currency]);

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
    queryKey: ["analytics", filters, volatilityPeriod, volatilityBrand, variationStartDate, variationEndDate, volatilityStartDate, volatilityEndDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (Array.isArray(value) && value.length > 0) {
          value.forEach(v => params.append(key, v));
        }
      });



      
      // Derive granularity from period
      // Derive granularity from period
      const volGran = 'month'; 
      params.append("granularity", volGran);

      if (volatilityStartDate !== 'all') params.append("volatilityStartDate", volatilityStartDate);
      if (volatilityEndDate !== 'all') params.append("volatilityEndDate", volatilityEndDate);
      if (volatilityBrand !== "all") {
        params.append("volatilityBrand", volatilityBrand);
      }
      if (variationStartDate !== "all") {
        params.append("variationStartDate", variationStartDate);
      }
      if (variationEndDate !== "all") {
        params.append("variationEndDate", variationEndDate);
      }
      
      // Override filters.brand if volatility drill-down is active AND we are fetching?
      // No, the global filters apply. The user wants to see models of a brand.
      // If we use global filter for brand, it filters everything.
      // If the user selects a brand in Volatility Chart, does it filter the whole dashboard?
      // PROBABLY NOT. But backend uses `filters.brand`.
      // The user wants a selector "para poder ver los modelos por marcas".
      // We will handle this by filtering on frontend or separate query?
      // The backend returns `volatility_timeseries` based on `filters.brand`.
      // If `filters.brand` has 1 item -> returns models.
      // So to drill down, we must add the selected volatility brand to the params sent to backend?
      // OR we add a specific param for volatility scope?
      // Current backend logic: `if (filters.brand.length === 1) volatilityScope = 'model'`.
      // So if I select a brand in the chart selector, I should probably pass it as `brand` filter?
      // BUT that would filter the whole dashboard.
      // For now, let's assume global filter interactions.
      // Actually, if I want to see models of "Toyota", I should probably filter by Toyota globally?
      // Or maybe the selector is just for that chart?
      // If just for that chart, I need to pass it in a way that affects only that chart data... 
      // But `get-analytics` returns everything.
      // Let's rely on global filter for now (simplest), or if user wants isolated drill-down I need to change backend.
      // User said "selector... within the chart".
      // Backend says: `if (filters.brand && filters.brand.length === 1)`.
      // So if I pick 1 brand, I get models.
      
      // So I don't need `volatilityBrand` state if I use `filters.brand`.
      // But maybe user wants to pick 1 brand from a list?
      
      // Let's proceed with just appending granularity.

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

  // Helper to format dates
  const formatDate = (d: Date) => d.toISOString().split('T')[0];
  const formatLabelDate = (dString: string) => {
    const d = new Date(dString);
    const day = d.getUTCDate().toString().padStart(2, '0');
    const month = (d.getUTCMonth() + 1).toString().padStart(2, '0');
    return `${day}/${month}`;
  };

  const getISOWeekNumber = (d: Date) => {
      const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
      date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
      const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
      return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  };

  const getISOWeekDateRange = (year: number, week: number) => {
      const simple = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
      const dow = simple.getUTCDay();
      const ISOweekStart = simple;
      if (dow <= 4)
          ISOweekStart.setUTCDate(simple.getUTCDate() - simple.getUTCDay() + 1);
      else
          ISOweekStart.setUTCDate(simple.getUTCDate() + 8 - simple.getUTCDay());
      const ISOweekEnd = new Date(ISOweekStart);
      ISOweekEnd.setUTCDate(ISOweekEnd.getUTCDate() + 6);
      return { start: ISOweekStart, end: ISOweekEnd };
  };

  // 1. Group dates into Months and Weeks
  const { months, weeks } = useMemo(() => {
    if (!analytics?.available_dates) return { months: [], weeks: [] };
    
    const dates = analytics.available_dates.sort();
    const monthGroups: Record<string, string[]> = {};
    const weekGroups: Record<string, string[]> = {};

    dates.forEach(d => {
       const dateObj = new Date(d);
       // Month Key: YYYY-MM
       const monthKey = d.substring(0, 7);
       if (!monthGroups[monthKey]) monthGroups[monthKey] = [];
       monthGroups[monthKey].push(d);

       // Week Key: ISO Week? Or simple 7-day buckets? 
       // Let's use ISO week for proper grouping or just "Week of Year"
       const weekNum = getISOWeekNumber(dateObj);
       const weekKey = `${dateObj.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
       
       if (!weekGroups[weekKey]) weekGroups[weekKey] = [];
       weekGroups[weekKey].push(d);
    });

    // Transform to Options, keeping only those with >= 2 dates
    const validMonths = Object.entries(monthGroups)
       .filter(([_, dates]) => dates.length >= 1)
       .map(([key, dates]) => {
          const dateObj = new Date(dates[0]);
          const label = dateObj.toLocaleDateString('es-CL', { timeZone: 'UTC', month: 'long', year: 'numeric' });
          // Capitalize first letter
          const finalLabel = label.charAt(0).toUpperCase() + label.slice(1);
          return {
             id: key,
             label: finalLabel,
             dates: dates
          };
       })
       .sort((a, b) => b.id.localeCompare(a.id)); // Newest first

    const validWeeks = Object.entries(weekGroups)
       .filter(([_, dates]) => dates.length >= 1)
       .map(([key, dates]) => {
          const [yearStr, weekStr] = key.split('-W');
          const range = getISOWeekDateRange(parseInt(yearStr), parseInt(weekStr));
          const min = formatLabelDate(range.start.toISOString());
          const max = formatLabelDate(range.end.toISOString());
          return {
             id: key,
             label: `Semana ${key.split('-W')[1]} (${min} - ${max})`,
             dates: dates
          };
       })
       .sort((a, b) => b.id.localeCompare(a.id));

    return { months: validMonths, weeks: validWeeks };
  }, [analytics?.available_dates?.length]);

  // Effect to set initial default option when period changes
  useEffect(() => {
     if (variationPeriod === 'month') {
        if (months.length > 0) {
            // Default to Latest Month as Range (Start = End)
            if (!variationStartMonthId) setVariationStartMonthId(months[0].id);
            if (!variationEndMonthId) setVariationEndMonthId(months[0].id);
        }
     }
  }, [variationPeriod, months]);

  // Effect to update VARIATION start/end dates based on selection
  useEffect(() => {
     if (!analytics?.available_dates) return;
     
     if (variationPeriod === 'total') {
        setVariationStartDate("all");
        setVariationEndDate("all");
        setVariationStartMonthId("");
        setVariationEndMonthId("");
     } else if (variationPeriod === 'month') {
         // Find Start and End groups
         const startGroup = months.find(m => m.id === variationStartMonthId);
         const endGroup = months.find(m => m.id === variationEndMonthId);
         
         if (startGroup) {
             setVariationStartDate(`${startGroup.id}-01`);
         }
         if (endGroup) {
             const [year, month] = endGroup.id.split('-');
             const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
             setVariationEndDate(`${endGroup.id}-${lastDay}`);
         }
     }
  }, [variationPeriod, variationStartMonthId, variationEndMonthId, months]);

  // --- Volatility Effects ---
  useEffect(() => {
     if (volatilityPeriod === 'month') {
        if (months.length > 0) {
            // Default to Latest Month
            if (!volatilityStartMonthId) setVolatilityStartMonthId(months[0].id);
            if (!volatilityEndMonthId) setVolatilityEndMonthId(months[0].id);
        }
     }
  }, [volatilityPeriod, months]);

  useEffect(() => {
     if (!analytics?.available_dates) return;
     
     if (volatilityPeriod === 'total') {
        setVolatilityStartDate("all");
        setVolatilityEndDate("all");
        setVolatilityStartMonthId("");
        setVolatilityEndMonthId("");
     } else if (volatilityPeriod === 'month') {
         const startGroup = months.find(m => m.id === volatilityStartMonthId);
         const endGroup = months.find(m => m.id === volatilityEndMonthId);
         
         if (startGroup) {
             setVolatilityStartDate(`${startGroup.id}-01`);
         }
         if (endGroup) {
             const [year, month] = endGroup.id.split('-');
             const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
             setVolatilityEndDate(`${endGroup.id}-${lastDay}`);
         }
     }
  }, [volatilityPeriod, volatilityStartMonthId, volatilityEndMonthId, months]);



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

  const { data: tiposVehiculo } = useQuery({
    queryKey: ["tiposVehiculo"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("tipo_vehiculo")
        .not("tipo_vehiculo", "is", null)
        .order("tipo_vehiculo");

      if (error) throw error;
      return [...new Set(data.map((p) => p.tipo_vehiculo).filter(Boolean))] as string[];
    },
  });

  const { data: brands } = useQuery({
    queryKey: ["brands", filters.tipoVehiculo],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select("brand")
        .order("brand");

      if (filters.tipoVehiculo.length > 0) {
        query = query.in("tipo_vehiculo", filters.tipoVehiculo);
      }

      const { data, error } = await query;
      if (error) throw error;
      const uniqueBrands = [...new Set(data.map(item => item.brand))].sort();
      return uniqueBrands;
    },
  });

  const { data: models } = useQuery({
    queryKey: ["models", filters.brand],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select("model, name, brand")
        .order("model");

      if (filters.brand.length > 0) {
        query = query.in("brand", filters.brand);
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

      if (filters.brand.length > 0) {
        query = query.in("brand", filters.brand);
      }
      if (filters.model.length > 0) {
        query = query.in("model", filters.model);
      }

      const { data, error } = await query;
      if (error) throw error;
      return [...new Set(data.map((p) => p.submodel).filter(Boolean))];
    },
  });

  if (isLoading) {
    return <LoadingSpinner fullScreen size="lg" text="Cargando datos del dashboard..." />
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

      <DashboardFilters
        filters={filters}
        setFilters={setFilters}
        tiposVehiculo={tiposVehiculo}
        brands={brands}
        models={models}
        submodels={submodels}
        refetchAnalytics={refetch}
        isRefetchingAnalytics={isRefetching}

      />

      {/* Brand Header - Shows when brands are selected */}
      {filters.brand.length > 0 && (
        <BrandHeader 
          brands={filters.brand} 
          tipoVehiculo={filters.tipoVehiculo}
          models={filters.model}
        />
      )}

      <div className="grid gap-4 sm:gap-6 grid-cols-1 xs:grid-cols-2 lg:grid-cols-4">
        <div className="group relative bg-card rounded-2xl p-6 shadow-premium hover:shadow-premium-hover transition-all duration-300 border border-border/40 hover:-translate-y-1 overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-brand opacity-80" />
          <div className="flex items-start justify-between mb-4">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <Package className="h-6 w-6 text-primary" />
            </div>
            <span className="text-xs font-medium bg-muted/60 px-2.5 py-1 rounded-full text-muted-foreground border border-border/50">
              Inventario
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Total Modelos</p>
            <h3 className="text-3xl font-heading font-bold text-foreground mb-1 tracking-tight">
              {analytics.metrics.total_models}
            </h3>
            <div className="flex items-center text-xs text-muted-foreground">
              <span className="font-medium text-primary mr-1">{analytics.metrics.total_brands}</span> marcas activas
            </div>
          </div>
        </div>

        <div className="group relative bg-card rounded-2xl p-6 shadow-premium hover:shadow-premium-hover transition-all duration-300 border border-border/40 hover:-translate-y-1 overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-1 bg-success/60" />
          <div className="flex items-start justify-between mb-4">
            <div className="h-12 w-12 rounded-xl bg-success/10 flex items-center justify-center group-hover:bg-success/20 transition-colors">
              <DollarSign className="h-6 w-6 text-success" />
            </div>
             <span className="text-xs font-medium bg-muted/60 px-2.5 py-1 rounded-full text-muted-foreground border border-border/50">
              Promedio
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Precio Promedio</p>
            <h3 className="text-3xl font-heading font-bold text-foreground mb-1 tracking-tight">
              {formatPrice(analytics.metrics.avg_price)}
            </h3>
             <div className="flex items-center text-xs text-muted-foreground">
              Var: <span className="font-medium ml-1 text-foreground">{analytics.metrics.variation_coefficient.toFixed(1)}%</span>
            </div>
          </div>
        </div>

        <div className="group relative bg-card rounded-2xl p-6 shadow-premium hover:shadow-premium-hover transition-all duration-300 border border-border/40 hover:-translate-y-1 overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-1 bg-warning/60" />
          <div className="flex items-start justify-between mb-4">
            <div className="h-12 w-12 rounded-xl bg-warning/10 flex items-center justify-center group-hover:bg-warning/20 transition-colors">
              <TrendingDown className="h-6 w-6 text-warning" />
            </div>
             <span className="text-xs font-medium bg-muted/60 px-2.5 py-1 rounded-full text-muted-foreground border border-border/50">
              Mínimo
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Precio Mínimo</p>
            <h3 className="text-3xl font-heading font-bold text-foreground mb-1 tracking-tight">
              {formatPrice(analytics.metrics.min_price)}
            </h3>
            <p className="text-xs text-muted-foreground">Valor más accesible</p>
          </div>
        </div>

        <div className="group relative bg-card rounded-2xl p-6 shadow-premium hover:shadow-premium-hover transition-all duration-300 border border-border/40 hover:-translate-y-1 overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-1 bg-accent/60" />
          <div className="flex items-start justify-between mb-4">
            <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
              <TrendingUp className="h-6 w-6 text-accent" />
            </div>
             <span className="text-xs font-medium bg-muted/60 px-2.5 py-1 rounded-full text-muted-foreground border border-border/50">
              Máximo
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Precio Máximo</p>
            <h3 className="text-3xl font-heading font-bold text-foreground mb-1 tracking-tight">
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
                <CardTitle className="card-title flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  Modelos por Tipo de Vehículo
                </CardTitle>
                <CardDescription className="subtitle">
                  Distribución según clasificación (SUV, Sedán, etc.)
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="h-[220px] sm:h-[260px]">
                  {mounted && (
                    <Bar
                      key={`bar-category-${chartKey}`}
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
                            backgroundColor: getChartPalette((analytics.chart_data?.models_by_category || []).length, 0.8),
                            hoverBackgroundColor: getChartPalette((analytics.chart_data?.models_by_category || []).length, 1),
                            borderRadius: 4,
                            barThickness: "flex",
                            maxBarThickness: 40,
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
                          x: {
                            ...getScaleOptions(),
                            grid: { display: false },
                            ticks: {
                              ...getScaleOptions().ticks,
                              color: hslVar('--muted-foreground'),
                            }
                          },
                          y: {
                            ...getScaleOptions(),
                            ticks: {
                                ...getScaleOptions().ticks,
                                color: hslVar('--muted-foreground'),
                            },
                            grid: {
                                ...getScaleOptions().grid,
                                color: hslVar('--border'),
                            }
                          },
                        },
                      }}
                    />
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50 shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="space-y-1 pb-4 flex flex-row items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="card-title flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-primary" />
                    Análisis de Precios
                  </CardTitle>
                  <CardDescription className="subtitle">
                    {selectedPriceSegment === "all" 
                      ? "Promedio por Tipo de Vehículo" 
                      : `Promedio por Marca en ${selectedPriceSegment}`}
                  </CardDescription>
                </div>
                <div className="w-[200px]">
                  <Select 
                    value={selectedPriceSegment} 
                    onValueChange={setSelectedPriceSegment}
                  >
                    <SelectTrigger className="w-full h-8 text-xs bg-background/50 border-input/40 backdrop-blur-sm">
                      <SelectValue placeholder="Seleccionar vista" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Ver General (Tipos)</SelectItem>
                      {(analytics.chart_data?.prices_by_category || []).map((cat) => (
                        <SelectItem key={cat.category} value={cat.category}>
                          Ver marcas de {cat.category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="h-[220px] sm:h-[260px]">
                  {mounted && (
                    <Bar
                      key={`price-analysis-${chartKey}-${selectedPriceSegment}`}
                      data={{
                        labels: selectedPriceSegment === "all"
                          ? (analytics.chart_data?.prices_by_category || []).map(d => d.category)
                          : (analytics.chart_data?.prices_by_segment_breakdown?.[selectedPriceSegment] || []).map(d => d.brand),
                        datasets: [
                          {
                            label: "Precio Promedio",
                            data: selectedPriceSegment === "all"
                              ? (analytics.chart_data?.prices_by_category || []).map(d => d.avg_price)
                              : (analytics.chart_data?.prices_by_segment_breakdown?.[selectedPriceSegment] || []).map(d => d.avg_price),
                            backgroundColor: getChartPalette(
                              selectedPriceSegment === "all"
                                ? (analytics.chart_data?.prices_by_category || []).length
                                : (analytics.chart_data?.prices_by_segment_breakdown?.[selectedPriceSegment] || []).length, 
                              0.8
                            ),
                            hoverBackgroundColor: getChartPalette(
                              selectedPriceSegment === "all"
                                ? (analytics.chart_data?.prices_by_category || []).length
                                : (analytics.chart_data?.prices_by_segment_breakdown?.[selectedPriceSegment] || []).length, 
                              1
                            ),
                            borderRadius: 4,
                            barThickness: "flex",
                            maxBarThickness: 40,
                          },
                        ],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { display: false },
                          tooltip: {
                            callbacks: {
                              label: (context) => formatPrice(context.parsed.y)
                            },
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
                          x: {
                            ...getScaleOptions(),
                            grid: { display: false },
                            ticks: {
                              ...getScaleOptions().ticks,
                              color: axisColor,
                            }
                          },
                          y: {
                             ...getScaleOptions(),
                             ticks: {
                               ...getScaleOptions().ticks,
                               color: axisColor,
                               callback: (value) => formatPrice(value as number)
                             },
                             grid: {
                               ...getScaleOptions().grid,
                               color: hslVar('--border'),
                             }
                          },
                        },
                      }}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sección: Top Modelos eliminada a petición del usuario */}

          {/* Sección: Precio vs Modelo Principal (Bubble Chart Grande) */}
          <Card className="border-border/50 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="card-title flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Precio vs Modelo Principal
              </CardTitle>
              <CardDescription className="subtitle">
                Tamaño proporcional al volumen de variantes
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="h-[320px]">
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
                              color: axisColor,
                            },
                            ticks: {
                              ...getScaleOptions().ticks,
                              color: axisColor,
                            }
                          },
                          y: {
                            ...getScaleOptions(),
                            ticks: {
                              color: axisColor,
                              font: { size: axisColors.tickFontSize },
                              callback: (value) => formatPrice(value as number),
                            },
                            title: {
                              display: true,
                              text: "Precio Promedio",
                              color: axisColor,
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
                <CardTitle className="card-title flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Precios por Categoría
                </CardTitle>
                <CardDescription className="subtitle">
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
                              color: legendColor,
                              padding: 8,
                              font: { size: 10 },
                            },
                          },
                          tooltip: {
                            // ... existing tooltip config ...
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
                              color: axisColor,
                              maxRotation: 45,
                              minRotation: 45,
                              font: { size: 10 },
                            },
                          },
                          y: {
                            ...getScaleOptions(),
                            ticks: {
                              ...getScaleOptions().ticks,
                              color: axisColor,
                              callback: (value) => formatPrice(value as number),
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
                <CardTitle className="card-title flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  Precios Promedio por Marca
                </CardTitle>
                <CardDescription className="subtitle">
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
                              color: axisColor,
                              maxRotation: 45,
                              minRotation: 45,
                            },
                          },
                          y: {
                            ...getScaleOptions(),
                            ticks: {
                              ...getScaleOptions().ticks,
                              color: axisColor,
                              callback: (value) => formatPrice(value as number),
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
                <CardTitle className="card-title flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  Variación de Precios por Marca
                </CardTitle>
                <CardDescription className="subtitle">
                   <div className="flex flex-col gap-3">
                       {/* Period Buttons */}
                       <div className="flex gap-2">
                           {(['total', 'month'] as const).map((mode) => (
                               <button
                                 key={mode}
                                 onClick={() => setVariationPeriod(mode)}
                                 className={cn(
                                   "px-3 py-1 text-[11px] rounded-md transition-all border font-medium",
                                   variationPeriod === mode 
                                      ? "bg-primary text-primary-foreground border-primary shadow-sm" 
                                      : "bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-primary"
                                 )}
                               >
                                 {mode === 'total' ? 'Histórico' : 'Rango Mensual'}
                               </button>
                           ))}
                       </div>

                       {/* Conditional Select */}
                       {(variationPeriod === 'month') && (
                           <div className="flex items-center gap-2">
                               <div className="flex items-center gap-1">
                                   <span className="text-[10px] text-muted-foreground">Desde:</span>
                                   <Select 
                                      value={variationStartMonthId} 
                                      onValueChange={setVariationStartMonthId} 
                                      disabled={months.length === 0}
                                   >
                                      <SelectTrigger className="h-7 text-xs w-[140px] bg-background">
                                        <SelectValue placeholder={months.length > 0 ? "Mes Inicio" : "Sin datos"} />
                                      </SelectTrigger>
                                      <SelectContent className="max-h-[200px]">
                                        {months.length > 0 ? months.map(m => (
                                           <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
                                        )) : <SelectItem value="nodata" disabled>No hay meses</SelectItem>}
                                      </SelectContent>
                                   </Select>
                               </div>
                               <div className="flex items-center gap-1">
                                   <span className="text-[10px] text-muted-foreground">Hasta:</span>
                                   <Select 
                                      value={variationEndMonthId} 
                                      onValueChange={setVariationEndMonthId} 
                                      disabled={months.length === 0}
                                   >
                                      <SelectTrigger className="h-7 text-xs w-[140px] bg-background">
                                        <SelectValue placeholder={months.length > 0 ? "Mes Fin" : "Sin datos"} />
                                      </SelectTrigger>
                                      <SelectContent className="max-h-[200px]">
                                        {months.length > 0 ? months.map(m => (
                                           <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
                                        )) : <SelectItem value="nodata" disabled>No hay meses</SelectItem>}
                                      </SelectContent>
                                   </Select>
                               </div>
                           </div>
                       )}

                        {/* Dynamic Description */}
                        <p className="text-[11px] text-muted-foreground">
                          {(() => {
                             if (variationPeriod === 'total') {
                                 if (!analytics.available_dates || analytics.available_dates.length === 0) return "Cargando fechas...";
                                 const min = formatLabelDate(analytics.available_dates[0]);
                                 const max = formatLabelDate(analytics.available_dates[analytics.available_dates.length - 1]);
                                 return `Periodo: ${min} - ${max}`;
                             }
                             if (variationStartDate !== 'all' && variationEndDate !== 'all' && variationStartDate && variationEndDate) {
                                return `Comparando: ${formatLabelDate(variationStartDate)} al ${formatLabelDate(variationEndDate)}`;
                             }
                             return "Seleccione rango";
                          })()}
                       </p>
                   </div>
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
                            label: (() => {
                               // Calculate explicit date range string for label
                               const variations = analytics.chart_data?.brand_variations || [];
                               if (variations.length > 0 && variations[0].startDate) {
                                  const dates = variations.flatMap(v => [v.startDate, v.endDate]).filter(Boolean).sort();
                                  if (dates.length > 0) {
                                     const minDate = new Date(dates[0]).toLocaleDateString('es-CL', { timeZone: 'UTC', day: '2-digit', month: '2-digit' });
                                     const maxDate = new Date(dates[dates.length-1]).toLocaleDateString('es-CL', { timeZone: 'UTC', day: '2-digit', month: '2-digit' });
                                     return `Variación % (${minDate} - ${maxDate})`;
                                  }
                               }
                               return "Variación %";
                            })(),
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
                              color: axisColor,
                              maxRotation: 45,
                              minRotation: 45,
                            },
                          },
                          y: {
                            ...getScaleOptions(),
                            ticks: {
                              ...getScaleOptions().ticks,
                              color: axisColor,
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

            {/* Volatilidad en el Tiempo */}
            <Card className="border-border/50 shadow-md hover:shadow-lg transition-shadow col-span-1 md:col-span-2 lg:col-span-1">
              <CardHeader className="space-y-1 pb-4">
                <div className="flex items-center justify-between">
                    <CardTitle className="card-title flex items-center gap-2">
                      <Activity className="h-5 w-5 text-primary" />
                      Volatilidad: {volatilityBrand !== "all" ? 'Modelos' : 'Marcas'}
                    </CardTitle>
                    
                     <div className="w-[120px]">
                      <Select 
                        value={volatilityBrand}
                        onValueChange={setVolatilityBrand}
                      >
                        <SelectTrigger className="h-7 text-xs bg-background/50">
                          <SelectValue placeholder="Marca" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas</SelectItem>
                          {(brands || []).map(b => (
                            <SelectItem key={b} value={b}>{b}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                </div>

                <CardDescription className="subtitle">
                    <div className="flex flex-col gap-3 pt-2">
                       <p>Variación de precios en el tiempo</p>
                       
                       {/* Period Buttons */}
                       <div className="flex gap-2">
                           {(['total', 'month'] as const).map((mode) => (
                               <button
                                 key={mode}
                                 onClick={() => setVolatilityPeriod(mode)}
                                 className={cn(
                                   "px-3 py-1 text-[11px] rounded-md transition-all border font-medium",
                                   volatilityPeriod === mode 
                                      ? "bg-primary text-primary-foreground border-primary shadow-sm" 
                                      : "bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-primary"
                                 )}
                               >
                                 {mode === 'total' ? 'Histórico' : 'Rango Mensual'}
                               </button>
                           ))}
                       </div>

                       {/* Conditional Select */}
                       {(volatilityPeriod === 'month') && (
                           <div className="flex items-center gap-2">
                               <div className="flex items-center gap-1">
                                   <span className="text-[10px] text-muted-foreground">Desde:</span>
                                   <Select 
                                      value={volatilityStartMonthId} 
                                      onValueChange={setVolatilityStartMonthId} 
                                      disabled={months.length === 0}
                                   >
                                      <SelectTrigger className="h-7 text-xs w-[140px] bg-background">
                                        <SelectValue placeholder={months.length > 0 ? "Mes Inicio" : "Sin datos"} />
                                      </SelectTrigger>
                                      <SelectContent className="max-h-[200px]">
                                        {months.length > 0 ? months.map(m => (
                                           <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
                                        )) : <SelectItem value="nodata" disabled>No hay meses</SelectItem>}
                                      </SelectContent>
                                   </Select>
                               </div>
                               <div className="flex items-center gap-1">
                                   <span className="text-[10px] text-muted-foreground">Hasta:</span>
                                   <Select 
                                      value={volatilityEndMonthId} 
                                      onValueChange={setVolatilityEndMonthId} 
                                      disabled={months.length === 0}
                                   >
                                      <SelectTrigger className="h-7 text-xs w-[140px] bg-background">
                                        <SelectValue placeholder={months.length > 0 ? "Mes Fin" : "Sin datos"} />
                                      </SelectTrigger>
                                      <SelectContent className="max-h-[200px]">
                                        {months.length > 0 ? months.map(m => (
                                           <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
                                        )) : <SelectItem value="nodata" disabled>No hay meses</SelectItem>}
                                      </SelectContent>
                                   </Select>
                               </div>
                           </div>
                       )}

                        {/* Dynamic Description */}
                        <p className="text-[11px] text-muted-foreground">
                          {(() => {
                             if (volatilityPeriod === 'total') {
                                 if (!analytics?.available_dates || analytics.available_dates.length === 0) return "Cargando fechas...";
                                 const min = formatLabelDate(analytics.available_dates[0]);
                                 const max = formatLabelDate(analytics.available_dates[analytics.available_dates.length - 1]);
                                 return `Periodo: ${min} - ${max}`;
                             }
                             if (volatilityStartDate !== 'all' && volatilityEndDate !== 'all' && volatilityStartDate && volatilityEndDate) {
                                return `Analizando: ${formatLabelDate(volatilityStartDate)} al ${formatLabelDate(volatilityEndDate)}`;
                             }
                             return "Seleccione rango";
                          })()}
                        </p>
                    </div>
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="h-[280px]">
                  {mounted && (
                    <Bar
                      key={`bar-volatility-${chartKey}-${volatilityPeriod}-${volatilityBrand}`}
                      data={{
                        // Collect all unique dates from all series to ensure x-axis alignment
                        labels: Array.from(new Set(
                          (analytics.chart_data?.volatility_timeseries || [])
                            .flatMap(s => s.data.map(d => d.date))
                        )).sort(),
                        datasets: (analytics.chart_data?.volatility_timeseries || []).map((series, idx) => ({
                          label: series.entity,
                          backgroundColor: COLORS_BG[idx % COLORS_BG.length], // Valid HSL with alpha
                          borderColor: COLORS[idx % COLORS.length],
                          borderWidth: 1,
                          borderRadius: 4,
                          parsing: {
                             xAxisKey: 'date',
                             yAxisKey: 'variation'
                          },
                          // Pass the full object struct to data so parsing works
                          data: series.data // [{date: '...', variation: ...}]
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
                            position: 'bottom',
                            labels: {
                                color: legendColor,
                                boxWidth: 12,
                                font: { size: 10 }
                            }
                          },
                          tooltip: {
                            // ... existing tooltip ...
                             backgroundColor: tooltipColors.backgroundColor(),
                            borderColor: tooltipColors.borderColor(),
                            borderWidth: tooltipColors.borderWidth,
                            titleColor: tooltipColors.titleColor(),
                            bodyColor: tooltipColors.bodyColor(),
                            callbacks: {
                              label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y.toFixed(2)}%`
                            }
                          },
                        },
                        scales: {
                          x: {
                            ...getScaleOptions(),
                            ticks: {
                              ...getScaleOptions().ticks,
                              color: axisColor,
                              maxRotation: 45,
                              minRotation: 45,
                            },
                          },
                          y: {
                            ...getScaleOptions(),
                            ticks: {
                               ...getScaleOptions().ticks,
                               color: axisColor,
                               callback: (val) => `${Number(val).toFixed(1)}%`
                            },
                            title: {
                                display: true,
                                text: 'Variación %',
                                color: axisColor,
                                font: { size: 10 }
                            }
                          },
                        },
                      }}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="modelos" className="space-y-6">
          <ModelsTable filters={filters} statusFilter="active" />

          <Card className="border-border/50 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="card-title flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                Modelos Inactivos
              </CardTitle>
              <CardDescription className="subtitle">
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
