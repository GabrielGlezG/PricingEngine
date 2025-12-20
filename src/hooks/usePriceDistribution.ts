import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"

export type PriceFilters = Partial<{
  tipoVehiculo: string | string[]
  brand: string | string[]
  category: string
  model: string | string[]
  submodel: string | string[]
  ctx_precio: string
  date_from: string
  date_to: string
  priceRange: string
}>

const formatPriceForRange = (price: number) => {
  if (price >= 1_000_000) return `$${(price / 1_000_000).toFixed(1)}M`
  return `$${(price / 1_000).toFixed(0)}k`
}

const getPrice = (it: any) => {
  const primary = Number(it?.precio_num ?? it?.precio_lista_num)
  if (!Number.isNaN(primary) && primary > 0) return primary
  const cleaned = String(it?.price ?? '').replace(/[^0-9.-]/g, '')
  const parsed = Number(cleaned)
  return Number.isNaN(parsed) ? 0 : parsed
}

export function usePriceDistribution(filters?: PriceFilters) {
  return useQuery({
    queryKey: ['price-distribution-local', filters],
    queryFn: async () => {
      // Fetch recent price_data and compute latest per product
      let query = supabase
        .from('price_data')
        .select(`
          id, price, date, ctx_precio, precio_num, precio_lista_num, bono_num, precio_texto,
          products!inner ( id, brand, category, model, name, submodel, tipo_vehiculo )
        `)
        .order('date', { ascending: false })
        .limit(2500)

      const { data, error } = await query
      if (error) throw error

      const latestMap = new Map<string, any>()
      data?.forEach((item: any) => {
        const pid = (item.products as any)?.id
        if (!pid) return
        if (!latestMap.has(pid) || new Date(item.date) > new Date(latestMap.get(pid).date)) {
          latestMap.set(pid, item)
        }
      })

      let rows = Array.from(latestMap.values())

      // Apply filters if provided
      if (filters) {
        if (filters.tipoVehiculo) {
          const tipos = Array.isArray(filters.tipoVehiculo) ? filters.tipoVehiculo : [filters.tipoVehiculo]
          rows = rows.filter(r => tipos.includes(r.products?.tipo_vehiculo))
        }
        if (filters.brand) {
          const brands = Array.isArray(filters.brand) ? filters.brand : [filters.brand]
          rows = rows.filter(r => brands.includes(r.products?.brand))
        }
        if (filters.category) rows = rows.filter(r => r.products?.category === filters.category)
        if (filters.model) {
          const models = Array.isArray(filters.model) ? filters.model : [filters.model]
          rows = rows.filter(r => models.includes(r.products?.model))
        }
        if (filters.submodel) {
          const submodels = Array.isArray(filters.submodel) ? filters.submodel : [filters.submodel]
          rows = rows.filter(r => submodels.includes(r.products?.submodel))
        }
        if (filters.ctx_precio) rows = rows.filter(r => r.ctx_precio === filters.ctx_precio)
        if (filters.priceRange) {
          const [min, max] = filters.priceRange.includes('+')
            ? [parseInt(filters.priceRange.replace('+', '')), Infinity]
            : filters.priceRange.split('-').map(Number)
          rows = rows.filter(item => {
            const p = getPrice(item)
            return p >= min && (max === Infinity || p <= max)
          })
        }
        if (filters.date_from || filters.date_to) {
          rows = rows.filter(item => {
            const d = new Date(item.date)
            if (filters.date_from && d < new Date(filters.date_from)) return false
            if (filters.date_to && d > new Date(filters.date_to)) return false
            return true
          })
        }
      }

      const prices = rows.map(getPrice).filter((p: number) => p > 0)
      if (prices.length === 0) return [] as Array<{range:string; count:number; min_value:number; max_value:number}>

      const sorted = [...prices].sort((a, b) => a - b)
      const min = sorted[0]
      const max = sorted[sorted.length - 1]
      const q1 = sorted[Math.floor(sorted.length * 0.25)]
      const med = sorted.length % 2
        ? sorted[Math.floor(sorted.length / 2)]
        : (sorted[sorted.length/2 - 1] + sorted[sorted.length/2]) / 2
      const q3 = sorted[Math.floor(sorted.length * 0.75)]

      const segments = [
        { label: 'Muy Bajo', min, max: q1 },
        { label: 'Bajo', min: q1, max: med },
        { label: 'Medio', min: med, max: q3 },
        { label: 'Alto', min: q3, max },
      ]

      const distribution = segments.map((s, idx) => {
        const count = prices.filter(p => {
          if (idx === 0) return p >= s.min && p <= s.max // include min..q1
          if (idx === segments.length - 1) return p > s.min && p <= s.max // q3..max
          return p > s.min && p <= s.max // middle segments
        }).length
        return {
          range: `${s.label} (${formatPriceForRange(s.min)}-${formatPriceForRange(s.max)})`,
          count,
          min_value: s.min,
          max_value: s.max,
        }
      })

      return distribution
    },
    staleTime: 0,
    refetchOnMount: true,
  })
}
