import { useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Crown, CreditCard, Calendar, AlertTriangle, Loader2, Check } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { InstitutionalHeader } from "@/components/InstitutionalHeader"

// Mock subscription plans since the table doesn't exist yet
const MOCK_PLANS = [
  {
    id: 'free',
    name: 'Plan Gratuito',
    description: 'Funcionalidades básicas para empezar',
    price_monthly: 0,
    price_yearly: 0,
    features: [
      'Acceso limitado al dashboard',
      'Análisis básicos',
      'Soporte por email'
    ],
    is_active: true
  },
  {
    id: 'premium',
    name: 'Plan Premium',
    description: 'Acceso completo a todas las funcionalidades',
    price_monthly: 499,
    price_yearly: 4990,
    features: [
      'Acceso completo al dashboard',
      'Análisis avanzados',
      'Comparación de productos',
      'Subida ilimitada de datos',
      'Insights automáticos',
      'Soporte prioritario'
    ],
    is_active: true
  }
]

export default function Subscription() {
  const { user, profile, refreshProfile } = useAuth()
  const { toast } = useToast()
  const [selectedBilling, setSelectedBilling] = useState<'monthly' | 'yearly'>('monthly')
  const [isProcessing, setIsProcessing] = useState(false)

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
      case 'expired':
        return <Badge variant="destructive">Expirada</Badge>
      case 'canceled':
        return <Badge variant="secondary">Cancelada</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const handleContactAdmin = () => {
    toast({
      title: "Contacta al administrador",
      description: "Envía un email o contacta al administrador para activar tu suscripción.",
    })
  }

  const currentPlan = MOCK_PLANS.find(plan => plan.id === profile?.subscription_plan) || MOCK_PLANS[0]
  const hasActiveSubscription = profile?.subscription_status === 'active' && profile?.role === 'admin' || 
    (profile?.subscription_status === 'active' && profile?.subscription_expires_at && 
     new Date(profile.subscription_expires_at) > new Date())

  return (
    <div className="space-y-6">
      <InstitutionalHeader 
        title="Planes de Suscripción" 
        description="Elige el plan que mejor se adapte a tus necesidades."
      />

      {/* Current Subscription Status */}
      {profile && (
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
                <h3 className="font-semibold text-lg">{currentPlan.name}</h3>
                <p className="text-muted-foreground">{currentPlan.description}</p>
                <div className="flex items-center gap-4 mt-2">
                  {getStatusBadge(profile.subscription_status || 'inactive')}
                  <span className="text-sm text-muted-foreground">
                    Plan: {profile.subscription_plan || 'free'}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-green-600">
                  {formatPrice(currentPlan.price_monthly)}
                </p>
                <p className="text-sm text-muted-foreground">/mes</p>
                {profile.subscription_expires_at && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Expira: {new Date(profile.subscription_expires_at).toLocaleDateString('es-MX')}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Billing Toggle */}
      {!hasActiveSubscription && (
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
        {MOCK_PLANS.map((plan) => {
          const price = selectedBilling === 'yearly' ? plan.price_yearly : plan.price_monthly
          const isCurrentPlan = profile?.subscription_plan === plan.id
          
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
                  {selectedBilling === 'yearly' && plan.price_yearly > 0 && (
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
                
                {!hasActiveSubscription && plan.id === 'premium' && (
                  <Button 
                    className="w-full" 
                    onClick={handleContactAdmin}
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
                        Contactar Administrador
                      </>
                    )}
                  </Button>
                )}
                
                {isCurrentPlan && (
                  <Button variant="outline" className="w-full" disabled>
                    Plan Activo
                  </Button>
                )}

                {plan.id === 'free' && (
                  <Button variant="outline" className="w-full" disabled>
                    Plan Gratuito
                  </Button>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* No Subscription Warning */}
      {!hasActiveSubscription && profile?.role !== 'admin' && (
        <Card className="border-orange-500/20 bg-orange-500/10">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <div>
                <p className="font-medium text-orange-400">Acceso Limitado</p>
                <p className="text-sm text-orange-300">
                  Sin una suscripción activa, tu acceso a las funcionalidades está restringido. 
                  Contacta al administrador para activar tu suscripción premium.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}