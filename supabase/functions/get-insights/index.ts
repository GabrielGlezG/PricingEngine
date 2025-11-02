import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper to get price value
const getPrice = (item: any): number => {
  return item.precio_num || item.precio_lista_num || parseFloat(item.price) || 0;
}

// Helper to calculate percentage change
const calcPercentChange = (current: number, previous: number): number => {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    console.log('Analyzing historical data for insights...');

    // Fetch all price data with products
    const { data: priceData, error: priceError } = await supabaseClient
      .from('price_data')
      .select('*, products(brand, category, model, name, submodel)')
      .order('date', { ascending: false });

    if (priceError) throw priceError;

    console.log(`Processing ${priceData?.length || 0} price records`);

    const insights: any[] = [];
    
    // Group data by product
    const productGroups = new Map<string, any[]>();
    priceData?.forEach(item => {
      if (!item.products) return;
      const key = `${item.products.brand}_${item.products.model}_${item.products.submodel || ''}`;
      if (!productGroups.has(key)) {
        productGroups.set(key, []);
      }
      productGroups.get(key)!.push(item);
    });

    // 1. PRICE TREND ANALYSIS - Detectar cambios significativos
    const brandTrends = new Map<string, { current: number[], previous: number[] }>();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

    priceData?.forEach(item => {
      if (!item.products?.brand) return;
      const brand = item.products.brand;
      const price = getPrice(item);
      const date = new Date(item.date);
      
      if (!brandTrends.has(brand)) {
        brandTrends.set(brand, { current: [], previous: [] });
      }
      
      if (date >= thirtyDaysAgo) {
        brandTrends.get(brand)!.current.push(price);
      } else if (date >= sixtyDaysAgo && date < thirtyDaysAgo) {
        brandTrends.get(brand)!.previous.push(price);
      }
    });

    // Analyze significant trends
    brandTrends.forEach((trends, brand) => {
      if (trends.current.length === 0 || trends.previous.length === 0) return;
      
      const currentAvg = trends.current.reduce((a, b) => a + b, 0) / trends.current.length;
      const previousAvg = trends.previous.reduce((a, b) => a + b, 0) / trends.previous.length;
      const changePercent = calcPercentChange(currentAvg, previousAvg);
      
      if (Math.abs(changePercent) > 5) {
        insights.push({
          insight_type: 'price_trend',
          title: changePercent > 0 ? `${brand}: Incremento de Precios Detectado` : `${brand}: Reducción de Precios Detectada`,
          description: `Los precios de ${brand} ${changePercent > 0 ? 'subieron' : 'bajaron'} ${Math.abs(changePercent).toFixed(1)}% en los últimos 30 días`,
          data: {
            brand,
            change_percent: parseFloat(changePercent.toFixed(2)),
            current_avg: Math.round(currentAvg),
            previous_avg: Math.round(previousAvg),
            direction: changePercent > 0 ? 'up' : 'down'
          },
          priority: Math.abs(changePercent) > 15 ? 1 : Math.abs(changePercent) > 10 ? 2 : 3
        });
      }
    });

    // 2. BEST VALUE MODELS - Modelos por debajo de la mediana
    const latestPrices = new Map<string, any>();
    priceData?.forEach(item => {
      if (!item.products) return;
      const key = `${item.products.brand}_${item.products.model}_${item.products.submodel || ''}`;
      if (!latestPrices.has(key) || new Date(item.date) > new Date(latestPrices.get(key).date)) {
        latestPrices.set(key, { ...item, price: getPrice(item) });
      }
    });

    const prices = Array.from(latestPrices.values()).map(p => p.price).filter(p => p > 0);
    const median = prices.sort((a, b) => a - b)[Math.floor(prices.length / 2)] || 0;
    
    const bestValues = Array.from(latestPrices.values())
      .filter(item => item.price > 0 && item.price < median * 0.8)
      .sort((a, b) => a.price - b.price)
      .slice(0, 5)
      .map(item => ({
        brand: item.products.brand,
        model: item.products.model,
        name: item.products.name,
        category: item.products.category,
        price: Math.round(item.price),
        savings_vs_median: Math.round(((median - item.price) / median) * 100)
      }));

    if (bestValues.length > 0) {
      insights.push({
        insight_type: 'best_value',
        title: 'Mejores Oportunidades del Mercado',
        description: `${bestValues.length} modelos con precios hasta 20% por debajo de la mediana del mercado`,
        data: bestValues,
        priority: 1
      });
    }

    // 3. PRICE VOLATILITY - Modelos con precios estables
    const volatilityScores: any[] = [];
    productGroups.forEach((items, key) => {
      if (items.length < 5) return;
      
      const prices = items.map(i => getPrice(i)).filter(p => p > 0);
      const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
      const variance = prices.reduce((sum, p) => sum + Math.pow(p - avg, 2), 0) / prices.length;
      const stdDev = Math.sqrt(variance);
      const cv = (stdDev / avg) * 100;
      
      const product = items[0].products;
      if (product && cv < 20) {
        volatilityScores.push({
          brand: product.brand,
          model: product.model,
          name: product.name,
          avg_price: Math.round(avg),
          stability_score: parseFloat(cv.toFixed(2)),
          data_points: items.length
        });
      }
    });

    if (volatilityScores.length > 0) {
      volatilityScores.sort((a, b) => a.stability_score - b.stability_score);
      insights.push({
        insight_type: 'price_stability',
        title: 'Modelos con Precios Estables',
        description: `${volatilityScores.slice(0, 3).length} modelos mantienen precios consistentes en su historial`,
        data: volatilityScores.slice(0, 3),
        priority: 2
      });
    }

    // 4. CATEGORY COMPARISON
    const categoryStats = new Map<string, number[]>();
    Array.from(latestPrices.values()).forEach(item => {
      if (!item.products?.category || item.price <= 0) return;
      if (!categoryStats.has(item.products.category)) {
        categoryStats.set(item.products.category, []);
      }
      categoryStats.get(item.products.category)!.push(item.price);
    });

    const categoryAverages = Array.from(categoryStats.entries())
      .map(([category, prices]) => ({
        category,
        avg_price: prices.reduce((a, b) => a + b, 0) / prices.length,
        model_count: prices.length,
        max_price: Math.max(...prices),
        min_price: Math.min(...prices),
        price_range: Math.max(...prices) - Math.min(...prices)
      }))
      .filter(c => c.model_count >= 3);

    if (categoryAverages.length > 1) {
      categoryAverages.sort((a, b) => b.avg_price - a.avg_price);
      insights.push({
        insight_type: 'category_comparison',
        title: 'Comparación de Segmentos de Mercado',
        description: `Análisis de ${categoryAverages.length} segmentos diferentes en el mercado`,
        data: {
          most_expensive_category: {
            category: categoryAverages[0].category,
            avg_price: Math.round(categoryAverages[0].avg_price),
            model_count: categoryAverages[0].model_count,
            min_price: Math.round(categoryAverages[0].min_price),
            max_price: Math.round(categoryAverages[0].max_price),
            price_range: Math.round(categoryAverages[0].price_range)
          },
          most_affordable_category: {
            category: categoryAverages[categoryAverages.length - 1].category,
            avg_price: Math.round(categoryAverages[categoryAverages.length - 1].avg_price),
            model_count: categoryAverages[categoryAverages.length - 1].model_count,
            min_price: Math.round(categoryAverages[categoryAverages.length - 1].min_price),
            max_price: Math.round(categoryAverages[categoryAverages.length - 1].max_price),
            price_range: Math.round(categoryAverages[categoryAverages.length - 1].price_range)
          }
        },
        priority: 2
      });
    }

    // 5. HISTORICAL HIGHS AND LOWS
    const extremePrices: any[] = [];
    productGroups.forEach((items, key) => {
      if (items.length < 3) return;
      
      const prices = items.map(i => ({ price: getPrice(i), date: i.date }));
      const maxPrice = Math.max(...prices.map(p => p.price));
      const minPrice = Math.min(...prices.filter(p => p.price > 0).map(p => p.price));
      
      if (maxPrice > 0 && minPrice > 0 && (maxPrice / minPrice) > 1.3) {
        const product = items[0].products;
        const latestPrice = prices[0].price;
        extremePrices.push({
          brand: product.brand,
          model: product.model,
          name: product.name,
          current_price: Math.round(latestPrice),
          historical_high: Math.round(maxPrice),
          historical_low: Math.round(minPrice),
          range_percent: Math.round(((maxPrice - minPrice) / minPrice) * 100),
          position: latestPrice < (minPrice + (maxPrice - minPrice) * 0.3) ? 'near_low' : 
                   latestPrice > (minPrice + (maxPrice - minPrice) * 0.7) ? 'near_high' : 'mid_range'
        });
      }
    });

    if (extremePrices.length > 0) {
      const nearLows = extremePrices.filter(p => p.position === 'near_low').sort((a, b) => b.range_percent - a.range_percent).slice(0, 3);
      if (nearLows.length > 0) {
        insights.push({
          insight_type: 'historical_opportunity',
          title: 'Modelos Cerca de sus Mínimos Históricos',
          description: `${nearLows.length} modelos están cerca de sus precios más bajos registrados`,
          data: nearLows,
          priority: 1
        });
      }
    }

    console.log(`Generated ${insights.length} insights from data analysis`);

    return new Response(
      JSON.stringify({
        insights,
        generated_at: new Date().toISOString(),
        data_analyzed: {
          total_records: priceData?.length || 0,
          products_tracked: productGroups.size,
          date_range: priceData && priceData.length > 0 ? {
            from: priceData[priceData.length - 1]?.date,
            to: priceData[0]?.date
          } : null
        }
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