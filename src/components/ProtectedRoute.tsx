import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const Spinner = () => (
  <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
  </div>
)

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) return <Spinner />
  if (!isAuthenticated) return <Navigate to="/signin" replace />
  return <>{children}</>
}

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { userRole, isLoading } = useAuth()

  if (isLoading) return <Spinner />
  if (!userRole) return <Navigate to="/signin" replace />
  if (userRole !== 'admin') return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

export function StudentRoute({ children }: { children: React.ReactNode }) {
  const { userRole, isLoading } = useAuth()

  if (isLoading) return <Spinner />
  if (!userRole) return <Navigate to="/signin" replace />
  if (userRole === 'banned') return <Navigate to="/signin" replace />
  if (userRole === 'faculty') return <Navigate to="/faculty-dashboard" replace />
  if (userRole === 'admin') return <Navigate to="/admin" replace />
  return <>{children}</>
}

export function FacultyRoute({ children }: { children: React.ReactNode }) {
  const { userRole, isLoading } = useAuth()

  if (isLoading) return <Spinner />
  if (!userRole) return <Navigate to="/signin" replace />
  if (userRole === 'student') return <Navigate to="/student-dashboard" replace />
  if (userRole === 'admin') return <Navigate to="/admin" replace />
  return <>{children}</>
}

export function StudentOrFacultyRoute({ children }: { children: React.ReactNode }) {
  const { userRole, isLoading } = useAuth()

  if (isLoading) return <Spinner />
  if (!userRole) return <Navigate to="/signin" replace />
  if (userRole === 'admin') return <Navigate to="/admin" replace />
  return <>{children}</>
}
