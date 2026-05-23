import { useState } from "react";
import { ArrowUpRight, MoreHorizontal, Zap } from "lucide-react";
import { AppShell } from "../components/layout/AppShell";
import { useItems } from "../hooks/useItems";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
} from "recharts";

// ── Mini spark data ──────────────────────────────────────────
const poData = [
  { v: 3420 }, { v: 3180 }, { v: 3500 }, { v: 3050 },
  { v: 2900 }, { v: 3320 }, { v: 3209 },
];
const prData = [
  { v: 2400 }, { v: 2550 }, { v: 2480 }, { v: 2700 },
  { v: 2820 }, { v: 2900 }, { v: 2956 },
];

// ── Key suppliers bar data ───────────────────────────────────
const suppliersData = [
  { country: "DE", pct: 23 },
  { country: "FR", pct: 19 },
  { country: "LU", pct: 13 },
  { country: "Others", pct: 45 },
];

// ── Invoice / Discount chart — per tab ───────────────────────
const invoiceChartData: Record<string, { month: string; invoice: number; discount: number }[]> = {
  Daily: [
    { month: "Mon", invoice: 12, discount: 1.1 },
    { month: "Tue", invoice: 18, discount: 1.4 },
    { month: "Wed", invoice: 10, discount: 1.0 },
    { month: "Thu", invoice: 22, discount: 1.6 },
    { month: "Fri", invoice: 35, discount: 1.9 },
    { month: "Sat", invoice: 28, discount: 1.7 },
    { month: "Sun", invoice: 15, discount: 1.2 },
  ],
  Weekly: [
    { month: "W1", invoice: 55, discount: 2.1 },
    { month: "W2", invoice: 80, discount: 2.4 },
    { month: "W3", invoice: 70, discount: 2.2 },
    { month: "W4", invoice: 110, discount: 2.8 },
    { month: "W5", invoice: 95, discount: 2.6 },
    { month: "W6", invoice: 120, discount: 3.0 },
  ],
  Monthly: [
    { month: "Jan", invoice: 180, discount: 2.1 },
    { month: "Feb", invoice: 220, discount: 2.8 },
    { month: "Mar", invoice: 160, discount: 1.9 },
    { month: "Apr", invoice: 280, discount: 3.5 },
    { month: "May", invoice: 240, discount: 3.1 },
    { month: "Jun", invoice: 310, discount: 3.8 },
    { month: "Jul", invoice: 290, discount: 4.0 },
    { month: "Aug", invoice: 320, discount: 4.1 },
  ],
  Yearly: [
    { month: "2020", invoice: 820, discount: 3.5 },
    { month: "2021", invoice: 1100, discount: 3.8 },
    { month: "2022", invoice: 1450, discount: 4.2 },
    { month: "2023", invoice: 1900, discount: 4.6 },
    { month: "2024", invoice: 2400, discount: 5.0 },
  ],
  All: [
    { month: "2019", invoice: 600, discount: 3.1 },
    { month: "2020", invoice: 820, discount: 3.5 },
    { month: "2021", invoice: 1100, discount: 3.8 },
    { month: "2022", invoice: 1450, discount: 4.2 },
    { month: "2023", invoice: 1900, discount: 4.6 },
    { month: "2024", invoice: 2400, discount: 5.0 },
  ],
};

