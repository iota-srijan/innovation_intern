import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Skeleton } from "../common/Skeleton";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  subtext?: ReactNode;
  progress?: number;
  isLoading?: boolean;
  variant?: "default" | "warning" | "danger";
}

export function StatCard({ label, value, icon: Icon, subtext, progress, isLoading, variant = "default" }: StatCardProps) {
  const iconClass =
    variant === "danger"
      ? "bg-red-50 dark:bg-red-400/10 text-red-600 dark:text-red-400"
      : variant === "warning"
      ? "bg-amber-50 dark:bg-amber-400/10 text-amber-600 dark:text-amber-400"
      : "bg-orange-50 dark:bg-orange-400/10 text-orange-500 dark:text-orange-300";

  return (
    <div className="flex flex-col justify-between rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1a1108] p-5 md:p-6 transition-colors">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500 dark:text-[#9a9aa6] mt-1">
          {label}
        </span>
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${iconClass}`}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-1">
        {isLoading ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <span className="text-2xl font-semibold text-slate-900 dark:text-white">
            {value}
          </span>
        )}

        {subtext && !isLoading && (
          <span className="text-xs text-slate-500 dark:text-[#9a9aa6]">
            {subtext}
          </span>
        )}

        {progress !== undefined && !isLoading && (
          <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-orange-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
