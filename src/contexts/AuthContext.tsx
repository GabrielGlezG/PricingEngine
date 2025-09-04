import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/integrations/supabase/client'
import { useQuery } from '@tanstack/react-query'
import { useToast } from '@/hooks/use-toast'

interface UserProfile {
  user_id: string
  email: string
  name: string
  role: string
  is_active: boolean
  subscription_status: string | null
  subscription_expires_at: string | null
}

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: UserProfile | null
  loading: boolean
  isAdmin: boolean
  hasActiveSubscription: boolean
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signUp: (email: string, password: string, name: string) => Promise<{ error: any }>
  signOut: () => Promise<void>
  refreshProfile: () => void
  makeFirstAdmin: (email: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  // Fetch user profile
  const { data: profile, refetch: refetchProfile } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (!user) return null
      
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()
      
      if (error) {
        console.error('Error fetching user profile:', error)
        // Si el perfil no existe, intentar crearlo
        if (error.code === 'PGRST116') {
          const { data: newProfile, error: createError } = await supabase
            .from('user_profiles')
            .insert({
              user_id: user.id,
              email: user.email || '',
              name: user.user_metadata?.name || user.email || '',
              role: 'user',
              is_active: true
            })
            .select()
            .single()
          
          if (createError) {
            console.error('Error creating user profile:', createError)
            return null
          }
          return newProfile as UserProfile
        }
        return null
      }
      return data as UserProfile
    },
    enabled: !!user,
    retry: 1
  })

  const isAdmin = Boolean(profile?.role === 'admin' && profile?.is_active)
  
  // Mejorar la lógica de verificación de suscripción activa
  const hasActiveSubscription = Boolean(
    profile?.is_active && (
      // Los admins siempre tienen acceso
      profile?.role === 'admin' || 
      // Usuarios con suscripción activa
      (profile?.subscription_status === 'active' && 
       (!profile?.subscription_expires_at || 
        new Date(profile.subscription_expires_at) > new Date()))
    )
  )

  const refreshProfile = () => {
    refetchProfile()
  }

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)
        
        if (session?.user) {
          // Pequeño delay para asegurar que el trigger de creación de perfil se ejecute
          setTimeout(() => {
            refetchProfile()
          }, 500)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [refetchProfile])

  // Función para hacer bootstrap del primer admin
  const makeFirstAdmin = async (email: string) => {
    try {
      const { error } = await supabase.rpc('bootstrap_first_admin', {
        p_user_email: email
      })
      
      if (error) throw error
      
      toast({
        title: "Administrador creado",
        description: "El usuario ha sido convertido en administrador."
      })
      
      // Refrescar el perfil después de un pequeño delay
      setTimeout(() => {
        refetchProfile()
      }, 1000)
    } catch (error: any) {
      console.error('Error making first admin:', error)
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      })
    }
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    return { error }
  }

  const signUp = async (email: string, password: string, name: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name
        }
      }
    })
    return { error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const value = {
    user,
    session,
    profile,
    loading,
    isAdmin,
    hasActiveSubscription: Boolean(hasActiveSubscription),
    signIn,
    signUp,
    signOut,
    refreshProfile,
    makeFirstAdmin
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}