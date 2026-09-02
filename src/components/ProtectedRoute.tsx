import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { homePathForRole } from '../lib/roleConfig'

const Spinner = () => (
  <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-orange-400 border-t-transparent rounded-full animate-spin"></div>
  </div>
)

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, userRole } = useAuth()

  if (isLoading) return <Spinner />
  if (userRole === 'banned' || userRole === 'blocked') {
    return <Navigate to="/signin?error=blocked" replace />
  }
  if (!isAuthenticated) return <Navigate to="/signin" replace />
  return <>{children}</>
}

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { userRole, isLoading } = useAuth()

  if (isLoading) return <Spinner />
  if (userRole === 'banned' || userRole === 'blocked') {
    return <Navigate to="/signin?error=blocked" replace />
  }
  if (!userRole) return <Navigate to="/signin" replace />
  if (userRole !== 'admin' && userRole !== 'super_admin') return <Navigate to={homePathForRole(userRole)} replace />
  return <>{children}</>
}

// Same as AdminRoute but also lets mentors through — used for routes mentors
// reuse directly (e.g. /admin/inventory), per Sidebar's existing nav exposure.
export function AdminOrMentorRoute({ children }: { children: React.ReactNode }) {
  const { userRole, isLoading } = useAuth()

  if (isLoading) return <Spinner />
  if (userRole === 'banned' || userRole === 'blocked') {
    return <Navigate to="/signin?error=blocked" replace />
  }
  if (!userRole) return <Navigate to="/signin" replace />
  if (userRole !== 'admin' && userRole !== 'super_admin' && userRole !== 'mentor') {
    return <Navigate to={homePathForRole(userRole)} replace />
  }
  return <>{children}</>
}

export function StudentRoute({ children }: { children: React.ReactNode }) {
  const { userRole, isLoading } = useAuth()

  if (isLoading) return <Spinner />
  if (userRole === 'banned' || userRole === 'blocked') {
    return <Navigate to="/signin?error=blocked" replace />
  }
  if (!userRole) return <Navigate to="/signin" replace />
  if (userRole === 'faculty') return <Navigate to="/faculty-dashboard" replace />
  if (userRole === 'admin') return <Navigate to="/admin" replace />
  return <>{children}</>
}

export function FacultyRoute({ children }: { children: React.ReactNode }) {
  const { userRole, isLoading } = useAuth()

  if (isLoading) return <Spinner />
  if (userRole === 'banned' || userRole === 'blocked') {
    return <Navigate to="/signin?error=blocked" replace />
  }
  if (!userRole) return <Navigate to="/signin" replace />
  if (userRole === 'student') return <Navigate to="/student-dashboard" replace />
  if (userRole === 'admin') return <Navigate to="/admin" replace />
  return <>{children}</>
}

export function StudentOrFacultyRoute({ children }: { children: React.ReactNode }) {
  const { userRole, isLoading } = useAuth()

  if (isLoading) return <Spinner />
  if (userRole === 'banned' || userRole === 'blocked') {
    return <Navigate to="/signin?error=blocked" replace />
  }
  if (!userRole) return <Navigate to="/signin" replace />
  if (userRole === 'admin') return <Navigate to="/admin" replace />
  return <>{children}</>
}

export function SuperAdminRoute({ children }: { children: React.ReactNode }) {
  const { userRole, isRoleLoading, isAuthenticated } = useAuth()
  if (isRoleLoading) return null
  if (!isAuthenticated) return <Navigate to="/signin" replace />
  if (userRole === 'banned' || userRole === 'blocked') {
    return <Navigate to="/signin?error=blocked" replace />
  }
  if (userRole !== 'super_admin') return <Navigate to="/signin" replace />
  return <>{children}</>
}

export function MentorRoute({ children }: { children: React.ReactNode }) {
  const { userRole, isRoleLoading, isAuthenticated } = useAuth()
  if (isRoleLoading) return null
  if (!isAuthenticated) return <Navigate to="/signin" replace />
  if (userRole === 'banned' || userRole === 'blocked') {
    return <Navigate to="/signin?error=blocked" replace />
  }
  if (userRole !== 'mentor') return <Navigate to="/signin" replace />
  return <>{children}</>
}
