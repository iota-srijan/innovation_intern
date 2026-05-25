import ReactDOM from "react-dom/client";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";

import "./index.css";

import { queryClient } from "./lib/queryClient";
import { UserTypeProvider } from "./context/UserTypeContext";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute, AdminRoute } from "./components/ProtectedRoute";

import LandingPage from "./pages/LandingPage";
import SignIn from "./pages/SignIn";
import AuthCallback from "./pages/AuthCallback";
import Dashboard from "./pages/Dashboard";
import ProDashboard from "./pages/ProDashboard";
import Inventory from "./pages/Inventory";
import Suppliers from "./pages/Suppliers";
import PurchaseOrders from "./pages/PurchaseOrders";
import LowStockAlerts from "./pages/LowStockAlerts";
import PendingPOs from "./pages/PendingPOs";
import Profile from "./pages/Profile";
import AdminDashboard from "./pages/AdminDashboard";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <UserTypeProvider>
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

              {/* Admin-only route */}
              <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />

              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>

            <Toaster richColors position="top-right" />
          </BrowserRouter>
        </UserTypeProvider>
      </AuthProvider>
  </QueryClientProvider>
);