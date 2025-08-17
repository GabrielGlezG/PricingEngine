import { useState } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/contexts/AuthContext"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Check, Crown, CreditCard, Calendar, AlertTriangle, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface SubscriptionPlan {
  id: string
  name: string
  description: string
  price_monthly: number
  price_yearly: number
  features: string[]
  is_active: boolean
}

interface UserSubscription {
  id: string
  plan_id: string
  status: string
  billing_cycle: string
  current_period_start: string
  current_period_end: string
  cancel_at_period_end: boolean
  subscription_plans: SubscriptionPlan
}

export default function Subscription() {
  const { user, profile } = useAuth()
  const { toast } = useToast()
  const [selectedBilling, setSelectedBilling] = useState<'monthly' | 'yearly'>('monthly')
  const [isProcessing, setIsProcessing] = useState(false)

  // Fetch subscription plans
  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('price_monthly')
      
      if (error) throw error
      return data as SubscriptionPlan[]
    }
  })

  // Fetch user's current subscription
  const { data: currentSubscription, refetch: refetchSubscription } = useQuery({
    queryKey: ['user-subscription', user?.id],
    queryFn: async () => {
      if (!user) return null
      
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select(`
          *,
          subscription_plans (*)
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single()
      
      if (error && error.code !== 'PGRST116') throw error
      return data as UserSubscription
    },
    enabled: !!user
  })

  // Fetch payment history
  const { data: paymentHistory } = useQuery({
    queryKey: ['payment-history', user?.id],
    queryFn: async () => {
      if (!user) return []
      
      const { data, error } = await supabase
        .from('payment_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)
      
      if (error) throw error
      return data
    },
    enabled: !!user
  })

  const subscribeMutation = useMutation({
    mutationFn: async ({ planId, billingCycle }: { planId: string, billingCycle: string }) => {
      // En una implementación real, aquí se integraría con Stripe
      // Por ahora, simularemos la creación de una suscripción
      const plan = plans?.find(p => p.id === planId)
      if (!plan) throw new Error('Plan no encontrado')

      const price = billingCycle === 'yearly' ? plan.price_yearly : plan.price_monthly
      const periodEnd = new Date()
      periodEnd.setMonth(periodEnd.getMonth() + (billingCycle === 'yearly' ? 12 : 1))

      // Simular creación de suscripción
      const { data, error } = await supabase.rpc('create_subscription', {
        p_user_id: user?.id,
        p_plan_id: planId,
        p_billing_cycle: billingCycle,
        p_stripe_subscription_id: `sim_${Date.now()}`,
        p_stripe_customer_id: `cus_${user?.id}`,
        p_current_period_start: new Date().toISOString(),
        p_current_period_end: periodEnd.toISOString()
      })

      if (error) throw error
      return data
    },
    onSuccess: () => {
      toast({
        title: "¡Suscripción activada!",
        description: "Tu suscripción ha sido activada exitosamente."
      })
      refetchSubscription()
    },
    onError: (error: any) => {
      toast({
        title: "Error al procesar suscripción",
        description: error.message,
        variant: "destructive"
      })
    }
  })

  const handleSubscribe = async (planId: string) => {
    if (!user) return
    
    setIsProcessing(true)
    try {
      await subscribeMutation.mutateAsync({ planId, billingCycle: selectedBilling })
    } finally {
      setIsProcessing(false)
    }
  }

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

  if (plansLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Cargando planes de suscripción...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">Planes de Suscripción</h1>
        <p className="text-muted-foreground mt-2">
          Elige el plan que mejor se adapte a tus necesidades
        </p>
      </div>

      {/* Current Subscription Status */}
      {currentSubscription && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-yellow-500" />
              Tu Suscripción Actual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg">{currentSubscription.subscription_plans.name}</h3>
                <p className="text-muted-foreground">{currentSubscription.subscription_plans.description}</p>
                <div className="flex items-center gap-4 mt-2">
                  {getStatusBadge(currentSubscription.status)}
                  <span className="text-sm text-muted-foreground">
                    Facturación: {currentSubscription.billing_cycle === 'yearly' ? 'Anual' : 'Mensual'}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-green-600">
                  {formatPrice(
                    currentSubscription.billing_cycle === 'yearly' 
                      ? currentSubscription.subscription_plans.price_yearly 
                      : currentSubscription.subscription_plans.price_monthly
                  )}
                </p>
                <p className="text-sm text-muted-foreground">
                  /{currentSubscription.billing_cycle === 'yearly' ? 'año' : 'mes'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Renueva: {new Date(currentSubscription.current_period_end).toLocaleDateString('es-MX')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Billing Toggle */}
      {!currentSubscription && (
        <div className="flex justify-center">
          <div className="flex items-center space-x-4 bg-muted p-1 rounded-lg">
            <Button
              variant={selectedBilling === 'monthly' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSelectedBilling('monthly')}
            >
              Mensual
            </Button>
            <Button
              variant={selectedBilling === 'yearly' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSelectedBilling('yearly')}
            >
              Anual
              <Badge variant="secondary" className="ml-2 bg-green-100 text-green-800">
                Ahorra 17%
              </Badge>
            </Button>
          </div>
        </div>
      )}

      {/* Subscription Plans */}
      <div className="grid gap-6 md:grid-cols-2">
        {plans?.map((plan) => {
          const price = selectedBilling === 'yearly' ? plan.price_yearly : plan.price_monthly
          const isCurrentPlan = currentSubscription?.plan_id === plan.id
          
          return (
            <Card key={plan.id} className={`relative ${isCurrentPlan ? 'border-primary' : ''}`}>
              {isCurrentPlan && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge variant="default" className="bg-primary text-primary-foreground">
                    Plan Actual
                  </Badge>
                </div>
              )}
              
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {plan.name}
                  {plan.id === 'premium' && (
                    <Crown className="h-5 w-5 text-yellow-500" />
                  )}
                </CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="mt-4">
                  <span className="text-3xl font-bold">{formatPrice(price)}</span>
                  <span className="text-muted-foreground">
                    /{selectedBilling === 'yearly' ? 'año' : 'mes'}
                  </span>
                  {selectedBilling === 'yearly' && (
                    <div className="text-sm text-green-600 mt-1">
                      Ahorras {formatPrice(plan.price_monthly * 12 - plan.price_yearly)} al año
                    </div>
                  )}
                </div>
              </CardHeader>
              
              <CardContent>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                {!currentSubscription && (
                  <Button 
                    className="w-full" 
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Procesando...
                      </>
                    ) : (
                      <>
                        <CreditCard className="mr-2 h-4 w-4" />
                        Suscribirse
                      </>
                    )}
                  </Button>
                )}
                
                {isCurrentPlan && (
                  <Button variant="outline" className="w-full" disabled>
                    Plan Activo
                  </Button>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Payment History */}
      {paymentHistory && paymentHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Historial de Pagos
            </CardTitle>
            <CardDescription>
              Últimos movimientos en tu cuenta
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {paymentHistory.map((payment: any) => (
                <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{payment.description || 'Pago de suscripción'}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(payment.created_at).toLocaleDateString('es-MX', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatPrice(payment.amount)}</p>
                    <Badge 
                      variant={payment.status === 'succeeded' ? 'default' : 'destructive'}
                      className={payment.status === 'succeeded' ? 'bg-green-600 text-white' : ''}
                    >
                      {payment.status === 'succeeded' ? 'Exitoso' : 'Fallido'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Subscription Warning */}
      {!currentSubscription && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <div>
                <p className="font-medium text-orange-800">Acceso Limitado</p>
                <p className="text-sm text-orange-700">
                  Sin una suscripción activa, tu acceso a las funcionalidades está restringido.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}