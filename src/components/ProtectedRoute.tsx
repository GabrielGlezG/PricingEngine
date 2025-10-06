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

  // Debug logging para identificar problemas
  console.log('ProtectedRoute Debug:', {
    user: !!user,
    profile: !!profile,
    isAdmin,
    hasActiveSubscription,
    requireAdmin,
    requireSubscription,
    profileData: profile ? {
      role: profile.role,
      subscription_status: profile.subscription_status,
      subscription_expires_at: profile.subscription_expires_at
    } : null
  })

  // Mostrar skeleton si está cargando o si el usuario existe pero el perfil no se ha cargado aún
  if (loading || (user && !profile)) {
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

  // Si llegamos aquí sin perfil después de cargar, entonces sí es un error real
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-orange-500" />
            <h2 className="text-xl font-semibold mb-2">Error de Perfil</h2>
            <p className="text-muted-foreground mb-4">
              No se pudo cargar tu perfil de usuario. Por favor, intenta cerrar sesión y volver a iniciar sesión.
            </p>
            <div className="space-y-2">
              <Button onClick={() => window.location.reload()}>
                Recargar Página
              </Button>
              <div className="text-xs text-muted-foreground">
                Usuario ID: {user.id}<br/>
                Email: {user.email}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
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

  return <>{children}</>
}