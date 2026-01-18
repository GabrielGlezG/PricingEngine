import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    console.log('Fetching historical data for destacados...')

    // Obtener todos los datos históricos con productos (FULL HISTORY)
    const { data: historicalData, error: histError } = await supabaseClient
      .from('price_data')
      .select(`
        price,
        date,
        product_id,
        products (
          id,
          name,
          brand,
          model,
          category,
          image_url
        )
      `)
      .order('date', { ascending: false })

    if (histError) {
      console.error('Error fetching historical data:', histError)
      throw histError
    }

    console.log(`Retrieved ${historicalData?.length || 0} historical records`)

    // Helper to safely extract numeric price
    const getPrice = (item: any) => {
      // Try numeric fields first if available (though query currently only selects 'price')
      const primary = Number((item as any).precio_num ?? (item as any).precio_lista_num);
      if (!Number.isNaN(primary) && primary > 0) return primary;

      // Fallback to cleaning string price
      const raw = (item as any).price;
      if (typeof raw === 'number') return raw;

      const cleaned = String(raw ?? '').replace(/[^0-9.-]/g, '');
      const parsed = Number(cleaned);
      return Number.isNaN(parsed) ? 0 : parsed;
    };

    // PRE-OPTIMIZATION: Group history by product_id for O(1) access
    const productHistoryMap = new Map<string, any[]>();
    historicalData?.forEach((item: any) => {
      if (!productHistoryMap.has(item.product_id)) {
        productHistoryMap.set(item.product_id, []);
      }
      productHistoryMap.get(item.product_id)!.push(item);
    });

    // 1. TENDENCIAS DE MERCADO - Últimos 6 meses
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    const recentData = historicalData.filter(item =>
      item.products && new Date(item.date) >= sixMonthsAgo
    )

    // Calcular tendencia general del mercado
    const monthlyAvg: { [key: string]: { total: number; count: number } } = {}
    recentData.forEach(item => {
      const price = getPrice(item);
      if (price <= 0) return;

      const month = new Date(item.date).toISOString().substring(0, 7)
      if (!monthlyAvg[month]) {
        monthlyAvg[month] = { total: 0, count: 0 }
      }
      monthlyAvg[month].total += price
      monthlyAvg[month].count += 1
    })

    const marketTrend = Object.entries(monthlyAvg)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month,
        avgPrice: Math.round(data.total / data.count)
      }))

    // 2. MEJORES OFERTAS ACTUALES (Oportunidades Comerciales)
    // Query active products with bono > 0
    const { data: commercialDeals, error: dealsError } = await supabaseClient
      .from('products')
      .select('id, brand, model, submodel, name, category, image_url, precio_lista, bono, precio_con_bono')
      .eq('status', 'active')
      .gt('bono', 0)
      .gt('precio_lista', 0)
      .order('bono', { ascending: false });

    if (dealsError) {
      console.error("Error fetching commercial deals:", dealsError);
    }

    const bestDeals = (commercialDeals || [])
      .map(item => {
        const listPrice = Number(item.precio_lista);
        const bonus = Number(item.bono);

        if (!listPrice || listPrice <= 0) return null;

        const discountPct = (bonus / listPrice) * 100;

        return {
          ...item,
          product_id: item.id,
          products: item, // Maintain structure for frontend compat
          price: Number(item.precio_con_bono) || (listPrice - bonus),
          historicalAvg: listPrice, // Use List Price as reference
          discount: Math.round(discountPct * 10) / 10
        };
      })
      .filter(item => item && item.discount >= 2) // Minimum 2% discount to show
      .sort((a, b) => b!.discount - a!.discount)
      .slice(0, 10); // Top 10 opportunities

    // --- RESTORED DEFINITIONS FOR SECTIONS 3, 5, 6 ---
    // These were previously part of Section 2 but are needed globally
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const latestPrices = new Map()
    historicalData.forEach((item: any) => {
      if (item.products && (!latestPrices.has(item.product_id) ||
        new Date(item.date) > new Date(latestPrices.get(item.product_id).date))) {
        latestPrices.set(item.product_id, item)
      }
    })
    // ------------------------------------------------

    // 3. MODELOS MÁS MONITOREADOS
    const productDataCount = new Map()
    historicalData.forEach(item => {
      if (!item.products) return
      productDataCount.set(
        item.product_id,
        (productDataCount.get(item.product_id) || 0) + 1
      )
    })

    const mostMonitored = Array.from(latestPrices.values())
      .filter(item => item.products)
      .map(item => ({
        ...item,
        price: getPrice(item), // Normalize
        dataPoints: productDataCount.get(item.product_id) || 0
      }))
      .sort((a, b) => b.dataPoints - a.dataPoints)
      .slice(0, 6)

    // 4. ANÁLISIS POR CATEGORÍA
    const categoryStats: {
      [key: string]: {
        count: number
        totalPrice: number
        minPrice: number
        maxPrice: number
        products: Set<string>
      }
    } = {}

    recentData.forEach(item => {
      const price = getPrice(item);
      if (!item.products || price <= 0) return

      const product = item.products as unknown as { category: string; brand: string }
      const cat = product.category
      if (!categoryStats[cat]) {
        categoryStats[cat] = {
          count: 0,
          totalPrice: 0,
          minPrice: Infinity,
          maxPrice: 0,
          products: new Set()
        }
      }
      categoryStats[cat].count += 1
      categoryStats[cat].totalPrice += price
      categoryStats[cat].minPrice = Math.min(categoryStats[cat].minPrice, price)
      categoryStats[cat].maxPrice = Math.max(categoryStats[cat].maxPrice, price)
      categoryStats[cat].products.add(item.product_id)
    })

    const categoryAnalysis = Object.entries(categoryStats)
      .map(([category, stats]) => ({
        category,
        avgPrice: Math.round(stats.totalPrice / stats.count),
        minPrice: stats.minPrice,
        maxPrice: stats.maxPrice,
        productCount: stats.products.size,
        dataPoints: stats.count
      }))
      .sort((a, b) => b.dataPoints - a.dataPoints)

    // 5. MARCAS MÁS ACTIVAS (Usando catálogo completo actual)
    const brandStats: {
      [key: string]: {
        products: Set<string>
        models: Set<string>
        dataPoints: number // count of products in this context
        totalPrice: number
      }
    } = {}

    // Use latestPrices to ensure we count ALL unique products currently in catalog
    latestPrices.forEach(item => {
      const price = getPrice(item);
      if (!item.products || price <= 0) return

      const product = item.products as unknown as { brand: string; model: string }
      const brand = product.brand
      if (!brandStats[brand]) {
        brandStats[brand] = {
          products: new Set(),
          models: new Set(),
          dataPoints: 0,
          totalPrice: 0
        }
      }
      brandStats[brand].products.add(item.product_id)
      brandStats[brand].models.add(product.model)
      brandStats[brand].dataPoints += 1
      brandStats[brand].totalPrice += price
    })

    const topBrands = Object.entries(brandStats)
      .map(([brand, stats]) => ({
        brand,
        productCount: stats.products.size,
        dataPoints: stats.dataPoints,
        avgPrice: Math.round(stats.totalPrice / stats.dataPoints)
      }))
      .sort((a, b) => b.productCount - a.productCount)
      .slice(0, 10)

    const allBrands = Object.entries(brandStats)
      .map(([brand, stats]) => ({
        brand,
        productCount: stats.products.size,
        modelCount: stats.models.size
      }))
      .sort((a, b) => a.brand.localeCompare(b.brand))



    // 6. CAMBIOS SIGNIFICATIVOS RECIENTES (OPTIMIZED)
    const recentChanges = Array.from(latestPrices.values())
      .filter(item => {
        if (!item.products) return false
        const itemDate = new Date(item.date)
        return itemDate >= thirtyDaysAgo
      })
      .map(latest => {
        // Use O(1) map lookup instead of O(N) filter
        const fullHistory = productHistoryMap.get(latest.product_id) || [];
        // History is already sorted by date desc because of main query
        // Find first item older than this one
        const previousItem = fullHistory.find(h => h.date < latest.date);

        if (!previousItem) return null;

        const currentPrice = getPrice(latest);
        const previousPrice = getPrice(previousItem);

        if (currentPrice <= 0 || previousPrice <= 0) return null;

        const change = ((currentPrice - previousPrice) / previousPrice) * 100;

        return {
          product: latest.products,
          currentPrice,
          previousPrice,
          change: Math.round(change * 10) / 10,
          date: latest.date
        }
      })
      .filter(item => item && Math.abs(item.change) >= 2) // Lower threshold slightly or keep 5
      .sort((a, b) => Math.abs(b!.change) - Math.abs(a!.change))
      .slice(0, 10)


    const response = {
      generatedAt: new Date().toISOString(),
      summary: {
        totalProducts: latestPrices.size,
        totalDataPoints: historicalData.length,
        categoriesCount: Object.keys(categoryStats).length,
        brandsCount: Object.keys(brandStats).length,
        dateRange: {
          from: historicalData[historicalData.length - 1]?.date || null,
          to: historicalData[0]?.date || null
        }
      },
      marketTrend,
      bestDeals,
      mostMonitored,
      categoryAnalysis,
      topBrands,
      allBrands,
      recentChanges: recentChanges.filter(Boolean)
    }

    console.log('Destacados generated successfully')

    return new Response(
      JSON.stringify(response),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=60, s-maxage=600, stale-while-revalidate=600',
        }
      }
    )

  } catch (error: unknown) {
    console.error('Error in get-destacados function:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    )
  }
})