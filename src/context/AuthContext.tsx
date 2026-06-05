import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { type User, type Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'
import { clearCartRef } from './CartContext'

function isAdminEmail(email: string): boolean {
  return email.endsWith('@stockpilot.inc')
}

type UserRole = 'student' | 'faculty' | 'admin' | 'blocked' | 'banned' | null

// Detect student vs faculty for @opju.ac.in emails.
// Student local parts contain a department-code segment after the dot:
//   e.g. kesh.bt24me14 → second segment starts with 2 letters + 2 digits → student
// Faculty local parts are plain name.surname (no embedded code) → faculty
function inferOpjuRole(email: string): 'student' | 'faculty' {
  const local = email.split('@')[0]
  const dotIndex = local.indexOf('.')
  if (dotIndex !== -1 && /^[a-zA-Z]{2}\d{2}/.test(local.slice(dotIndex + 1))) {
    return 'student'
  }
  return 'faculty'
}

// Fallback rules when user_roles table has no row for this email
function getDefaultRole(email: string): UserRole {
  if (isAdminEmail(email)) return 'admin'
  if (email === 'srijanmishra1669@gmail.com') return 'student'
  if (email === 'mishrasrijan2305@gmail.com') return 'faculty'
  if (email.endsWith('@opju.ac.in')) return inferOpjuRole(email)
  return 'blocked'
}

// Queries user_roles for both role and display_name in one round-trip.
async function fetchUserData(email: string): Promise<{ role: UserRole; displayName: string | null }> {
  if (isAdminEmail(email)) return { role: 'admin', displayName: null }
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
  signInAsAdmin: (email: string, password: string) => Promise<boolean>
  signOut: () => Promise<void>
  userRole: UserRole
  adminEmail: string | null
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
  signInAsAdmin: async () => false,
  signOut: async () => {},
  userRole: null,
  adminEmail: null,
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
  const [userRole, setUserRole] = useState<UserRole>(() => {
    // Synchronously seed from localStorage so the first render already has the
    // correct role — eliminates the null-flash on page load for admin sessions.
    const stored = localStorage.getItem('sp-user-type') as UserRole
    return stored === 'admin' ? 'admin' : null
  })
  const [adminEmail, setAdminEmail] = useState<string | null>(() =>
    localStorage.getItem('sp-admin-email')
  )
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
        if (email && !isAdminEmail(email)) {
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
                { user_id: s.user.id, email, role: detectedRole, display_name: nameFromMeta },
                { onConflict: 'user_id', ignoreDuplicates: true }
              )
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
        // No Supabase session — restore admin role and email from localStorage
        const stored = localStorage.getItem('sp-user-type') as UserRole
        setUserRole(stored === 'admin' ? 'admin' : null)
        if (stored === 'admin') {
          const storedEmail = localStorage.getItem('sp-admin-email')
          setAdminEmail(storedEmail)
          setDisplayName(storedEmail ?? '')
        } else {
          setDisplayName('')
        }
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

  const signInAsAdmin = async (email: string, password: string): Promise<boolean> => {
    const trimmedEmail = email.trim()

    try {
      const { data, error } = await supabase
        .from('admin_credentials')
        .select('*')
        .eq('email', trimmedEmail)
        .eq('password', password)
        .single()

      if (!error && data) {
        localStorage.setItem('sp-user-type', 'admin')
        localStorage.setItem('sp-admin-email', trimmedEmail)
        setUserRole('admin')
        setAdminEmail(trimmedEmail)
        setDisplayName(trimmedEmail)
        return true
      }
    } catch {
      // network error
    }

    return false
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    localStorage.removeItem('sp-user-type')
    localStorage.removeItem('sp-auth-user')
    localStorage.removeItem('sp-admin-email')
    clearCartRef.current?.()
    setUserRole(null)
    setAdminEmail(null)
    setDisplayName('')
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isAuthenticated: !!user || userRole === 'admin',
        isLoading,
        isRoleLoading,
        signInWithGoogle,
        signInAsAdmin,
        signOut,
        userRole,
        adminEmail,
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
