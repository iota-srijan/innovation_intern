import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { type User, type Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'
import { clearCartRef } from './CartContext'

const ADMIN_EMAIL = 'admin@stockpilot.inc'

type UserRole = 'student' | 'faculty' | 'admin' | 'blocked' | null

// Fallback rules when user_roles table has no row for this email
function getDefaultRole(email: string): UserRole {
  if (email === ADMIN_EMAIL) return 'admin'
  if (email === 'srijanmishra1669@gmail.com') return 'student'
  if (email === 'mishrasrijan2305@gmail.com') return 'faculty'
  if (email.endsWith('@opju.ac.in')) return 'faculty'
  if (email.endsWith('@opju.edu.in')) return 'student'
  return 'blocked'
}

// Primary source of truth: user_roles table. Falls back to domain rules.
async function fetchUserRole(email: string): Promise<UserRole> {
  if (email === ADMIN_EMAIL) return 'admin'
  try {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('email', email)
      .maybeSingle()
    if (data?.role) return data.role as UserRole
  } catch {
    // table missing or network error — fall through to defaults
  }
  return getDefaultRole(email)
}

interface AuthContextValue {
  user: User | null
  session: Session | null
  isAuthenticated: boolean
  isLoading: boolean
  signInWithGoogle: () => Promise<void>
  signInAsAdmin: (email: string, password: string) => Promise<boolean>
  signOut: () => Promise<void>
  userRole: UserRole
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  isAuthenticated: false,
  isLoading: true,
  signInWithGoogle: async () => {},
  signInAsAdmin: async () => false,
  signOut: async () => {},
  userRole: null,
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [userRole, setUserRole] = useState<UserRole>(null)

  useEffect(() => {
    let cancelled = false

    const resolveSession = async (s: Session | null) => {
      if (cancelled) return

      setSession(s)
      setUser(s?.user ?? null)

      if (s?.user) {
        const email = s.user.email ?? ''
        const role = await fetchUserRole(email)
        if (cancelled) return

        if (role === 'blocked') {
          void supabase.auth.signOut()
          setUser(null)
          setSession(null)
          setUserRole(null)
        } else {
          localStorage.setItem('sp-user-type', role as string)
          setUserRole(role)
        }
      } else {
        // No Supabase session — check for admin localStorage token
        const stored = localStorage.getItem('sp-user-type') as UserRole
        setUserRole(stored === 'admin' ? 'admin' : null)
      }

      if (!cancelled) setIsLoading(false)
    }

    void supabase.auth.getSession().then(({ data: { session: s } }) => resolveSession(s))

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      void resolveSession(s)
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    })
  }

  const signInAsAdmin = async (email: string, password: string): Promise<boolean> => {
    if (email === ADMIN_EMAIL && password === 'admin123') {
      localStorage.setItem('sp-user-type', 'admin')
      setUserRole('admin')
      return true
    }
    return false
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    localStorage.removeItem('sp-user-type')
    localStorage.removeItem('sp-auth-user')
    clearCartRef.current?.()
    setUserRole(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isAuthenticated: !!user || userRole === 'admin',
        isLoading,
        signInWithGoogle,
        signInAsAdmin,
        signOut,
        userRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
