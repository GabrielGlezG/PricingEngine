import { useQuery, useMutation } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Users, CreditCard, Package } from "lucide-react"
import { useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/AuthContext"

export default function Admin() {
  const { toast } = useToast()
  const { user, profile, isAdmin } = useAuth()
  const [selectedUser, setSelectedUser] = useState<string>('')
  const [subscriptionForm, setSubscriptionForm] = useState({
    planId: '',
    billingCycle: 'monthly',
    durationMonths: 1
  })

  // Mock subscription plans, IDs deben coincidir con constraints de DB
  const plans = [
    { id: 'free', name: 'Plan Free', price_monthly: 0, price_yearly: 0, features: ['Acceso limitado'], is_active: true, description: 'Plan gratis' },
    { id: 'basic', name: 'Plan Básico', price_monthly: 99, price_yearly: 990, features: ['Dashboard básico', 'Soporte email'], is_active: true, description: 'Plan básico' },
    { id: 'premium', name: 'Plan Premium', price_monthly: 199, price_yearly: 1990, features: ['Dashboard completo', 'Análisis avanzados', 'Soporte prioritario'], is_active: true, description: 'Plan premium' }
  ]

  // Fetch user profiles
  const { data: users, refetch } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    }
  })

  // Actualiza rol de usuario
  const updateUserRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string, role: string }) => {
      const { error } = await supabase
        .from('user_profiles')
        .update({ role } as any)
        .eq('user_id', userId.trim())
      if (error) throw error
    },
    onSuccess: () => {
      toast({ title: "Rol actualizado exitosamente" })
      refetch()
    }
  })

  // Asignar suscripción
  const assignSubscription = useMutation({
    mutationFn: async ({ userId, planId }: { userId: string, planId: string }) => {
      const expiresAt = new Date()
      expiresAt.setMonth(expiresAt.getMonth() + subscriptionForm.durationMonths)

      const { error } = await supabase
        .from('user_profiles')
        .update({ 
          subscription_status: 'active',
          subscription_plan: planId,
          subscription_expires_at: expiresAt.toISOString()
        })
        .eq('user_id', userId.trim())
      if (error) throw error
    },
    onSuccess: () => {
      toast({ title: "Suscripción asignada exitosamente" })
      setSelectedUser('')
      setSubscriptionForm({ planId: '', billingCycle: 'monthly', durationMonths: 1 })
      refetch()
    }
  })

  // Cancelar suscripción
  const cancelSubscription = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('user_profiles')
        .update({ 
          subscription_status: 'cancelled',
          subscription_expires_at: new Date().toISOString()
        })
        .eq('user_id', userId.trim())
      if (error) throw error
    },
    onSuccess: () => {
      toast({ title: "Suscripción cancelada" })
      refetch()
    }
  })

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 }).format(price)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge variant="default" className="bg-green-600 text-white">Activa</Badge>
      case 'cancelled': return <Badge variant="destructive">Cancelada</Badge>
      case 'expired': return <Badge variant="default" className="bg-orange-600 text-white">Vencida</Badge>
      default: return <Badge variant="secondary">{status}</Badge>
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Panel de Administración
        </h1>
        <p className="text-muted-foreground">
          Control centralizado de usuarios, planes de suscripción y métricas del sistema.
        </p>
      </div>

      {/* Summary Stats Row */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-blue-50 to-white dark:from-slate-900 dark:to-slate-950 border-blue-100 dark:border-blue-900/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Usuarios Totales</CardTitle>
            <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{users?.length || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Registrados en la plataforma</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-50 to-white dark:from-slate-900 dark:to-slate-950 border-emerald-100 dark:border-emerald-900/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Suscripciones Activas</CardTitle>
            <CreditCard className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{users?.filter(u => u.subscription_status === 'active').length || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Generando ingresos recurrentes</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-white dark:from-slate-900 dark:to-slate-950 border-purple-100 dark:border-purple-900/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Planes Disponibles</CardTitle>
            <Package className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{plans.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Niveles de servicio configurados</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="bg-muted/50 p-1 border border-border/50 rounded-lg">
          <TabsTrigger value="users" className="flex items-center gap-2 px-4 py-2 hover:bg-background/50 transition-all font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-primary">
            <Users className="h-4 w-4"/> Usuarios
          </TabsTrigger>
          <TabsTrigger value="subscriptions" className="flex items-center gap-2 px-4 py-2 hover:bg-background/50 transition-all font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-emerald-600">
            <CreditCard className="h-4 w-4"/> Suscripciones
          </TabsTrigger>
          <TabsTrigger value="plans" className="flex items-center gap-2 px-4 py-2 hover:bg-background/50 transition-all font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-purple-600">
            <Package className="h-4 w-4"/> Planes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-premium overflow-hidden">
            <CardHeader className="bg-muted/20 border-b border-border/40">
              <CardTitle>Gestión de Usuarios</CardTitle>
              <CardDescription>Administra roles y permisos de acceso al sistema.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="font-semibold">Usuario</TableHead>
                    <TableHead className="font-semibold">Email</TableHead>
                    <TableHead className="font-semibold">Rol</TableHead>
                    <TableHead className="font-semibold">Estado</TableHead>
                    <TableHead className="font-semibold">Suscripción</TableHead>
                    <TableHead className="text-right font-semibold pr-6">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users?.map((u) => (
                    <TableRow key={u.user_id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-medium text-foreground">{u.name}</TableCell>
                      <TableCell className="text-muted-foreground">{u.email}</TableCell>
                      <TableCell>
                         <Badge variant={u.role === 'admin' ? 'default' : 'secondary'} className={u.role === 'admin' ? "bg-primary text-primary-foreground shadow-sm" : ""}>
                            {u.role === 'admin' ? 'Admin' : 'Usuario'}
                         </Badge>
                      </TableCell>
                      <TableCell><Badge variant="outline" className="border-emerald-200 text-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900/50">Activo</Badge></TableCell>
                      <TableCell>{u.subscription_status ? getStatusBadge(u.subscription_status) : <span className="text-xs text-muted-foreground italic">Sin suscripción</span>}</TableCell>
                      <TableCell className="flex justify-end gap-2 pr-6">
                        <Button size="sm" variant="ghost" className="h-8 text-xs font-medium hover:bg-primary/10 hover:text-primary" onClick={() => updateUserRole.mutate({ userId: u.user_id, role: u.role === 'admin' ? 'user' : 'admin' })}>
                           {u.role === 'admin' ? 'Revocar Admin' : 'Hacer Admin'}
                        </Button>
                        {u.subscription_status !== 'active' && 
                           <Button size="sm" variant="outline" className="h-8 text-xs border-primary/20 text-primary hover:bg-primary/5 hover:text-primary hover:border-primary/40 shadow-sm" onClick={() => setSelectedUser(u.user_id)}>
                             Asignar Plan
                           </Button>
                        }
                        {u.subscription_status === 'active' && 
                           <Button size="sm" variant="ghost" className="h-8 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => cancelSubscription.mutate(u.user_id)}>
                             Cancelar
                           </Button>
                        }
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscriptions" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-premium overflow-hidden">
            <CardHeader className="bg-muted/20 border-b border-border/40">
              <CardTitle>Suscripciones Activas</CardTitle>
              <CardDescription>Monitoreo en tiempo real de cuentas premium.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="font-semibold">Usuario</TableHead>
                    <TableHead className="font-semibold">Plan Contratado</TableHead>
                    <TableHead className="font-semibold">Estado</TableHead>
                    <TableHead className="font-semibold">Vencimiento</TableHead>
                    <TableHead className="text-right font-semibold pr-6">Ciclo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users?.filter(u => u.subscription_status)?.map(u => (
                    <TableRow key={u.user_id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-medium">{u.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                           <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-900/50">
                             {plans.find(p => p.id === u.subscription_plan)?.name || 'Custom'}
                           </Badge>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(u.subscription_status)}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{u.subscription_expires_at ? new Date(u.subscription_expires_at).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' }) : '-'}</TableCell>
                      <TableCell className="text-right pr-6"><span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Mensual</span></TableCell>
                    </TableRow>
                  ))}
                   {(!users || users.filter(u => u.subscription_status).length === 0) && (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No hay suscripciones activas encontradas.</TableCell>
                      </TableRow>
                   )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="plans">
            <div className="grid md:grid-cols-3 gap-6">
                {plans.map(plan => (
                    <Card key={plan.id} className="border-border/50 shadow-sm hover:border-primary/40 hover:shadow-md transition-all cursor-default group relative overflow-hidden">
                        <div className={`absolute top-0 left-0 w-full h-1 ${plan.id === 'premium' ? 'bg-gradient-to-r from-amber-400 to-orange-500' : (plan.id === 'basic' ? 'bg-blue-500' : 'bg-slate-300')}`} />
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <CardTitle className="text-xl">{plan.name}</CardTitle>
                                {plan.id === 'premium' && <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200">Popular</Badge>}
                            </div>
                            <CardDescription>{plan.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="text-3xl font-bold">
                                {formatPrice(plan.price_monthly)}
                                <span className="text-sm font-normal text-muted-foreground">/mes</span>
                            </div>
                            <ul className="space-y-2">
                                {plan.features.map((feature, i) => (
                                    <li key={i} className="text-sm flex items-center gap-2 text-muted-foreground">
                                        <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                                        {feature}
                                    </li>
                                ))}
                            </ul>
                            <Button className="w-full mt-4" variant="outline">Editar Plan</Button>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </TabsContent>

        {/* Modal asignar suscripción */}
        {selectedUser && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
            <Card className="w-full max-w-md shadow-2xl border-white/20">
              <CardHeader>
                <CardTitle>Asignar Suscripción</CardTitle>
                <CardDescription>Configura el plan para el usuario seleccionado.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Plan de Suscripción</Label>
                  <select 
                    className="w-full p-2.5 bg-background border border-input rounded-md text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" 
                    value={subscriptionForm.planId} 
                    onChange={e => setSubscriptionForm(prev => ({ ...prev, planId: e.target.value }))}
                  >
                    <option value="">-- Seleccionar plan --</option>
                    {plans.map(p => <option key={p.id} value={p.id}>{p.name} ({formatPrice(p.price_monthly)}/mes)</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Duración (meses)</Label>
                  <input 
                    type="number" 
                    min={1} 
                    max={24} 
                    className="w-full p-2.5 bg-background border border-input rounded-md text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" 
                    value={subscriptionForm.durationMonths} 
                    onChange={e => setSubscriptionForm(prev => ({ ...prev, durationMonths: parseInt(e.target.value) }))}
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <Button 
                    className="flex-1 shadow-md shadow-primary/20" 
                    disabled={!subscriptionForm.planId || assignSubscription.isPending} 
                    onClick={() => assignSubscription.mutate({ userId: selectedUser, planId: subscriptionForm.planId })}
                  >
                    {assignSubscription.isPending ? 'Procesando...' : 'Confirmar Asignación'}
                  </Button>
                  <Button variant="secondary" className="flex-1" onClick={() => setSelectedUser('')}>Cancelar</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </Tabs>
    </div>
  )
}
