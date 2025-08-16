import { useAuth } from '@/contexts/AuthContext'
import { Navigate, useLocation } from 'react-router-dom'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { AlertTriangle, Crown } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireAdmin?: boolean
  requireSubscription?: boolean
}

export function ProtectedRoute({ 
  children, 
  requireAdmin = false, 
  requireSubscription = true 
}: ProtectedRouteProps) {
  const { user, loading, isAdmin, hasActiveSubscription, profile } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-8 w-24 mb-2" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (requireAdmin && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <Crown className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
            <h2 className="text-xl font-semibold mb-2">Acceso Restringido</h2>
            <p className="text-muted-foreground mb-4">
              Esta sección requiere permisos de administrador.
            </p>
            <Button onClick={() => window.history.back()}>
              Volver
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (requireSubscription && !hasActiveSubscription) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-orange-500" />
            <h2 className="text-xl font-semibold mb-2">Suscripción Requerida</h2>
            <p className="text-muted-foreground mb-4">
              {profile?.subscription_status === 'active' && profile?.subscription_expires_at ? 
                `Tu suscripción expiró el ${new Date(profile.subscription_expires_at).toLocaleDateString()}.` :
                'Necesitas una suscripción activa para acceder a esta funcionalidad.'
              }
            </p>
            <div className="space-y-2">
              <Button className="w-full">
                Renovar Suscripción
              </Button>
              <Button variant="outline" onClick={() => window.history.back()}>
                Volver
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return <>{children}</>
}