import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MoreHorizontal, Sparkles, Package, AlertTriangle, FileText, TrendingUp } from "lucide-react";
import { AppShell } from "../components/layout/AppShell";
import { useUserType } from "../context/UserTypeContext";
import { useAuth } from "../context/AuthContext";
import { useItems } from "../hooks/useItems";
import {
  AreaChart,
  Area,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
} from "recharts";

// ── Mock data for the Pro-exclusive AreaChart ────────────────
const areaChartData: Record<string, { date: string; qty: number }[]> = {
  "30D": [
    { date: "May 1", qty: 4200 },
    { date: "May 5", qty: 4500 },
    { date: "May 10", qty: 4100 },
    { date: "May 15", qty: 4800 },
    { date: "May 20", qty: 5400 },
    { date: "May 25", qty: 5100 },
    { date: "May 30", qty: 5800 },
  ],
  "90D": [
    { date: "Mar 1", qty: 3200 },
    { date: "Mar 15", qty: 3800 },
    { date: "Apr 1", qty: 3500 },
    { date: "Apr 15", qty: 4200 },
    { date: "May 1", qty: 4600 },
    { date: "May 15", qty: 5400 },
    { date: "May 30", qty: 5800 },
  ],
  "1Y": [
    { date: "Q1 25", qty: 2800 },
    { date: "Q2 25", qty: 3500 },
    { date: "Q3 25", qty: 4200 },
    { date: "Q4 25", qty: 5100 },
    { date: "Q1 26", qty: 5800 },
  ],
};

// ── Invoice / Discount chart mock data (same as free dashboard) ──
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

// ── Spend by category mock data (same as free dashboard) ──────────
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

const InvoiceTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md bg-white dark:bg-zinc-850 border border-zinc-200 dark:border-white/8 px-3 py-2 text-[10px] text-zinc-900 dark:text-white shadow-lg">
      <div className="font-semibold mb-1">{payload[0]?.payload?.month}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span style={{ color: p.color }}>●</span>
          <span className="text-zinc-500 dark:text-zinc-400">{p.name}:</span>
          <span>{p.dataKey === "invoice" ? `$${p.value}M` : `${p.value}%`}</span>
        </div>
      ))}
    </div>
  );
};

