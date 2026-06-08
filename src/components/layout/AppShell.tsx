import { useEffect, useState, type ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { useCart } from "../../context/CartContext";

const THEME_KEY = "stockpilot-theme";

interface AppShellProps {
  title: string;
  children: ReactNode;
  isPro?: boolean;
}

export function AppShell({ title, children, isPro }: AppShellProps) {
  const { cartCount } = useCart();
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      return saved !== null ? saved === "dark" : true; // default: dark
    } catch {
      return true;
    }
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    try {
      localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");
    } catch {
      // ignore
    }
  }, [isDark]);

  return (
    <div className={`flex h-screen overflow-hidden bg-white dark:bg-[#1a1108] ${isPro ? "border-t-2 border-orange-500" : ""}`}>
      <Sidebar />
      <div className="ml-14 flex flex-1 flex-col overflow-hidden">
        <TopBar
          title={title}
          isDark={isDark}
          onToggleDark={() => setIsDark((d) => !d)}
          isPro={isPro}
          cartCount={cartCount}
        />
        <main className="flex-1 overflow-y-auto scrollbar-thin bg-white dark:bg-[#1a1108]">
          {children}
        </main>
      </div>
    </div>
  );
}