// ── Spend by category — per tab ──────────────────────────────
type SpendRow = { category: string; spend: number; transactions: number; suppliers: number; supplierPct: number; days: number };
const spendData: Record<string, SpendRow[]> = {
  Daily: [
    { category: "Electronics",    spend: 2100000, transactions: 48,  suppliers: 8,  supplierPct: 62, days: 1 },
    { category: "Office Supplies",spend: 800000,  transactions: 210, suppliers: 15, supplierPct: 88, days: 1 },
    { category: "Furniture",      spend: 1500000, transactions: 32,  suppliers: 6,  supplierPct: 45, days: 2 },
    { category: "Janitorial",     spend: 350000,  transactions: 90,  suppliers: 12, supplierPct: 78, days: 1 },
    { category: "Networking",     spend: 920000,  transactions: 41,  suppliers: 4,  supplierPct: 56, days: 3 },
  ],
  Weekly: [
    { category: "Electronics",    spend: 14000000, transactions: 320,  suppliers: 8,  supplierPct: 62, days: 4 },
    { category: "Office Supplies",spend: 4200000,  transactions: 1100, suppliers: 15, supplierPct: 88, days: 3 },
    { category: "Furniture",      spend: 9100000,  transactions: 210,  suppliers: 6,  supplierPct: 45, days: 6 },
    { category: "Janitorial",     spend: 2400000,  transactions: 580,  suppliers: 12, supplierPct: 78, days: 3 },
    { category: "Networking",     spend: 6100000,  transactions: 260,  suppliers: 4,  supplierPct: 56, days: 7 },
  ],
  Monthly: [
    { category: "Electronics",    spend: 45200000, transactions: 1240, suppliers: 8,  supplierPct: 62, days: 12 },
    { category: "Office Supplies",spend: 12800000, transactions: 3420, suppliers: 15, supplierPct: 88, days: 4 },
    { category: "Furniture",      spend: 28500000, transactions: 840,  suppliers: 6,  supplierPct: 45, days: 18 },
    { category: "Janitorial",     spend: 8200000,  transactions: 2100, suppliers: 12, supplierPct: 78, days: 3 },
    { category: "Networking",     spend: 19400000, transactions: 960,  suppliers: 4,  supplierPct: 56, days: 8 },
  ],
  Yearly: [
    { category: "Electronics",    spend: 542000000,  transactions: 14800, suppliers: 8,  supplierPct: 62, days: 45 },
    { category: "Office Supplies",spend: 154000000,  transactions: 41000, suppliers: 15, supplierPct: 88, days: 30 },
    { category: "Furniture",      spend: 342000000,  transactions: 10100, suppliers: 6,  supplierPct: 45, days: 90 },
    { category: "Janitorial",     spend: 98400000,   transactions: 25200, suppliers: 12, supplierPct: 78, days: 32 },
    { category: "Networking",     spend: 233000000,  transactions: 11500, suppliers: 4,  supplierPct: 56, days: 60 },
  ],
  All: [
    { category: "Electronics",    spend: 1200000000, transactions: 38000, suppliers: 8,  supplierPct: 62, days: 60 },
    { category: "Office Supplies",spend: 420000000,  transactions: 98000, suppliers: 15, supplierPct: 88, days: 45 },
    { category: "Furniture",      spend: 890000000,  transactions: 28000, suppliers: 6,  supplierPct: 45, days: 90 },
    { category: "Janitorial",     spend: 260000000,  transactions: 62000, suppliers: 12, supplierPct: 78, days: 50 },
    { category: "Networking",     spend: 610000000,  transactions: 31000, suppliers: 4,  supplierPct: 56, days: 75 },
  ],
};

// ── Helpers ──────────────────────────────────────────────────
function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
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
          <span>{p.dataKey === "invoice" ? `$${p.value}M` : `${p.value}%`}</span>
        </div>
      ))}
    </div>
  );
};