export default function ProDashboard() {
  const { user } = useAuth()
  const { userType } = useUserType()
  const navigate = useNavigate()

  useEffect(() => {
    const isPro = user?.role === 'pro' || user?.role === 'admin' || userType === 'pro'
    if (!isPro) {
      navigate('/dashboard', { replace: true })
    }
  }, [user, userType, navigate])

  const isPro = user?.role === 'pro' || user?.role === 'admin' || userType === 'pro'
  if (!isPro) return null

  const [movementTab, setMovementTab] = useState<"30D" | "90D" | "1Y">("30D");
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
    <AppShell title="Pro Procurement Dashboard" isPro={true}>
      <div className="flex flex-col gap-5 p-6 bg-white dark:bg-[#111111] min-h-screen text-zinc-900 dark:text-white">

        {/* ── Row 1: Stat Cards (4 premium cards with high data density) ── */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          
          {/* Card 1: Total SKUs */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 flex flex-col justify-between hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Total SKUs</span>
              <div className="p-1.5 bg-violet-500/10 text-violet-400 rounded-lg">
                <Package className="h-4 w-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-bold text-zinc-900 dark:text-white tracking-tight">{totalSKUs.toLocaleString()}</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400">
                Live
              </span>
            </div>
            <span className="text-[10px] text-zinc-500 mt-2 block">
              Active catalog items across all depots
            </span>
          </div>

          {/* Card 2: Low Stock (red accent) */}
          <div className="bg-white dark:bg-zinc-900 border border-red-500/30 rounded-xl p-5 flex flex-col justify-between hover:border-red-500/50 transition-all duration-200 relative overflow-hidden">
            <div className="absolute right-0 top-0 w-24 h-24 bg-red-500/5 rounded-full blur-xl pointer-events-none" />
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Low Stock</span>
              <div className="p-1.5 bg-red-500/10 text-red-400 rounded-lg">
                <AlertTriangle className="h-4 w-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-bold text-red-400 tracking-tight">{lowStockCount}</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-red-500/15 text-red-400">
                {lowStockCount > 0 ? 'Needs Action' : 'All Good'}
              </span>
            </div>
            <span className="text-[10px] text-zinc-500 mt-2 block">
              12 items are currently below critical safety levels
            </span>
          </div>

          {/* Card 3: Open POs */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 flex flex-col justify-between hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Open POs</span>
              <div className="p-1.5 bg-blue-500/10 text-blue-400 rounded-lg">
                <FileText className="h-4 w-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-bold text-zinc-900 dark:text-white tracking-tight">128</span>
              <span className="text-[10px] font-semibold text-blue-400">
                $2.4M value
              </span>
            </div>
            <span className="text-[10px] text-zinc-500 mt-2 block">
              Estimated arrival: 3 transit routes active
            </span>
          </div>

          {/* Card 4: Fulfillment Rate */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 flex flex-col justify-between hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Fulfillment Rate</span>
              <div className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-bold text-zinc-900 dark:text-white tracking-tight">{fulfillmentRate}%</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400">
                Live
              </span>
            </div>
            <span className="text-[10px] text-zinc-500 mt-2 block">
              Fulfillment score across past 30 days
            </span>
          </div>

        </div>

        {/* ── Row 2: 2-Col Grid (Inventory Movement & Priority Restock Queue) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          
          {/* Left: Inventory Movement AreaChart */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 flex flex-col justify-between hover:border-zinc-200 dark:hover:border-zinc-800 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Inventory Movement</h3>
                <p className="text-[10px] text-zinc-500">Real-time stock trajectory across networks</p>
              </div>
              <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-lg p-1">
                {(["30D", "90D", "1Y"] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setMovementTab(r)}
                    className={`rounded px-2.5 py-1 text-[10px] font-medium transition-all ${
                      movementTab === r
                        ? "bg-violet-750 text-white shadow-sm font-semibold"
                        : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={areaChartData[movementTab]} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="proAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 9, fill: "#71717a" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 9, fill: "#71717a" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#18181b",
                      border: "1px solid #27272a",
                      borderRadius: "8px",
                      fontSize: "11px",
                      color: "#fff",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="qty"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    fill="url(#proAreaGrad)"
                    name="Stock Qty"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Right: Priority Restock Queue */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Priority Restock Queue</h3>
                <span className="text-[10px] text-violet-400 font-semibold px-2 py-0.5 bg-violet-500/10 rounded-full border border-violet-500/20">
                  Critical
                </span>
              </div>
              <p className="text-[10px] text-zinc-500 mb-4">Urgent purchase orders required for highlighted SKUs</p>
            </div>

            <div className="divide-y divide-zinc-200 dark:divide-zinc-800 flex-1 flex flex-col justify-center">
              {[
                { id: "SKU-992", name: "MacBook Pro M3 Max", qty: 12, label: "Critical", badgeClass: "bg-red-500/20 text-red-400" },
                { id: "SKU-184", name: "Dell UltraSharp 32\"", qty: 45, label: "Low", badgeClass: "bg-amber-500/20 text-amber-400" },
                { id: "SKU-223", name: "Sony WH-1000XM5", qty: 182, label: "Healthy", badgeClass: "bg-green-500/20 text-green-400" },
                { id: "SKU-445", name: "Logitech MX Master 3S", qty: 89, label: "Low", badgeClass: "bg-amber-500/20 text-amber-400" },
              ].map((row) => (
                <div key={row.id} className="flex items-center justify-between py-3 text-xs last:border-b-0">
                  <div className="flex items-center">
                    <span className="text-zinc-500 dark:text-zinc-600 font-mono text-[10px] mr-2.5 w-14 shrink-0">{row.id}</span>
                    <span className="text-zinc-900 dark:text-zinc-200 font-medium">{row.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-zinc-500 dark:text-zinc-400 mr-2">Qty: {row.qty}</span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${row.badgeClass}`}>
                      {row.label}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* ── Pro-only Label Strip ── */}
        <div className="flex items-center gap-2 mt-4 mb-1">
          <Sparkles className="w-3.5 h-3.5 text-violet-400 shrink-0" />
          <span className="text-xs text-violet-400 font-medium whitespace-nowrap">Pro analytics</span>
          <div className="flex-1 border-t border-violet-900/50" />
        </div>

        {/* ── Row 3: 2-Col Grid (Spend by Category & Total Invoice ComposedChart) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          
          {/* Left: Spend by Category Table */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Spend by Category</h3>
                <p className="text-[10px] text-zinc-500">Transaction counts and cycle averages</p>
              </div>
              <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 p-1 rounded-lg">
                {tabs.map((t) => (
                  <button
                    key={t}
                    onClick={() => setSpendTab(t)}
                    className={`px-2 py-1 rounded text-[10px] transition-all ${
                      spendTab === t
                        ? "bg-violet-750 text-white font-semibold shadow-sm"
                        : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
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
                  <tr className="border-b border-zinc-200 dark:border-zinc-800">
                    {["CATEGORY", "SPEND", "TRANS.", "SUPPLIERS", "PROC. CYCLE"].map((h) => (
                      <th key={h} className="pb-2 text-left text-[9px] font-semibold uppercase tracking-wide text-zinc-500 first:pl-0 px-2">
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
                      className="border-b border-zinc-200 dark:border-zinc-850/50 transition-colors hover:bg-zinc-50 dark:hover:bg-white/4 last:border-0"
                    >
                      <td className="py-2.5 first:pl-0 px-2 font-medium text-zinc-900 dark:text-zinc-200 whitespace-nowrap">
                        {row.category}
                      </td>
                      <td className="py-2.5 px-2 text-zinc-700 dark:text-zinc-300 whitespace-nowrap font-mono">
                        {fmt(row.spend)}
                      </td>
                      <td className="py-2.5 px-2 text-zinc-500 dark:text-zinc-400">
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
                        <button className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right: Total Invoice / Discount % */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Total Invoice &amp; Discount %</h3>
                <p className="text-[10px] text-zinc-500">Overview of capital invoices and average discount rate</p>
              </div>
              <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 p-1 rounded-lg">
                {tabs.map((t) => (
                  <button
                    key={t}
                    onClick={() => setInvoiceTab(t)}
                    className={`px-2 py-1 rounded text-[10px] transition-all ${
                      invoiceTab === t
                        ? "bg-violet-750 text-white font-semibold shadow-sm"
                        : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute -top-1.5 right-1.5 text-xs font-semibold bg-violet-500/10 text-violet-400 px-2 py-0.5 rounded border border-violet-500/15">
                Max: {Math.max(...(invoiceChartData[invoiceTab] ?? []).map((d) => d.discount)).toFixed(1)}% Discount
              </div>
              <div className="h-56 mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={invoiceChartData[invoiceTab]} margin={{ top: 12, right: 0, left: -20, bottom: 0 }}>
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
                      fill="#27272a"
                      radius={[3, 3, 0, 0]}
                      name="Invoice"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="discount"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      dot={{ r: 2, strokeWidth: 1 }}
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
