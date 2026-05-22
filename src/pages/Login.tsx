import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Layers } from "lucide-react";

export default function Login() {
  // Apply dark mode for this page
  useEffect(() => {
    const saved = localStorage.getItem("stockpilot-theme");
    if (saved !== "light") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-[#111111] px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex items-center gap-3 justify-center">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-700">
            <Layers className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-semibold text-zinc-900 dark:text-white">StockPilot</span>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 dark:border-white/8 dark:bg-[#1a1a1a]">
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-white mb-1">Sign in</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-6">
            Enter your credentials to access your workspace.
          </p>

          <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-400">Email</label>
              <input
                type="email"
                placeholder="you@company.com"
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 transition-colors focus:border-violet-600 focus:ring-1 focus:ring-violet-600 dark:border-white/8 dark:bg-white/6 dark:text-zinc-200 dark:placeholder:text-zinc-600"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-400">Password</label>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 transition-colors focus:border-violet-600 focus:ring-1 focus:ring-violet-600 dark:border-white/8 dark:bg-white/6 dark:text-zinc-200 dark:placeholder:text-zinc-600"
              />
            </div>

            <Link
              to="/dashboard"
              className="mt-2 flex w-full items-center justify-center rounded-lg bg-violet-700 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-violet-600"
            >
              Sign In
            </Link>
          </form>
        </div>

        <p className="mt-4 text-center text-xs text-zinc-500 dark:text-zinc-500">
          Don't have an account?{" "}
          <span className="text-violet-500 cursor-pointer hover:text-violet-400 transition-colors">
            Contact admin
          </span>
        </p>
      </div>
    </div>
  );
}
