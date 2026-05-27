import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { type User, type Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'
import { clearCartRef } from './CartContext'

const ADMIN_EMAIL = 'admin@stockpilot.inc'

type UserRole = 'student' | 'faculty' | 'admin' | 'blocked' | null

const getUserRole = (email: string): UserRole => {
  if (email === ADMIN_EMAIL) return 'admin'
  if (email === 'srijanmishra1669@gmail.com') return 'student'
  if (email === 'mishrasrijan2305@gmail.com') return 'faculty'
  if (email.endsWith('@opju.ac.in')) return 'faculty'
  if (email.endsWith('@opju.edu.in')) return 'student'
  return 'blocked'
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
  userRole: null
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [userRole, setUserRole] = useState<UserRole>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        const email = session.user.email ?? ''
        const role = getUserRole(email)
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
        // Check for admin session stored in localStorage
        const stored = localStorage.getItem('sp-user-type') as UserRole
        if (stored === 'admin') {
          setUserRole('admin')
        } else {
          setUserRole(null)
        }
      }
      setIsLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        const email = session.user.email ?? ''
        const role = getUserRole(email)
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
        const stored = localStorage.getItem('sp-user-type') as UserRole
        if (stored === 'admin') {
          setUserRole('admin')
        } else {
          setUserRole(null)
        }
      }
      setIsLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent'
        }
      }
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
