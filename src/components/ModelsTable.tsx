import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrency } from "@/contexts/CurrencyContext";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Badge } from "@/components/custom/Badge";
import { Package, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface ModelsTableProps {
  filters: {
    tipoVehiculo?: string | string[];
    brand?: string | string[];
    model?: string | string[];
    submodel?: string | string[];
  };
  statusFilter?: 'active' | 'inactive';
}

interface ModelData {
  model: string;
  submodel: string | null;
  brand: string;
  name: string;
  estado: string | null;
  count: number;
  precio_con_bono: number | null;
  precio_lista: number | null;
  bono: number | null;
}

export function ModelsTable({ filters, statusFilter = 'active' }: ModelsTableProps) {
  const { formatPrice } = useCurrency();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const { data: modelsData, isLoading } = useQuery({
    queryKey: ['models-table', filters, statusFilter],
    queryFn: async () => {
      // Get latest prices with product details
      const { data: priceData, error } = await supabase
        .from('price_data')
        .select(`
          product_id,
          price,
          precio_texto,
          precio_lista_num,
          bono_num,
          date,
          products!inner(
            id,
            name,
            brand,
            model,
            submodel,
            estado,
            tipo_vehiculo
          )
        `)
        .order('date', { ascending: false });

      if (error) throw error;

      // Group by product and get latest entry
      const productMap = new Map<string, any>();
      
      priceData?.forEach((item: any) => {
        const productId = item.product_id;
        const product = item.products;
        
        // Apply filters (only if array has values)
        const tipoArr = Array.isArray(filters.tipoVehiculo) ? filters.tipoVehiculo : filters.tipoVehiculo ? [filters.tipoVehiculo] : [];
        if (tipoArr.length > 0 && !tipoArr.includes(product.tipo_vehiculo)) return;
        
        const brandArr = Array.isArray(filters.brand) ? filters.brand : filters.brand ? [filters.brand] : [];
        if (brandArr.length > 0 && !brandArr.includes(product.brand)) return;
        
        const modelArr = Array.isArray(filters.model) ? filters.model : filters.model ? [filters.model] : [];
        if (modelArr.length > 0 && !modelArr.includes(product.model)) return;
        
        const submodelArr = Array.isArray(filters.submodel) ? filters.submodel : filters.submodel ? [filters.submodel] : [];
        if (submodelArr.length > 0 && !submodelArr.includes(product.submodel)) return;
        
        // Apply status filter
        const estado = product.estado?.toLowerCase() || 'vigente';
        if (statusFilter === 'active' && estado === 'inactivo') return;
        if (statusFilter === 'inactive' && estado !== 'inactivo') return;

        if (!productMap.has(productId) || new Date(item.date) > new Date(productMap.get(productId).date)) {
          productMap.set(productId, {
            ...item,
            product
          });
        }
      });

      // Aggregate by model and submodel
      const modelMap = new Map<string, ModelData>();
      
      Array.from(productMap.values()).forEach((item) => {
        const product = item.product;
        const modelKey = `${product.brand}-${product.model}-${product.submodel || 'sin-submodelo'}`;
        
        if (!modelMap.has(modelKey)) {
          modelMap.set(modelKey, {
            model: product.model,
            submodel: product.submodel,
            brand: product.brand,
            name: product.name,
            estado: product.estado,
            count: 0,
            precio_con_bono: null,
            precio_lista: null,
            bono: null,
          });
        }

        const modelData = modelMap.get(modelKey)!;
        modelData.count += 1;
        
        // Calculate average prices
        const currentCount = modelData.count;
        
        // precio_con_bono es el precio final (price o precio_texto parseado)
        const precioConBono = item.price || 0;
        // precio_lista_num es el precio de lista (sin bono)
        const precioLista = item.precio_lista_num || 0;
        // bono_num es el bono
        const bono = item.bono_num || 0;
        
        modelData.precio_con_bono = ((modelData.precio_con_bono || 0) * (currentCount - 1) + precioConBono) / currentCount;
        modelData.precio_lista = ((modelData.precio_lista || 0) * (currentCount - 1) + precioLista) / currentCount;
        modelData.bono = ((modelData.bono || 0) * (currentCount - 1) + bono) / currentCount;
      });

      return Array.from(modelMap.values()).sort((a, b) => (b.precio_con_bono || 0) - (a.precio_con_bono || 0));
    },
    staleTime: 30000,
  });

  const calculateVsList = (precioConBono: number | null, precioLista: number | null) => {
    if (!precioConBono || !precioLista || precioLista === 0) return 0;
    return ((precioConBono - precioLista) / precioLista) * 100;
  };

  // Pagination logic
  const totalPages = Math.ceil((modelsData?.length || 0) / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = modelsData?.slice(startIndex, endIndex);


  if (isLoading) {
    return (
      <Card className="border-border/50 shadow-md">
        <CardContent className="py-12">
          <LoadingSpinner size="lg" text="Cargando modelos..." />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 shadow-md hover:shadow-lg transition-shadow">
      <CardHeader className="space-y-1 pb-4">
        <CardTitle className="card-title flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          {statusFilter === 'active' ? 'Modelos Activos' : 'Modelos Inactivos'}
        </CardTitle>
        <CardDescription className="subtitle">
          Desglose detallado de precios por modelo
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[180px]">Modelo</TableHead>
                <TableHead className="min-w-[120px]">Submodelo</TableHead>
                <TableHead className="text-right">Precio c/Bono</TableHead>
                <TableHead className="text-right">Precio Lista</TableHead>
                <TableHead className="text-right">Bono</TableHead>
                <TableHead className="text-right">vs. Lista</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData?.map((model, index) => {
                const vsList = calculateVsList(model.precio_con_bono, model.precio_lista);
                const isNuevo = model.estado?.toLowerCase() === 'nuevo';
                
                return (
                  <TableRow key={`${model.brand}-${model.model}-${model.submodel}-${index}`}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <span>{model.model}</span>
                        {isNuevo && statusFilter === 'active' && (
                          <Badge variant="success">Nuevo</Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">{model.brand}</div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {model.submodel || '-'}
                    </TableCell>
                    <TableCell className="text-right">{formatPrice(model.precio_con_bono || 0)}</TableCell>
                    <TableCell className="text-right">{formatPrice(model.precio_lista || 0)}</TableCell>
                    <TableCell className="text-right">{formatPrice(model.bono || 0)}</TableCell>
                    <TableCell className="text-right">
                      <span className={vsList < 0 ? 'text-red-500' : vsList > 0 ? 'text-green-500' : ''}>
                        {vsList.toFixed(1)}%
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
              {(!paginatedData || paginatedData.length === 0) && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No hay modelos {statusFilter === 'inactive' ? 'inactivos' : 'activos'} para mostrar
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        
        {/* ✅ Nueva paginación optimizada para mobile */}
        {totalPages > 1 && (
          <div className="mt-4">
            <div className="flex items-center justify-between gap-2">
              {/* Botón Previous */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Anterior</span>
              </Button>

              {/* Indicador de página */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Página {currentPage} de {totalPages}
                </span>
              </div>

              {/* Botón Next */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="gap-1"
              >
                <span className="hidden sm:inline">Siguiente</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Números de página - solo en desktop */}
            <div className="hidden sm:flex justify-center mt-3 gap-1">
              {[...Array(totalPages)].map((_, i) => {
                const pageNum = i + 1;
                // Show first page, last page, current page, and pages around current
                if (
                  pageNum === 1 ||
                  pageNum === totalPages ||
                  (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                ) {
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                      className="w-9 h-9 p-0"
                    >
                      {pageNum}
                    </Button>
                  );
                } else if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                  return (
                    <span key={pageNum} className="flex items-center px-2 text-muted-foreground">
                      ...
                    </span>
                  );
                }
                return null;
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}