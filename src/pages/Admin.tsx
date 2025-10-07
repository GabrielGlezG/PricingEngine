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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Panel de Administración</h1>
        <p className="text-muted-foreground">Gestiona usuarios, suscripciones y configuración del sistema</p>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users" className="flex items-center gap-2"><Users className="h-4 w-4"/>Usuarios</TabsTrigger>
          <TabsTrigger value="subscriptions" className="flex items-center gap-2"><CreditCard className="h-4 w-4"/>Suscripciones</TabsTrigger>
          <TabsTrigger value="plans" className="flex items-center gap-2"><Package className="h-4 w-4"/>Planes</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>Gestión de Usuarios</CardTitle>
              <CardDescription>Administra roles y permisos de usuarios</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Suscripción</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users?.map((u) => (
                    <TableRow key={u.user_id}>
                      <TableCell className="font-medium">{u.name}</TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell><Badge variant={u.role === 'admin' ? 'default' : 'secondary'}>{u.role === 'admin' ? 'Admin' : 'Usuario'}</Badge></TableCell>
                      <TableCell><Badge variant="default">Activo</Badge></TableCell>
                      <TableCell>{u.subscription_status ? getStatusBadge(u.subscription_status) : <span className="text-muted-foreground">Sin suscripción</span>}</TableCell>
                      <TableCell className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => updateUserRole.mutate({ userId: u.user_id, role: u.role === 'admin' ? 'user' : 'admin' })}>{u.role === 'admin' ? 'Quitar Admin' : 'Hacer Admin'}</Button>
                        {u.subscription_status !== 'active' && <Button size="sm" variant="default" onClick={() => setSelectedUser(u.user_id)}>Asignar Suscripción</Button>}
                        {u.subscription_status === 'active' && <Button size="sm" variant="destructive" onClick={() => cancelSubscription.mutate(u.user_id)}>Cancelar Suscripción</Button>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscriptions">
          <Card>
            <CardHeader>
              <CardTitle>Suscripciones Activas</CardTitle>
              <CardDescription>Monitorea el estado de todas las suscripciones</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Vencimiento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users?.filter(u => u.subscription_status)?.map(u => (
                    <TableRow key={u.user_id}>
                      <TableCell>{u.name}</TableCell>
                      <TableCell>{plans.find(p => p.id === u.subscription_plan)?.name || 'Sin plan'}</TableCell>
                      <TableCell>{getStatusBadge(u.subscription_status)}</TableCell>
                      <TableCell>{u.subscription_expires_at ? new Date(u.subscription_expires_at).toLocaleDateString('es-MX') : '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Modal asignar suscripción */}
        {selectedUser && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>Asignar Suscripción</CardTitle>
                <CardDescription>Asignar una suscripción manual al usuario seleccionado</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Plan de Suscripción</Label>
                  <select className="w-full p-2 border rounded-md" value={subscriptionForm.planId} onChange={e => setSubscriptionForm(prev => ({ ...prev, planId: e.target.value }))}>
                    <option value="">Seleccionar plan</option>
                    {plans.map(p => <option key={p.id} value={p.id}>{p.name} - {formatPrice(p.price_monthly)}/mes</option>)}
                  </select>
                </div>
                <div>
                  <Label>Duración (meses)</Label>
                  <input type="number" min={1} max={24} className="w-full p-2 border rounded-md" value={subscriptionForm.durationMonths} onChange={e => setSubscriptionForm(prev => ({ ...prev, durationMonths: parseInt(e.target.value) }))}/>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button className="flex-1" disabled={!subscriptionForm.planId || assignSubscription.isPending} onClick={() => assignSubscription.mutate({ userId: selectedUser, planId: subscriptionForm.planId })}>{assignSubscription.isPending ? 'Asignando...' : 'Asignar Suscripción'}</Button>
                  <Button variant="outline" className="flex-1" onClick={() => setSelectedUser('')}>Cancelar</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </Tabs>
    </div>
  )
}
