import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { User, Settings, LogOut, Crown, CreditCard } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export function UserMenu() {
  const { user, profile, signOut, isAdmin, hasActiveSubscription } = useAuth()
  const navigate = useNavigate()

  if (!user || !profile) return null

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getSubscriptionStatus = () => {
    if (isAdmin) return { text: 'Admin', variant: 'default' as const, color: 'bg-yellow-600' }
    if (hasActiveSubscription) return { text: 'Premium', variant: 'default' as const, color: 'bg-green-600' }
    return { text: 'Sin Acceso', variant: 'secondary' as const, color: 'bg-gray-600' }
  }

  const subscriptionStatus = getSubscriptionStatus()

  // Debug logging
  console.log('UserMenu Debug:', {
    user: !!user,
    profile: !!profile,
    isAdmin,
    hasActiveSubscription,
    profileRole: profile?.role,
    profileActive: profile?.is_active,
    subscriptionStatus: profile?.subscription_status
  })

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">
              {getInitials(profile.name)}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-2">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium leading-none">{profile.name}</p>
              {isAdmin && <Crown className="h-3 w-3 text-yellow-500" />}
            </div>
            <p className="text-xs leading-none text-muted-foreground">
              {profile.email}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              ID: {user.id}
            </p>
            <Badge 
              variant={subscriptionStatus.variant} 
              className={`text-white text-xs w-fit ${subscriptionStatus.color}`}
            >
              {subscriptionStatus.text}
            </Badge>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <DropdownMenuItem>
          <User className="mr-2 h-4 w-4" />
          <span>Perfil</span>
        </DropdownMenuItem>
        
        {!isAdmin && (
          <DropdownMenuItem onClick={() => navigate('/subscription')}>
            <CreditCard className="mr-2 h-4 w-4" />
            <span>Suscripción</span>
          </DropdownMenuItem>
        )}
        
        <DropdownMenuItem>
          <Settings className="mr-2 h-4 w-4" />
          <span>Configuración</span>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={() => signOut()}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Cerrar Sesión</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}