import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { User, AuthError } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Database } from '../types/database'

type UserProfile = Database['public']['Tables']['user_profiles']['Row']

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  session: any | null
  loading: boolean
  isAdmin: boolean
  can: (section: string) => boolean
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

async function fetchProfile(userId: string): Promise<UserProfile | null> {
  const { data } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single()
  return data ?? null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [session, setSession] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    // Initial session load — this is the source of truth on page load
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        const p = await fetchProfile(session.user.id)
        if (mounted) setProfile(p)
      }
      if (mounted) setLoading(false)
    })

    // Only handle auth state *changes* (sign in / sign out events)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return
      // Skip the initial INITIAL_SESSION event — already handled above
      if (event === 'INITIAL_SESSION') return
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        const p = await fetchProfile(session.user.id)
        if (mounted) setProfile(p)
      } else {
        setProfile(null)
      }
      setLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  const signUp = async (email: string, password: string, fullName?: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (!error && data.user) {
      await supabase.from('user_profiles').insert({
        id: data.user.id,
        full_name: fullName ?? null,
        role: 'user',
        permissions: [],
      } as any)
    }
    return { error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const isAdmin = profile?.role === 'admin'

  const can = (section: string): boolean => {
    if (isAdmin) return true
    return profile?.permissions?.includes(section) ?? false
  }

  return (
    <AuthContext.Provider value={{ user, profile, session, loading, isAdmin, can, signIn, signUp, signOut }}>
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
