import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

interface SectionCardProps {
  title: string;
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}

export function SectionCard({ title, icon: Icon, children, className = "", action }: SectionCardProps) {
  return (
    <section className={`flex h-full flex-col rounded-xl border border-slate-200 bg-white p-5 md:p-6 ${className}`}>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-5 w-5 text-orange-500" aria-hidden="true" />}
          <h2 className="text-base font-semibold text-slate-900 md:text-lg">{title}</h2>
        </div>
        {action && <div>{action}</div>}
      </div>
      <div className="flex-1">
        {children}
      </div>
    </section>
  );
}
