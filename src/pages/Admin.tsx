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
import { Settings, Users, CreditCard, Package, Plus, CreditCard as Edit, Trash2 } from "lucide-react"
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

  // Debug de autenticación para admin
  console.log('Admin Page Auth Debug:', {
    user: !!user,
    profile: !!profile,
    isAdmin,
    profileData: profile
  })

  // Mock subscription plans for now
  const plans = [
    {
      id: '1',
      name: 'Plan Básico',
      price_monthly: 99,
      price_yearly: 990,
      features: ['Dashboard básico', 'Soporte email'],
      is_active: true,
      description: 'Plan básico para usuarios'
    },
    {
      id: '2', 
      name: 'Plan Premium',
      price_monthly: 199,
      price_yearly: 1990,
      features: ['Dashboard completo', 'Análisis avanzados', 'Soporte prioritario'],
      is_active: true,
      description: 'Plan premium con todas las funcionalidades'
    }
  ]

  // Fetch user profiles using the admin function
  const { data: users } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('list_all_users')

      if (error) {
        console.error('Error fetching users:', error)
        throw error
      }
      return data
    },
    enabled: isAdmin
  })

  // Fetch subscriptions from user_profiles
  const { data: subscriptions } = useQuery({
    queryKey: ['admin-subscriptions'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('list_all_users')

      if (error) {
        console.error('Error fetching subscriptions:', error)
        throw error
      }
      return data?.filter((user: any) => user.subscription_status) || []
    },
    enabled: isAdmin
  })

  // Mock data for payments
  const payments = []

  const updateUserRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string, role: string }) => {
      const { error } = await supabase
        .from('user_profiles')
        .update({ role } as any)
        .eq('user_id', userId)
      
      if (error) throw error
    },
    onSuccess: () => {
      toast({ title: "Rol actualizado exitosamente" })
    }
  })

  const assignSubscription = useMutation({
    mutationFn: async ({ userId, planId }: { userId: string, planId: string }) => {
      const { error } = await supabase
        .from('user_profiles')
        .update({ 
          subscription_status: 'active',
          subscription_plan: planId,
          subscription_expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
        })
        .eq('user_id', userId)
      
      if (error) throw error
    },
    onSuccess: () => {
      toast({ title: "Suscripción asignada exitosamente" })
      setSelectedUser('')
      setSubscriptionForm({ planId: '', billingCycle: 'monthly', durationMonths: 1 })
    }
  })

  const cancelSubscription = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('user_profiles')
        .update({ 
          subscription_status: 'canceled',
          subscription_expires_at: new Date().toISOString()
        })
        .eq('user_id', userId)
      
      if (error) throw error
    },
    onSuccess: () => {
      toast({ title: "Suscripción cancelada" })
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
                        <Badge variant={(user as any).role === 'admin' ? 'default' : 'secondary'}>
                          {(user as any).role === 'admin' ? 'Admin' : 'Usuario'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="default">
                          Activo
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
                              role: (user as any).role === 'admin' ? 'user' : 'admin'
                            })}
                          >
                            {(user as any).role === 'admin' ? 'Quitar Admin' : 'Hacer Admin'}
                          </Button>
                          {user.subscription_status !== 'active' && (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => setSelectedUser(user.user_id)}
                            >
                              Asignar Suscripción
                            </Button>
                          )}
                          {user.subscription_status === 'active' && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => cancelSubscription.mutate(user.user_id)}
                            >
                              Cancelar Suscripción
                            </Button>
                          )}
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
                  {subscriptions?.map((sub: any) => (
                    <TableRow key={sub.user_id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{sub.name}</p>
                          <p className="text-sm text-muted-foreground">{sub.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>{sub.subscription_plan || 'N/A'}</TableCell>
                      <TableCell>{getStatusBadge(sub.subscription_status)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">N/A</Badge>
                      </TableCell>
                      <TableCell>
                        {sub.created_at ? new Date(sub.created_at).toLocaleDateString('es-MX') : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {sub.subscription_expires_at ? new Date(sub.subscription_expires_at).toLocaleDateString('es-MX') : 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Modal para asignar suscripción */}
        {selectedUser && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>Asignar Suscripción</CardTitle>
                <CardDescription>
                  Asignar una suscripción manual al usuario seleccionado
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Plan de Suscripción</Label>
                  <select 
                    className="w-full p-2 border rounded-md"
                    value={subscriptionForm.planId}
                    onChange={(e) => setSubscriptionForm(prev => ({ ...prev, planId: e.target.value }))}
                  >
                    <option value="">Seleccionar plan</option>
                    {plans?.map(plan => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name} - {formatPrice(plan.price_monthly)}/mes
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <Label>Ciclo de Facturación</Label>
                  <select 
                    className="w-full p-2 border rounded-md"
                    value={subscriptionForm.billingCycle}
                    onChange={(e) => setSubscriptionForm(prev => ({ ...prev, billingCycle: e.target.value }))}
                  >
                    <option value="monthly">Mensual</option>
                    <option value="yearly">Anual</option>
                  </select>
                </div>
                
                <div>
                  <Label>Duración (meses)</Label>
                  <input 
                    type="number"
                    min="1"
                    max="24"
                    className="w-full p-2 border rounded-md"
                    value={subscriptionForm.durationMonths}
                    onChange={(e) => setSubscriptionForm(prev => ({ ...prev, durationMonths: parseInt(e.target.value) }))}
                  />
                </div>
                
                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={() => {
                      if (subscriptionForm.planId) {
                        assignSubscription.mutate({
                          userId: selectedUser,
                          planId: subscriptionForm.planId
                        })
                      }
                    }}
                    disabled={!subscriptionForm.planId || assignSubscription.isPending}
                    className="flex-1"
                  >
                    {assignSubscription.isPending ? 'Asignando...' : 'Asignar Suscripción'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setSelectedUser('')}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

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