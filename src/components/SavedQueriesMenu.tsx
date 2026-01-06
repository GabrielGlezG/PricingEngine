
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Bookmark, Save, Trash2, Check, Loader2, Plus } from "lucide-react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/contexts/AuthContext"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

interface SavedQueriesMenuProps {
  currentFilters: any;
  onLoadFilters: (filters: any) => void;
  context?: string;
}

export function SavedQueriesMenu({ 
  currentFilters, 
  onLoadFilters,
  context = 'general' 
}: SavedQueriesMenuProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [isOpen, setIsOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [newQueryName, setNewQueryName] = useState("")

interface SavedQuery {
  id: string;
  name: string;
  filters: any;
  context: string;
  created_at?: string;
}

  // Fetch Saved Queries
  const { data: savedQueries, isLoading } = useQuery({
    queryKey: ['saved_queries', user?.id, context],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('saved_queries' as any)
        .select('*')
        .eq('context', context)
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data as any[]) as SavedQuery[] || []
    },
    enabled: !!user,
  })

  // Save Query Mutation
  const saveMutation = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from('saved_queries' as any)
        .insert({
          user_id: user?.id,
          name,
          filters: currentFilters,
          context
        })
        .select()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved_queries'] })
      toast({ title: "Consulta guardada", description: `"${newQueryName}" se ha guardado correctamente.` })
      setNewQueryName("")
      setIsSaving(false)
    },
    onError: (error) => {
      toast({ 
        title: "Error al guardar", 
        description: error.message, 
        variant: "destructive" 
      })
    }
  })

  // Delete Query Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('saved_queries' as any)
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved_queries'] })
      toast({ title: "Consulta eliminada" })
    }
  })

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newQueryName.trim()) return
    saveMutation.mutate(newQueryName)
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-9 px-3 rounded-xl border border-transparent bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground font-normal transition-all"
        >
          <Bookmark className="mr-2 h-3.5 w-3.5" />
          Mis Consultas
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80 p-0 rounded-xl shadow-xl border-border/60" align="end">
        <div className="p-3 bg-muted/20 border-b border-border/40">
           <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Gestor de Vistas</h4>
           <p className="text-[10px] text-muted-foreground leading-tight">
             Guarda tu configuración actual de filtros o carga una vista previa.
           </p>
        </div>
        
        {/* Save Current Section */}
        <div className="p-2">
            {!isSaving ? (
                <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full justify-start h-9 text-xs font-medium border-dashed border-primary/30 text-primary hover:text-primary hover:bg-primary/5 hover:border-primary/60"
                    onClick={() => setIsSaving(true)}
                >
                    <Plus className="mr-2 h-3.5 w-3.5" />
                    Crear nueva vista con filtros actuales
                </Button>
            ) : (
                <form onSubmit={handleSave} className="bg-muted/30 p-2 rounded-lg border border-border/50 animate-in slide-in-from-top-1 duration-200 space-y-2">
                    <div className="space-y-1">
                        <label className="text-[10px] font-medium text-muted-foreground uppercase">Nombre de la vista</label>
                        <Input 
                            placeholder="Ej: SUVs Toyota 2024..." 
                            className="h-8 text-xs bg-background"
                            value={newQueryName}
                            onChange={(e) => setNewQueryName(e.target.value)}
                            autoFocus
                        />
                    </div>
                    <div className="flex gap-2 justify-end">
                        <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 text-xs px-2 hover:bg-transparent text-muted-foreground hover:text-foreground" 
                            onClick={() => setIsSaving(false)}
                        >
                            Cancelar
                        </Button>
                        <Button 
                            type="submit" 
                            size="sm" 
                            className="h-7 text-xs px-3" 
                            disabled={saveMutation.isPending || !newQueryName.trim()}
                        >
                            {saveMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Guardar"}
                        </Button>
                    </div>
                </form>
            )}
        </div>

        <DropdownMenuSeparator className="bg-border/40" />

        {/* Saved List */}
        <div className="px-1 pb-1">
            <div className="px-2 py-1.5 flex items-center justify-between">
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Tus Vistas Guardadas</span>
                {savedQueries && savedQueries.length > 0 && (
                     <span className="text-[10px] text-muted-foreground bg-muted px-1.5 rounded-full">{savedQueries.length}</span>
                )}
            </div>

            <div className="max-h-[200px] overflow-y-auto scrollbar-thin scrollbar-thumb-rounded scrollbar-track-transparent">
                {isLoading ? (
                    <div className="p-4 text-center text-xs text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2 opacity-50" />
                        Cargando...
                    </div>
                ) : savedQueries?.length === 0 ? (
                    <div className="p-6 text-center text-xs text-muted-foreground/60 border-2 border-dashed border-muted m-2 rounded-lg">
                        <Bookmark className="h-6 w-6 mx-auto mb-2 opacity-20" />
                        <p>No tienes vistas guardadas.</p>
                        <p className="mt-1 text-[10px]">Configura tus filtros y guárdalos para acceder rápido después.</p>
                    </div>
                ) : (
                    <DropdownMenuGroup className="space-y-0.5">
                        {savedQueries?.map((query) => (
                            <div key={query.id} className="group flex items-center justify-between rounded-md px-2 py-2 hover:bg-accent/50 hover:text-accent-foreground transition-all relative">
                                <div 
                                    className="flex-1 flex items-center gap-3 overflow-hidden cursor-pointer" 
                                    onClick={() => {
                                        onLoadFilters(query.filters)
                                        setIsOpen(false)
                                        toast({ title: "Vista aplicada", description: `Se ha cargado "${query.name}".` })
                                    }}
                                >
                                    <div className="p-1.5 rounded-full bg-primary/10 text-primary shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                        <Bookmark className="h-3 w-3" />
                                    </div>
                                    <div className="flex flex-col overflow-hidden">
                                        <span className="text-sm font-medium truncate leading-none">{query.name}</span>
                                        <span className="text-[10px] text-muted-foreground truncate mt-0.5">
                                            {new Date(query.created_at || '').toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                                
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive shrink-0"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        if(confirm('¿Eliminar esta vista?')) deleteMutation.mutate(query.id)
                                    }}
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        ))}
                    </DropdownMenuGroup>
                )}
            </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
