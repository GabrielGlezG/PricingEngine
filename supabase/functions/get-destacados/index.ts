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
        id,
        price,
        date,
        ctx_precio,
        store,
        product_id,
        products (
          id,
          name,
          brand,
          model,
          submodel,
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
      const month = new Date(item.date).toISOString().substring(0, 7)
      if (!monthlyAvg[month]) {
        monthlyAvg[month] = { total: 0, count: 0 }
      }
      monthlyAvg[month].total += item.price
      monthlyAvg[month].count += 1
    })

    const marketTrend = Object.entries(monthlyAvg)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month,
        avgPrice: Math.round(data.total / data.count)
      }))

    // 2. MEJORES OFERTAS ACTUALES
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const latestPrices = new Map()
    historicalData.forEach(item => {
      if (item.products && (!latestPrices.has(item.product_id) ||
        new Date(item.date) > new Date(latestPrices.get(item.product_id).date))) {
        latestPrices.set(item.product_id, item)
      }
    })

    const productHistoricalAvg = new Map()
    historicalData.forEach(item => {
      if (!item.products) return
      if (!productHistoricalAvg.has(item.product_id)) {
        productHistoricalAvg.set(item.product_id, { total: 0, count: 0 })
      }
      const data = productHistoricalAvg.get(item.product_id)
      data.total += item.price
      data.count += 1
    })

    const bestDeals = Array.from(latestPrices.values())
      .filter(item => item.products && productHistoricalAvg.has(item.product_id))
      .map(item => {
        const avgData = productHistoricalAvg.get(item.product_id)
        const historicalAvg = avgData.total / avgData.count
        const discount = ((historicalAvg - item.price) / historicalAvg) * 100
        return {
          ...item,
          historicalAvg: Math.round(historicalAvg),
          discount: Math.round(discount * 10) / 10
        }
      })
      .filter(item => item.discount > 5)
      .sort((a, b) => b.discount - a.discount)
      .slice(0, 8)

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
      if (!item.products) return
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
      categoryStats[cat].totalPrice += item.price
      categoryStats[cat].minPrice = Math.min(categoryStats[cat].minPrice, item.price)
      categoryStats[cat].maxPrice = Math.max(categoryStats[cat].maxPrice, item.price)
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

    // 5. MARCAS MÁS ACTIVAS
    const brandStats: {
      [key: string]: {
        products: Set<string>
        models: Set<string>
        dataPoints: number
        totalPrice: number
      }
    } = {}

    recentData.forEach(item => {
      if (!item.products) return
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
      brandStats[brand].totalPrice += item.price
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

        const previousPrice = previousItem.price;
        const change = ((latest.price - previousPrice) / previousPrice) * 100;

        return {
          product: latest.products,
          currentPrice: latest.price,
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