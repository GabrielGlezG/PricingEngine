import { Menu, LogOut, Crown, CreditCard, CalendarClock, Sun, Moon } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useLastUpdate } from '@/contexts/LastUpdateContext'
import { useNavigate } from 'react-router-dom'
import { useTheme } from 'next-themes'
import { Badge } from './custom/Badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface TopBarProps {
  onMenuClick: () => void
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const { user, profile, signOut, isAdmin, hasActiveSubscription } = useAuth()
  const { lastUpdate } = useLastUpdate()
  const { theme, setTheme } = useTheme()
  const navigate = useNavigate()

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
  const displayName = profile?.name || user?.email || 'Usuario'
  const displayEmail = profile?.email || user?.email || ''

  return (
    <div className="h-16 bg-card border-b border-border flex items-center px-4 sm:px-6 justify-between">
      <button
        onClick={onMenuClick}
        className="md:hidden h-10 w-10 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center transition-colors flex-shrink-0"
        aria-label="Abrir menú"
      >
        <Menu className="h-5 w-5" />
      </button>
      
      <div className="flex-1" />

      {lastUpdate && (
        <div className="hidden sm:flex items-center gap-1.5 sm:gap-2 mr-2 sm:mr-3 text-muted-foreground">
          <CalendarClock className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
          <span className="text-xs whitespace-nowrap">
            <span className="hidden lg:inline">Última actualización: </span>
            {format(new Date(lastUpdate), "d MMM", { locale: es })}
            <span className="hidden md:inline">{format(new Date(lastUpdate), ", yyyy", { locale: es })}</span>
          </span>
        </div>
      )}

      <button
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        className="h-10 w-10 rounded-lg bg-muted hover:bg-muted/80 text-foreground flex items-center justify-center transition-colors flex-shrink-0 mr-2"
        aria-label="Cambiar tema"
      >
        {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </button>

      {user && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors flex-shrink-0">
              {getInitials(displayName)}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 p-3 space-y-3 bg-card z-50">
            <div className="flex items-center gap-3 px-2">
              <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-medium text-sm flex-shrink-0">
                {getInitials(displayName)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
                  {profile && isAdmin && <Crown className="h-4 w-4 text-yellow-500 flex-shrink-0" />}
                </div>
                <p className="text-xs text-muted-foreground truncate">{displayEmail}</p>
                <Badge variant={subscriptionStatus.variant} className="mt-1">{subscriptionStatus.text}</Badge>
              </div>
            </div>

            {profile && !isAdmin && (
              <button
                onClick={() => navigate('/subscription')}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors text-foreground"
              >
                <CreditCard className="h-4 w-4" />
                <span className="text-sm">Suscripción</span>
              </button>
            )}

            <button
              onClick={async () => {
                await signOut()
                navigate('/login')
              }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors text-destructive"
            >
              <LogOut className="h-4 w-4" />
              <span className="text-sm">Cerrar Sesión</span>
            </button>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}
