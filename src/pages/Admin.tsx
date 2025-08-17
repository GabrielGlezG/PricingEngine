import { useQuery, useMutation } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Settings, Users, CreditCard, Package, Plus, Edit, Trash2 } from "lucide-react"
import { useState } from "react"
import { useToast } from "@/hooks/use-toast"

export default function Admin() {
  const { toast } = useToast()
  const [editingPlan, setEditingPlan] = useState<any>(null)

  // Fetch subscription plans
  const { data: plans, refetch: refetchPlans } = useQuery({
    queryKey: ['admin-subscription-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('price_monthly')
      
      if (error) throw error
      return data
    }
  })

  // Fetch all user subscriptions
  const { data: subscriptions } = useQuery({
    queryKey: ['admin-subscriptions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select(`
          *,
          subscription_plans (name),
          user_profiles!user_subscriptions_user_id_fkey (name, email)
        `)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data
    }
  })

  // Fetch user profiles
  const { data: users } = useQuery({
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

  // Fetch payment history
  const { data: payments } = useQuery({
    queryKey: ['admin-payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_history')
        .select(`
          *,
          user_profiles!payment_history_user_id_fkey (name, email)
        `)
        .order('created_at', { ascending: false })
        .limit(50)
      
      if (error) throw error
      return data
    }
  })

  const updateUserRole = useMutation({
    mutationFn: async ({ userId, role, isActive }: { userId: string, role: string, isActive: boolean }) => {
      const { error } = await supabase
        .from('user_profiles')
        .update({ role, is_active: isActive })
        .eq('user_id', userId)
      
      if (error) throw error
    },
    onSuccess: () => {
      toast({ title: "Usuario actualizado exitosamente" })
    }
  })

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-600 text-white">Activa</Badge>
      case 'canceled':
        return <Badge variant="destructive">Cancelada</Badge>
      case 'past_due':
        return <Badge variant="default" className="bg-orange-600 text-white">Vencida</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Panel de Administración</h1>
        <p className="text-muted-foreground">
          Gestiona usuarios, suscripciones y configuración del sistema
        </p>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Usuarios
          </TabsTrigger>
          <TabsTrigger value="subscriptions" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Suscripciones
          </TabsTrigger>
          <TabsTrigger value="plans" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Planes
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Pagos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>Gestión de Usuarios</CardTitle>
              <CardDescription>
                Administra roles y permisos de usuarios
              </CardDescription>
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
                  {users?.map((user) => (
                    <TableRow key={user.user_id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                          {user.role === 'admin' ? 'Admin' : 'Usuario'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.is_active ? 'default' : 'destructive'}>
                          {user.is_active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.subscription_status ? (
                          <Badge variant={user.subscription_status === 'active' ? 'default' : 'secondary'}>
                            {user.subscription_status}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">Sin suscripción</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateUserRole.mutate({
                              userId: user.user_id,
                              role: user.role === 'admin' ? 'user' : 'admin',
                              isActive: user.is_active
                            })}
                          >
                            {user.role === 'admin' ? 'Quitar Admin' : 'Hacer Admin'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateUserRole.mutate({
                              userId: user.user_id,
                              role: user.role,
                              isActive: !user.is_active
                            })}
                          >
                            {user.is_active ? 'Desactivar' : 'Activar'}
                          </Button>
                        </div>
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
              <CardDescription>
                Monitorea el estado de todas las suscripciones
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Ciclo</TableHead>
                    <TableHead>Inicio</TableHead>
                    <TableHead>Vencimiento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscriptions?.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{sub.user_profiles?.name}</p>
                          <p className="text-sm text-muted-foreground">{sub.user_profiles?.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>{sub.subscription_plans?.name}</TableCell>
                      <TableCell>{getStatusBadge(sub.status)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {sub.billing_cycle === 'yearly' ? 'Anual' : 'Mensual'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(sub.current_period_start).toLocaleDateString('es-MX')}
                      </TableCell>
                      <TableCell>
                        {new Date(sub.current_period_end).toLocaleDateString('es-MX')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plans">
          <Card>
            <CardHeader>
              <CardTitle>Planes de Suscripción</CardTitle>
              <CardDescription>
                Gestiona los planes disponibles para los usuarios
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {plans?.map((plan) => (
                  <Card key={plan.id}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        {plan.name}
                        <Badge variant={plan.is_active ? 'default' : 'secondary'}>
                          {plan.is_active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </CardTitle>
                      <CardDescription>{plan.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Precio Mensual:</span>
                          <span className="font-semibold">{formatPrice(plan.price_monthly)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Precio Anual:</span>
                          <span className="font-semibold">{formatPrice(plan.price_yearly)}</span>
                        </div>
                        <div className="mt-4">
                          <p className="text-sm font-medium mb-2">Características:</p>
                          <ul className="text-sm space-y-1">
                            {plan.features.map((feature: string, index: number) => (
                              <li key={index} className="flex items-center gap-2">
                                <span className="w-1 h-1 bg-primary rounded-full"></span>
                                {feature}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Pagos</CardTitle>
              <CardDescription>
                Últimas transacciones del sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Fecha</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments?.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{payment.user_profiles?.name}</p>
                          <p className="text-sm text-muted-foreground">{payment.user_profiles?.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">
                        {formatPrice(payment.amount)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={payment.status === 'succeeded' ? 'default' : 'destructive'}>
                          {payment.status === 'succeeded' ? 'Exitoso' : 'Fallido'}
                        </Badge>
                      </TableCell>
                      <TableCell>{payment.description || 'Pago de suscripción'}</TableCell>
                      <TableCell>
                        {new Date(payment.created_at).toLocaleDateString('es-MX')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}