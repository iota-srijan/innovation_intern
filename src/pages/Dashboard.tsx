import { useState } from "react";
import { ArrowUpRight, MoreHorizontal } from "lucide-react";
import { AppShell } from "../components/layout/AppShell";
import { useItems } from "../hooks/useItems";
import {
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
} from "recharts";

interface ExtendedItem {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  unit_price?: number;
  reorder_threshold: number;
  supplier: string;
  created_at: string;
}

// Chart data is not yet connected to a live data source.
const invoiceChartData: Record<string, { month: string; invoice: number; discount: number }[]> = {};
type SpendRow = { category: string; spend: number; transactions: number; suppliers: number; supplierPct: number; days: number };
const spendData: Record<string, SpendRow[]> = {};

// ── Helpers ──────────────────────────────────────────────────
function fmt(n: number) {
  if (n >= 1_000_000) return `₹${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(0)}K`;
  return `₹${n}`;
}

function ProcSpark({ days }: { days: number }) {
  const c = days > 10 ? "#ef4444" : days > 5 ? "#f59e0b" : "#22c55e";
  return (
    <svg width="32" height="10" className="inline-block mr-1.5 shrink-0">
      <line x1="3" y1="5" x2="29" y2="5" stroke={c} strokeWidth="1" />
      <circle cx="3" cy="5" r="2.5" fill={c} />
      <circle cx="29" cy="5" r="2.5" fill={c} />
    </svg>
  );
}

// Custom tooltip for invoice chart
const InvoiceTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md bg-zinc-800 border border-white/8 px-3 py-2 text-[10px] text-white shadow-lg">
      <div className="font-medium mb-1">{payload[0]?.payload?.month}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span style={{ color: p.color }}>●</span>
          <span className="text-zinc-400">{p.name}:</span>
          <span>{p.dataKey === "invoice" ? `₹${p.value}M` : `${p.value}%`}</span>
        </div>
      ))}
    </div>
  );
};

