import { History } from "lucide-react";
import { SectionCard } from "../common/SectionCard";

export function RecentActivity() {
  return (
    <SectionCard title="Recent Activity" icon={History}>
      <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
        <History className="h-6 w-6 text-slate-300" />
        <p className="text-sm text-slate-500">No recent activity to display.</p>
      </div>
    </SectionCard>
  );
}
