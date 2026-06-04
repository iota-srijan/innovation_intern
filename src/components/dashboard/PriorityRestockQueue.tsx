import { Filter } from "lucide-react";

export function PriorityRestockQueue() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden flex flex-col flex-1">
      <div className="flex items-center justify-between border-b border-slate-100 p-5 md:px-6 md:py-5 bg-slate-50/50">
        <h3 className="font-semibold text-slate-900">Priority Restock Queue</h3>
        <button className="flex items-center gap-2 rounded border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors">
          <Filter className="h-3 w-3 text-slate-400" />
          All Warehouses
        </button>
      </div>
      <div className="flex flex-1 items-center justify-center py-12 text-sm text-slate-400">
        No items require restocking.
      </div>
    </div>
  );
}
