import { useState, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
// @ts-ignore - Papa parse types
import Papa from "papaparse";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    <div className="space-y-4 md:space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
            <Upload className="h-4 md:h-5 w-4 md:w-5" />
            Cargar Datos de Productos
          </CardTitle>
          <CardDescription className="text-xs md:text-sm">
            Sube archivos JSON/CSV/Excel con datos de precios de productos
            automotrices para su análisis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 md:space-y-6">
          {/* Área de drag & drop */}
          <div
            className={`border-2 border-dashed rounded-lg p-6 md:p-8 text-center transition-colors ${
              dragActive
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-muted-foreground/50"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <FileJson className="h-10 md:h-12 w-10 md:w-12 mx-auto mb-3 md:mb-4 text-muted-foreground" />
            <div className="space-y-2">
              <p className="text-base md:text-lg font-medium">
                {selectedFile
                  ? selectedFile.name
                  : "Arrastra tu archivo JSON/CSV/Excel aquí"}
              </p>
              <p className="text-xs md:text-sm text-muted-foreground">o</p>
              <Label htmlFor="file-upload">
                <Button variant="outline" asChild>
                  <span>Seleccionar archivo</span>
                </Button>
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
            <Card className="bg-muted/30 border-muted">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileJson className="h-8 w-8 text-primary" />
                    <div>
                      <p className="font-medium">{selectedFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedFile(null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = "";
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remover
                    </Button>
                    <Button
                      onClick={handleUpload}
                      disabled={uploadMutation.isPending}
                    >
                      {uploadMutation.isPending
                        ? "Cargando..."
                        : "Subir archivo"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Formato esperado */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Formato JSON/CSV Esperado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted/30 p-4 rounded-md text-sm overflow-x-auto text-foreground">
                {`{
  "UID": "9d16db5ca272",
  "ID_Base": "audi|a1-sportback|a1 sportback 30 tfsi",
  "Categoría": "Audi",
  "Modelo Principal": "A1 Sportback",
  "Modelo": "A1 Sportback 30 TFSI",
  "ctx_precio": "financiamiento:marca",
  "precio_num": 24900000,
  "precio_lista_num": 27100000,
  "bono_num": 2200000,
  "Precio_Texto": "$24.900.000",
  "fuente_texto_raw": "A1 Sportback 30 TFSI...",
  "Modelo_URL": "https://www.automotrizcarmona.cl/project/a1-sportback/",
  "Archivo_Origen": "audi_a1-sportback.xlsx",
  "Fecha": "2025-09-08",
  "Timestamp": "2025-09-08T06:34:36+00:00"
}`}
              </pre>
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      {/* Historial de trabajos con paginación */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Historial de Cargas</CardTitle>
              <CardDescription>
                Estado de los trabajos de procesamiento de datos
              </CardDescription>
            </div>
            {totalCount > 0 && (
              <Badge variant="secondary">
                {totalCount} trabajo{totalCount !== 1 ? "s" : ""} total
                {totalCount !== 1 ? "es" : ""}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {jobs && jobs.length > 0 ? (
            <>
              <div className="space-y-4">
                {jobs.map((job) => (
                  <div
                    key={job.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      {getStatusIcon(job.status)}
                      <div>
                        <p className="font-medium">
                          Trabajo {job.id.slice(0, 8)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(job.created_at).toLocaleDateString(
                            "es-MX",
                            {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm">
                          {job.completed_products} / {job.total_products}{" "}
                          productos
                        </p>
                        {job.status === "processing" && (
                          <Progress
                            value={
                              (job.completed_products / job.total_products) *
                              100
                            }
                            className="w-32 mt-1"
                          />
                        )}
                      </div>
                      {getStatusBadge(job.status)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Controles de paginación */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Página {currentPage} de {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((prev) => prev - 1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((prev) => prev + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Siguiente
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No hay trabajos de carga registrados
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
