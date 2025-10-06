import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { User, Settings, LogOut, Crown, CreditCard } from 'lucide-react'
import { Badge } from './custom/Badge'

export function TopBar() {
  const { user, profile, signOut, isAdmin, hasActiveSubscription } = useAuth()
  const navigate = useNavigate()
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (!user) return null

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getSubscriptionStatus = () => {
    if (!profile) return { text: 'Configurando...', variant: 'default' as const }
    if (isAdmin) return { text: 'Admin', variant: 'copper' as const }
    if (hasActiveSubscription) return { text: 'Premium', variant: 'success' as const }
    return { text: 'Sin Acceso', variant: 'default' as const }
  }

  const subscriptionStatus = getSubscriptionStatus()
  const displayName = profile?.name || user.email || 'Usuario'
  const displayEmail = profile?.email || user.email || ''

  return (
    <div className="h-16 bg-card border-b border-border flex items-center justify-end px-6">
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-muted transition-colors"
        >
          <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-medium text-sm">
            {getInitials(displayName)}
          </div>
          <div className="text-left hidden md:block">
            <p className="text-sm font-medium text-foreground">{displayName}</p>
            <p className="text-xs text-muted-foreground">{displayEmail}</p>
          </div>
        </button>

        {showDropdown && (
          <div className="absolute right-0 mt-2 w-64 bg-card border border-border rounded-lg shadow-lg z-50">
            <div className="p-4 border-b border-border">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-medium text-foreground">{displayName}</p>
                {profile && isAdmin && <Crown className="h-4 w-4 text-yellow-500" />}
              </div>
              <p className="text-xs text-muted-foreground mb-2">{displayEmail}</p>
              <Badge variant={subscriptionStatus.variant}>{subscriptionStatus.text}</Badge>
            </div>

            {profile && (
              <div className="p-2">
                <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors text-foreground">
                  <User className="h-4 w-4" />
                  <span className="text-sm">Perfil</span>
                </button>

                {!isAdmin && (
                  <button 
                    onClick={() => {
                      navigate('/subscription')
                      setShowDropdown(false)
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors text-foreground"
                  >
                    <CreditCard className="h-4 w-4" />
                    <span className="text-sm">Suscripción</span>
                  </button>
                )}

                <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors text-foreground">
                  <Settings className="h-4 w-4" />
                  <span className="text-sm">Configuración</span>
                </button>
              </div>
            )}

            <div className="p-2 border-t border-border">
              <button 
                onClick={() => {
                  signOut()
                  setShowDropdown(false)
                }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors text-destructive"
              >
                <LogOut className="h-4 w-4" />
                <span className="text-sm">Cerrar Sesión</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
