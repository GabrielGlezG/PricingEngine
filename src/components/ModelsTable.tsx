import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchModelsData } from "@/lib/fetchModelsData";
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
import { Package, ChevronLeft, ChevronRight, Download } from "lucide-react"; // Added Download
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
  const [isExporting, setIsExporting] = useState(false); // Added state
  const itemsPerPage = 5;

  const { data: modelsData, isLoading } = useQuery({
    queryKey: ['models-table', filters, statusFilter],
    queryFn: async () => {
      return await fetchModelsData({ filters, statusFilter });
    },
    staleTime: 30000,
  });

  const handleExport = async () => {
    if (!modelsData || modelsData.length === 0) return;
    
    setIsExporting(true);
    try {
      const { exportModelsToExcel } = await import('@/lib/exportUtils');
      await exportModelsToExcel(modelsData, "$", (p) => p);
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setIsExporting(false);
    }
  };

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
        <div className="flex items-center justify-between">
            <CardTitle className="card-title flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              {statusFilter === 'active' ? 'Modelos Activos' : 'Modelos Inactivos'}
            </CardTitle>
            <Button 
                variant="outline" 
                size="sm" 
                onClick={handleExport} 
                disabled={isExporting || !modelsData || modelsData.length === 0}
                className="gap-2"
            >
                {isExporting ? <LoadingSpinner size="sm" /> : <Download className="h-4 w-4" />}
                Exportar Excel
            </Button>
        </div>
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
                <TableHead className="min-w-[120px]">Versión</TableHead>
                <TableHead className="text-right">Precio c/Bono</TableHead>
                <TableHead className="text-right">Precio Lista</TableHead>
                <TableHead className="text-right">Bono</TableHead>
                <TableHead className="text-right">% Desc.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData?.map((model, index) => {
                // Calculate Discount % (Bono / Precio Lista)
                const discountPct = (model.bono && model.precio_lista && model.precio_lista > 0)
                  ? (model.bono / model.precio_lista) * 100
                  : 0;
                
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
                      <span className={discountPct > 0 ? 'text-green-600 font-bold' : 'text-muted-foreground'}>
                        {discountPct > 0 ? `${discountPct.toFixed(1)}%` : '-'}
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