import { useState } from "react";
import { Search, Clock, AlertCircle, FileText, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "../components/layout/AppShell";

const mockPendingPOs = [
  {
    id: "PO-2024-089",
    supplier: "TechCorp Electronics",
    status: "Delayed",
    reason: "Supplier reported 5 day shipping delay due to customs.",
    expectedDelay: "+5 days",
    amount: "₹24,500.00",
    date: "May 12, 2024",
  },
  {
    id: "PO-2024-092",
    supplier: "Apex Manufacturing",
    status: "Pending Approval",
    reason: "Requires executive approval for orders >₹40k.",
    expectedDelay: "Awaiting Auth",
    amount: "₹42,000.00",
    date: "May 18, 2024",
  },
  {
    id: "PO-2024-095",
    supplier: "Global Logistics Ltd",
    status: "Action Required",
    reason: "Payment method failed. Needs manual invoice processing.",
    expectedDelay: "Blocked",
    amount: "₹8,450.00",
    date: "May 18, 2024",
  },
];

function StatusIcon({ status }: { status: string }) {
  if (status === "Delayed") return <Clock className="h-4 w-4" />;
  if (status === "Action Required") return <AlertCircle className="h-4 w-4" />;
  return <FileText className="h-4 w-4" />;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Delayed: "bg-amber-500/15 text-amber-400",
    "Pending Approval": "bg-violet-500/15 text-violet-400",
    "Action Required": "bg-red-500/15 text-red-400",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-px text-[9px] font-bold uppercase tracking-wider ${map[status] ?? "bg-zinc-500/15 text-zinc-400"}`}>
      {status}
    </span>
  );
}

export default function PendingPOs() {
  const [search, setSearch] = useState("");

  const filtered = mockPendingPOs.filter(
    (po) =>
      po.id.toLowerCase().includes(search.toLowerCase()) ||
      po.supplier.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppShell title="Pending Orders">
      <div className="p-5">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-zinc-900 dark:text-white">Pending Purchase Orders</h2>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              Orders requiring intervention or delayed in transit.
            </p>
          </div>
          <button
            onClick={() => toast.success("Approval process initiated.")}
            className="flex items-center gap-1.5 rounded-lg bg-violet-700 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-violet-600"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Approve All Valid
          </button>
        </div>

        {/* Summary cards */}
        <div className="mb-5 grid grid-cols-3 gap-4">
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-white/8 dark:bg-[#1a1a1a]">
            <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Total Pending Value</div>
            <div className="text-2xl font-semibold text-zinc-900 dark:text-white">₹74,950</div>
          </div>
          <div className="rounded-2xl border border-amber-200/40 bg-amber-50/40 p-4 dark:border-amber-700/20 dark:bg-amber-950/20">
            <div className="text-xs text-amber-600 dark:text-amber-500 mb-1">Delayed Shipments</div>
            <div className="text-2xl font-semibold text-amber-700 dark:text-amber-400">1 Order</div>
          </div>
          <div className="rounded-2xl border border-red-200/40 bg-red-50/40 p-4 dark:border-red-700/20 dark:bg-red-950/20">
            <div className="text-xs text-red-600 dark:text-red-500 mb-1">Action Required</div>
            <div className="text-2xl font-semibold text-red-700 dark:text-red-400">2 Orders</div>
          </div>
        </div>

        {/* Table card */}
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-white/8 dark:bg-[#1a1a1a]">
          {/* Search */}
          <div className="border-b border-zinc-100 p-4 dark:border-white/8">
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500 dark:text-zinc-600" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search pending orders..."
                className="h-8 w-full rounded-lg border border-zinc-200 bg-white pl-9 pr-4 text-xs text-zinc-700 outline-none placeholder:text-zinc-500 focus:border-violet-600 focus:ring-1 focus:ring-violet-600 dark:border-white/8 dark:bg-white/6 dark:text-zinc-300 dark:placeholder:text-zinc-600"
              />
            </div>
          </div>

          <div className="divide-y divide-zinc-100 dark:divide-white/6">
            {filtered.map((po) => (
              <div
                key={po.id}
                className="flex items-start justify-between gap-4 p-5 transition-colors hover:bg-zinc-50 dark:hover:bg-white/4"
              >
                {/* Left: icon + details */}
                <div className="flex items-start gap-4">
                  <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                    po.status === "Delayed"
                      ? "bg-amber-500/10 text-amber-400"
                      : po.status === "Action Required"
                      ? "bg-red-500/10 text-red-400"
                      : "bg-violet-500/10 text-violet-400"
                  }`}>
                    <StatusIcon status={po.status} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{po.id}</span>
                      <StatusBadge status={po.status} />
                    </div>
                    <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                      {po.supplier} · {po.amount}
                    </span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 max-w-lg">{po.reason}</span>
                  </div>
                </div>

                {/* Right: delay impact + action */}
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <div className="text-[9px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                    Delay Impact
                  </div>
                  <div className={`text-sm font-bold ${po.status === "Delayed" ? "text-red-400" : "text-zinc-700 dark:text-zinc-300"}`}>
                    {po.expectedDelay}
                  </div>
                  <button
                    onClick={() => toast.success(`Resolution flow started for ${po.id}`)}
                    className="text-xs font-medium text-violet-500 transition-colors hover:text-violet-400"
                  >
                    Resolve →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
