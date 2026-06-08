import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  Truck,
  FileText,
  GitBranch,
  Megaphone,
  Settings,
  Layers,
  LogOut,
  ListOrdered,
  BarChart2,
  Clock,
  ClipboardList,
  ScrollText,
  Bell,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";

const navItems = [
  { icon: LayoutDashboard,  path: "/dashboard",               label: "Dashboard" },
  { icon: BarChart2,        path: "/admin/logistics",         label: "Logistics" },
  { icon: Package,          path: "/admin/inventory",         label: "Inventory" },   // admin only
  { icon: Megaphone,        path: "/admin/demands",           label: "IdeaBoard" }, // admin only
  { icon: Package,          path: "/inventory",               label: "Inventory" },
  { icon: Truck,            path: "/suppliers",               label: "Suppliers" },
  { icon: FileText,         path: "/purchase-orders",         label: "Purchase Orders" },
  { icon: GitBranch,        path: "/alerts/low-stock",        label: "Low Stock Alerts" },
  { icon: Megaphone,        path: "/demands",                 label: "IdeaBoard" },
  { icon: FileText,         path: "/student/requests",        label: "My Requests" },
  { icon: ListOrdered,      path: "/faculty-requests",        label: "My Requests" },  // faculty
  { icon: Bell,             path: "/notifications",           label: "Notifications" },
  { icon: Package,          path: "/cart",                    label: "Request Item" },
  { icon: Clock,            path: "/admin/pending",           label: "Pending" }, // admin only
  { icon: ClipboardList,    path: "/admin/requests",          label: "All Requests" },     // admin only
  { icon: Bell,             path: "/admin/notifications",     label: "Notifications" },
  { icon: ScrollText,       path: "/admin/audit-log",         label: "Audit Log" },        // admin only
  { icon: Settings,         path: "/profile",                 label: "Settings" },
  { icon: Settings,         path: "/admin/settings",          label: "Settings" },
];

export function Sidebar() {
  const location = useLocation();
  const { userRole, signOut, isRoleLoading } = useAuth();
  const navigate = useNavigate();

  const goToDashboard = () => {
    if (userRole === 'admin') {
      navigate('/admin')
    } else if (userRole === 'faculty') {
      navigate('/faculty-dashboard')
    } else if (userRole === 'student') {
      navigate('/student-dashboard')
    } else {
      navigate('/dashboard')
    }
  };

  const isActive = (path: string) => {
    if (path === "/purchase-orders") {
      return (
        location.pathname === "/purchase-orders" ||
        location.pathname === "/purchase-orders/pending"
      );
    }
    if (path === "/dashboard" && (
      location.pathname === "/pro-dashboard" ||
      location.pathname === "/student-dashboard" ||
      location.pathname === "/faculty-dashboard" ||
      location.pathname === "/admin"
    )) {
      return true;
    }
    return location.pathname === path || location.pathname.startsWith(path + "/");
  };

  if (isRoleLoading) return null;
  if (!userRole) return null;

  return (
    <aside className="group w-14 hover:w-48 transition-all duration-200 ease-in-out overflow-hidden bg-[#1e3a5f] dark:bg-[#0f1f35] flex flex-col h-screen fixed left-0 top-0 z-40 border-r border-white/8 py-4">
      {/* Logo mark */}
      <div className="mb-4 ml-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-500">
        <Layers className="h-4 w-4 text-white" />
      </div>

      {/* Nav icons */}
      <nav className="flex flex-1 flex-col gap-2 w-full px-2">
        {navItems.map(({ icon: Icon, path, label }) => {
          if (path === "/dashboard") {
            return (
              <button
                key={path}
                onClick={goToDashboard}
                className={`flex items-center gap-3 px-2.5 py-2.5 rounded-lg cursor-pointer transition-colors duration-150 w-full ${
                  isActive(path)
                    ? "bg-orange-500/20 text-orange-400"
                    : "text-white hover:bg-white/10"
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span className={`opacity-0 group-hover:opacity-100 transition-opacity duration-150 whitespace-nowrap text-sm font-medium`} style={{ color: isActive(path) ? "#fdba74" : "white" }}>
                  {label}
                </span>
              </button>
            );
          }

          // /admin/ routes are admin-only — hide for everyone else
          if (path.startsWith('/admin/') && userRole !== 'admin') {
            return null;
          }

          // Students only see Dashboard, Demand Board, My Requests, Request Item, Notifications, and Settings
          if (userRole === 'student' && !['/dashboard', '/demands', '/student/requests', '/cart', '/notifications', '/profile'].includes(path)) {
            return null;
          }

          // Faculty sees Dashboard, Demand Board, My Requests, Notifications, and Settings
          if (userRole === 'faculty' && !['/dashboard', '/demands', '/faculty-requests', '/notifications', '/profile'].includes(path)) {
            return null;
          }

          // Admin only sees /admin/* routes (Dashboard handled above, Sign Out always shown)
          if (userRole === 'admin' && path === '/profile') return null;
          if (userRole === 'admin' && !path.startsWith('/admin/')) {
            return null;
          }

          // Hide student/faculty specific routes from others
          if (userRole !== 'student' && userRole !== 'faculty' && (path === '/student/requests' || path === '/cart' || path === '/faculty-requests')) {
            return null;
          }

          return (
            <Link
              key={path}
              to={path}
              className={`flex items-center gap-3 px-2.5 py-2.5 rounded-lg cursor-pointer transition-colors duration-150 w-full ${
                isActive(path)
                  ? "bg-orange-500/20 text-orange-400"
                  : "text-white hover:bg-white/10"
              }`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span className={`opacity-0 group-hover:opacity-100 transition-opacity duration-150 whitespace-nowrap text-sm font-medium`} style={{ color: isActive(path) ? "#fdba74" : "white" }}>
                {label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className="flex flex-col gap-2 w-full px-2 mt-auto">
        {/* Logout */}
        <button
          onClick={async () => {
            await signOut();
            toast.info("Signed out successfully");
            navigate("/signin");
          }}
          className="flex items-center gap-3 px-2.5 py-2.5 rounded-lg cursor-pointer transition-colors duration-150 w-full text-white hover:bg-white/10"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 whitespace-nowrap text-sm font-medium" style={{ color: "white" }}>
            Sign Out
          </span>
        </button>
      </div>
    </aside>
  );
}
