import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, RefreshCw, Download, Share2, Sun, Moon, ShoppingCart } from "lucide-react";
import { toast } from "sonner";

interface TopBarProps {
  title: string;
  isDark: boolean;
  onToggleDark: () => void;
  isPro?: boolean;
  cartCount?: number;
}

export function TopBar({ title, isDark, onToggleDark, isPro: _isPro, cartCount }: TopBarProps) {
  const [initials, setInitials] = useState("SM");

  useEffect(() => {
    const loadInitials = () => {
      try {
        const saved = localStorage.getItem("stockpilot-profile");
        if (saved) {
          const profile = JSON.parse(saved);
          const first = profile.firstName || "Shrijan";
          const last = profile.lastName || "Mishra";
          setInitials(((first[0] || "") + (last[0] || "")).toUpperCase() || "SM");
        } else {
          setInitials("SM");
        }
      } catch {
        setInitials("SM");
      }
    };

    loadInitials();

    window.addEventListener("profile-updated", loadInitials);
    return () => {
      window.removeEventListener("profile-updated", loadInitials);
    };
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center border-b border-zinc-200 bg-white px-5 dark:border-white/8 dark:bg-[#111111]">
      {/* Left: page title */}
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">
          {title}
        </h1>
      </div>

      {/* Right controls */}
      <div className="ml-auto flex items-center gap-3">
        {/* Sun/Moon toggle pill */}
        <div className="flex items-center gap-1 rounded-full border border-zinc-200 p-1 dark:border-white/10">
          <button
            onClick={() => { if (isDark) onToggleDark(); }}
            title="Light mode"
            className={`flex h-6 w-6 items-center justify-center rounded-full transition-colors duration-150 ${
              !isDark
                ? "bg-zinc-100 text-zinc-900 dark:bg-white/10 dark:text-white"
                : "text-zinc-400 hover:text-zinc-600 dark:text-zinc-600 dark:hover:text-zinc-400"
            }`}
          >
            <Sun className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => { if (!isDark) onToggleDark(); }}
            title="Dark mode"
            className={`flex h-6 w-6 items-center justify-center rounded-full transition-colors duration-150 ${
              isDark
                ? "bg-zinc-100 text-zinc-900 dark:bg-white/10 dark:text-white"
                : "text-zinc-400 hover:text-zinc-600 dark:text-zinc-600 dark:hover:text-zinc-400"
            }`}
          >
            <Moon className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Bell with red dot */}
        <button
          onClick={() => toast.info("You have 4 low stock alerts")}
          className="relative text-zinc-400 transition-colors hover:text-zinc-600 dark:text-zinc-400 dark:hover:text-white"
          title="Notifications"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-red-500" />
        </button>

        {/* Cart badge — only when cart has items */}
        {(cartCount ?? 0) > 0 && (
          <Link
            to="/cart"
            title="Your Cart"
            className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-violet-500/40 bg-violet-500/10 text-violet-400 transition-colors hover:bg-violet-500/20 hover:text-violet-300"
          >
            <ShoppingCart className="h-4 w-4" />
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-violet-600 text-[9px] font-bold text-white">
              {cartCount}
            </span>
          </Link>
        )}

        {/* Refresh button */}
        <button
          onClick={() => { toast.success("Data refreshed"); window.location.reload(); }}
          className="flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
        >
          <RefreshCw className="h-3 w-3" />
          Refresh
        </button>

        {/* Export icon button */}
        <button
          onClick={() => toast.info("Exporting data...")}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 transition-colors hover:bg-zinc-50 hover:text-zinc-900 dark:border-white/10 dark:text-zinc-400 dark:hover:bg-white/8 dark:hover:text-white"
          title="Export"
        >
          <Download className="h-3.5 w-3.5" />
        </button>

        {/* Share icon button */}
        <button
          onClick={() => toast.info("Share link copied")}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 transition-colors hover:bg-zinc-50 hover:text-zinc-900 dark:border-white/10 dark:text-zinc-400 dark:hover:bg-white/8 dark:hover:text-white"
          title="Share"
        >
          <Share2 className="h-3.5 w-3.5" />
        </button>

        {/* Avatar */}
        <Link
          to="/profile"
          title="Profile Settings"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-700 text-[10px] font-semibold text-white uppercase hover:bg-violet-600 transition-colors cursor-pointer"
        >
          {initials}
        </Link>
      </div>
    </header>
  );
}
