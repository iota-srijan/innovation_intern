import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { type User, type Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'

interface AuthContextValue {
  user: User | null
  session: Session | null
  isAuthenticated: boolean
  isLoading: boolean
  signInWithGoogle: () => Promise<void>
  signInAsAdmin: (email: string, password: string) => Promise<boolean>
  signOut: () => Promise<void>
  userRole: 'free' | 'pro' | 'admin' | null
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  isAuthenticated: false,
  isLoading: true,
  signInWithGoogle: async () => {},
  signInAsAdmin: async () => false,
  signOut: async () => {},
  userRole: null
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [userRole, setUserRole] = useState<'free' | 'pro' | 'admin' | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        const stored = localStorage.getItem('sp-user-type') as 'free' | 'pro' | 'admin' | null
        setUserRole(stored ?? 'free')
      }
      setIsLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        const stored = localStorage.getItem('sp-user-type') as 'free' | 'pro' | 'admin' | null
        setUserRole(stored ?? 'free')
      } else {
        setUserRole(null)
      }
      setIsLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })
  }

  const signInAsAdmin = async (email: string, password: string): Promise<boolean> => {
    if (email === 'admin@stockpilot.inc' && password === 'admin123') {
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
    setUserRole(null)
  }

  return (
    <AuthContext.Provider value={{
      user,
      session,
      isAuthenticated: !!user || userRole === 'admin',
      isLoading,
      signInWithGoogle,
      signInAsAdmin,
      signOut,
      userRole
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
