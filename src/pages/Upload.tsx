import { useState, useRef } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Upload as UploadIcon, FileJson, CheckCircle, AlertCircle, Clock, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface ScrapingJob {
  id: string
  status: string
  total_products: number
  completed_products: number
  created_at: string
  completed_at?: string
  error_message?: string
}

export default function Upload() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const { data: jobs, refetch: refetchJobs } = useQuery({
    queryKey: ['scraping-jobs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scraping_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)
      
      if (error) throw error
      return data as ScrapingJob[]
    },
    refetchInterval: 5000 // Actualizar cada 5 segundos
  })

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const text = await file.text()
      const jsonData = JSON.parse(text)
      const batchId = crypto.randomUUID()

      const { data, error } = await supabase.functions.invoke('upload-json', {
        body: { data: jsonData, batchId }
      })

      if (error) throw error
      return data
    },
    onSuccess: () => {
      toast({
        title: "Archivo cargado exitosamente",
        description: "Los datos están siendo procesados en segundo plano.",
      })
      setSelectedFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      refetchJobs()
    },
    onError: (error: any) => {
      toast({
        title: "Error al cargar archivo",
        description: error.message || "Ocurrió un error inesperado",
        variant: "destructive",
      })
    }
  })

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    const files = Array.from(e.dataTransfer.files)
    const jsonFile = files.find(file => file.type === "application/json" || file.name.endsWith('.json'))
    
    if (jsonFile) {
      setSelectedFile(jsonFile)
    } else {
      toast({
        title: "Archivo inválido",
        description: "Por favor selecciona un archivo JSON válido.",
        variant: "destructive",
      })
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  const handleUpload = () => {
    if (selectedFile) {
      uploadMutation.mutate(selectedFile)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'processing':
        return <Clock className="h-4 w-4 text-blue-500" />
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-600 text-white">Completado</Badge>
      case 'processing':
        return <Badge variant="default" className="bg-blue-600 text-white">Procesando</Badge>
      case 'failed':
        return <Badge variant="destructive">Fallido</Badge>
      default:
        return <Badge variant="secondary">Pendiente</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UploadIcon className="h-5 w-5" />
            Cargar Datos JSON
          </CardTitle>
          <CardDescription>
            Sube archivos JSON con datos de precios de productos automotrices para su análisis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Área de drag & drop */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive 
                ? 'border-primary bg-primary/5' 
                : 'border-muted-foreground/25 hover:border-muted-foreground/50'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <FileJson className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <div className="space-y-2">
              <p className="text-lg font-medium">
                {selectedFile ? selectedFile.name : "Arrastra tu archivo JSON aquí"}
              </p>
              <p className="text-sm text-muted-foreground">
                o
              </p>
              <Label htmlFor="file-upload">
                <Button variant="outline" asChild>
                  <span>Seleccionar archivo</span>
                </Button>
              </Label>
              <Input
                ref={fileInputRef}
                id="file-upload"
                type="file"
                accept=".json,application/json"
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
                        setSelectedFile(null)
                        if (fileInputRef.current) {
                          fileInputRef.current.value = ''
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
                      {uploadMutation.isPending ? "Cargando..." : "Subir archivo"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Formato esperado */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Formato JSON Esperado</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted/30 p-4 rounded-md text-sm overflow-x-auto text-foreground">
{`[
  {
    "Marca": "Toyota",
    "Categoría": "Sedán",
    "Modelo Principal": "Camry",
    "Modelo": "Camry LE",
    "Submodelo": "2024",
    "Precio": 580000,
    "Fecha Scraping": "2024-01-15"
  }
]`}
              </pre>
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      {/* Historial de trabajos */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Cargas</CardTitle>
          <CardDescription>
            Estado de los trabajos de procesamiento de datos
          </CardDescription>
        </CardHeader>
        <CardContent>
          {jobs && jobs.length > 0 ? (
            <div className="space-y-4">
              {jobs.map((job) => (
                <div key={job.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    {getStatusIcon(job.status)}
                    <div>
                      <p className="font-medium">Trabajo {job.id.slice(0, 8)}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(job.created_at).toLocaleDateString('es-MX', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm">
                        {job.completed_products} / {job.total_products} productos
                      </p>
                      {job.status === 'processing' && (
                        <Progress 
                          value={(job.completed_products / job.total_products) * 100} 
                          className="w-32 mt-1"
                        />
                      )}
                    </div>
                    {getStatusBadge(job.status)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No hay trabajos de carga registrados
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}