// ── Component ────────────────────────────────────────────────
export default function Dashboard() {
  const [spendTab, setSpendTab] = useState("Monthly");
  const [invoiceTab, setInvoiceTab] = useState("Yearly");
  const { data: items = [] } = useItems();

  const totalSKUs = items.length;
  const lowStockItems = items.filter(i => i.quantity <= i.reorder_threshold);
  const lowStockCount = lowStockItems.length;
  const fulfillmentRate = items.length > 0
    ? ((items.filter(i => i.quantity > 0).length / items.length) * 100).toFixed(1)
    : '0.0';

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

          {/* Card 2: PO Count */}
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 dark:border-white/8 dark:bg-[#1a1a1a] flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-zinc-900 dark:text-white">PO Count</span>
              <button className="flex h-6 w-6 items-center justify-center rounded-md bg-zinc-200 text-zinc-500 hover:bg-zinc-300 dark:bg-white/8 dark:text-zinc-400 dark:hover:bg-white/12 transition-colors">
                <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-3xl font-semibold text-zinc-900 dark:text-white">3,209</span>
              <span className="text-[9px] font-bold px-1.5 py-px rounded bg-red-500/15 text-red-400">-0.281</span>
            </div>
            <div className="mt-auto pt-3 h-16">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={poData}>
                  <Line
                    type="monotone"
                    dataKey="v"
                    stroke="#ef4444"
                    strokeWidth={1.5}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Card 3: PR Count */}
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 dark:border-white/8 dark:bg-[#1a1a1a] flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-zinc-900 dark:text-white">PR Count</span>
              <button className="flex h-6 w-6 items-center justify-center rounded-md bg-zinc-200 text-zinc-500 hover:bg-zinc-300 dark:bg-white/8 dark:text-zinc-400 dark:hover:bg-white/12 transition-colors">
                <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-3xl font-semibold text-zinc-900 dark:text-white">2,956</span>
              <span className="text-[9px] font-bold px-1.5 py-px rounded bg-green-500/15 text-green-400">+0.118</span>
            </div>
            <div className="mt-auto pt-3 h-16">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={prData}>
                  <Line
                    type="monotone"
                    dataKey="v"
                    stroke="#22c55e"
                    strokeWidth={1.5}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Card 4: Supplier Distribution Map */}
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 dark:border-white/8 dark:bg-[#1a1a1a] relative overflow-hidden flex flex-col justify-between">
            <div className="text-sm font-medium text-zinc-900 dark:text-white mb-4 z-10 relative">Supplier Distribution</div>
            <div className="relative h-[160px] w-full flex items-center justify-center">
              {/* Map background using mask */}
              <div 
                className="absolute inset-0 w-full h-full bg-zinc-300 dark:bg-zinc-700 opacity-60"
                style={{
                  maskImage: 'url(/world-map.svg)',
                  maskSize: 'contain',
                  maskRepeat: 'no-repeat',
                  maskPosition: 'center',
                  WebkitMaskImage: 'url(/world-map.svg)',
                  WebkitMaskSize: 'contain',
                  WebkitMaskRepeat: 'no-repeat',
                  WebkitMaskPosition: 'center',
                }}
              />
              
              {/* Pins and Labels */}
              <div className="absolute top-[30%] left-[51%] group">
                <div className="relative flex h-3 w-3 z-20">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-violet-500 border-[1.5px] border-zinc-50 dark:border-[#1a1a1a]"></span>
                </div>
                <div className="absolute left-4 top-1/2 -translate-y-1/2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 shadow-sm rounded-md px-2 py-1 text-[9px] font-medium text-zinc-700 dark:text-zinc-200 whitespace-nowrap z-10 transition-transform group-hover:translate-x-0.5">
                  217 - Germany
                </div>
              </div>

              <div className="absolute top-[33%] left-[49%] group">
                <div className="relative flex h-2.5 w-2.5 z-20">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500 border-[1.5px] border-zinc-50 dark:border-[#1a1a1a]"></span>
                </div>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 shadow-sm rounded-md px-2 py-1 text-[9px] font-medium text-zinc-700 dark:text-zinc-200 whitespace-nowrap z-10 transition-transform group-hover:-translate-x-0.5">
                  185 - France
                </div>
              </div>

              <div className="absolute top-[52%] right-[18%] group">
                <div className="relative flex h-2.5 w-2.5 z-20">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border-[1.5px] border-zinc-50 dark:border-[#1a1a1a]"></span>
                </div>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 shadow-sm rounded-md px-2 py-1 text-[9px] font-medium text-zinc-700 dark:text-zinc-200 whitespace-nowrap z-10 transition-transform group-hover:-translate-x-0.5">
                  92 - APAC
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-zinc-200 dark:border-white/10 pt-3">
              <div className="flex flex-col">
                <span className="text-lg font-semibold text-zinc-900 dark:text-white">1,248</span>
                <span className="text-[9px] text-zinc-500">Total Suppliers</span>
              </div>
              <div className="flex flex-col text-right">
                <span className="text-lg font-semibold text-violet-500">12</span>
                <span className="text-[9px] text-zinc-500">Countries Active</span>
              </div>
            </div>
          </div>

          {/* Card 5: Key Suppliers */}
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 dark:border-white/8 dark:bg-[#1a1a1a] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-zinc-900 dark:text-white">Key Suppliers</span>
                <span className="text-xs text-violet-600 dark:text-violet-400 font-medium bg-violet-100 dark:bg-violet-500/10 px-2 py-0.5 rounded-full">1,248</span>
              </div>
              <div className="text-[10px] text-zinc-500 dark:text-zinc-500 mb-6">Total Suppliers by Region</div>
            </div>
            <div className="h-32 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={suppliersData} barSize={24} margin={{ top: 0, right: 0, left: -28, bottom: 0 }}>
                  <defs>
                    <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity={1} />
                      <stop offset="100%" stopColor="#6d28d9" stopOpacity={0.8} />
                    </linearGradient>
                  </defs>
                  <Tooltip 
                    cursor={{ fill: 'transparent' }} 
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e4e4e7', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                  />
                  <XAxis
                    dataKey="country"
                    tick={{ fontSize: 10, fill: "#a1a1aa" }}
                    axisLine={false}
                    tickLine={false}
                    dy={10}
                  />
                  <Bar 
                    dataKey="pct" 
                    fill="url(#barGrad)" 
                    radius={[4, 4, 0, 0]} 
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* ── Row 2: tables + invoice chart ───────────────── */}
        <div className="grid grid-cols-[1.1fr_1fr] gap-4">

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
                        ? "bg-violet-700 text-white"
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
                        ? "bg-violet-700 text-white"
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
                      tickFormatter={(v) => `$${v}M`}
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

        {/* ── Upgrade banner ───────────────────────────────── */}
        <div className="flex items-center justify-between rounded-2xl border border-violet-200 bg-gradient-to-r from-zinc-100 to-violet-50 p-4 dark:border-violet-800/40 dark:from-zinc-900 dark:to-violet-950">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-700">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm text-zinc-900 dark:text-white">
              Upgrade to access advanced procurement analytics
            </span>
          </div>
          <button className="rounded-xl bg-violet-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-600">
            Get Pro
          </button>
        </div>

      </div>
    </AppShell>
  );
}
