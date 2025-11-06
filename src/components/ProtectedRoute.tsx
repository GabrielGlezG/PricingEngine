import { useAuth } from '@/contexts/AuthContext'
import { Navigate, useLocation } from 'react-router-dom'
import { AlertTriangle, Crown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/LoadingSpinner'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireAdmin?: boolean
  requireSubscription?: boolean
  allowWithoutProfile?: boolean
}

export function ProtectedRoute({ 
  children, 
  requireAdmin = false, 
  requireSubscription = true,
  allowWithoutProfile = false
}: ProtectedRouteProps) {
  const { user, loading, isAdmin, hasActiveSubscription, profile } = useAuth()
  const location = useLocation()

  // Mostrar loading solo si hay usuario autenticado pero está cargando el perfil
  if (loading) {
    // Si no hay usuario, no mostrar nada (va a redirigir a login)
    if (!user) {
      return null
    }
    // Si hay usuario pero está cargando el perfil, mostrar spinner
    return <LoadingSpinner fullScreen size="lg" text="Cargando perfil..." />
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  
  // Verificar permisos solo si tiene perfil
  if (profile) {
    if (requireAdmin && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <Crown className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
            <h2 className="text-xl font-semibold mb-2">Acceso Restringido</h2>
            <p className="text-muted-foreground mb-4">
              Esta sección requiere permisos de administrador.
              {profile && (
                <span className="block mt-2 text-sm">
                  Tu rol actual: {profile.role}<br/>
                  Suscripción: {profile.subscription_status || 'Sin suscripción'}<br/>
                  Debug - isAdmin: {isAdmin ? 'true' : 'false'}
                </span>
              )}
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
        <Card className="max-w-lg w-full">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-orange-500" />
            <h2 className="text-xl font-semibold mb-2">Suscripción Requerida</h2>
            <p className="text-muted-foreground mb-4">
              {profile?.subscription_status === 'active' && profile?.subscription_expires_at ? 
                `Tu suscripción expiró el ${new Date(profile.subscription_expires_at).toLocaleDateString()}.` :
                'Necesitas una suscripción activa para acceder a esta funcionalidad. Contacta al administrador o activa tu suscripción.'
              }
              {profile && (
                <span className="block mt-2 text-sm">
                  Estado de suscripción: {profile.subscription_status || 'Sin suscripción'}<br/>
                  Rol: {profile.role}<br/>
                  Expira: {profile.subscription_expires_at ? new Date(profile.subscription_expires_at).toLocaleDateString() : 'N/A'}<br/>
                  Debug - hasActiveSubscription: {hasActiveSubscription ? 'true' : 'false'}
                </span>
              )}
            </p>
            <div className="space-y-2">
              <Button className="w-full" onClick={() => window.location.href = '/subscription'}>
                Ver Planes de Suscripción
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
  }

  return <>{children}</>
}