// ── Component ────────────────────────────────────────────────
export default function Dashboard() {
  const [spendTab, setSpendTab] = useState("Monthly");
  const [invoiceTab, setInvoiceTab] = useState("Yearly");
  const { data = [] } = useItems();
  const items = data as any[] as ExtendedItem[];

  const totalSKUs = items.length;
  const lowStockItems = items.filter(i => i.quantity <= i.reorder_threshold);
  const lowStockCount = lowStockItems.length;
  const fulfillmentRate = items.length > 0
    ? ((items.filter(i => i.quantity > 0).length / items.length) * 100).toFixed(1)
    : '0.0';
  const totalValue = items.reduce((sum, i) => sum + (i.quantity * (i.unit_price || 0)), 0);
  const totalValueFormatted = totalValue >= 1000000
    ? `₹${(totalValue / 1000000).toFixed(2)}M`
    : `₹${(totalValue / 1000).toFixed(1)}K`;

  const tabs = ["All", "Daily", "Weekly", "Monthly", "Yearly"];

  return (
    <AppShell title="Procurement Dashboard">
      <div className="flex flex-col gap-4 p-5">

        {/* ── Row 1: top metrics ───────────────────────────── */}
        <div className="grid grid-cols-[1.4fr_1fr_1fr_2fr_1.5fr] gap-4">

          {/* Card 1: Overview */}
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 dark:border-white/8 dark:bg-[#1a1a1a]">
            <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-4">Overview</div>
            <div className="flex flex-col gap-3">
              {[
                { label: "Total SKUs", value: totalSKUs.toLocaleString(), badge: "Live", green: true },
                { label: "Low Stock Items", value: String(lowStockCount), badge: lowStockCount > 0 ? "Alert" : "OK", green: lowStockCount === 0 },
                { label: "Fulfillment Rate", value: `${fulfillmentRate}%`, badge: "Live", green: true },
                { label: "Inventory Value", value: totalValueFormatted, badge: "Live", green: true },
              ].map((s) => (
                <div key={s.label}>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-semibold text-zinc-900 dark:text-white">{s.value}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-px rounded ${
                      s.green
                        ? "bg-green-500/15 text-green-400"
                        : "bg-red-500/15 text-red-400"
                    }`}>{s.badge}</span>
                  </div>
                  <div className="text-[10px] text-zinc-500 dark:text-zinc-500 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Card 2: PO Count — no live data */}
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 dark:border-white/8 dark:bg-[#1a1a1a] flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-zinc-900 dark:text-white">PO Count</span>
              <ArrowUpRight className="h-3.5 w-3.5 text-zinc-400" />
            </div>
            <div className="flex flex-1 items-center justify-center text-xs text-zinc-400">
              No data
            </div>
          </div>

          {/* Card 3: PR Count — no live data */}
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 dark:border-white/8 dark:bg-[#1a1a1a] flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-zinc-900 dark:text-white">PR Count</span>
              <ArrowUpRight className="h-3.5 w-3.5 text-zinc-400" />
            </div>
            <div className="flex flex-1 items-center justify-center text-xs text-zinc-400">
              No data
            </div>
          </div>

          {/* Card 4: Supplier Distribution — no live data */}
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 dark:border-white/8 dark:bg-[#1a1a1a] flex flex-col justify-center items-center">
            <span className="text-sm font-medium text-zinc-900 dark:text-white mb-2">Supplier Distribution</span>
            <span className="text-xs text-zinc-400">No data</span>
          </div>

          {/* Card 5: Key Suppliers — no live data */}
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 dark:border-white/8 dark:bg-[#1a1a1a] flex flex-col justify-center items-center">
            <span className="text-sm font-medium text-zinc-900 dark:text-white mb-2">Key Suppliers</span>
            <span className="text-xs text-zinc-400">No data</span>
          </div>
        </div>

        {/* ── Row 2: tables + invoice chart ───────────────── */}
        <div className="grid grid-cols-[1.1fr_1fr] gap-4" style={{ display: Object.keys(spendData).length === 0 ? 'none' : undefined }}>

          {/* Spend by Category */}
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 dark:border-white/8 dark:bg-[#1a1a1a]">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-zinc-900 dark:text-white">Spend by Category</span>
              <div className="flex items-center gap-1">
                {tabs.map((t) => (
                  <button
                    key={t}
                    onClick={() => setSpendTab(t)}
                    className={`px-2 py-1 rounded-md text-[10px] transition-colors ${
                      spendTab === t
                        ? "bg-violet-750 text-white"
                        : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-white/8">
                    {["CATEGORY", "SPEND", "TRANS.", "SUPPLIERS", "PROC. CYCLE"].map((h) => (
                      <th key={h} className="pb-2 text-left text-[9px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500 first:pl-0 px-2">
                        {h}
                      </th>
                    ))}
                    <th className="pb-2 w-6"></th>
                  </tr>
                </thead>
                <tbody>
                  {spendData[spendTab].map((row) => (
                    <tr
                      key={row.category}
                      className="border-b border-zinc-100 dark:border-white/6 transition-colors hover:bg-zinc-100 dark:hover:bg-white/4 last:border-0"
                    >
                      <td className="py-2.5 first:pl-0 px-2 font-medium text-zinc-900 dark:text-zinc-300 whitespace-nowrap">
                        {row.category}
                      </td>
                      <td className="py-2.5 px-2 text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                        {fmt(row.spend)}
                      </td>
                      <td className="py-2.5 px-2 text-zinc-700 dark:text-zinc-300">
                        {row.transactions.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-zinc-700 dark:text-zinc-300">{row.suppliers}</span>
                          <span className={`text-[9px] font-bold px-1 py-px rounded ${
                            row.supplierPct >= 75
                              ? "bg-green-500/15 text-green-400"
                              : row.supplierPct >= 50
                              ? "bg-amber-500/15 text-amber-400"
                              : "bg-red-500/15 text-red-400"
                          }`}>
                            {row.supplierPct}%
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-2">
                        <div className="flex items-center gap-1">
                          <ProcSpark days={row.days} />
                          <span className="text-zinc-500 dark:text-zinc-400">{row.days}d</span>
                        </div>
                      </td>
                      <td className="py-2.5 text-right">
                        <button className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors">
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Total Invoice / Discount % */}
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 dark:border-white/8 dark:bg-[#1a1a1a]">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-zinc-900 dark:text-white">Total Invoice, Discount %</span>
              <div className="flex items-center gap-1">
                {tabs.map((t) => (
                  <button
                    key={t}
                    onClick={() => setInvoiceTab(t)}
                    className={`px-2 py-1 rounded-md text-[10px] transition-colors ${
                      invoiceTab === t
                        ? "bg-violet-750 text-white"
                        : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="absolute top-0 right-0 text-sm font-semibold text-zinc-900 dark:text-white z-10">
                {Math.max(...(invoiceChartData[invoiceTab] ?? []).map((d) => d.discount)).toFixed(1)}%
              </div>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={invoiceChartData[invoiceTab]} margin={{ top: 8, right: 0, left: -20, bottom: 0 }}>
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 9, fill: "#71717a" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      yAxisId="left"
                      tick={{ fontSize: 9, fill: "#71717a" }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `₹${v}M`}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fontSize: 9, fill: "#71717a" }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `${v}%`}
                      width={30}
                    />
                    <Tooltip content={<InvoiceTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                    <Bar
                      yAxisId="left"
                      dataKey="invoice"
                      fill="#3f3f46"
                      radius={[3, 3, 0, 0]}
                      name="Invoice"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="discount"
                      stroke="#ef4444"
                      strokeWidth={1.5}
                      dot={false}
                      name="Discount %"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

      </div>
    </AppShell>
  );
}
