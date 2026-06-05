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
  { icon: Package,          path: "/cart",                    label: "Request Item" },
  { icon: Clock,            path: "/admin/pending",           label: "Pending Requests" }, // admin only
  { icon: ClipboardList,    path: "/admin/requests",          label: "All Requests" },     // admin only
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
    <aside className="fixed inset-y-0 left-0 z-20 flex w-14 flex-col items-center border-r border-white/8 bg-[#111111] py-4 gap-1">
      {/* Logo mark */}
      <div className="mb-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-700">
        <Layers className="h-4 w-4 text-white" />
      </div>

      {/* Nav icons */}
      <nav className="flex flex-1 flex-col items-center gap-1">
        {navItems.map(({ icon: Icon, path, label }) => {
          if (path === "/dashboard") {
            return (
              <button
                key={path}
                onClick={goToDashboard}
                title={label}
                className={`flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-150 cursor-pointer ${
                  isActive(path)
                    ? "bg-white/10 text-white"
                    : "text-zinc-500 hover:bg-white/8 hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4" />
              </button>
            );
          }

          // /admin/ routes are admin-only — hide for everyone else
          if (path.startsWith('/admin/') && userRole !== 'admin') {
            return null;
          }

          // Students only see Dashboard, Demand Board, My Requests, Request Item, and Settings
          if (userRole === 'student' && !['/dashboard', '/demands', '/student/requests', '/cart', '/profile'].includes(path)) {
            return null;
          }

          // Faculty sees Dashboard, Demand Board, My Requests, and Settings
          if (userRole === 'faculty' && !['/dashboard', '/demands', '/faculty-requests', '/profile'].includes(path)) {
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
              title={label}
              className={`flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-150 ${
                isActive(path)
                  ? "bg-white/10 text-white"
                  : "text-zinc-500 hover:bg-white/8 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4" />
            </Link>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className="flex flex-col items-center gap-1 mt-auto">
        {/* Logout */}
        <button
          onClick={async () => {
            await signOut();
            toast.info("Signed out successfully");
            navigate("/signin");
          }}
          title="Sign Out"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 transition-all duration-150 hover:bg-white/8 hover:text-white cursor-pointer"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </aside>
  );
}
