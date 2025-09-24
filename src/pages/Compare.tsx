import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { X, Plus, TrendingUp, DollarSign, Award, Zap, Scale } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from 'recharts'
import { PriceEvolutionChart } from "@/components/PriceEvolutionChart"

interface Product {
  id: string
  brand: string
  category: string
  model: string
  name: string
  latest_price?: number
  min_price?: number
  max_price?: number
  avg_price?: number
  price_history?: Array<{date: string, price: number}>
}

interface ComparisonData {
  product: Product
  value_score: number
  stability_score: number
  recommendation_score: number
}

export default function Compare() {
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const [comparisonFilter, setComparisonFilter] = useState({
    category: '',
    brand: '',
    maxPrice: '',
    ctx_precio: ''
  })

  // Fetch available products for selection
  const { data: products } = useQuery({
    queryKey: ['products-for-comparison'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          price_data (price, date)
        `)
        .order('brand')
      
      if (error) throw error
      
      return data?.map(product => {
        const prices = product.price_data?.map(p => p.price) || []
        const sortedHistory = product.price_data?.sort((a, b) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
        ) || []
        
        return {
          ...product,
          latest_price: prices.length > 0 ? prices[prices.length - 1] : 0,
          min_price: prices.length > 0 ? Math.min(...prices) : 0,
          max_price: prices.length > 0 ? Math.max(...prices) : 0,
          avg_price: prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0,
          price_history: sortedHistory
        }
      }) || []
    }
  })

  // Get brands and categories for filters
  const brands = [...new Set(products?.map(p => p.brand))].filter(Boolean)
  const categories = [...new Set(products?.map(p => p.category))].filter(Boolean)

  // Filter products based on current filters
  const filteredProducts = products?.filter(product => {
    if (comparisonFilter.category && product.category !== comparisonFilter.category) return false
    if (comparisonFilter.brand && product.brand !== comparisonFilter.brand) return false
    if (comparisonFilter.maxPrice && product.latest_price > parseInt(comparisonFilter.maxPrice)) return false
    // Note: ctx_precio filter would need to be implemented at the price_data level
    return true
  }) || []

  // Get comparison data for selected products
  const getComparisonData = (productIds: string[]): ComparisonData[] => {
    const selectedData = products?.filter(p => productIds.includes(p.id)) || []
    const avgMarketPrice = products?.reduce((sum, p) => sum + (p.latest_price || 0), 0) / (products?.length || 1)
    
    return selectedData.map(product => {
      const prices = product.price_data?.map(p => p.price) || []
      const priceVariation = prices.length > 1 ? 
        Math.sqrt(prices.reduce((acc, price) => acc + Math.pow(price - (product.avg_price || 0), 2), 0) / prices.length) : 0
      
      const valueScore = avgMarketPrice > 0 ? 
        Math.max(0, Math.min(100, ((avgMarketPrice - (product.latest_price || 0)) / avgMarketPrice * 100) + 50)) : 50
      
      const stabilityScore = product.avg_price > 0 ? 
        Math.max(0, 100 - (priceVariation / product.avg_price * 100)) : 0
      
      const recommendationScore = (valueScore * 0.4) + (stabilityScore * 0.3) + 
        (product.category === 'Sedán' ? 15 : product.category === 'SUV' ? 10 : 5) + 
        (product.latest_price && product.latest_price < avgMarketPrice ? 10 : 0)
      
      return {
        product,
        value_score: Math.round(valueScore),
        stability_score: Math.round(stabilityScore),
        recommendation_score: Math.round(Math.min(100, recommendationScore))
      }
    })
  }

  const comparisonData = getComparisonData(selectedProducts)

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500'
    if (score >= 60) return 'text-yellow-500'
    return 'text-red-500'
  }

  const getScoreBadge = (score: number) => {
    if (score >= 80) return <Badge variant="default" className="bg-green-600 text-white">Excelente</Badge>
    if (score >= 60) return <Badge variant="default" className="bg-yellow-600 text-white">Bueno</Badge>
    return <Badge variant="default" className="bg-red-600 text-white">Regular</Badge>
  }

  const addProduct = (productId: string) => {
    if (selectedProducts.length < 4 && !selectedProducts.includes(productId)) {
      setSelectedProducts([...selectedProducts, productId])
    }
  }

  const removeProduct = (productId: string) => {
    setSelectedProducts(selectedProducts.filter(id => id !== productId))
  }

  // Prepare radar chart data
  const radarData = comparisonData.length > 0 ? [
    {
      metric: 'Valor',
      ...comparisonData.reduce((acc, item, index) => ({
        ...acc,
        [`Modelo ${index + 1}`]: item.value_score
      }), {})
    },
    {
      metric: 'Estabilidad',
      ...comparisonData.reduce((acc, item, index) => ({
        ...acc,
        [`Modelo ${index + 1}`]: item.stability_score
      }), {})
    },
    {
      metric: 'Recomendación',
      ...comparisonData.reduce((acc, item, index) => ({
        ...acc,
        [`Modelo ${index + 1}`]: item.recommendation_score
      }), {})
    }
  ] : []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Comparador de Vehículos</h1>
        <p className="text-muted-foreground">
          Compara hasta 4 modelos para encontrar la mejor opción para ti
        </p>
      </div>

      {/* Filtros y Selección */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            Seleccionar Vehículos para Comparar
          </CardTitle>
          <CardDescription>
            Usa los filtros para encontrar los modelos que te interesan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4 mb-6">
            <Select value={comparisonFilter.category} onValueChange={(value) => 
              setComparisonFilter(f => ({ ...f, category: value === "all" ? "" : value }))
            }>
              <SelectTrigger>
                <SelectValue placeholder="Todas las categorías" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={comparisonFilter.brand} onValueChange={(value) => 
              setComparisonFilter(f => ({ ...f, brand: value === "all" ? "" : value }))
            }>
              <SelectTrigger>
                <SelectValue placeholder="Todas las marcas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las marcas</SelectItem>
                {brands.map(brand => (
                  <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={comparisonFilter.maxPrice} onValueChange={(value) => 
              setComparisonFilter(f => ({ ...f, maxPrice: value === "all" ? "" : value }))
            }>
              <SelectTrigger>
                <SelectValue placeholder="Precio máximo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Sin límite</SelectItem>
                <SelectItem value="300000">Hasta $300,000</SelectItem>
                <SelectItem value="500000">Hasta $500,000</SelectItem>
                <SelectItem value="800000">Hasta $800,000</SelectItem>
                <SelectItem value="1000000">Hasta $1,000,000</SelectItem>
              </SelectContent>
            </Select>

            <Button 
              onClick={() => setSelectedProducts([])}
              variant="outline"
              className="w-full"
            >
              Limpiar Selección
            </Button>
          </div>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {filteredProducts.slice(0, 12).map(product => (
              <div 
                key={product.id} 
                className={`p-3 border rounded-lg cursor-pointer transition-all ${
                  selectedProducts.includes(product.id) 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => selectedProducts.includes(product.id) ? removeProduct(product.id) : addProduct(product.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium">{product.brand} {product.model}</p>
                    <p className="text-sm text-muted-foreground">{product.category}</p>
                    <p className="text-sm font-semibold text-green-500">
                      {formatPrice(product.latest_price || 0)}
                    </p>
                  </div>
                  {selectedProducts.includes(product.id) ? (
                    <X className="h-4 w-4 text-red-500" />
                  ) : (
                    <Plus className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </div>
            ))}
          </div>

          {selectedProducts.length > 0 && (
            <div className="mt-4 p-3 bg-primary/10 border border-primary/20 rounded-lg">
              <p className="text-sm text-foreground">
                <strong>{selectedProducts.length}/4 modelos seleccionados</strong> - 
                {selectedProducts.length < 4 ? ' Puedes agregar más modelos' : ' Máximo alcanzado'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Comparación Detallada */}
      {comparisonData.length > 0 && (
        <>
          {/* Tabla de Comparación */}
          <Card>
            <CardHeader>
              <CardTitle>Comparación Detallada</CardTitle>
              <CardDescription>Análisis lado a lado de los modelos seleccionados</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3">Característica</th>
                      {comparisonData.map((item, index) => (
                        <th key={index} className="text-center p-3 min-w-[200px]">
                          <div>
                            <p className="font-medium">{item.product.brand}</p>
                            <p className="text-sm text-muted-foreground">{item.product.model}</p>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="p-3 font-medium">Precio Actual</td>
                      {comparisonData.map((item, index) => (
                        <td key={index} className="p-3 text-center">
                          <span className="text-lg font-bold text-green-500">
                            {formatPrice(item.product.latest_price || 0)}
                          </span>
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b">
                      <td className="p-3 font-medium">Categoría</td>
                      {comparisonData.map((item, index) => (
                        <td key={index} className="p-3 text-center">
                          <Badge variant="outline">{item.product.category}</Badge>
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b">
                      <td className="p-3 font-medium">Rango de Precios</td>
                      {comparisonData.map((item, index) => (
                        <td key={index} className="p-3 text-center text-sm">
                          {formatPrice(item.product.min_price || 0)} - {formatPrice(item.product.max_price || 0)}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b">
                      <td className="p-3 font-medium">Score de Valor</td>
                      {comparisonData.map((item, index) => (
                        <td key={index} className="p-3 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className={`text-lg font-bold ${getScoreColor(item.value_score)}`}>
                              {item.value_score}/100
                            </span>
                            {getScoreBadge(item.value_score)}
                          </div>
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b">
                      <td className="p-3 font-medium">Estabilidad de Precio</td>
                      {comparisonData.map((item, index) => (
                        <td key={index} className="p-3 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className={`text-lg font-bold ${getScoreColor(item.stability_score)}`}>
                              {item.stability_score}/100
                            </span>
                            {getScoreBadge(item.stability_score)}
                          </div>
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="p-3 font-medium">Recomendación General</td>
                      {comparisonData.map((item, index) => (
                        <td key={index} className="p-3 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className={`text-xl font-bold ${getScoreColor(item.recommendation_score)}`}>
                              {item.recommendation_score}/100
                            </span>
                            {getScoreBadge(item.recommendation_score)}
                          </div>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Gráficos de Comparación */}
          <div className="space-y-6">
            {/* Evolución de Precios de Modelos Seleccionados */}
            <PriceEvolutionChart
              selectedBrand={comparisonFilter.brand}
              selectedCategory={comparisonFilter.category}
            />
            
            <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Comparación de Scores</CardTitle>
                <CardDescription>Análisis visual de las métricas clave</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={comparisonData.map((item, index) => ({
                    name: `${item.product.brand} ${item.product.model}`,
                    valor: item.value_score,
                    estabilidad: item.stability_score,
                    recomendacion: item.recommendation_score
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="valor" fill="hsl(var(--primary))" name="Valor" />
                    <Bar dataKey="estabilidad" fill="hsl(var(--secondary))" name="Estabilidad" />
                    <Bar dataKey="recomendacion" fill="hsl(var(--accent))" name="Recomendación" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Comparación de Precios</CardTitle>
                <CardDescription>Diferencias de precio entre modelos</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={comparisonData.map((item, index) => ({
                    name: `${item.product.brand} ${item.product.model}`,
                    precio: item.product.latest_price,
                    minimo: item.product.min_price,
                    maximo: item.product.max_price
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value: number) => formatPrice(value)} />
                    <Legend />
                    <Bar dataKey="minimo" fill="hsl(var(--muted))" name="Precio Mínimo" />
                    <Bar dataKey="precio" fill="hsl(var(--primary))" name="Precio Actual" />
                    <Bar dataKey="maximo" fill="hsl(var(--destructive))" name="Precio Máximo" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
          </div>

          {/* Recomendación Final */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-yellow-500" />
                Recomendación Final
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const bestModel = comparisonData.reduce((best, current) => 
                  current.recommendation_score > best.recommendation_score ? current : best
                )
                const bestValue = comparisonData.reduce((best, current) => 
                  current.value_score > best.value_score ? current : best
                )
                
                return (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                      <h3 className="font-semibold text-green-400 mb-2 flex items-center gap-2">
                        🏆 Mejor Opción General
                      </h3>
                      <p className="font-medium text-lg">{bestModel.product.brand} {bestModel.product.model}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Score total: {bestModel.recommendation_score}/100
                      </p>
                      <p className="text-sm mt-2">
                        Este modelo ofrece la mejor combinación de valor, estabilidad y características.
                      </p>
                    </div>
                    
                    <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                      <h3 className="font-semibold text-blue-400 mb-2 flex items-center gap-2">
                        💰 Mejor Valor por Dinero
                      </h3>
                      <p className="font-medium text-lg">{bestValue.product.brand} {bestValue.product.model}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Score de valor: {bestValue.value_score}/100
                      </p>
                      <p className="text-sm mt-2">
                        Precio: {formatPrice(bestValue.product.latest_price || 0)} - La opción más económica de tu selección.
                      </p>
                    </div>
                  </div>
                )
              })()}
            </CardContent>
          </Card>
        </>
      )}

      {comparisonData.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Scale className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Selecciona modelos para comparar</h3>
            <p className="text-muted-foreground text-center mb-4">
              Elige hasta 4 vehículos de la lista de arriba para ver una comparación detallada.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}