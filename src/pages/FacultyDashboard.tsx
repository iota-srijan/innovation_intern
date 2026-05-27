import { useState } from "react";
import { Shield, AlertTriangle, Package, FileText, TrendingUp, X } from "lucide-react";
import { AppShell } from "../components/layout/AppShell";
import { useAuth } from "../context/AuthContext";
import { useItems } from "../hooks/useItems";
import { supabase } from "../lib/supabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Bar,
  Line,
  ComposedChart,
} from "recharts";

interface IssueRequest {
  id: string;
  item_id: string;
  item_name: string;
  quantity_requested: number;
  purpose: string;
  status: "pending" | "approved" | "rejected";
  student_email: string;
  student_name: string;
  created_at: string;
  return_deadline?: string;
  review_note?: string;
  reviewed_by?: string;
}

// ── Chart mock data (same as ProDashboard) ────────────────────
const areaChartData: Record<string, { date: string; qty: number }[]> = {
  "30D": [
    { date: "May 1", qty: 4200 }, { date: "May 5", qty: 4500 },
    { date: "May 10", qty: 4100 }, { date: "May 15", qty: 4800 },
    { date: "May 20", qty: 5400 }, { date: "May 25", qty: 5100 },
    { date: "May 30", qty: 5800 },
  ],
  "90D": [
    { date: "Mar 1", qty: 3200 }, { date: "Mar 15", qty: 3800 },
    { date: "Apr 1", qty: 3500 }, { date: "Apr 15", qty: 4200 },
    { date: "May 1", qty: 4600 }, { date: "May 15", qty: 5400 },
    { date: "May 30", qty: 5800 },
  ],
  "1Y": [
    { date: "Q1 25", qty: 2800 }, { date: "Q2 25", qty: 3500 },
    { date: "Q3 25", qty: 4200 }, { date: "Q4 25", qty: 5100 },
    { date: "Q1 26", qty: 5800 },
  ],
};

const invoiceChartData: Record<string, { month: string; invoice: number; discount: number }[]> = {
  Monthly: [
    { month: "Jan", invoice: 180, discount: 2.1 }, { month: "Feb", invoice: 220, discount: 2.8 },
    { month: "Mar", invoice: 160, discount: 1.9 }, { month: "Apr", invoice: 280, discount: 3.5 },
    { month: "May", invoice: 240, discount: 3.1 }, { month: "Jun", invoice: 310, discount: 3.8 },
  ],
  Yearly: [
    { month: "2022", invoice: 1450, discount: 4.2 }, { month: "2023", invoice: 1900, discount: 4.6 },
    { month: "2024", invoice: 2400, discount: 5.0 }, { month: "2025", invoice: 2800, discount: 5.3 },
  ],
};

const APPROVAL_REASONS = [
  "Approved for project use",
  "Approved for coursework",
  "Approved for research",
  "Approved for lab activity",
];

const REJECTION_REASONS = [
  "Item unavailable",
  "Insufficient justification",
  "Quantity exceeds policy",
  "Item reserved for other use",
];

type StatusFilter = "All" | "Pending" | "Approved" | "Rejected";

function StatusBadge({ status }: { status: string }) {
  if (status === "pending")
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/20 text-amber-400">Pending</span>;
  if (status === "approved")
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-500/20 text-green-400">Approved</span>;
  if (status === "rejected")
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-500/20 text-red-400">Rejected</span>;
  return null;
}

