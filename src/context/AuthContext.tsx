import { createContext, useContext, useState, type ReactNode } from 'react'

export type UserRole = 'free' | 'pro' | 'admin' | null

interface AuthUser {
  name: string
  email: string
  avatar: string
  role: UserRole
  provider: 'google' | 'microsoft' | 'admin'
}

interface AuthContextValue {
  user: AuthUser | null
  isAuthenticated: boolean
  signInWithGoogle: (requestedRole?: UserRole) => void
  signInWithMicrosoft: (requestedRole?: UserRole) => void
  signInAsAdmin: () => void
  signOut: () => void
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isAuthenticated: false,
  signInWithGoogle: () => {},
  signInWithMicrosoft: () => {},
  signInAsAdmin: () => {},
  signOut: () => {}
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = localStorage.getItem('sp-auth-user')
    return stored ? JSON.parse(stored) : null
  })

  const persist = (u: AuthUser | null) => {
    setUser(u)
    if (u) {
      localStorage.setItem('sp-auth-user', JSON.stringify(u))
      localStorage.setItem('sp-user-type', u.role ?? 'free')
    } else {
      localStorage.removeItem('sp-auth-user')
      localStorage.removeItem('sp-user-type')
    }
  }

  const signInWithGoogle = () => persist({
    name: 'Shrijan Mishra',
    email: 'shrijan@gmail.com',
    avatar: 'SM',
    role: 'pro',
    provider: 'google'
  })

  const signInWithMicrosoft = (requestedRole?: UserRole) => persist({
    name: 'Shrijan Mishra',
    email: 'shrijan@outlook.com',
    avatar: 'SM',
    role: requestedRole || 'free',
    provider: 'microsoft'
  })

  const signInAsAdmin = () => persist({
    name: 'Admin',
    email: 'admin@stockpilot.inc',
    avatar: 'AD',
    role: 'admin',
    provider: 'admin'
  })

  const signOut = () => {
    persist(null)
    localStorage.removeItem('sp-user-type')
  }

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      signInWithGoogle,
      signInWithMicrosoft,
      signInAsAdmin,
      signOut
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
