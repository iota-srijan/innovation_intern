import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'sonner'

import { useAuth } from './context/AuthContext'
import { ProtectedRoute, AdminRoute, AdminOrMentorRoute, StudentRoute, FacultyRoute, StudentOrFacultyRoute, SuperAdminRoute, MentorRoute } from './components/ProtectedRoute'
import { SessionTracker } from './components/SessionTracker'

import LandingPage from './pages/LandingPage'
import SignIn from './pages/SignIn'
import AuthCallback from './pages/AuthCallback'
import Profile from './pages/Profile'
import AdminDashboard from './pages/AdminDashboard'
import SuperAdminDashboard from './pages/SuperAdminDashboard'
import MentorDashboard from './pages/MentorDashboard'
import StudentDashboard from './pages/StudentDashboard'
import FacultyDashboard from './pages/FacultyDashboard'
import CartPage from './pages/CartPage'
import StudentRequestsPage from './pages/StudentRequestsPage'
import DemandsPage from './pages/DemandsPage'
import AdminInventoryPage from './pages/AdminInventoryPage'
import AdminDemandsPage from './pages/AdminDemandsPage'
import FacultyRequestsPage from './pages/FacultyRequestsPage'
import AdminLogisticsPage from './pages/AdminLogisticsPage'
import AdminPendingPage from './pages/AdminPendingPage'
import AdminAllRequestsPage from './pages/AdminAllRequestsPage'
import AdminAuditLogPage from './pages/AdminAuditLogPage'
import AdminSettingsPage from './pages/AdminSettingsPage'
import NotificationsPage from './pages/NotificationsPage'
import AdminNotificationsPage from './pages/AdminNotificationsPage'
import AdminAnalyticsPage from './pages/AdminAnalyticsPage'

export default function App() {
  const { isRoleLoading } = useAuth()

  if (isRoleLoading) {
    return <div className="min-h-screen bg-[#0d0a08]" />
  }

  return (
    <BrowserRouter>
      <SessionTracker />
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/auth/callback" element={<AuthCallback />} />

        {/* Protected app routes */}
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

        {/* IdeaLab role-based routes */}
        <Route path="/student-dashboard" element={<StudentRoute><StudentDashboard /></StudentRoute>} />
        <Route path="/cart" element={<StudentOrFacultyRoute><CartPage /></StudentOrFacultyRoute>} />
        <Route path="/student/requests" element={<StudentRoute><StudentRequestsPage /></StudentRoute>} />
        <Route path="/faculty-dashboard" element={<FacultyRoute><FacultyDashboard /></FacultyRoute>} />
        <Route path="/faculty-requests" element={<FacultyRoute><FacultyRequestsPage /></FacultyRoute>} />
        <Route path="/notifications" element={<StudentOrFacultyRoute><NotificationsPage /></StudentOrFacultyRoute>} />
        <Route path="/demands" element={<ProtectedRoute><DemandsPage /></ProtectedRoute>} />

        {/* Admin-only routes */}
        <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/admin/logistics" element={<AdminRoute><AdminLogisticsPage /></AdminRoute>} />
        <Route path="/admin/inventory" element={<AdminOrMentorRoute><AdminInventoryPage /></AdminOrMentorRoute>} />
        <Route path="/admin/demands" element={<AdminRoute><AdminDemandsPage /></AdminRoute>} />
        <Route path="/admin/pending" element={<AdminRoute><AdminPendingPage /></AdminRoute>} />
        <Route path="/admin/requests" element={<AdminRoute><AdminAllRequestsPage /></AdminRoute>} />
        <Route path="/admin/notifications" element={<AdminRoute><AdminNotificationsPage /></AdminRoute>} />
        <Route path="/admin/audit-log" element={<AdminRoute><AdminAuditLogPage /></AdminRoute>} />
        <Route path="/admin/analytics" element={<AdminRoute><AdminAnalyticsPage /></AdminRoute>} />
        <Route path="/admin/settings" element={<AdminRoute><AdminSettingsPage /></AdminRoute>} />

        {/* Super Admin / Mentor portals */}
        <Route path="/super-admin" element={<SuperAdminRoute><SuperAdminDashboard /></SuperAdminRoute>} />
        <Route path="/mentor-dashboard" element={<MentorRoute><MentorDashboard /></MentorRoute>} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <Toaster richColors position="top-right" />
    </BrowserRouter>
  )
}
