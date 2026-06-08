import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Bell, Sun, Moon, ShoppingCart } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabaseClient";

interface TopBarProps {
  title: string;
  isDark: boolean;
  onToggleDark: () => void;
  isPro?: boolean;
  cartCount?: number;
}

export function TopBar({ title, isDark, onToggleDark, isPro: _isPro, cartCount }: TopBarProps) {
  const { displayName, userRole, user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .map(w => w[0].toUpperCase())
    .join('')
    .slice(0, 2) || 'U';

  const profileHref = userRole === 'admin' ? '/admin/settings' : '/profile';

  useEffect(() => {
    if (!user || (userRole !== 'student' && userRole !== 'faculty')) {
      setUnreadCount(0);
      return;
    }

    const fetchUnread = async () => {
      const { data: notifications } = await supabase
        .from('notifications')
        .select('id')
        .eq('is_active', true);

      if (!notifications || notifications.length === 0) {
        setUnreadCount(0);
        return;
      }

      const notifIds = (notifications as { id: string }[]).map(n => n.id);

      const { data: reads } = await supabase
        .from('notification_reads')
        .select('notification_id')
        .eq('user_id', user.id)
        .in('notification_id', notifIds);

      const readIds = new Set(
        ((reads ?? []) as { notification_id: string }[]).map(r => r.notification_id)
      );
      setUnreadCount(notifIds.filter(id => !readIds.has(id)).length);
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 60_000);
    return () => clearInterval(interval);
  }, [user, userRole]);

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center border-b border-orange-100 bg-white px-5 dark:border-white/8 dark:bg-[#1a1108]">
      {/* Left: page title */}
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">
          {title}
        </h1>
      </div>

      {/* Right controls */}
      <div className="ml-auto flex items-center gap-5">
        {/* Sun/Moon toggle pill */}
        <div className="flex items-center gap-1 rounded-full border border-orange-100 p-1 dark:border-white/10">
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

        {/* Bell — student / faculty only */}
        {(userRole === 'student' || userRole === 'faculty') && (
          <Link
            to="/notifications"
            title="Notifications"
            className="relative text-zinc-400 transition-colors hover:text-zinc-600 dark:text-zinc-400 dark:hover:text-white"
          >
            <Bell className="h-7 w-7" />
            {unreadCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-orange-500 px-1 text-[9px] font-bold leading-none text-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Link>
        )}

        {/* Cart badge — only when cart has items */}
        {(cartCount ?? 0) > 0 && (
          <Link
            to="/cart"
            title="Your Cart"
            className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-orange-400/40 bg-orange-400/10 text-orange-300 transition-colors hover:bg-orange-400/20 hover:text-orange-200"
          >
            <ShoppingCart className="h-4 w-4" />
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[9px] font-bold text-white">
              {cartCount}
            </span>
          </Link>
        )}

        {/* Avatar */}
        <Link
          to={profileHref}
          title="Profile Settings"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500 text-[10px] font-semibold text-white uppercase hover:bg-orange-500 transition-colors cursor-pointer"
        >
          {initials}
        </Link>
      </div>
    </header>
  );
}
