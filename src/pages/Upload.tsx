import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
// @ts-ignore - Papa parse types
import Papa from "papaparse";
import { supabase } from "@/integrations/supabase/client";
import { useLastUpdate } from "@/contexts/LastUpdateContext";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { InstitutionalHeader } from "@/components/InstitutionalHeader";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  FileJson,
  CheckCircle,
  AlertCircle,
  Clock,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ScrapingJob {
  id: string;
  status: string;
  total_products: number;
  completed_products: number;
  created_at: string;
  completed_at?: string;
  error_message?: string;
}

const ITEMS_PER_PAGE = 5;

export default function UploadComponent() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { setLastUpdate } = useLastUpdate();


  const { data: jobsData, refetch: refetchJobs } = useQuery({
    queryKey: ["scraping-jobs", currentPage],
    queryFn: async () => {
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      // Get total count
      const { count } = await supabase
        .from("scraping_jobs")
        .select("*", { count: "exact", head: true });

      // Get paginated data
      const { data, error } = await supabase
        .from("scraping_jobs")
        .select("*")
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;
      return {
        jobs: data as ScrapingJob[],
        totalCount: count || 0,
        totalPages: Math.ceil((count || 0) / ITEMS_PER_PAGE),
      };
    },
    refetchInterval: 5000,
  });

  useEffect(() => {
  if (jobsData?.jobs?.length) {
    const lastDate = jobsData.jobs[0].created_at;
    setLastUpdate(lastDate);
  }
}, [jobsData, setLastUpdate]);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      let jsonData: any;
      const batchId = crypto.randomUUID();

      if (file.name.endsWith(".json")) {
        const text = await file.text();
        jsonData = JSON.parse(text);
      } else if (file.name.endsWith(".csv")) {
        const text = await file.text();
        const parsed = Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (header) => header.trim(),
        });
        jsonData = parsed.data;
      } else if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
        throw new Error(
          "Los archivos Excel deben convertirse a CSV primero. Por favor exporta tu archivo como CSV y vuelve a subirlo."
        );
      } else {
        throw new Error("Tipo de archivo no soportado");
      }

      const { data, error } = await supabase.functions.invoke("upload-json", {
        body: { data: jsonData, batchId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Archivo cargado exitosamente",
        description: "Los datos están siendo procesados en segundo plano.",
      });
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setCurrentPage(1);
      refetchJobs();
    },
    onError: (error: any) => {
      toast({
        title: "Error al cargar archivo",
        description: error.message || "Ocurrió un error inesperado",
        variant: "destructive",
      });
    },
  });

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    const validFile = files.find(
      (file) =>
        file.type === "application/json" ||
        file.name.endsWith(".json") ||
        file.type === "text/csv" ||
        file.name.endsWith(".csv") ||
        file.type ===
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
        file.name.endsWith(".xlsx") ||
        file.name.endsWith(".xls")
    );

    if (validFile) {
      setSelectedFile(validFile);
    } else {
      toast({
        title: "Archivo inválido",
        description:
          "Por favor selecciona un archivo JSON, CSV o Excel válido.",
        variant: "destructive",
      });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = () => {
    if (selectedFile) {
      uploadMutation.mutate(selectedFile);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-primary" />;
      case "processing":
        return <Clock className="h-4 w-4 text-muted-foreground" />;
      case "failed":
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge variant="default" className="bg-primary">
            Completado
          </Badge>
        );
      case "processing":
        return <Badge variant="secondary">Procesando</Badge>;
      case "failed":
        return <Badge variant="destructive">Fallido</Badge>;
      default:
        return <Badge variant="secondary">Pendiente</Badge>;
    }
  };

  const jobs = jobsData?.jobs || [];
  const totalPages = jobsData?.totalPages || 0;
  const totalCount = jobsData?.totalCount || 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <InstitutionalHeader
        title="Gestión de Datos"
        description="Centro de carga y procesamiento de archivos para el motor de precios."
      />

      <Card className="border-border/60 shadow-sm bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Upload className="h-5 w-5 text-primary" />
            Nueva Carga de Archivos
          </CardTitle>
          <CardDescription>
            Soporta formatos JSON, CSV y Excel. Los archivos grandes se procesarán en segundo plano.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Área de drag & drop Premium */}
          <div
            className={`group border-2 border-dashed rounded-xl p-10 text-center transition-all duration-500 ease-out ${
              dragActive
                ? "border-primary bg-primary/5 scale-[1.01] shadow-lg"
                : "border-border/60 hover:border-primary/40 hover:bg-muted/20"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="mb-4 p-4 bg-muted/30 rounded-full w-fit mx-auto group-hover:bg-primary/10 group-hover:scale-110 transition-all duration-500">
              <FileJson className="h-10 w-10 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <div className="space-y-2">
              <p className="text-xl font-medium text-foreground">
                {selectedFile ? selectedFile.name : "Arrastra y suelta tus archivos aquí"}
              </p>
              <p className="text-sm text-muted-foreground">
                o selecciona desde tu ordenador
              </p>
              <Label htmlFor="file-upload" className="cursor-pointer">
                <div className="mt-4">
                  <Button variant="outline" className="border-primary/20 hover:bg-primary/5 hover:text-primary" asChild>
                    <span>Explorar Archivos</span>
                  </Button>
                </div>
              </Label>
              <Input
                ref={fileInputRef}
                id="file-upload"
                type="file"
                accept=".json,.csv,.xlsx,.xls,application/json,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          </div>

          {/* Información del archivo seleccionado */}
          {selectedFile && (
            <div className="bg-muted/30 border border-border/50 rounded-lg p-4 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-background rounded-md shadow-sm border border-border/50">
                   <FileJson className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  onClick={() => {
                    setSelectedFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
                <Button
                  onClick={handleUpload}
                  disabled={uploadMutation.isPending}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-all"
                >
                  {uploadMutation.isPending ? "Procesando..." : "Iniciar Carga"}
                </Button>
              </div>
            </div>
          )}

          {/* Formato esperado Collapsible/Acordeón style via Details/Summary could be better but sticking to strict design */}
          <div className="mt-4 pt-4 border-t border-border/40">
            <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Estructura Requerida (Referencia)</p>
            <pre className="bg-muted/30 border border-border/40 p-4 rounded-lg text-xs font-mono text-muted-foreground overflow-x-auto">
              {`{
  "UID", "ID_Base", "Categoría", "Modelo Principal", "Modelo",
  "Tipo_Vehiculo", "ctx_precio", "precio_num", "precio_lista_num",
  "Fecha", "Timestamp", "estado" ...
}`}
            </pre>
          </div>
        </CardContent>
      </Card>

      {/* Historial de trabajos Rediseñado con Tabla */}
      <Card className="border-border/60 shadow-sm bg-card/50">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="space-y-1">
             <CardTitle className="text-lg flex items-center gap-2">
               <Clock className="h-5 w-5 text-primary" />
               Historial de Procesamiento
             </CardTitle>
             <CardDescription>Registro de cargas y estado de ingestión</CardDescription>
          </div>
          {totalCount > 0 && (
            <Badge variant="outline" className="bg-background">
              {totalCount} Registros
            </Badge>
          )}
        </CardHeader>
        <CardContent>
          {jobs && jobs.length > 0 ? (
            <>
              <div className="rounded-md border border-border/50 overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead className="w-[120px]">ID Trabajo</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Progreso</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jobs.map((job) => (
                      <TableRow key={job.id} className="hover:bg-muted/10">
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {job.id.slice(0, 8)}
                        </TableCell>
                        <TableCell className="text-sm">
                           {new Date(job.created_at).toLocaleDateString("es-MX", {
                              day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
                           })}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1 w-[140px]">
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>{job.completed_products} / {job.total_products}</span>
                              <span>{Math.round((job.completed_products / Math.max(job.total_products, 1)) * 100)}%</span>
                            </div>
                            {job.status === "processing" && (
                              <Progress value={(job.completed_products / job.total_products) * 100} className="h-1.5" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(job.status)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Controles de paginación */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-2">
                  <p className="text-sm text-muted-foreground">
                    Página {currentPage} de {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((prev) => prev - 1)}
                      disabled={currentPage === 1}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((prev) => prev + 1)}
                      disabled={currentPage === totalPages}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 text-muted-foreground bg-muted/10 rounded-lg border border-dashed border-border/50">
               <Upload className="h-10 w-10 mx-auto mb-3 opacity-20" />
               <p>No hay historial disponible</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
