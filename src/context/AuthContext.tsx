import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { type User, type Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'
import { clearCartRef } from './CartContext'
import { getDefaultRole, type UserRole } from '../lib/roleConfig'

// Queries user_roles for both role and display_name in one round-trip.
async function fetchUserData(email: string): Promise<{ role: UserRole; displayName: string | null }> {
  try {
    const { data } = await supabase
      .from('user_roles')
      .select('role, display_name')
      .eq('email', email)
      .maybeSingle()
    if (data?.role) {
      return {
        role: data.role as UserRole,
        displayName: (data.display_name as string | null) ?? null,
      }
    }
  } catch {
    // table missing, column missing, or network error — fall through to defaults
  }
  return { role: getDefaultRole(email), displayName: null }
}

// Resolves the best available display name for a logged-in user in priority order:
// 1. display_name from user_roles (saved custom name)
// 2. full_name from Google OAuth metadata
// 3. name from Google OAuth metadata
// 4. Capitalized local part of email (girish.mishra → "Girish Mishra")
// 5. Raw email as final fallback
function getDisplayName(user: User, dbDisplayName: string | null): string {
  if (dbDisplayName) return dbDisplayName
  const meta = user.user_metadata as Record<string, unknown>
  if (typeof meta?.full_name === 'string' && meta.full_name) return meta.full_name
  if (typeof meta?.name === 'string' && meta.name) return meta.name
  const local = (user.email ?? '').split('@')[0]
  if (local) {
    return local.split('.').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  }
  return user.email ?? ''
}

interface AuthContextValue {
  user: User | null
  session: Session | null
  isAuthenticated: boolean
  isLoading: boolean
  isRoleLoading: boolean
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  userRole: UserRole
  displayName: string
  setDisplayName: (name: string) => void
  authError: string | null
  clearAuthError: () => void
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  isAuthenticated: false,
  isLoading: true,
  isRoleLoading: true,
  signInWithGoogle: async () => {},
  signOut: async () => {},
  userRole: null,
  displayName: '',
  setDisplayName: () => {},
  authError: null,
  clearAuthError: () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRoleLoading, setIsRoleLoading] = useState(true)
  const [userRole, setUserRole] = useState<UserRole>(null)
  const [displayName, setDisplayName] = useState('')
  const [authError, setAuthError] = useState<string | null>(null)

  const clearAuthError = () => setAuthError(null)

  useEffect(() => {
    let cancelled = false

    const resolveSession = async (s: Session | null) => {
      if (cancelled) return

      setIsRoleLoading(true)
      setSession(s)
      setUser(s?.user ?? null)

      if (s?.user) {
        const email = s.user.email ?? ''

        // Upsert user into user_roles with the role detected from their email pattern.
        // ignoreDuplicates: true → ON CONFLICT DO NOTHING so admin-granted roles are preserved.
        // A second UPDATE syncs display_name from Google metadata for returning users
        // whose display_name column is still null.
        if (email) {
          const meta = s.user.user_metadata as Record<string, unknown>
          const nameFromMeta: string | null =
            (typeof meta?.full_name === 'string' && meta.full_name ? meta.full_name : null) ??
            (typeof meta?.name === 'string' && meta.name ? meta.name : null) ??
            null
          const detectedRole = getDefaultRole(email)

          if (detectedRole === 'student' || detectedRole === 'faculty') {
            const { error: upsertError } = await supabase
              .from('user_roles')
              .upsert(
                {
                  user_id: s.user.id,
                  email,
                  role: detectedRole,
                  display_name: nameFromMeta,
                  last_sign_in_at: new Date().toISOString(),
                },
                { onConflict: 'user_id', ignoreDuplicates: true }
              )

            // Always update last_sign_in_at separately — safe to overwrite
            // since it's just a timestamp, not a role.
            if (!upsertError) {
              await supabase
                .from('user_roles')
                .update({ last_sign_in_at: new Date().toISOString() })
                .eq('user_id', s.user.id)
            }

            // For returning users whose display_name is still null (logged in before this
            // field was added), sync it from Google metadata without touching role.
            if (!upsertError && nameFromMeta) {
              await supabase
                .from('user_roles')
                .update({ display_name: nameFromMeta })
                .eq('user_id', s.user.id)
                .is('display_name', null)
            }
          }
        }

        const { role, displayName: dbName } = await fetchUserData(email)
        if (cancelled) return

        if (role === 'banned') {
          void supabase.auth.signOut()
          setUser(null)
          setSession(null)
          setUserRole(null)
          setDisplayName('')
          setAuthError('Your account has been suspended. Contact lab administration.')
        } else if (role === 'blocked') {
          void supabase.auth.signOut()
          setUser(null)
          setSession(null)
          setUserRole(null)
          setDisplayName('')
        } else {
          localStorage.setItem('sp-user-type', role as string)
          setUserRole(role)
          setDisplayName(getDisplayName(s.user, dbName))
        }
      } else {
        setUserRole(null)
        setDisplayName('')
      }

      if (!cancelled) {
        setIsRoleLoading(false)
        setIsLoading(false)
      }
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

  const signOut = async () => {
    await supabase.auth.signOut()
    localStorage.removeItem('sp-user-type')
    clearCartRef.current?.()
    setUserRole(null)
    setDisplayName('')
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isAuthenticated: !!user,
        isLoading,
        isRoleLoading,
        signInWithGoogle,
        signOut,
        userRole,
        displayName,
        setDisplayName,
        authError,
        clearAuthError,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
