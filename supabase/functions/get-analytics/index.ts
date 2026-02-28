import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Parse request to get filters
    const url = new URL(req.url);
    // Default: from URL params
    let filters = {
      tipoVehiculo: url.searchParams.getAll('tipoVehiculo') || [],
      brand: url.searchParams.getAll('brand') || [],
      category: url.searchParams.get('category') || '',
      model: url.searchParams.getAll('model') || [],
      submodel: url.searchParams.getAll('submodel') || [],
      ctx_precio: url.searchParams.get('ctx_precio') || '',
      priceRange: url.searchParams.get('priceRange') || '',
      dateFrom: url.searchParams.get('dateFrom') || '',
      dateTo: url.searchParams.get('dateTo') || '',
      granularity: url.searchParams.get('granularity') || 'month',
      volatilityBrand: url.searchParams.getAll('volatilityBrand') || [],
      variationStartDate: url.searchParams.get('variationStartDate') || '',
      variationEndDate: url.searchParams.get('variationEndDate') || '',
      volatilityStartDate: url.searchParams.get('volatilityStartDate') || '',
      volatilityEndDate: url.searchParams.get('volatilityEndDate') || '',
    };

    // Also support body with `params` (supabase.functions.invoke)
    try {
      const body = await req.json().catch(() => null) as any
      if (body && typeof body.params === 'string') {
        const sp = new URLSearchParams(body.params)
        filters = {
          tipoVehiculo: sp.getAll('tipoVehiculo') || filters.tipoVehiculo,
          brand: sp.getAll('brand') || filters.brand,
          category: sp.get('category') || filters.category,
          model: sp.getAll('model') || filters.model,
          submodel: sp.getAll('submodel') || filters.submodel,
          ctx_precio: sp.get('ctx_precio') || filters.ctx_precio,
          priceRange: sp.get('priceRange') || filters.priceRange,
          dateFrom: sp.get('dateFrom') || filters.dateFrom,
          dateTo: sp.get('dateTo') || filters.dateTo,
          granularity: sp.get('granularity') || filters.granularity,
          volatilityBrand: sp.getAll('volatilityBrand') || filters.volatilityBrand,
          variationStartDate: sp.get('variationStartDate') || filters.variationStartDate,
          variationEndDate: sp.get('variationEndDate') || filters.variationEndDate,
          volatilityStartDate: sp.get('volatilityStartDate') || filters.volatilityStartDate,
          volatilityEndDate: sp.get('volatilityEndDate') || filters.volatilityEndDate,
        }
      }
    } catch (_) {
      // ignore body parse errors
    }

    console.log('Received filters:', filters);

    console.log('Received filters:', filters);

    // Start building the query
    let query = supabaseClient
      .from('price_data')
      .select(`
        id,
        price,
        date,
        store,
        ctx_precio,
        precio_num,
        precio_lista_num,
        bono_num,
        precio_texto,
        products!inner (
          id,
          brand,
          category,
          model,
          name,
          submodel,
          tipo_vehiculo
        )
      `)
      .order('date', { ascending: false });

    // Apply DB-level filters
    // Note: We use 'products.field' because of the !inner join
    if (filters.tipoVehiculo && filters.tipoVehiculo.length > 0) {
      query = query.in('products.tipo_vehiculo', filters.tipoVehiculo);
    }
    if (filters.brand && filters.brand.length > 0) {
      query = query.in('products.brand', filters.brand);
    }
    if (filters.category) {
      query = query.eq('products.category', filters.category);
    }
    if (filters.model && filters.model.length > 0) {
      query = query.in('products.model', filters.model);
    }
    if (filters.submodel && filters.submodel.length > 0) {
      query = query.in('products.submodel', filters.submodel);
    }
    if (filters.ctx_precio) {
      query = query.eq('ctx_precio', filters.ctx_precio);
    }
    // Date filtering (if enabled in UI)
    if (filters.dateFrom) {
      query = query.gte('date', filters.dateFrom);
    }
    if (filters.dateTo) {
      query = query.lte('date', filters.dateTo);
    }

    const { data: priceData, error: priceError } = await query;

    if (priceError) {
      console.error('Error fetching price data:', priceError);
      throw priceError;
    }

    console.log('Retrieved price data count:', priceData?.length || 0);

    // Get latest price for each product (most recent date per product)
    const latestPrices = new Map();
    priceData?.forEach(item => {
      const productId = (item.products as any).id;
      if (!latestPrices.has(productId) || new Date(item.date) > new Date(latestPrices.get(productId).date)) {
        latestPrices.set(productId, item);
      }
    });

    const filteredData = Array.from(latestPrices.values());

    // JS filtering removed as it is now done in DB
    // Only 'priceRange' needs manual filtering if passing complex strings, 
    // but basic filtering is now DB-side.

    console.log('Filtered data count (after latest per product):', filteredData.length);

    // Calculate comprehensive metrics
    const getPrice = (item: any) => {
      const primary = Number((item as any).precio_num ?? (item as any).precio_lista_num);
      if (!Number.isNaN(primary) && primary > 0) return primary;
      const cleaned = String((item as any).price ?? '').replace(/[^0-9.-]/g, '');
      const parsed = Number(cleaned);
      return Number.isNaN(parsed) ? 0 : parsed;
    };
    const prices = filteredData.map((item: any) => getPrice(item)).filter((p: number) => p > 0);
    const brands = [...new Set(filteredData.map(item => item.products?.brand))].filter(Boolean);
    const categories = [...new Set(filteredData.map(item => item.products?.category))].filter(Boolean);

    const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

    // Calculate median price
    const sortedPrices = [...prices].sort((a, b) => a - b);
    const medianPrice = prices.length > 0 ? (() => {
      const mid = Math.floor(sortedPrices.length / 2);
      return sortedPrices.length % 2 !== 0 ? sortedPrices[mid] : (sortedPrices[mid - 1] + sortedPrices[mid]) / 2;
    })() : 0;

    // Calculate price standard deviation and variation coefficient
    const variance = prices.length > 1 ?
      prices.reduce((acc, price) => acc + Math.pow(price - avgPrice, 2), 0) / (prices.length - 1) : 0;
    const stdDev = Math.sqrt(variance);
    const variationCoeff = avgPrice > 0 ? (stdDev / avgPrice) * 100 : 0;

    // Calculate price ranges for comparison
    const priceRange = maxPrice - minPrice;
    const lowerQuartile = prices.length > 0 ? sortedPrices[Math.floor(sortedPrices.length * 0.25)] : 0;
    const upperQuartile = prices.length > 0 ? sortedPrices[Math.floor(sortedPrices.length * 0.75)] : 0;

    // Calculate unique versions (Brand + Model + Submodel)
    const totalVersions = new Set(filteredData.map(item => {
      const p = item.products as any;
      return `${p.brand}|${p.model}|${p.submodel || ''}`;
    }));

    // Calculate unique model families (Brand + Model)
    const uniqueModelFamilies = new Set(filteredData.map(item => {
      const p = item.products as any;
      return `${p.brand}|${p.model}`;
    }));

    // Calculate metrics based on current scraping date
    const metrics = {
      total_models: totalVersions.size, // Kept as total_models for backward compat, but logic is versions
      total_model_families: uniqueModelFamilies.size, // New metric
      total_brands: brands.length,
      total_categories: categories.length,
      avg_price: avgPrice,
      median_price: medianPrice,
      min_price: minPrice,
      max_price: maxPrice,
      price_std_dev: stdDev,
      price_range: priceRange,
      variation_coefficient: variationCoeff,
      lower_quartile: lowerQuartile,
      upper_quartile: upperQuartile,
      current_scraping_date: filteredData.length > 0 ? filteredData[0].date : null,
      total_scraping_sessions: 0, // Will be updated below

      // New: Global Average Discount Percent
      avg_discount_pct: (() => {
        const discountItems = filteredData.filter(item => {
          const list = Number((item as any).precio_lista_num);
          const bonus = Number((item as any).bono_num);
          return !Number.isNaN(list) && list > 0 && !Number.isNaN(bonus) && bonus > 0;
        });

        if (discountItems.length === 0) return 0;

        const totalPct = discountItems.reduce((acc, item) => {
          const list = Number((item as any).precio_lista_num);
          const bonus = Number((item as any).bono_num);
          return acc + ((bonus / list) * 100);
        }, 0);

        return totalPct / discountItems.length;
      })()
    };

    // Get total scraping sessions count (distinct dates)
    const { data: allDates } = await supabaseClient
      .from('price_data')
      .select('date');

    const uniqueDates = [...new Set(allDates?.map(d => d.date.split('T')[0]))];
    metrics.total_scraping_sessions = uniqueDates.length;

    // Group data for comprehensive charts WITH TEMPORAL ANALYSIS
    const pricesByBrand = await Promise.all(brands.map(async (brand) => {
      const brandPrices = filteredData
        .filter(item => item.products?.brand === brand)
        .map(item => parseFloat(item.price));
      const brandAvg = brandPrices.reduce((a, b) => a + b, 0) / brandPrices.length;

      // Get historical trend for this brand with filters applied
      let brandHistoryQuery = supabaseClient
        .from('price_data')
        .select(`
          date, price,
          products!inner (brand, model, submodel)
        `)
        .eq('products.brand', brand)
        .order('date', { ascending: false })
        .limit(100);

      if (filters.model && filters.model.length > 0) {
        brandHistoryQuery = brandHistoryQuery.in('products.model', filters.model);
      }
      if (filters.submodel && filters.submodel.length > 0) {
        brandHistoryQuery = brandHistoryQuery.in('products.submodel', filters.submodel);
      }

      const { data: brandHistory } = await brandHistoryQuery;

      // Calculate trend
      const recentPrices = brandHistory?.map(h => parseFloat(h.price)) || [];
      const trend = recentPrices.length > 1 ?
        ((recentPrices[0] - recentPrices[recentPrices.length - 1]) / recentPrices[recentPrices.length - 1] * 100) : 0;

      return {
        brand,
        avg_price: brandAvg,
        min_price: Math.min(...brandPrices),
        max_price: Math.max(...brandPrices),
        count: brandPrices.length,
        value_score: avgPrice > 0 ? ((avgPrice - brandAvg) / avgPrice * 100) : 0,
        price_trend: trend // Percentage change from first to last scraping
      };
    }));

    const tiposVehiculoForModels = [...new Set(filteredData.map(item => item.products?.tipo_vehiculo))].filter(Boolean);

    const pricesByCategory = tiposVehiculoForModels.map(tipo => {
      const categoryPrices = filteredData
        .filter(item => item.products?.tipo_vehiculo === tipo)
        .map(item => parseFloat(item.price));
      return {
        category: tipo,
        avg_price: categoryPrices.length > 0 ? categoryPrices.reduce((a, b) => a + b, 0) / categoryPrices.length : 0,
        min_price: categoryPrices.length > 0 ? Math.min(...categoryPrices) : 0,
        max_price: categoryPrices.length > 0 ? Math.max(...categoryPrices) : 0,
        count: categoryPrices.length
      };
    });

    // Drill-down: Prices by Brand per Category (Segment)
    const pricesBySegmentBreakdown = tiposVehiculoForModels.reduce((acc, tipo) => {
      const segmentData = filteredData.filter(item => item.products?.tipo_vehiculo === tipo);
      const brandsInSegment = [...new Set(segmentData.map(item => item.products?.brand))].filter(Boolean);

      const brandMetrics = brandsInSegment.map(brand => {
        const brandPrices = segmentData
          .filter(item => item.products?.brand === brand)
          .map(item => parseFloat(item.price));
        return {
          brand,
          avg_price: brandPrices.length > 0 ? brandPrices.reduce((a, b) => a + b, 0) / brandPrices.length : 0,
          count: brandPrices.length
        };
      }).sort((a, b) => b.avg_price - a.avg_price); // Sort by highest price

      acc[tipo] = brandMetrics;
      return acc;
    }, {} as Record<string, Array<{ brand: string; avg_price: number; count: number }>>);

    // Group by main model for model principal analysis
    const modelPrincipals = [...new Set(filteredData.map(item => item.products?.model))].filter(Boolean);
    const modelsByPrincipal = modelPrincipals.map(modelPrincipal => {
      const modelData = filteredData.filter(item => item.products?.model === modelPrincipal);
      const modelPrices = modelData.map(item => parseFloat(item.price));
      const brand = modelData.length > 0 ? (modelData[0].products as any).brand : 'Unknown';

      // --- New: Discount Analysis Calculation ---
      const listPrices = modelData
        .map(item => Number((item as any).precio_lista_num))
        .filter(p => !Number.isNaN(p) && p > 0);

      const bonuses = modelData
        .map(item => Number((item as any).bono_num))
        .filter(b => !Number.isNaN(b)); // Include 0 bonuses

      const avgListPrice = listPrices.length > 0
        ? listPrices.reduce((a, b) => a + b, 0) / listPrices.length
        : 0;

      const avgBonus = bonuses.length > 0
        ? bonuses.reduce((a, b) => a + b, 0) / bonuses.length
        : 0;

      // Calculate Avg Discount Pct (Row Level for accuracy)
      const discounts = modelData.map(item => {
        const list = Number((item as any).precio_lista_num);
        const bonus = Number((item as any).bono_num);

        if (list > 0 && bonus > 0) {
          return (bonus / list) * 100;
        }
        return 0; // No discount if list is missing or bonus is 0
      });

      const avgDiscountPct = discounts.length > 0
        ? discounts.reduce((a, b) => a + b, 0) / discounts.length
        : 0;
      // ------------------------------------------

      return {
        brand,
        model_principal: modelPrincipal,
        count: modelData.length,
        avg_price: modelPrices.reduce((a, b) => a + b, 0) / modelPrices.length,
        min_price: Math.min(...modelPrices),
        max_price: Math.max(...modelPrices),
        // New Metrics
        avg_list_price: avgListPrice,
        avg_bonus: avgBonus,
        avg_discount_pct: avgDiscountPct
      };
    });

    const modelsByCategory = tiposVehiculoForModels.map(tipo => ({
      category: tipo,
      count: filteredData.filter(item => item.products?.tipo_vehiculo === tipo).length
    }));

    // Calculate monthly variation for volatility analysis with filters
    let monthlyQuery = supabaseClient
      .from('price_data')
      .select(`
        date,
        price,
        products!inner (id, brand, model, name, submodel)
      `)
      .order('date', { ascending: true });

    if (filters.brand && filters.brand.length > 0) {
      monthlyQuery = monthlyQuery.in('products.brand', filters.brand);
    }
    if (filters.tipoVehiculo && filters.tipoVehiculo.length > 0) {
      monthlyQuery = monthlyQuery.in('products.tipo_vehiculo', filters.tipoVehiculo);
    }
    if (filters.model && filters.model.length > 0) {
      monthlyQuery = monthlyQuery.in('products.model', filters.model);
    }
    if (filters.submodel && filters.submodel.length > 0) {
      monthlyQuery = monthlyQuery.in('products.submodel', filters.submodel);
    }

    // Apply Volatility Specific Date Filters
    if (filters.volatilityStartDate && filters.volatilityStartDate !== 'all') {
      monthlyQuery = monthlyQuery.gte('date', filters.volatilityStartDate);
    } else if (filters.dateFrom) {
      monthlyQuery = monthlyQuery.gte('date', filters.dateFrom);
    } else if (filters.volatilityStartDate !== 'all') {
      // DEFAULT: Limit internal database query to the rolling 1 year to avoid downloading 2022-2023 data 
      // and hitting the 1000-row Supabase API limit!
      const now = new Date();
      const oneYearAgoStr = new Date(now.getFullYear() - 1, now.getMonth(), 1).toISOString().split('T')[0];
      monthlyQuery = monthlyQuery.gte('date', oneYearAgoStr);
    }

    if (filters.volatilityEndDate && filters.volatilityEndDate !== 'all') {
      monthlyQuery = monthlyQuery.lte('date', filters.volatilityEndDate + 'T23:59:59');
    } else if (filters.dateTo) {
      monthlyQuery = monthlyQuery.lte('date', filters.dateTo);
    }

    const { data: monthlyData } = await monthlyQuery;

    const monthlyVariation: {
      most_volatile: Array<{
        brand: string;
        model: string;
        name: string;
        avg_monthly_variation: number;
        data_points: number;
      }>;
    } = { most_volatile: [] };

    if (monthlyData) {
      // Group by brand-model to analyze all submodels together
      const productGroups: Record<string, Array<{
        date: string;
        price: number;
        brand: string;
        model: string;
        name: string;
      }>> = monthlyData.reduce((acc, item: any) => {
        const brand = (item.products as any).brand;
        const model = (item.products as any).model;
        const key = `${brand}-${model}`; // Group by brand-model
        if (!acc[key]) acc[key] = [];
        acc[key].push({
          date: item.date,
          price: parseFloat(item.price),
          brand: brand,
          model: model,
          name: (item.products as any).name
        });
        return acc;
      }, {} as Record<string, Array<{
        date: string;
        price: number;
        brand: string;
        model: string;
        name: string;
      }>>);

      const volatilityAnalysis: Array<{
        brand: string;
        model: string;
        name: string;
        avg_monthly_variation: number;
        data_points: number;
      }> = [];

      Object.entries(productGroups).forEach(([key, data]) => {
        // Require at least 1 data point. If 1, variation is 0.
        if (data.length > 0) {
          const sortedData = data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
          const variations = [] as number[];

          for (let i = 1; i < sortedData.length; i++) {
            const prev = sortedData[i - 1].price;
            const curr = sortedData[i].price;
            if (prev > 0) {
              const variation = Math.abs((curr - prev) / prev * 100);
              variations.push(variation);
            }
          }

          const avgVariation = variations.length > 0 ? variations.reduce((a, b) => a + b, 0) / variations.length : 0;
          volatilityAnalysis.push({
            brand: sortedData[0].brand,
            model: sortedData[0].model,
            name: sortedData[0].name,
            avg_monthly_variation: avgVariation,
            data_points: sortedData.length
          });
        }
      });

      monthlyVariation.most_volatile = volatilityAnalysis
        .sort((a, b) => b.avg_monthly_variation - a.avg_monthly_variation)
        .slice(0, 5);
    }

    // Calculate brand price variations between scraping dates with filters
    const brandVariations = await Promise.all(brands.map(async (brand) => {
      let brandHistoryQuery = supabaseClient
        .from('price_data')
        .select(`
          date, price,
          products!inner (brand, model, submodel)
        `)
        .eq('products.brand', brand)
        .order('date', { ascending: true });

      if (filters.model && filters.model.length > 0) {
        brandHistoryQuery = brandHistoryQuery.in('products.model', filters.model);
      }
      if (filters.submodel && filters.submodel.length > 0) {
        brandHistoryQuery = brandHistoryQuery.in('products.submodel', filters.submodel);
      }
      if (filters.variationStartDate && filters.variationStartDate !== 'all') {
        brandHistoryQuery = brandHistoryQuery.gte('date', filters.variationStartDate);
      } else if (filters.variationStartDate !== 'all') {
        // DEFAULT: Limit to rolling 1 year to avoid downloading massive history and bypassing 1000-row limits
        const now = new Date();
        const oneYearAgoStr = new Date(now.getFullYear() - 1, now.getMonth(), 1).toISOString().split('T')[0];
        brandHistoryQuery = brandHistoryQuery.gte('date', oneYearAgoStr);
      }

      if (filters.variationEndDate && filters.variationEndDate !== 'all') {
        // Append time to end of day if just a date, or just simple comparison if exact
        // Assuming YYYY-MM-DD, we want to include that day, so maybe lt date+1 or just lte 23:59:59
        // Simple string compare works if ISO.
        brandHistoryQuery = brandHistoryQuery.lte('date', filters.variationEndDate + 'T23:59:59');
      }

      const { data: brandHistory } = await brandHistoryQuery;

      if (brandHistory && brandHistory.length > 0) {
        // Group by date and calculate average price per date
        const dateGroups = brandHistory.reduce((acc: Record<string, number[]>, item) => {
          const dateKey = item.date.split('T')[0];
          if (!acc[dateKey]) acc[dateKey] = [];
          acc[dateKey].push(parseFloat(item.price));
          return acc;
        }, {} as Record<string, number[]>);

        const dateAverages = Object.entries(dateGroups).map(([date, prices]: [string, number[]]) => ({
          date,
          avg_price: (prices as number[]).reduce((a: number, b: number) => a + b, 0) / (prices as number[]).length
        })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        if (dateAverages.length > 0) {
          const firstAvg = dateAverages[0].avg_price;
          const lastAvg = dateAverages[dateAverages.length - 1].avg_price;
          // Calculate variation only if we have > 1 point and firstAvg > 0
          let variation = 0;
          if (dateAverages.length > 1 && firstAvg > 0) {
            const rawVariation = ((lastAvg - firstAvg) / firstAvg * 100);
            if (rawVariation >= -99 && rawVariation <= 500) {
              variation = rawVariation;
            }
          }

          return {
            brand,
            first_avg_price: firstAvg,
            last_avg_price: lastAvg,
            variation_percent: variation,
            scraping_sessions: dateAverages.length,
            startDate: dateAverages[0].date,
            endDate: dateAverages[dateAverages.length - 1].date
          };
        }
      }

      return {
        brand,
        first_avg_price: 0,
        last_avg_price: 0,
        variation_percent: 0,
        scraping_sessions: 0
      };
    }));

    // Price distribution with dynamic ranges based on actual data
    const formatPriceForRange = (price: number) => {
      if (price >= 1000000) return `$${(price / 1000000).toFixed(1)}M`;
      if (price >= 1000) return `$${(price / 1000).toFixed(0)}k`;
      return `$${price.toFixed(0)}`;
    };

    // --- New: Volatility Time Series Analysis (Robust Aggregation) ---
    // 1. Determine Granularity
    const granularity = (filters.granularity || 'month') as 'week' | 'month';

    const getBucketKey = (dateStr: string) => {
      const d = new Date(dateStr);
      if (granularity === 'week') {
        const firstDayOfYear = new Date(d.getFullYear(), 0, 1);
        const pastDaysOfYear = (d.getTime() - firstDayOfYear.getTime()) / 86400000;
        const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
        return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
      }
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    };

    // 2. Calculate variations PER MODEL first to avoid Mix-Shift spikes
    interface ModelTimeSeries {
      brand: string;
      model: string;
      buckets: Record<string, number[]>; // bucket -> prices[]
      variations: Record<string, number>; // bucket -> % variation vs prev bucket
    }

    const modelMap: Record<string, ModelTimeSeries> = {};
    const allBucketsSet = new Set<string>();

    // Use monthlyData (historical) instead of filteredData (snapshot) for Volatility Calculation
    const volatilityData = monthlyData || [];

    volatilityData.forEach((item: any) => {
      // Create a unique key for the model
      const p = item.products as any;
      const key = `${p.brand}||${p.model}`;

      if (!modelMap[key]) {
        modelMap[key] = {
          brand: p.brand,
          model: p.model,
          buckets: {},
          variations: {}
        };
      }

      const bucket = getBucketKey(item.date);
      allBucketsSet.add(bucket);

      if (!modelMap[key].buckets[bucket]) {
        modelMap[key].buckets[bucket] = [];
      }
      modelMap[key].buckets[bucket].push(parseFloat(item.price));
    });

    const sortedAllBuckets = Array.from(allBucketsSet).sort();

    // Compute variations for each model
    Object.values(modelMap).forEach(m => {
      let prevAvg = 0;
      // Iterate sorted buckets to find variations 
      sortedAllBuckets.forEach((bucket, idx) => {
        const prices = m.buckets[bucket];
        if (prices && prices.length > 0) {
          const avg = prices.reduce((a, b) => a + b, 0) / prices.length;

          if (prevAvg > 0) {
            const rawVariation = ((avg - prevAvg) / prevAvg) * 100;
            // Filter out absurd data outliers (e.g., price dropping to 1 peso or jumping to billions)
            // Realistic month-to-month car price variation is usually between -50% and +100%
            if (rawVariation >= -99 && rawVariation <= 500) {
              m.variations[bucket] = rawVariation;
            }
          }
          prevAvg = avg;
        }
      });
    });

    // 3. Aggregate based on Scope
    let volatilityTimeSeries: any[] = [];

    // Determine scope logic:
    // 1. If explicit volatilityBrand is selected:
    //    - Single brand -> MODEL Scope (drill down models of that brand)
    //    - Multiple brands -> BRAND Scope (compare selected brands against each other)
    // 2. If no explicit volatilityBrand:
    //    - If global brand filter has 1 brand -> MODEL Scope
    //    - Otherwise -> BRAND Scope (compare all available brands)

    // Check params parsing (ensure it comes as array)
    const volBrandsParam = filters.volatilityBrand;
    const volBrands = Array.isArray(volBrandsParam) ? volBrandsParam : (volBrandsParam ? [volBrandsParam] : []);

    const globalBrandsParam = filters.brand;
    const globalBrands = Array.isArray(globalBrandsParam) ? globalBrandsParam : (globalBrandsParam ? [globalBrandsParam] : []);

    let targetScope: 'MODEL' | 'BRAND' = 'BRAND';
    let targetBrandForModelScope: string | null = null;
    let targetBrandsForBrandScope: string[] = [];

    if (volBrands.length === 1) {
      targetScope = 'MODEL';
      targetBrandForModelScope = volBrands[0];
    } else if (volBrands.length > 1) {
      targetScope = 'BRAND';
      targetBrandsForBrandScope = volBrands;
    } else {
      // Fallback to global filters
      if (globalBrands.length === 1) {
        targetScope = 'MODEL';
        targetBrandForModelScope = globalBrands[0];
      } else {
        targetScope = 'BRAND';
        // If global brands are filtered, we should respect that for "All" view too?
        // Existing logic respected it via filteredData.
        // So empty here means "All in filteredData".
        targetBrandsForBrandScope = [];
      }
    }

    if (targetScope === 'MODEL' && targetBrandForModelScope) {
      // Return top volatile models for the selected brand
      const targetBrand = targetBrandForModelScope;

      volatilityTimeSeries = Object.values(modelMap)
        .filter(m => m.brand === targetBrand)
        .map(m => {
          const dataPoints = Object.entries(m.variations).map(([date, variation]) => ({
            date, variation
          }));
          const score = dataPoints.reduce((sum, d) => sum + Math.abs(d.variation), 0) / (dataPoints.length || 1);
          return {
            entity: `${m.brand} - ${m.model}`,
            score,
            data: dataPoints
          };
        })
        .filter(s => s.data.length > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 20);

    } else {
      // Scope: Brand
      // Aggregate model variations by Brand
      const brandMap: Record<string, Record<string, number[]>> = {}; // brand -> bucket -> [variations]

      Object.values(modelMap).forEach(m => {
        const brand = m.brand;

        // Filter if specific brands are targeted
        if (targetBrandsForBrandScope.length > 0 && !targetBrandsForBrandScope.includes(brand)) {
          return;
        }

        if (!brandMap[brand]) brandMap[brand] = {};

        Object.entries(m.variations).forEach(([bucket, variation]) => {
          if (!brandMap[brand][bucket]) brandMap[brand][bucket] = [];
          brandMap[brand][bucket].push(variation);
        });
      });

      volatilityTimeSeries = Object.entries(brandMap).map(([brand, buckets]) => {
        const dataPoints = Object.entries(buckets).map(([bucket, variations]) => {
          // Average variation of all models in this brand for this bucket
          const avgVar = variations.reduce((a, b) => a + b, 0) / variations.length;
          return { date: bucket, variation: avgVar };
        });

        const score = dataPoints.reduce((sum, d) => sum + Math.abs(d.variation), 0) / (dataPoints.length || 1);

        return {
          entity: brand,
          score,
          data: dataPoints
        };
      })
        .filter(s => s.data.length > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 20);
    }

    // Clean up dates to be sorted in the response
    volatilityTimeSeries.forEach(series => {
      series.data.sort((a: any, b: any) => a.date.localeCompare(b.date));
    });

    // --- End Volatility Time Series ---

    // Calculate dynamic price segments based on min, max, and quartiles
    let priceDistribution: Array<{
      range: string;
      count: number;
      min_value: number;
      max_value: number;
    }> = [];

    if (prices.length > 0) {
      console.log('Price distribution calculation:', {
        minPrice,
        lowerQuartile,
        medianPrice,
        upperQuartile,
        maxPrice,
        totalPrices: prices.length
      });

      // Create 4 segments based on quartiles
      const segments = [
        { label: 'Muy Bajo', min: minPrice, max: lowerQuartile },
        { label: 'Bajo', min: lowerQuartile, max: medianPrice },
        { label: 'Medio', min: medianPrice, max: upperQuartile },
        { label: 'Alto', min: upperQuartile, max: maxPrice },
      ];

      priceDistribution = segments.map((segment, idx) => {
        const count = prices.filter(p => {
          if (idx === 0) {
            // First segment: min <= p <= q1
            return p >= segment.min && p <= segment.max;
          } else if (idx === segments.length - 1) {
            // Last segment: q3 < p <= max
            return p > segment.min && p <= segment.max;
          } else {
            // Middle segments: prev < p <= current
            return p > segment.min && p <= segment.max;
          }
        }).length;

        return {
          range: `${segment.label} (${formatPriceForRange(segment.min)}-${formatPriceForRange(segment.max)})`,
          count,
          min_value: segment.min,
          max_value: segment.max
        };
      });

      console.log('Price distribution result:', priceDistribution);
    }

    // Best value models (price below median)
    const bestValueModels = filteredData
      .filter(item => parseFloat(item.price) <= medianPrice)
      .sort((a, b) => parseFloat(a.price) - parseFloat(b.price))
      .slice(0, 5)
      .map(item => ({
        brand: item.products?.brand,
        name: item.products?.name,
        category: item.products?.category,
        price: parseFloat(item.price),
        value_rating: ((medianPrice - parseFloat(item.price)) / medianPrice * 100).toFixed(1)
      }));

    // Top 5 most expensive and cheapest (use filtered data)
    const sortedByPrice = [...filteredData].sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
    const top5Expensive = sortedByPrice.slice(0, 5).map(item => ({
      brand: item.products?.brand,
      model: item.products?.name,
      price: parseFloat(item.price)
    }));
    const top5Cheapest = sortedByPrice.slice(-5).reverse().map(item => ({
      brand: item.products?.brand,
      model: item.products?.name,
      price: parseFloat(item.price)
    }));

    // Historical data for selected models
    const historicalData = [];
    if (filters.model) {
      const { data: historical, error: histError } = await supabaseClient
        .from('price_data')
        .select(`
          date,
          price,
          products!inner (brand, model, name)
        `)
        .eq('products.model', filters.model)
        .order('date', { ascending: true });

      if (!histError && historical) {
        historicalData.push(...historical.map(item => ({
          date: item.date,
          price: parseFloat(item.price)
        })));
      }
    }

    console.log('Analytics generated successfully');

    return new Response(
      JSON.stringify({
        metrics,
        chart_data: {
          prices_by_brand: pricesByBrand,
          prices_by_category: pricesByCategory,
          prices_by_segment_breakdown: pricesBySegmentBreakdown,
          models_by_category: modelsByCategory,
          models_by_principal: modelsByPrincipal,
          price_distribution: priceDistribution,
          volatility_timeseries: volatilityTimeSeries, // New field
          best_value_models: bestValueModels,
          top_5_expensive: top5Expensive.map(item => ({
            brand: item.brand,
            name: item.model,
            price: item.price
          })),
          bottom_5_cheap: top5Cheapest.map(item => ({
            brand: item.brand,
            name: item.model,
            price: item.price
          })),
          brand_variations: brandVariations,
          monthly_volatility: monthlyVariation
        },
        historical_data: historicalData,
        applied_filters: {
          brand: filters.brand,
          category: filters.category,
          model: filters.model,
          submodel: filters.submodel,
          ctx_precio: filters.ctx_precio,
          priceRange: filters.priceRange,
          date_from: filters.dateFrom,
          date_to: filters.dateTo
        },
        // Sort ascending (Oldest -> Newest) and limit to the last rolling 12 months based on the LATEST data available
        available_dates: (() => {
          const allDates = [...new Set(monthlyData?.map((d: any) => d.date.split('T')[0]) || [])].sort() as string[];
          if (allDates.length === 0) return [];

          // Use the newest date in the database as the reference point, not the system clock
          const latestDateStr = allDates[allDates.length - 1];
          const latestDate = new Date(latestDateStr);

          // First day of the month, one year ago from the latest data point
          const oneYearAgo = new Date(latestDate.getFullYear() - 1, latestDate.getMonth(), 1);

          return allDates.filter(d => new Date(d) >= oneYearAgo);
        })(),
        generated_at: new Date().toISOString()
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=60, s-maxage=600, stale-while-revalidate=600',
        },
      }
    );

  } catch (error: unknown) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});