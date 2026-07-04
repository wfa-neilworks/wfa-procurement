import { createContext, useContext, useEffect, useState, useRef } from 'react'
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

const PROFILE_CACHE_KEY = 'wfa-profile-cache'

function getCachedProfile(): UserProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as UserProfile
  } catch {
    return null
  }
}

function setCachedProfile(p: UserProfile | null) {
  if (p) {
    localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(p))
  } else {
    localStorage.removeItem(PROFILE_CACHE_KEY)
  }
}

async function fetchProfile(userId: string): Promise<UserProfile | null> {
  try {
    const { data } = await supabase
      .from('user_profiles')
      .select('id, full_name, role, permissions, created_at')
      .eq('id', userId)
      .single() as any

    if (!data) return null
    return {
      id: data.id,
      full_name: data.full_name ?? null,
      role: data.role ?? 'user',
      permissions: Array.isArray(data.permissions) ? data.permissions : [],
      created_at: data.created_at,
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
  const resolvedRef = useRef(false)

  const refreshProfile = async () => {
    const { data: { session: s } } = await supabase.auth.getSession()
    if (!s?.user) return
    const p = await fetchProfile(s.user.id)
    setCachedProfile(p)
    setProfile(p)
  }

  useEffect(() => {
    const mounted = { current: true }

    async function handleSession(s: Session | null) {
      if (!mounted.current) return

      setSession(s)
      setUser(s?.user ?? null)

      if (!s?.user) {
        setCachedProfile(null)
        setProfile(null)
        if (mounted.current) setLoading(false)
        return
      }

      // Show cached profile immediately so the app unblocks right away
      const cached = getCachedProfile()
      if (cached && cached.id === s.user.id) {
        setProfile(cached)
        if (mounted.current) setLoading(false)
      }

      // Then fetch fresh profile in background and update
      const fresh = await fetchProfile(s.user.id)
      if (mounted.current) {
        setCachedProfile(fresh)
        setProfile(fresh)
        // If there was no cache, this is when loading becomes false
        if (mounted.current) setLoading(false)
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted.current) return

        if (event === 'INITIAL_SESSION') {
          if (!resolvedRef.current) {
            resolvedRef.current = true
            await handleSession(session)
          }
          return
        }

        // SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED, etc.
        resolvedRef.current = true
        await handleSession(session)
      }
    )

    // Fallback: if INITIAL_SESSION never fires, use getSession after 2s
    const fallback = setTimeout(async () => {
      if (!resolvedRef.current && mounted.current) {
        resolvedRef.current = true
        const { data: { session } } = await supabase.auth.getSession()
        await handleSession(session)
      }
    }, 2000)

    // Hard stop: loading cannot stay true past 5s no matter what
    const hardStop = setTimeout(() => {
      if (mounted.current) setLoading(false)
    }, 5000)

    return () => {
      mounted.current = false
      subscription.unsubscribe()
      clearTimeout(fallback)
      clearTimeout(hardStop)
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
    setCachedProfile(null)
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
      isAdmin, can, signIn, signUp, signOut, refreshProfile,
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
