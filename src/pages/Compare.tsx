import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useCurrency } from "@/contexts/CurrencyContext"
import { Card } from "@/components/custom/Card"
import { Badge } from "@/components/custom/Badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/custom/Input"
import { Search } from "lucide-react"
import { Slider } from "@/components/ui/slider"
import { X, Plus, Scale } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface Product {
  id: string
  brand: string
  category: string
  model: string
  submodel: string
  name: string
  latest_price?: number
  min_price?: number
  max_price?: number
  avg_price?: number
  price_history?: Array<{date: string, price: number}>
}

interface ComparisonData {
  product: Product
  priceData: Array<{date: string, [key: string]: string | number}>
}

export default function Compare() {
  const { formatPrice } = useCurrency()
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [comparisonFilter, setComparisonFilter] = useState({
    brand: '',
    model: '',
    submodel: '',
    priceRange: [0, 2000000] as [number, number]
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

  // Get brands, models and submodels for filters
  const brands = [...new Set(products?.map(p => p.brand))].filter(Boolean).sort()
  
  const models = [...new Set(
    products
      ?.filter(p => !comparisonFilter.brand || p.brand === comparisonFilter.brand)
      ?.map(p => p.model)
  )].filter(Boolean).sort()
  
  const submodels = [...new Set(
    products
      ?.filter(p => !comparisonFilter.brand || p.brand === comparisonFilter.brand)
      ?.filter(p => !comparisonFilter.model || p.model === comparisonFilter.model)
      ?.map(p => p.submodel)
  )].filter(Boolean).sort()

  // Don't filter dropdown options based on search
  const filteredBrands = brands
  const filteredModels = models
  const filteredSubmodels = submodels

  // Calculate min and max prices from available products
  const prices = products?.map(p => p.latest_price || 0).filter(p => p > 0) || []
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 2000000
  
  // Initialize price range when products are loaded for the first time
  useEffect(() => {
    if (products && products.length > 0 && comparisonFilter.priceRange[0] === 0 && comparisonFilter.priceRange[1] === 2000000 && minPrice > 0 && maxPrice > 0) {
      setComparisonFilter(f => ({ ...f, priceRange: [minPrice, maxPrice] }))
    }
  }, [products, minPrice, maxPrice])

  // Filter products based on current filters AND search query
  const filteredProducts = products?.filter(product => {
    if (comparisonFilter.brand && product.brand !== comparisonFilter.brand) return false
    if (comparisonFilter.model && product.model !== comparisonFilter.model) return false
    if (comparisonFilter.submodel && product.submodel !== comparisonFilter.submodel) return false
    const price = product.latest_price || 0
    if (price < comparisonFilter.priceRange[0] || price > comparisonFilter.priceRange[1]) return false
    
    // Apply search query filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesBrand = product.brand.toLowerCase().includes(query)
      const matchesModel = product.model.toLowerCase().includes(query)
      const matchesSubmodel = product.submodel?.toLowerCase().includes(query)
      const matchesName = product.name.toLowerCase().includes(query)
      
      if (!matchesBrand && !matchesModel && !matchesSubmodel && !matchesName) return false
    }
    
    return true
  }) || []

  // Get comparison data for selected products
  const getComparisonData = (productIds: string[]): ComparisonData[] => {
    const selectedData = products?.filter(p => productIds.includes(p.id)) || []
    
    // Combine all dates from all selected products
    const allDates = new Set<string>()
    selectedData.forEach(product => {
      product.price_history?.forEach(ph => {
        allDates.add(ph.date)
      })
    })
    
    // Sort dates
    const sortedDates = Array.from(allDates).sort()
    
    // Create price data for charts
    const priceData = sortedDates.map(date => {
      const dataPoint: any = { date: new Date(date).toLocaleDateString('es-MX', { month: 'short', year: 'numeric' }) }
      
      selectedData.forEach(product => {
        const priceEntry = product.price_history?.find(ph => ph.date === date)
        const label = `${product.brand} ${product.model} ${product.submodel || ''}`.trim()
        dataPoint[label] = priceEntry?.price || null
      })
      
      return dataPoint
    })
    
    return selectedData.map(product => ({
      product,
      priceData
    }))
  }

  const comparisonData = getComparisonData(selectedProducts)


  const addProduct = (productId: string) => {
    if (selectedProducts.length < 4 && !selectedProducts.includes(productId)) {
      setSelectedProducts([...selectedProducts, productId])
    }
  }

  const removeProduct = (productId: string) => {
    setSelectedProducts(selectedProducts.filter(id => id !== productId))
  }

  // Get colors for each product line
  const getProductColor = (index: number) => {
    const colors = ['hsl(var(--primary))', '#B17A50', 'hsl(var(--muted-foreground))', '#D0D0D0']
    return colors[index % colors.length]
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">Comparador de Vehículos</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Compara hasta 4 modelos para encontrar la mejor opción para ti
        </p>
      </div>

      {/* Filtros y Selección */}
      <Card>
        <div className="p-6">
          <div className="flex items-center gap-2 mb-2">
            <Scale className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold text-card-foreground">Seleccionar Vehículos para Comparar</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            Usa los filtros para encontrar los modelos que te interesan
          </p>

          {/* Search Input */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar marca, modelo o submodelo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-4 md:mb-6">
            <Select value={comparisonFilter.brand || "all"} onValueChange={(value) => {
              setComparisonFilter(f => ({ ...f, brand: value === "all" ? "" : value, model: "", submodel: "" }))
            }}>
              <SelectTrigger className="bg-card border-border">
                <SelectValue placeholder="Todas las marcas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las marcas</SelectItem>
                {filteredBrands.map(brand => (
                  <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={comparisonFilter.model || "all"} onValueChange={(value) => {
              setComparisonFilter(f => ({ ...f, model: value === "all" ? "" : value, submodel: "" }))
            }}>
              <SelectTrigger className="bg-card border-border">
                <SelectValue placeholder="Todos los modelos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los modelos</SelectItem>
                {filteredModels.map(model => (
                  <SelectItem key={model} value={model}>{model}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={comparisonFilter.submodel || "all"} onValueChange={(value) => {
              setComparisonFilter(f => ({ ...f, submodel: value === "all" ? "" : value }))
            }}>
              <SelectTrigger className="bg-card border-border">
                <SelectValue placeholder="Todos los submodelos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los submodelos</SelectItem>
                {filteredSubmodels.map(submodel => (
                  <SelectItem key={submodel} value={submodel}>{submodel}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button 
              onClick={() => {
                setSelectedProducts([])
                setComparisonFilter({
                  brand: '',
                  model: '',
                  submodel: '',
                  priceRange: [minPrice, maxPrice]
                })
              }}
              variant="copper"
              className="w-full"
            >
              <X className="h-4 w-4 mr-2" />
              Limpiar Todo
            </Button>
          </div>

          {products && products.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-foreground">Rango de Precio</label>
                <span className="text-sm text-muted-foreground">
                  {formatPrice(comparisonFilter.priceRange[0])} - {formatPrice(comparisonFilter.priceRange[1])}
                </span>
              </div>
              <Slider
                value={comparisonFilter.priceRange}
                onValueChange={(value) => setComparisonFilter(f => ({ ...f, priceRange: value as [number, number] }))}
                min={minPrice}
                max={maxPrice}
                step={10000}
                className="w-full"
              />
              <div className="flex justify-between mt-1">
                <span className="text-xs text-muted-foreground">{formatPrice(minPrice)}</span>
                <span className="text-xs text-muted-foreground">{formatPrice(maxPrice)}</span>
              </div>
            </div>
          )}

          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
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
                    <p className="font-medium text-foreground">
                      {product.brand} {product.model}
                    </p>
                    {product.submodel && (
                      <p className="text-sm text-primary">{product.submodel}</p>
                    )}
                    <p className="text-xs text-muted-foreground">{product.category}</p>
                    <p className="text-sm font-semibold text-primary mt-1">
                      {formatPrice(product.latest_price || 0)}
                    </p>
                  </div>
                  {selectedProducts.includes(product.id) ? (
                    <X className="h-4 w-4" style={{ color: '#B17A50' }} />
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
        </div>
      </Card>

      {/* Comparación Detallada */}
      {comparisonData.length > 0 && (
        <>
          {/* Tabla de Comparación */}
          <Card>
            <div className="p-4 md:p-6">
              <h2 className="text-lg md:text-xl font-semibold text-card-foreground mb-2">Comparación Detallada</h2>
              <p className="text-xs md:text-sm text-muted-foreground mb-4 md:mb-6">Análisis lado a lado de los modelos seleccionados</p>
              
              <div className="overflow-x-auto -mx-4 md:mx-0">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-3 text-foreground">Característica</th>
                      {comparisonData.map((item, index) => (
                        <th key={index} className="text-center p-3 min-w-[200px]">
                          <div>
                            <p className="font-medium text-foreground">{item.product.brand} {item.product.model}</p>
                            {item.product.submodel && (
                              <p className="text-sm text-primary">{item.product.submodel}</p>
                            )}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border">
                      <td className="p-3 font-medium text-foreground">Precio Actual</td>
                      {comparisonData.map((item, index) => (
                        <td key={index} className="p-3 text-center">
                          <span className="text-lg font-bold text-primary">
                            {formatPrice(item.product.latest_price || 0)}
                          </span>
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b border-border">
                      <td className="p-3 font-medium text-foreground">Categoría</td>
                      {comparisonData.map((item, index) => (
                        <td key={index} className="p-3 text-center">
                          <Badge variant="default">{item.product.category}</Badge>
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b border-border">
                      <td className="p-3 font-medium text-foreground">Precio Promedio Histórico</td>
                      {comparisonData.map((item, index) => (
                        <td key={index} className="p-3 text-center text-sm text-muted-foreground">
                          {formatPrice(item.product.avg_price || 0)}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b border-border">
                      <td className="p-3 font-medium text-foreground">Rango de Precios</td>
                      {comparisonData.map((item, index) => (
                        <td key={index} className="p-3 text-center text-sm text-muted-foreground">
                          {formatPrice(item.product.min_price || 0)} - {formatPrice(item.product.max_price || 0)}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </Card>

          {/* Gráfico de Evolución de Precios */}
          <Card>
            <div className="p-4 md:p-6">
              <h2 className="text-lg md:text-xl font-semibold text-card-foreground mb-2">Evolución de Precios</h2>
              <p className="text-xs md:text-sm text-muted-foreground mb-4 md:mb-6">Comparación de precios históricos</p>
              
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={comparisonData[0]?.priceData || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="date" 
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip 
                    formatter={(value: number) => formatPrice(value)}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      color: 'hsl(var(--foreground))'
                    }}
                  />
                  <Legend 
                    wrapperStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  {comparisonData.map((item, index) => {
                    const label = `${item.product.brand} ${item.product.model} ${item.product.submodel || ''}`.trim()
                    return (
                      <Line
                        key={index}
                        type="monotone"
                        dataKey={label}
                        stroke={getProductColor(index)}
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        name={label}
                        connectNulls
                      />
                    )
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </>
      )}

      {comparisonData.length === 0 && (
        <Card>
          <div className="flex flex-col items-center justify-center py-12 px-6">
            <Scale className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2 text-foreground">Selecciona modelos para comparar</h3>
            <p className="text-muted-foreground text-center mb-4">
              Elige hasta 4 vehículos de la lista de arriba para ver una comparación detallada.
            </p>
          </div>
        </Card>
      )}
    </div>
  )
}