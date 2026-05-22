import { History } from "lucide-react";
import { SectionCard } from "../common/SectionCard";

const activities = [
  { id: 1, action: "Added new item", item: "MacBook Pro M3", time: "2 hours ago" },
  { id: 2, action: "Updated quantity", item: "Logitech MX Master 3S", time: "4 hours ago" },
  { id: 3, action: "Deleted item", item: "Old Monitor Stand", time: "1 day ago" },
  { id: 4, action: "Added new category", item: "Peripherals", time: "2 days ago" },
];

export function RecentActivity() {
  return (
    <SectionCard title="Recent Activity" icon={History}>
      <div className="flex flex-col gap-4 overflow-y-auto pr-2 scrollbar-thin max-h-[200px]">
        {activities.map((activity) => (
          <div key={activity.id} className="flex flex-col gap-1 border-l-2 border-slate-100 pl-3 transition-colors hover:border-indigo-200">
            <span className="text-sm font-medium text-slate-900">{activity.action}</span>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 truncate mr-2">{activity.item}</span>
              <span className="text-[10px] font-medium text-slate-400 whitespace-nowrap">
                {activity.time}
              </span>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
