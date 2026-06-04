import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'sonner'

import { useAuth } from './context/AuthContext'
import { ProtectedRoute, AdminRoute, StudentRoute, FacultyRoute, StudentOrFacultyRoute } from './components/ProtectedRoute'

import LandingPage from './pages/LandingPage'
import SignIn from './pages/SignIn'
import AuthCallback from './pages/AuthCallback'
import Dashboard from './pages/Dashboard'
import ProDashboard from './pages/ProDashboard'
import Inventory from './pages/Inventory'
import Suppliers from './pages/Suppliers'
import PurchaseOrders from './pages/PurchaseOrders'
import LowStockAlerts from './pages/LowStockAlerts'
import PendingPOs from './pages/PendingPOs'
import Profile from './pages/Profile'
import AdminDashboard from './pages/AdminDashboard'
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
import AdminPasswordPage from './pages/AdminPasswordPage'

export default function App() {
  const { isRoleLoading } = useAuth()

  if (isRoleLoading) {
    return <div className="min-h-screen bg-[#0a0a0b]" />
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/auth/callback" element={<AuthCallback />} />

        {/* Protected app routes */}
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/pro-dashboard" element={<ProtectedRoute><ProDashboard /></ProtectedRoute>} />
        <Route path="/inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
        <Route path="/suppliers" element={<ProtectedRoute><Suppliers /></ProtectedRoute>} />
        <Route path="/purchase-orders" element={<ProtectedRoute><PurchaseOrders /></ProtectedRoute>} />
        <Route path="/purchase-orders/pending" element={<ProtectedRoute><PendingPOs /></ProtectedRoute>} />
        <Route path="/alerts/low-stock" element={<ProtectedRoute><LowStockAlerts /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

        {/* IdeaLab role-based routes */}
        <Route path="/student-dashboard" element={<StudentRoute><StudentDashboard /></StudentRoute>} />
        <Route path="/cart" element={<StudentOrFacultyRoute><CartPage /></StudentOrFacultyRoute>} />
        <Route path="/student/requests" element={<StudentRoute><StudentRequestsPage /></StudentRoute>} />
        <Route path="/faculty-dashboard" element={<FacultyRoute><FacultyDashboard /></FacultyRoute>} />
        <Route path="/faculty-requests" element={<FacultyRoute><FacultyRequestsPage /></FacultyRoute>} />
        <Route path="/demands" element={<ProtectedRoute><DemandsPage /></ProtectedRoute>} />

        {/* Admin-only routes */}
        <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/admin/logistics" element={<AdminRoute><AdminLogisticsPage /></AdminRoute>} />
        <Route path="/admin/inventory" element={<AdminRoute><AdminInventoryPage /></AdminRoute>} />
        <Route path="/admin/demands" element={<AdminRoute><AdminDemandsPage /></AdminRoute>} />
        <Route path="/admin/pending" element={<AdminRoute><AdminPendingPage /></AdminRoute>} />
        <Route path="/admin/requests" element={<AdminRoute><AdminAllRequestsPage /></AdminRoute>} />
        <Route path="/admin/audit-log" element={<AdminRoute><AdminAuditLogPage /></AdminRoute>} />
        <Route path="/admin/settings" element={<AdminRoute><AdminSettingsPage /></AdminRoute>} />
        <Route path="/admin/settings/password" element={<AdminRoute><AdminPasswordPage /></AdminRoute>} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <Toaster richColors position="top-right" />
    </BrowserRouter>
  )
}
