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
    <div className="flex min-h-screen items-center justify-center bg-orange-50 dark:bg-[#1a1108] px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex items-center gap-3 justify-center">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500">
            <Layers className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-semibold text-zinc-900 dark:text-white">StockPilot</span>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-orange-100 bg-white p-8 dark:border-white/8 dark:bg-[#1f1509]">
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
                className="w-full rounded-lg border border-orange-100 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 transition-colors focus:border-orange-500 focus:ring-1 focus:ring-orange-500 dark:border-white/8 dark:bg-white/6 dark:text-zinc-200 dark:placeholder:text-zinc-600"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-400">Password</label>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full rounded-lg border border-orange-100 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 transition-colors focus:border-orange-500 focus:ring-1 focus:ring-orange-500 dark:border-white/8 dark:bg-white/6 dark:text-zinc-200 dark:placeholder:text-zinc-600"
              />
            </div>

            <Link
              to="/dashboard"
              className="mt-2 flex w-full items-center justify-center rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-orange-500"
            >
              Sign In
            </Link>
          </form>
        </div>

        <p className="mt-4 text-center text-xs text-zinc-500 dark:text-zinc-500">
          Don't have an account?{" "}
          <span className="text-orange-400 cursor-pointer hover:text-orange-300 transition-colors">
            Contact admin
          </span>
        </p>
      </div>
    </div>
  );
}