export default function FacultyDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: items = [] } = useItems();

  const [movementTab, setMovementTab] = useState<"30D" | "90D" | "1Y">("30D");
  const [invoiceTab, setInvoiceTab] = useState("Monthly");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");

  // Approve modal state
  const todayStr = new Date().toISOString().split("T")[0];
  const [approveTarget, setApproveTarget] = useState<IssueRequest | null>(null);
  const [approvalReason, setApprovalReason] = useState(APPROVAL_REASONS[0]);
  const [returnDeadline, setReturnDeadline] = useState(todayStr);

  // Reject modal state
  const [rejectTarget, setRejectTarget] = useState<IssueRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState(REJECTION_REASONS[0]);

  // Fetch all requests
  const { data: allRequests = [] } = useQuery<IssueRequest[]>({
    queryKey: ["issue_requests", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("issue_requests")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const pendingRequests = allRequests.filter((r) => r.status === "pending");

  const extendedItems = items as any[];
  const totalSKUs = extendedItems.length;
  const lowStockCount = extendedItems.filter((i) => i.quantity <= i.reorder_threshold).length;
  const totalValue = extendedItems.reduce((sum, i) => sum + (i.quantity * (i.unit_price || 0)), 0);
  const totalValueFormatted = totalValue >= 1000000
    ? `$${(totalValue / 1000000).toFixed(2)}M`
    : `$${(totalValue / 1000).toFixed(1)}K`;
  const fulfillmentRate = extendedItems.length > 0
    ? ((extendedItems.filter((i) => i.quantity > 0).length / extendedItems.length) * 100).toFixed(1)
    : "0.0";

  const approveMutation = useMutation({
    mutationFn: async () => {
      if (!approveTarget) return;

      const { error: updateError } = await supabase
        .from("issue_requests")
        .update({
          status: "approved",
          reviewed_by: user?.id,
          review_note: approvalReason,
          return_deadline: returnDeadline,
        })
        .eq("id", approveTarget.id);
      if (updateError) throw updateError;

      // Decrement inventory quantity
      const { data: item } = await supabase
        .from("inventory_items")
        .select("quantity, reorder_threshold")
        .eq("id", approveTarget.item_id)
        .single();
      if (item) {
        const newQty = Math.max(0, item.quantity - approveTarget.quantity_requested);
        const newStatus = newQty <= 0 ? "out_of_stock" : (newQty <= item.reorder_threshold ? "low_stock" : "in_stock");
        await supabase
          .from("inventory_items")
          .update({ 
            quantity: newQty, 
            status: newStatus,
            updated_at: new Date().toISOString() 
          })
          .eq("id", approveTarget.item_id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["issue_requests"] });
      queryClient.invalidateQueries({ queryKey: ["items"] });
      toast.success("Request approved");
      setApproveTarget(null);
    },
    onError: () => toast.error("Failed to approve request"),
  });

  const rejectMutation = useMutation({
    mutationFn: async () => {
      if (!rejectTarget) return;
      const { error } = await supabase
        .from("issue_requests")
        .update({
          status: "rejected",
          reviewed_by: user?.id,
          review_note: rejectionReason,
        })
        .eq("id", rejectTarget.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["issue_requests"] });
      toast.success("Request rejected");
      setRejectTarget(null);
    },
    onError: () => toast.error("Failed to reject request"),
  });

  const filteredRequests = allRequests.filter((r) => {
    if (statusFilter === "All") return true;
    return r.status === statusFilter.toLowerCase();
  });

  const maxQty = extendedItems.length > 0 ? Math.max(1, ...extendedItems.map((i) => i.quantity || 0)) * 10 : 6000;

  return (
    <AppShell title="IdeaLab — Faculty Portal" isPro={true}>
      <div className="flex flex-col gap-5 p-6 bg-white dark:bg-[#111111] min-h-screen text-zinc-900 dark:text-white">

        {/* Faculty portal badge */}
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-violet-400" />
          <span className="text-sm font-medium text-zinc-900 dark:text-white">IdeaLab Faculty Portal</span>
          <span className="text-xs text-zinc-500">· OPJU IdeaLab</span>
        </div>

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Total SKUs</span>
              <div className="p-1.5 bg-violet-500/10 text-violet-400 rounded-lg"><Package className="h-4 w-4" /></div>
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-bold text-zinc-900 dark:text-white tracking-tight">{totalSKUs}</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400">Live</span>
            </div>
            <span className="text-[10px] text-zinc-500 mt-2 block">Active catalog items in IdeaLab</span>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-red-500/30 rounded-xl p-5 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute right-0 top-0 w-24 h-24 bg-red-500/5 rounded-full blur-xl pointer-events-none" />
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Low Stock</span>
              <div className="p-1.5 bg-red-500/10 text-red-400 rounded-lg"><AlertTriangle className="h-4 w-4" /></div>
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-bold text-red-400 tracking-tight">{lowStockCount}</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-red-500/15 text-red-400">
                {lowStockCount > 0 ? "Needs Action" : "All Good"}
              </span>
            </div>
            <span className="text-[10px] text-zinc-500 mt-2 block">Items below reorder threshold</span>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Inventory Value</span>
              <div className="p-1.5 bg-blue-500/10 text-blue-400 rounded-lg"><FileText className="h-4 w-4" /></div>
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-bold text-zinc-900 dark:text-white tracking-tight">{totalValueFormatted}</span>
            </div>
            <span className="text-[10px] text-zinc-500 mt-2 block">Estimated valuation of all stock</span>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Fulfillment Rate</span>
              <div className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg"><TrendingUp className="h-4 w-4" /></div>
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-bold text-zinc-900 dark:text-white tracking-tight">{fulfillmentRate}%</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400">Live</span>
            </div>
            <span className="text-[10px] text-zinc-500 mt-2 block">Items with quantity &gt; 0</span>
          </div>
        </div>

        {/* ── Charts Row ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Inventory Movement */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Inventory Movement</h3>
                <p className="text-[10px] text-zinc-500">Stock trajectory over time</p>
              </div>
              <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-1">
                {(["30D", "90D", "1Y"] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setMovementTab(r)}
                    className={`rounded px-2.5 py-1 text-[10px] font-medium transition-all ${
                      movementTab === r ? "bg-violet-700 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={areaChartData[movementTab]} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="facultyAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#71717a" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: "#71717a" }} axisLine={false} tickLine={false} domain={[0, maxQty]} tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`} />
                  <Tooltip contentStyle={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "8px", fontSize: "11px", color: "#fff" }} />
                  <Area type="monotone" dataKey="qty" stroke="#8b5cf6" strokeWidth={2} fill="url(#facultyAreaGrad)" name="Stock Qty" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Invoice chart */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Issue Activity</h3>
                <p className="text-[10px] text-zinc-500">Component issuances and trends</p>
              </div>
              <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-1 rounded-lg">
                {["Monthly", "Yearly"].map((t) => (
                  <button
                    key={t}
                    onClick={() => setInvoiceTab(t)}
                    className={`px-2 py-1 rounded text-[10px] transition-all ${
                      invoiceTab === t ? "bg-violet-700 text-white font-semibold shadow-sm" : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={invoiceChartData[invoiceTab]} margin={{ top: 8, right: 0, left: -20, bottom: 0 }}>
                  <XAxis dataKey="month" tick={{ fontSize: 9, fill: "#71717a" }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="left" tick={{ fontSize: 9, fill: "#71717a" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}M`} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9, fill: "#71717a" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} width={30} />
                  <Tooltip contentStyle={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "8px", fontSize: "11px", color: "#fff" }} />
                  <Bar yAxisId="left" dataKey="invoice" fill="#3f3f46" radius={[3, 3, 0, 0]} name="Issues" />
                  <Line yAxisId="right" type="monotone" dataKey="discount" stroke="#8b5cf6" strokeWidth={2} dot={false} name="Trend %" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* ── Pending Requests ── */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-sm font-medium text-white">Pending Issue Requests</span>
            {pendingRequests.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400">
                {pendingRequests.length}
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-zinc-800">
                  {["STUDENT", "ITEM", "QTY", "PURPOSE", "SUBMITTED", "ACTION"].map((h) => (
                    <th key={h} className="pb-2 text-left text-[9px] font-semibold uppercase tracking-wide text-zinc-500 px-2 first:pl-0">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pendingRequests.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-zinc-500 text-xs">
                      No pending requests.
                    </td>
                  </tr>
                )}
                {pendingRequests.map((req) => (
                  <tr key={req.id} className="border-b border-zinc-800 hover:bg-white/4 last:border-0">
                    <td className="py-2.5 px-2 first:pl-0 font-medium text-zinc-200">
                      <div>{req.student_name}</div>
                      <div className="text-[9px] text-zinc-500 font-mono">{req.student_email}</div>
                    </td>
                    <td className="py-2.5 px-2 text-zinc-300">{req.item_name}</td>
                    <td className="py-2.5 px-2 text-zinc-300">{req.quantity_requested}</td>
                    <td className="py-2.5 px-2 text-zinc-400 max-w-[160px] truncate">{req.purpose}</td>
                    <td className="py-2.5 px-2 text-zinc-500">
                      {new Date(req.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-2.5 px-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => { setApproveTarget(req); setApprovalReason(APPROVAL_REASONS[0]); setReturnDeadline(todayStr); }}
                          className="px-3 py-1 bg-green-600 hover:bg-green-500 text-white text-xs rounded-lg transition-colors cursor-pointer"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => { setRejectTarget(req); setRejectionReason(REJECTION_REASONS[0]); }}
                          className="px-3 py-1 bg-red-600/20 hover:bg-red-600/30 text-red-400 text-xs rounded-lg border border-red-600/30 transition-colors cursor-pointer"
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── All Requests History ── */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <span className="text-sm font-medium text-white">All Requests</span>
            <div className="flex items-center gap-1">
              {(["All", "Pending", "Approved", "Rejected"] as StatusFilter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`px-3 py-1 rounded-lg text-[10px] font-medium transition-colors cursor-pointer ${
                    statusFilter === f
                      ? "bg-violet-700 text-white"
                      : "text-zinc-500 hover:text-zinc-300 border border-zinc-700"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-zinc-800">
                  {["STUDENT", "ITEM", "QTY", "PURPOSE", "STATUS", "SUBMITTED", "RETURN BY"].map((h) => (
                    <th key={h} className="pb-2 text-left text-[9px] font-semibold uppercase tracking-wide text-zinc-500 px-2 first:pl-0">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRequests.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-zinc-500 text-xs">No requests found.</td>
                  </tr>
                )}
                {filteredRequests.map((req) => (
                  <tr key={req.id} className="border-b border-zinc-800 hover:bg-white/4 last:border-0">
                    <td className="py-2.5 px-2 first:pl-0 font-medium text-zinc-200">{req.student_name}</td>
                    <td className="py-2.5 px-2 text-zinc-300">{req.item_name}</td>
                    <td className="py-2.5 px-2 text-zinc-300">{req.quantity_requested}</td>
                    <td className="py-2.5 px-2 text-zinc-400 max-w-[140px] truncate">{req.purpose}</td>
                    <td className="py-2.5 px-2"><StatusBadge status={req.status} /></td>
                    <td className="py-2.5 px-2 text-zinc-500">{new Date(req.created_at).toLocaleDateString()}</td>
                    <td className="py-2.5 px-2 text-zinc-500">
                      {req.return_deadline ? new Date(req.return_deadline).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Approve Modal */}
      {approveTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setApproveTarget(null)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 w-full max-w-md relative mx-4" onClick={(e) => e.stopPropagation()}>
            <button className="absolute top-4 right-4 text-zinc-500 hover:text-white cursor-pointer" onClick={() => setApproveTarget(null)}>
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-lg font-semibold text-white mb-1">Approve Request</h3>
            <p className="text-xs text-zinc-400 mb-5">
              {approveTarget.student_name} · {approveTarget.item_name} × {approveTarget.quantity_requested}
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Approval Reason</label>
                <select
                  value={approvalReason}
                  onChange={(e) => setApprovalReason(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500 cursor-pointer"
                >
                  {APPROVAL_REASONS.map((r) => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Return Deadline</label>
                <input
                  type="date"
                  min={todayStr}
                  value={returnDeadline}
                  onChange={(e) => setReturnDeadline(e.target.value)}
                  className="w-full bg-zinc-800 border border-white/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 cursor-pointer"
                />
                {returnDeadline && (
                  <p className="mt-1.5 text-[11px] text-zinc-400">
                    Return by: <span className="font-medium text-white">{new Date(returnDeadline).toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  </p>
                )}
              </div>
              <button
                onClick={() => approveMutation.mutate()}
                disabled={approveMutation.isPending}
                className="w-full py-2.5 bg-green-600 hover:bg-green-500 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition-colors cursor-pointer"
              >
                {approveMutation.isPending ? "Approving…" : "Confirm Approval"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setRejectTarget(null)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 w-full max-w-md relative mx-4" onClick={(e) => e.stopPropagation()}>
            <button className="absolute top-4 right-4 text-zinc-500 hover:text-white cursor-pointer" onClick={() => setRejectTarget(null)}>
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-lg font-semibold text-white mb-1">Reject Request</h3>
            <p className="text-xs text-zinc-400 mb-5">
              {rejectTarget.student_name} · {rejectTarget.item_name} × {rejectTarget.quantity_requested}
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Rejection Reason</label>
                <select
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500 cursor-pointer"
                >
                  {REJECTION_REASONS.map((r) => <option key={r}>{r}</option>)}
                </select>
              </div>
              <button
                onClick={() => rejectMutation.mutate()}
                disabled={rejectMutation.isPending}
                className="w-full py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition-colors cursor-pointer"
              >
                {rejectMutation.isPending ? "Rejecting…" : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
