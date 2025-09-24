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
    const filters = {
      brand: url.searchParams.get('brand') || '',
      category: url.searchParams.get('category') || '',
      model: url.searchParams.get('model') || '',
      submodel: url.searchParams.get('submodel') || '',
      ctx_precio: url.searchParams.get('ctx_precio') || '',
      priceRange: url.searchParams.get('priceRange') || '',
      dateFrom: url.searchParams.get('dateFrom') || '',
      dateTo: url.searchParams.get('dateTo') || ''
    };

    console.log('Received filters:', filters);

    // Get latest price data for each product with related product information
    const { data: priceData, error: priceError } = await supabaseClient
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
          submodel
        )
      `)
      .order('date', { ascending: false });

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

    let filteredData = Array.from(latestPrices.values());

    // Apply filters
    if (filters.brand) {
      filteredData = filteredData.filter(item => item.products?.brand === filters.brand);
    }
    if (filters.category) {
      filteredData = filteredData.filter(item => item.products?.category === filters.category);
    }
    if (filters.model) {
      filteredData = filteredData.filter(item => item.products?.model === filters.model);
    }
    if (filters.submodel) {
      filteredData = filteredData.filter(item => item.products?.submodel === filters.submodel);
    }
    if (filters.ctx_precio) {
      filteredData = filteredData.filter(item => item.ctx_precio === filters.ctx_precio);
    }
    if (filters.priceRange) {
      const [min, max] = filters.priceRange.includes('+') 
        ? [parseInt(filters.priceRange.replace('+', '')), Infinity]
        : filters.priceRange.split('-').map(Number);
      filteredData = filteredData.filter(item => {
        const price = parseFloat(item.price);
        return price >= min && (max === Infinity || price <= max);
      });
    }
    if (filters.dateFrom || filters.dateTo) {
      filteredData = filteredData.filter(item => {
        const itemDate = new Date(item.date);
        if (filters.dateFrom && itemDate < new Date(filters.dateFrom)) return false;
        if (filters.dateTo && itemDate > new Date(filters.dateTo)) return false;
        return true;
      });
    }

    console.log('Filtered data count:', filteredData.length);

    // Calculate comprehensive metrics
    const prices = filteredData.map(item => parseFloat(item.price));
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
    
    // Calculate metrics based on current scraping date
    const metrics = {
      total_models: filteredData.length,
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
      total_scraping_sessions: 0 // Will be updated below
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
      
      // Get historical trend for this brand (last 2 scraping dates)
      const { data: brandHistory } = await supabaseClient
        .from('price_data')
        .select(`
          date, price,
          products!inner (brand)
        `)
        .eq('products.brand', brand)
        .order('date', { ascending: false })
        .limit(100);
      
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

    const pricesByCategory = categories.map(category => {
      const categoryPrices = filteredData
        .filter(item => item.products?.category === category)
        .map(item => parseFloat(item.price));
      return {
        category,
        avg_price: categoryPrices.reduce((a, b) => a + b, 0) / categoryPrices.length,
        min_price: Math.min(...categoryPrices),
        max_price: Math.max(...categoryPrices),
        count: categoryPrices.length
      };
    });

    // Group by main model for model principal analysis
    const modelPrincipals = [...new Set(filteredData.map(item => item.products?.model))].filter(Boolean);
    const modelsByPrincipal = modelPrincipals.map(modelPrincipal => {
      const modelData = filteredData.filter(item => item.products?.model === modelPrincipal);
      const modelPrices = modelData.map(item => parseFloat(item.price));
      return {
        model_principal: modelPrincipal,
        count: modelData.length,
        avg_price: modelPrices.reduce((a, b) => a + b, 0) / modelPrices.length,
        min_price: Math.min(...modelPrices),
        max_price: Math.max(...modelPrices)
      };
    });

    const modelsByCategory = categories.map(category => ({
      category,
      count: filteredData.filter(item => item.products?.category === category).length
    }));

    // Calculate monthly variation for volatility analysis
    const { data: monthlyData } = await supabaseClient
      .from('price_data')
      .select(`
        date,
        price,
        products!inner (id, brand, model, name)
      `)
      .order('date', { ascending: true });

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
      // Group by product and calculate monthly changes
      const productGroups: Record<string, Array<{
        date: string;
        price: number;
        brand: string;
        model: string;
        name: string;
      }>> = monthlyData.reduce((acc, item: any) => {
        const key = `${(item.products as any).brand}-${(item.products as any).model}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push({
          date: item.date,
          price: parseFloat(item.price),
          brand: (item.products as any).brand,
          model: (item.products as any).model,
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
        if (data.length > 1) {
          const sortedData = data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
          const variations = [];
          
          for (let i = 1; i < sortedData.length; i++) {
            const variation = Math.abs((sortedData[i].price - sortedData[i-1].price) / sortedData[i-1].price * 100);
            variations.push(variation);
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

    // Calculate brand price variations between scraping dates
    const brandVariations = await Promise.all(brands.map(async (brand) => {
      const { data: brandHistory } = await supabaseClient
        .from('price_data')
        .select(`
          date, price,
          products!inner (brand)
        `)
        .eq('products.brand', brand)
        .order('date', { ascending: true });

      if (brandHistory && brandHistory.length > 1) {
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

        if (dateAverages.length > 1) {
          const firstAvg = dateAverages[0].avg_price;
          const lastAvg = dateAverages[dateAverages.length - 1].avg_price;
          const variation = ((lastAvg - firstAvg) / firstAvg * 100);
          
          return {
            brand,
            first_avg_price: firstAvg,
            last_avg_price: lastAvg,
            variation_percent: variation,
            scraping_sessions: dateAverages.length
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

    // Price distribution for comparison insights
    const priceDistribution = [
      { range: 'Bajo ($0-$300k)', count: prices.filter(p => p <= 300000).length },
      { range: 'Medio ($300k-$600k)', count: prices.filter(p => p > 300000 && p <= 600000).length },
      { range: 'Alto ($600k-$1M)', count: prices.filter(p => p > 600000 && p <= 1000000).length },
      { range: 'Premium ($1M+)', count: prices.filter(p => p > 1000000).length }
    ];

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

    // Top 5 most expensive and cheapest
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
          models_by_category: modelsByCategory,
          models_by_principal: modelsByPrincipal,
          price_distribution: priceDistribution,
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
        generated_at: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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