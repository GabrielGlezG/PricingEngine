import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/integrations/supabase/client'
import { useQuery } from '@tanstack/react-query'

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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

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
      
      if (error) throw error
      return data as UserProfile
    },
    enabled: !!user
  })

  const isAdmin = profile?.role === 'admin' && profile?.is_active
  const hasActiveSubscription = profile?.is_active && (
    profile?.role === 'admin' || 
    (profile?.subscription_status === 'active' && 
     profile?.subscription_expires_at && 
     new Date(profile.subscription_expires_at) > new Date())
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
          refetchProfile()
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [refetchProfile])

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
    isAdmin: !!isAdmin,
    hasActiveSubscription: !!hasActiveSubscription,
    signIn,
    signUp,
    signOut,
    refreshProfile
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