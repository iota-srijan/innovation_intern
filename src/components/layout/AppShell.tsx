import { useEffect, useState, type ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

const THEME_KEY = "stockpilot-theme";

interface AppShellProps {
  title: string;
  children: ReactNode;
  isPro?: boolean;
}

export function AppShell({ title, children, isPro }: AppShellProps) {
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
    <div className={`flex h-screen overflow-hidden bg-white dark:bg-[#111111] ${isPro ? "border-t-2 border-violet-600" : ""}`}>
      <Sidebar />
      <div className="ml-14 flex flex-1 flex-col overflow-hidden">
        <TopBar
          title={title}
          isDark={isDark}
          onToggleDark={() => setIsDark((d) => !d)}
          isPro={isPro}
        />
        <main className="flex-1 overflow-y-auto scrollbar-thin bg-white dark:bg-[#111111]">
          {children}
        </main>
      </div>
    </div>
  );
}
