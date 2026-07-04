import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { User, AuthError, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export interface UserProfile {
  id: string
  full_name: string | null
  role: 'admin' | 'user'
  permissions: string[]
  created_at: string
}

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  session: Session | null
  loading: boolean
  isAdmin: boolean
  can: (section: string) => boolean
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

async function fetchProfile(userId: string): Promise<UserProfile | null> {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, full_name, role, permissions, created_at')
      .eq('id', userId)
      .single()

    if (error || !data) return null

    return {
      id: (data as any).id,
      full_name: (data as any).full_name ?? null,
      role: ((data as any).role as 'admin' | 'user') ?? 'user',
      permissions: Array.isArray((data as any).permissions) ? (data as any).permissions : [],
      created_at: (data as any).created_at,
    }
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshProfile = async () => {
    const { data: { session: s } } = await supabase.auth.getSession()
    if (!s?.user) return
    const p = await fetchProfile(s.user.id)
    setProfile(p)
  }

  useEffect(() => {
    let mounted = true

    // onAuthStateChange fires immediately with INITIAL_SESSION on page load
    // This is the single source of truth — no need for a separate getSession call
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return

        setSession(session)
        setUser(session?.user ?? null)

        if (session?.user) {
          // Fetch profile after we have a valid session
          const p = await fetchProfile(session.user.id)
          if (mounted) setProfile(p)
        } else {
          setProfile(null)
        }

        if (mounted) setLoading(false)
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  const signUp = async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) return { error }

    const userId = data.user?.id ?? data.session?.user?.id
    if (!userId) return { error: null }

    // Insert profile — try insert first, fallback to upsert
    const { error: insertError } = await supabase
      .from('user_profiles')
      .insert({ id: userId, full_name: fullName, role: 'user', permissions: [] } as any)

    if (insertError) {
      await supabase
        .from('user_profiles')
        .upsert({ id: userId, full_name: fullName, role: 'user', permissions: [] } as any)
    }

    return { error: null }
  }

  const signOut = async () => {
    setUser(null)
    setProfile(null)
    setSession(null)
    await supabase.auth.signOut()
  }

  const isAdmin = profile?.role === 'admin'

  const can = (section: string): boolean => {
    if (isAdmin) return true
    return profile?.permissions?.includes(section) ?? false
  }

  return (
    <AuthContext.Provider value={{
      user, profile, session, loading,
      isAdmin, can, signIn, signUp, signOut, refreshProfile
    }}>
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
