import { useEffect, useState, useMemo } from "react";
import { AppShell } from "../components/layout/AppShell";
import { supabase } from "../lib/supabaseClient";
import { Package, AlertTriangle, FileText, TrendingUp } from "lucide-react";
import {
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  Area,
  AreaChart
} from "recharts";

type TimeRange = "30D" | "90D" | "1Y";
type ActivityRange = "Monthly" | "Yearly";

export default function AdminLogisticsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [_loading, setLoading] = useState(true);

  const [movementRange, setMovementRange] = useState<TimeRange>("30D");
  const [activityRange, setActivityRange] = useState<ActivityRange>("Monthly");

  useEffect(() => {
    async function fetchData() {
      const [itemsRes, reqRes] = await Promise.all([
        supabase.from("inventory_items").select("quantity, reorder_threshold, unit_price"),
        supabase.from("issue_requests").select("status, created_at, quantity_requested")
      ]);
      setItems(itemsRes.data || []);
      setRequests(reqRes.data || []);
      setLoading(false);
    }
    fetchData();
  }, []);

  const stats = useMemo(() => {
    const totalSkus = items.length;

    // Items at or below their reorder threshold
    const lowStock = items.filter(
      i => (i.quantity || 0) <= (i.reorder_threshold || 0)
    ).length;

    // Sum of quantity * unit_price; unit_price may arrive as a string
    const totalValue = items.reduce(
      (acc, curr) => acc + (curr.quantity || 0) * parseFloat(curr.unit_price || 0),
      0
    );

    // Items still in stock (quantity > 0) divided by total items
    const inStock = items.filter(i => (i.quantity || 0) > 0).length;
    const fulfillmentRate = items.length ? (inStock / items.length) * 100 : 0;

    return { totalSkus, lowStock, totalValue, fulfillmentRate };
  }, [items]);

  const formatCurrency = (val: number) => {
    if (val >= 1000) {
      return `₹${(val / 1000).toFixed(1)}K`;
    }
    return `₹${val.toFixed(2)}`;
  };

  const movementData = useMemo(() => {
    const now = new Date();
    const data = [];
    const days = movementRange === "30D" ? 30 : movementRange === "90D" ? 90 : 365;
    const interval = movementRange === "30D" ? 3 : movementRange === "90D" ? 7 : 30;
    
    for (let i = days; i >= 0; i -= interval) {
      const start = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
      const end = new Date(now.getTime() - ((i - interval) * 24 * 60 * 60 * 1000));
      
      const reqs = requests.filter(r => {
        const d = new Date(r.created_at);
        return d >= start && d < end;
      });
      const sum = reqs.reduce((acc, r) => acc + (r.quantity_requested || 0), 0);
      
      data.push({
        name: start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        value: sum
      });
    }
    return data;
  }, [requests, movementRange]);

  const activityData = useMemo(() => {
    const now = new Date();
    const data = [];
    const periods = activityRange === "Monthly" ? 6 : 12;
    
    for (let i = periods - 1; i >= 0; i--) {
      let d, end;
      if (activityRange === "Monthly") {
        d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      } else {
        d = new Date(now.getFullYear(), now.getMonth() - (i * 2), 1);
        end = new Date(now.getFullYear(), now.getMonth() - (i * 2) + 2, 0);
      }
      
      const reqs = requests.filter(r => {
        const rd = new Date(r.created_at);
        return rd >= d && rd <= end;
      });
      
      const total = reqs.length;
      const approved = reqs.filter(r => r.status === 'approved').length;
      
      data.push({
        name: d.toLocaleDateString('en-US', { month: 'short' }),
        total: total,
        approved: approved
      });
    }
    return data;
  }, [requests, activityRange]);

  return (
    <AppShell title="Logistics">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 font-['DM_Sans']">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white tracking-tight">Logistics</h1>
        </div>

        {/* Stats Row */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-white/10 bg-[#111114] p-5 flex flex-col justify-between h-28">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#6e6e78]">Total SKUs</span>
              <Package className="h-4 w-4 text-violet-400" />
            </div>
            <div>
              <div className="text-3xl font-bold text-white tracking-tight">{stats.totalSkus}</div>
              <div className="text-[11px] text-[#6e6e78] mt-1">Active catalog items in IdeaLab</div>
            </div>
          </div>
          
          <div className="rounded-xl border border-white/10 bg-[#111114] p-5 flex flex-col justify-between h-28">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#6e6e78]">Low Stock</span>
              <AlertTriangle className="h-4 w-4 text-red-400" />
            </div>
            <div>
              <div className="text-3xl font-bold text-red-400 tracking-tight">{stats.lowStock}</div>
              <div className="text-[11px] text-[#6e6e78] mt-1">Items below reorder threshold</div>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-[#111114] p-5 flex flex-col justify-between h-28">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#6e6e78]">Inventory Value</span>
              <FileText className="h-4 w-4 text-blue-400" />
            </div>
            <div>
              <div className="text-3xl font-bold text-white tracking-tight">{formatCurrency(stats.totalValue)}</div>
              <div className="text-[11px] text-[#6e6e78] mt-1">Estimated value of all stock</div>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-[#111114] p-5 flex flex-col justify-between h-28">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#6e6e78]">Fulfillment Rate</span>
              <TrendingUp className="h-4 w-4 text-emerald-400" />
            </div>
            <div>
              <div className="text-3xl font-bold text-white tracking-tight">{stats.fulfillmentRate.toFixed(1)}%</div>
              <div className="text-[11px] text-[#6e6e78] mt-1">Items with approved = true</div>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Inventory Movement */}
          <div className="rounded-xl border border-white/10 bg-[#111114] p-5">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-sm font-bold text-white">Inventory Movement</h3>
                <p className="text-[11px] text-[#6e6e78]">Items issued across all labs/workshops</p>
              </div>
              <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-black/20 p-1">
                {(["30D", "90D", "1Y"] as TimeRange[]).map((range) => (
                  <button
                    key={range}
                    onClick={() => setMovementRange(range)}
                    className={`rounded-md px-3 py-1 text-[11px] font-bold transition-colors ${
                      movementRange === range ? "bg-violet-600 text-white" : "text-[#6e6e78] hover:text-white"
                    }`}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={movementData}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#7c3aed" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="name" stroke="#6e6e78" fontSize={10} tickLine={false} axisLine={false} tickMargin={10} />
                  <YAxis stroke="#6e6e78" fontSize={10} tickLine={false} axisLine={false} tickMargin={10} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#111114', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                    cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }}
                  />
                  <Area type="monotone" dataKey="value" stroke="#7c3aed" strokeWidth={2} fillOpacity={1} fill="url(#colorValue)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Issue Activity */}
          <div className="rounded-xl border border-white/10 bg-[#111114] p-5">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-sm font-bold text-white">Issue Activity</h3>
                <p className="text-[11px] text-[#6e6e78]">Requests per period</p>
              </div>
              <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-black/20 p-1">
                {(["Monthly", "Yearly"] as ActivityRange[]).map((range) => (
                  <button
                    key={range}
                    onClick={() => setActivityRange(range)}
                    className={`rounded-md px-3 py-1 text-[11px] font-bold transition-colors ${
                      activityRange === range ? "bg-violet-600 text-white" : "text-[#6e6e78] hover:text-white"
                    }`}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={activityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="name" stroke="#6e6e78" fontSize={10} tickLine={false} axisLine={false} tickMargin={10} />
                  <YAxis stroke="#6e6e78" fontSize={10} tickLine={false} axisLine={false} tickMargin={10} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#111114', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  />
                  <Bar dataKey="total" fill="#3f3f46" radius={[4, 4, 0, 0]} maxBarSize={30} />
                  <Line type="monotone" dataKey="approved" stroke="#7c3aed" strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
