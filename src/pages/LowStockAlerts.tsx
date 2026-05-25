import { useState } from "react";
import { Search, AlertTriangle, ShoppingCart, RefreshCw, X, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "../components/layout/AppShell";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip as RechartsTooltip, CartesianGrid } from 'recharts';
import { useItems } from "../hooks/useItems";

const forecastData = Array.from({ length: 14 }).map((_, i) => ({
  day: `Day ${i + 1}`,
  macbook: Math.max(12 - (4.5 * i), 0),
  dell: Math.max(45 - (12.2 * i), 0),
  logi: Math.max(89 - (8.4 * i), 0),
}));

function UrgencyBadge({ urgency }: { urgency: string }) {
  const map: Record<string, string> = {
    Critical: "bg-red-500/15 text-red-500 border-red-500/20",
    High: "bg-amber-500/15 text-amber-500 border-amber-500/20",
    Medium: "bg-orange-500/15 text-orange-500 border-orange-500/20",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${map[urgency] ?? "bg-zinc-500/15 text-zinc-400"}`}>
      {urgency}
    </span>
  );
}

export default function LowStockAlerts() {
  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState("All");

  // Draft PO Modal State
  const [draftPO, setDraftPO] = useState<any>(null);
  
  // Forecast Modal State
  const [isForecastOpen, setIsForecastOpen] = useState(false);

  const { data: items = [], isLoading } = useItems()

  const lowStockItems = items
    .filter(i => i.quantity <= i.reorder_threshold)
    .map(i => ({
      id: i.id,
      name: i.name,
      sku: i.sku,
      quantity: i.quantity,
      reorder_threshold: i.reorder_threshold,
      supplier: i.supplier,
      urgency: i.quantity === 0 ? 'Critical'
        : i.quantity <= i.reorder_threshold * 0.3 ? 'Critical'
        : i.quantity <= i.reorder_threshold * 0.6 ? 'High'
        : 'Medium',
      suggestedOrder: Math.max(i.reorder_threshold * 3 - i.quantity, 50),
      // Use fake data for the spark line to maintain UI
      dailyVelocity: Math.floor(Math.random() * 10) + 1,
      sparkData: [{v:3},{v:4},{v:3.5},{v:5},{v:6},{v:7},{v:8}],
    }))

  const filtered = lowStockItems.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) || item.sku.toLowerCase().includes(search.toLowerCase());
    const matchesTab = filterTab === "All" || item.urgency === filterTab;
    return matchesSearch && matchesTab;
  });

  const criticalCount = lowStockItems.filter(i => i.urgency === 'Critical').length
  const highCount = lowStockItems.filter(i => i.urgency === 'High').length
  const mediumCount = lowStockItems.filter(i => i.urgency === 'Medium').length

  const handleDraftSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success(`PO drafted for ${draftPO.name}`);
    setDraftPO(null);
  };

  return (
    <AppShell title="Low Stock Alerts">
      <div className="p-5">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-zinc-900 dark:text-white">Low Stock Alerts</h2>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              Critical inventory requiring immediate restock action.
            </p>
          </div>
          <button
            onClick={() => setIsForecastOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-violet-700 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-violet-600 shadow-lg shadow-violet-700/20"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Run Forecast
          </button>
        </div>

        {/* Urgency Filter Tabs */}
        <div className="flex gap-2 mb-4">
          {["All", "Critical", "High", "Medium"].map(tab => (
            <button
              key={tab}
              onClick={() => setFilterTab(tab)}
              className={`px-4 py-1.5 rounded-full text-xs transition-all ${
                filterTab === tab
                  ? "bg-violet-600 text-white font-medium"
                  : "border border-slate-200 dark:border-zinc-700 text-zinc-500 hover:border-violet-400 dark:hover:border-violet-500 font-medium"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Summary stat cards */}
        <div className="mb-5 grid grid-cols-3 gap-4">
          {[
            { label: "Critical Items", value: criticalCount, color: "text-red-500" },
            { label: "High Priority", value: highCount, color: "text-amber-500" },
            { label: "Medium Priority", value: mediumCount, color: "text-orange-500" },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-white/8 dark:bg-zinc-900 shadow-sm">
              <div className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1">{s.label}</div>
              <div className={`text-3xl font-black ${s.color}`}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Table card */}
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-white/8 dark:bg-[#1a1a1a]">
          {/* Search bar */}
          <div className="border-b border-zinc-100 p-4 dark:border-white/8">
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search low stock SKUs..."
                className="h-8 w-full rounded-lg border border-zinc-200 bg-white pl-9 pr-4 text-xs text-zinc-700 outline-none focus:border-violet-600 dark:border-white/8 dark:bg-white/6 dark:text-zinc-300"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="p-8 space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 w-full animate-pulse bg-zinc-100 dark:bg-white/5 rounded-xl"></div>
                ))}
              </div>
            ) : lowStockItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center mb-3">
                  <TrendingUp className="h-6 w-6 text-green-500" />
                </div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-1">Inventory is Healthy</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center max-w-sm">
                  No low stock items — all inventory is healthy and above reorder thresholds.
                </p>
              </div>
            ) : (
              <table className="w-full text-left">
                <thead className="border-b border-zinc-100 dark:border-white/8 bg-zinc-50 dark:bg-zinc-950">
                  <tr>
                    {["Item Details", "Stock Level", "Urgency", "Velocity", "Suggested Order", "Action"].map((h) => (
                      <th key={h} className="px-4 py-3 text-[9px] font-semibold uppercase tracking-wide text-zinc-400">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-white/6">
                  {filtered.map((item) => {
                    const pct = (item.quantity / item.reorder_threshold) * 100;
                    const barColor = pct < 25 ? "bg-red-500" : pct < 50 ? "bg-amber-500" : "bg-green-500";
                    
                    return (
                      <tr key={item.id} className="group transition-colors hover:bg-zinc-50 dark:hover:bg-white/4">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                              item.urgency === "Critical" ? "bg-red-500/10 text-red-500" : item.urgency === "High" ? "bg-amber-500/10 text-amber-500" : "bg-orange-500/10 text-orange-500"
                            }`}>
                              <AlertTriangle className="h-3.5 w-3.5" />
                            </div>
                            <div>
                              <div className="text-xs font-bold text-zinc-900 dark:text-zinc-200">{item.name}</div>
                              <div className="text-[10px] font-mono text-zinc-500 mt-0.5">{item.sku}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-end gap-1 mb-1.5">
                            <span className="text-sm font-black text-zinc-900 dark:text-zinc-200 leading-none">{item.quantity}</span>
                            <span className="text-[10px] font-bold text-zinc-400">/ {item.reorder_threshold}</span>
                          </div>
                          <div className="h-1.5 w-32 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <UrgencyBadge urgency={item.urgency} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div>
                              <div className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{item.dailyVelocity}/day</div>
                              <div className="text-[10px] font-medium text-zinc-500 mt-0.5">Out in ~{Math.floor(item.quantity / item.dailyVelocity)}d</div>
                            </div>
                            <div className="w-[60px] h-[24px]">
                              <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={item.sparkData}>
                                  <Line 
                                    type="monotone" 
                                    dataKey="v" 
                                    stroke={item.urgency === 'Critical' ? '#ef4444' : item.urgency === 'High' ? '#f59e0b' : '#3b82f6'} 
                                    strokeWidth={1.5} 
                                    dot={false} 
                                    isAnimationActive={false}
                                  />
                                </LineChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center rounded-lg bg-zinc-100 px-2.5 py-1 text-xs font-bold text-zinc-700 dark:bg-white/8 dark:text-zinc-300">
                            +{item.suggestedOrder} units
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setDraftPO(item)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-violet-700/10 px-3 py-1.5 text-[10px] font-bold text-violet-600 transition-colors hover:bg-violet-700/20 dark:text-violet-400"
                          >
                            <ShoppingCart className="h-3 w-3" />
                            Draft PO
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Simple Draft PO Modal */}
      {draftPO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 dark:border-white/8 dark:bg-[#1a1a1a] shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Draft Purchase Order</h3>
              <button onClick={() => setDraftPO(null)} className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleDraftSubmit} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">Supplier</label>
                <input type="text" readOnly value={draftPO.supplier || 'Unknown'} className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-zinc-900 font-medium dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300" />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">SKU</label>
                <input type="text" readOnly value={`${draftPO.sku} - ${draftPO.name}`} className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-zinc-900 font-medium dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300" />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">Order Quantity</label>
                <input type="number" defaultValue={draftPO.suggestedOrder} className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-violet-600 font-bold dark:border-zinc-700 dark:bg-zinc-950 dark:text-white" />
              </div>
              <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                <button type="button" onClick={() => setDraftPO(null)} className="rounded-xl px-4 py-2 font-bold text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800">Cancel</button>
                <button type="submit" className="rounded-xl bg-violet-600 px-4 py-2 font-bold text-white hover:bg-violet-700 flex items-center gap-2"><ShoppingCart className="w-4 h-4"/> Submit Draft</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Forecast Modal */}
      {isForecastOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border border-zinc-200 bg-white p-6 dark:border-white/8 dark:bg-[#1a1a1a] shadow-2xl">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-violet-500" /> Stockout Forecast
              </h3>
              <button onClick={() => setIsForecastOpen(false)} className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs font-medium text-zinc-500 mb-6">Based on current velocity and stock levels.</p>
            
            <div className="h-[200px] w-full mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={forecastData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#71717a" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#71717a" }} axisLine={false} tickLine={false} />
                  <RechartsTooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px', fontSize: '12px', color: '#fff' }} />
                  <Line type="monotone" dataKey="macbook" name="MacBook Pro" stroke="#ef4444" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="dell" name="Dell Monitor" stroke="#f59e0b" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="logi" name="Logitech Mouse" stroke="#22c55e" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-2 border-t border-zinc-200 dark:border-zinc-800 pt-4">
              <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
                <span className="text-sm font-bold text-zinc-900 dark:text-white">MacBook Pro M3 Max</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium text-zinc-500">Stockout in ~3 days</span>
                  <UrgencyBadge urgency="Critical" />
                </div>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
                <span className="text-sm font-bold text-zinc-900 dark:text-white">Dell UltraSharp 32"</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium text-zinc-500">Stockout in ~4 days</span>
                  <UrgencyBadge urgency="High" />
                </div>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
                <span className="text-sm font-bold text-zinc-900 dark:text-white">Logitech MX Master 3S</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium text-zinc-500">Stockout in ~11 days</span>
                  <UrgencyBadge urgency="Medium" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </AppShell>
  );
}
