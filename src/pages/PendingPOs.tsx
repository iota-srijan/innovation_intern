import { FileText } from "lucide-react";
import { AppShell } from "../components/layout/AppShell";

export default function PendingPOs() {
  return (
    <AppShell title="Pending Orders">
      <div className="p-5">
        <div className="mb-5">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-white">Pending Purchase Orders</h2>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            Orders requiring intervention or delayed in transit.
          </p>
        </div>
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-orange-100 bg-white py-20 dark:border-white/8 dark:bg-[#1f1509]">
          <FileText className="h-8 w-8 text-zinc-300 dark:text-zinc-600" />
          <p className="text-sm text-zinc-500 dark:text-zinc-400">No pending purchase orders.</p>
        </div>
      </div>
    </AppShell>
  );
}
