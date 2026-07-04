import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { User, AuthError } from '@supabase/supabase-js'
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
  session: any | null
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
  const { data, error } = await supabase
    .from('user_profiles')
    .select('id, full_name, role, permissions, created_at')
    .eq('id', userId)
    .single()
  if (error || !data) return null
  return {
    id: data.id,
    full_name: data.full_name ?? null,
    role: (data.role as 'admin' | 'user') ?? 'user',
    permissions: Array.isArray(data.permissions) ? data.permissions : [],
    created_at: data.created_at,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [session, setSession] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshProfile = async () => {
    if (!user) return
    const p = await fetchProfile(user.id)
    setProfile(p)
  }

  useEffect(() => {
    let mounted = true

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

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return
      if (event === 'INITIAL_SESSION') return
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        const p = await fetchProfile(session.user.id)
        if (mounted) setProfile(p)
      } else {
        setProfile(null)
      }
      if (mounted) setLoading(false)
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

  const signUp = async (email: string, password: string, fullName: string) => {
    // Step 1: create the auth user (this does NOT create a session since we navigate to /pending)
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) return { error }

    const userId = data.user?.id ?? data.session?.user?.id
    if (!userId) return { error: null }

    // Step 2: insert profile immediately using the service key workaround —
    // we sign in right away so the authenticated client can insert
    const { error: profileError } = await supabase.from('user_profiles').insert({
      id: userId,
      full_name: fullName,
      role: 'user',
      permissions: [],
    } as any)

    if (profileError) {
      // Try upsert as fallback
      await supabase.from('user_profiles').upsert({
        id: userId,
        full_name: fullName,
        role: 'user',
        permissions: [],
      } as any)
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
    <AuthContext.Provider value={{ user, profile, session, loading, isAdmin, can, signIn, signUp, signOut, refreshProfile }}>
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
