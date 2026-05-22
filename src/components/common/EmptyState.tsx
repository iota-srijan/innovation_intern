import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className = "" }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 px-6 py-14 text-center ${className}`}>
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 text-zinc-400 dark:border-white/8 dark:bg-white/4 dark:text-zinc-500">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-200">{title}</p>
        <p className="max-w-xs text-xs text-zinc-500 dark:text-zinc-400">{description}</p>
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
