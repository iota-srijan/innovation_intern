import { useState, useEffect, useRef } from "react";
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

type PhysicalStatus = "pending_handover" | "issued" | "returned" | "consumed";

interface IssueRequest {
  id: string;
  item_id: string;
  item_name: string;
  sku?: string;
  quantity_requested: number;
  purpose: string;
  status: "pending" | "approved" | "rejected";
  student_email: string;
  student_name: string;
  created_at: string;
  return_deadline?: string;
  review_note?: string;
  reviewed_by?: string;
  physical_status?: PhysicalStatus;
  issued_at?: string;
  returned_at?: string;
}

// ── Chart helpers ────────────────────────────────────────────────

/** Format a JS Date as 'MMM D' (e.g. "May 3") */
function fmtDay(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

type MovementRange = "30D" | "90D" | "1Y";

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

// ── Helper: is this a consumable (non-returnable) item? ──────────
function isConsumable(req: IssueRequest): boolean {
  const sku = (req.sku ?? "").toUpperCase();
  const name = (req.item_name ?? "").toLowerCase();
  return sku.startsWith("3DP-") && !name.includes("printer");
}

// ── Resolve effective physical status with fallback ──────────────
function effectivePhysicalStatus(req: IssueRequest): PhysicalStatus {
  return req.physical_status ?? "pending_handover";
}

// ── Badges ───────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  if (status === "pending")
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/20 text-amber-400">Pending</span>;
  if (status === "approved")
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-500/20 text-green-400">Approved</span>;
  if (status === "rejected")
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-500/20 text-red-400">Rejected</span>;
  return null;
}

function PhysicalStatusBadge({ req }: { req: IssueRequest }) {
  if (req.status !== "approved") return <span className="text-zinc-600">—</span>;
  const ps = effectivePhysicalStatus(req);
  if (ps === "pending_handover")
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-700 text-zinc-300">Awaiting Handover</span>;
  if (ps === "issued")
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/20 text-blue-400">Issued</span>;
  if (ps === "returned")
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-500/20 text-green-400">Returned</span>;
  if (ps === "consumed")
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-500/20 text-purple-400">Consumed</span>;
  return null;
}

// ── Inline confirmation popover ──────────────────────────────────
interface ConfirmPopoverProps {
  message: string;
  confirmLabel: string;
  confirmClassName: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}
function ConfirmPopover({ message, confirmLabel, confirmClassName, onConfirm, onCancel, loading }: ConfirmPopoverProps) {
  return (
    <div className="absolute z-20 right-0 top-full mt-1 w-56 bg-zinc-800 border border-zinc-700 rounded-xl shadow-xl p-3 text-left">
      <p className="text-[11px] text-zinc-300 leading-snug mb-3">{message}</p>
      <div className="flex gap-2">
        <button
          disabled={loading}
          onClick={onConfirm}
          className={`flex-1 py-1 rounded-lg text-[11px] font-medium disabled:opacity-50 transition-colors cursor-pointer ${confirmClassName}`}
        >
          {loading ? "…" : confirmLabel}
        </button>
        <button
          disabled={loading}
          onClick={onCancel}
          className="flex-1 py-1 rounded-lg text-[11px] text-zinc-400 hover:text-white border border-zinc-700 transition-colors cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function FacultyDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: items = [] } = useItems();

  const [movementTab, setMovementTab] = useState<MovementRange>("30D");
  const [invoiceTab, setInvoiceTab] = useState("Monthly");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");

  // Approve modal state
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];
  const [approveTarget, setApproveTarget] = useState<IssueRequest | null>(null);
  const [approvalReason, setApprovalReason] = useState(APPROVAL_REASONS[0]);
  const [returnDeadline, setReturnDeadline] = useState(tomorrowStr);

  // Reject modal state
  const [rejectTarget, setRejectTarget] = useState<IssueRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState(REJECTION_REASONS[0]);

  // Physical status action state — which row's confirm popover is open
  const [confirmOpen, setConfirmOpen] = useState<string | null>(null); // row id
  const [loadingRow, setLoadingRow] = useState<string | null>(null);   // row id during async op

  // ── STEP 1: DB migration — run once ─────────────────────────────
  const migrationRan = useRef(false);
  useEffect(() => {
    if (migrationRan.current) return;
    migrationRan.current = true;

    const runMigration = async () => {
      // Execute each ALTER TABLE via a raw SQL RPC; gracefully ignore if already exists
      const statements = [
        `alter table issue_requests add column if not exists physical_status text default 'pending_handover'`,
        `alter table issue_requests add column if not exists issued_at timestamptz`,
        `alter table issue_requests add column if not exists returned_at timestamptz`,
      ];
      for (const sql of statements) {
        // supabase.rpc requires a defined function; fallback: attempt and ignore errors
        try {
          await supabase.rpc("exec_sql", { sql });
        } catch {
          // exec_sql function may not exist — columns may already exist, that's fine
        }
      }
    };
    runMigration();
  }, []);

  // ── STEP 2: Fetch all requests (select * covers new columns) ─────
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

  // ── Realtime subscription: refetch all requests on any change ────
  useEffect(() => {
  const channel = supabase
    .channel('faculty-requests-rt')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'issue_requests' }, () => {
      queryClient.invalidateQueries({ queryKey: ['issue_requests', 'all'] });
    })
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}, [queryClient]);

  // ── Chart query: Inventory Movement ─────────────────────────────
  const movementDays = movementTab === "30D" ? 30 : movementTab === "90D" ? 90 : 365;

  const { data: movementData, isLoading: movementLoading } = useQuery<{ date: string; qty: number }[]>({
    queryKey: ["chart_movement", movementTab],
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - movementDays);
      const sinceISO = since.toISOString();

      // Primary: inventory_items created in the window
      const { data: invData, error: invError } = await supabase
        .from("inventory_items")
        .select("created_at, quantity")
        .gte("created_at", sinceISO)
        .order("created_at", { ascending: true });

      if (invError) throw invError;

      // Group by date
      const dayMap = new Map<string, number>();
      for (const row of (invData ?? [])) {
        const d = new Date(row.created_at);
        const key = fmtDay(d);
        dayMap.set(key, (dayMap.get(key) ?? 0) + (row.quantity ?? 0));
      }

      // If we have ≥ 3 data points from inventory_items, use them
      if (dayMap.size >= 3) {
        return Array.from(dayMap.entries()).map(([date, qty]) => ({ date, qty }));
      }

      // Fallback: issue_requests grouped by date (count of items issued per day)
      const { data: issueData, error: issueError } = await supabase
        .from("issue_requests")
        .select("created_at, quantity_requested")
        .gte("created_at", sinceISO)
        .order("created_at", { ascending: true });

      if (issueError) throw issueError;

      const issueMap = new Map<string, number>();
      for (const row of (issueData ?? [])) {
        const d = new Date(row.created_at);
        const key = fmtDay(d);
        issueMap.set(key, (issueMap.get(key) ?? 0) + ((row as any).quantity_requested ?? 1));
      }

      return Array.from(issueMap.entries()).map(([date, qty]) => ({ date, qty }));
    },
    staleTime: 60_000,
  });

  // ── Chart query: Issue Activity ──────────────────────────────────
  const { data: issueActivityData, isLoading: activityLoading } = useQuery<{ month: string; count: number; trend: number }[]>({
    queryKey: ["chart_issue_activity", invoiceTab],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("issue_requests")
        .select("created_at")
        .order("created_at", { ascending: true });

      if (error) throw error;
      const rows = (data ?? []) as { created_at: string }[];

      if (invoiceTab === "Monthly") {
        // Last 12 calendar months
        const countMap = new Map<string, number>();
        const now = new Date();
        for (let i = 11; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const key = `${MONTH_NAMES[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
          countMap.set(key, 0);
        }
        for (const row of rows) {
          const d = new Date(row.created_at);
          const key = `${MONTH_NAMES[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
          if (countMap.has(key)) countMap.set(key, (countMap.get(key) ?? 0) + 1);
        }
        const entries = Array.from(countMap.entries());
        const maxCount = Math.max(1, ...entries.map(([, v]) => v));
        return entries.map(([month, count]) => ({
          month,
          count,
          trend: parseFloat(((count / maxCount) * 10).toFixed(1)),
        }));
      } else {
        // Yearly
        const countMap = new Map<string, number>();
        for (const row of rows) {
          const yr = String(new Date(row.created_at).getFullYear());
          countMap.set(yr, (countMap.get(yr) ?? 0) + 1);
        }
        const entries = Array.from(countMap.entries()).sort(([a], [b]) => Number(a) - Number(b));
        const maxCount = Math.max(1, ...entries.map(([, v]) => v));
        return entries.map(([month, count]) => ({
          month,
          count,
          trend: parseFloat(((count / maxCount) * 10).toFixed(1)),
        }));
      }
    },
    staleTime: 60_000,
  });

  const pendingRequests = allRequests.filter((r) => r.status === "pending");

  const extendedItems = items as any[];
  const totalSKUs = extendedItems.length;
  const lowStockCount = extendedItems.filter((i) => i.quantity <= i.reorder_threshold).length;
  const totalValue = extendedItems.reduce((sum, i) => sum + (i.quantity * (i.unit_price || 0)), 0);
  const totalValueFormatted = totalValue >= 1000000
    ? `₹${(totalValue / 1000000).toFixed(2)}M`
    : `₹${(totalValue / 1000).toFixed(1)}K`;
  const fulfillmentRate = extendedItems.length > 0
    ? ((extendedItems.filter((i) => i.quantity > 0).length / extendedItems.length) * 100).toFixed(1)
    : "0.0";

  // ── Approve mutation ─────────────────────────────────────────────
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
      await supabase.from('audit_log').insert({
        actor_email: user?.email ?? null,
        action: `Approved request for ${approveTarget.item_name} by ${approveTarget.student_name}`,
        action_type: 'UPDATE',
      });
    },
    onSuccess: async () => {
      setApproveTarget(null);
      await queryClient.invalidateQueries({ queryKey: ["issue_requests", "all"] });
      await queryClient.refetchQueries({ queryKey: ["issue_requests", "all"] });
      queryClient.invalidateQueries({ queryKey: ["items"] });
      toast.success("Request approved");
    },
    onError: () => toast.error("Failed to approve request"),
  });

  // ── Reject mutation ──────────────────────────────────────────────
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
      await supabase.from('audit_log').insert({
        actor_email: user?.email ?? null,
        action: `Rejected request for ${rejectTarget.item_name} by ${rejectTarget.student_name}`,
        action_type: 'UPDATE',
      });
    },
    onSuccess: async () => {
      setRejectTarget(null);
      await queryClient.invalidateQueries({ queryKey: ["issue_requests", "all"] });
      await queryClient.refetchQueries({ queryKey: ["issue_requests", "all"] });
      toast.success("Request rejected");
    },
    onError: () => toast.error("Failed to reject request"),
  });

  // ── STEP 4: Physical status action handlers ──────────────────────

  /** CASE A — Mark Issued */
  async function handleMarkIssued(req: IssueRequest) {
    setLoadingRow(req.id);
    const { error } = await supabase
      .from("issue_requests")
      .update({ physical_status: "issued", issued_at: new Date().toISOString() })
      .eq("id", req.id);
    setLoadingRow(null);
    setConfirmOpen(null);
    if (error) {
      toast.error("Failed to mark item as issued");
      return;
    }
    toast.success("Item marked as issued");
    void supabase.from('audit_log').insert({
      actor_email: user?.email ?? null,
      action: `Marked ${req.item_name} as issued to ${req.student_name}`,
      action_type: 'UPDATE',
    });
    queryClient.invalidateQueries({ queryKey: ["issue_requests"] });
  }

  /** CASE B — Mark Consumed (consumable, no inventory restore) */
  async function handleMarkConsumed(req: IssueRequest) {
    setLoadingRow(req.id);
    const { error } = await supabase
      .from("issue_requests")
      .update({ physical_status: "consumed", returned_at: new Date().toISOString() })
      .eq("id", req.id);
    setLoadingRow(null);
    setConfirmOpen(null);
    if (error) {
      toast.error("Failed to mark item as consumed");
      return;
    }
    toast.success("Item marked as consumed");
    void supabase.from('audit_log').insert({
      actor_email: user?.email ?? null,
      action: `Marked ${req.item_name} as consumed by ${req.student_name}`,
      action_type: 'UPDATE',
    });
    queryClient.invalidateQueries({ queryKey: ["issue_requests"] });
  }

  /** CASE B — Mark Returned (returnable, increment inventory) */
  async function handleMarkReturned(req: IssueRequest) {
    setLoadingRow(req.id);

    // 1. Update issue_requests
    const { error: reqError } = await supabase
      .from("issue_requests")
      .update({ physical_status: "returned", returned_at: new Date().toISOString() })
      .eq("id", req.id);

    if (reqError) {
      setLoadingRow(null);
      setConfirmOpen(null);
      toast.error("Failed to mark item as returned");
      return;
    }

    // 2. Fetch current inventory
    const { data: invItem, error: fetchError } = await supabase
      .from("inventory_items")
      .select("quantity, reorder_threshold")
      .eq("id", req.item_id)
      .single();

    if (!fetchError && invItem) {
      const currentQty = invItem.quantity ?? 0;
      const newQty = currentQty + req.quantity_requested;
      const threshold = invItem.reorder_threshold ?? 0;
      const newStatus =
        newQty <= 0 ? "out_of_stock"
        : newQty <= threshold ? "low_stock"
        : "in_stock";

      await supabase
        .from("inventory_items")
        .update({ quantity: newQty, status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", req.item_id);
    }

    setLoadingRow(null);
    setConfirmOpen(null);
    toast.success("Item returned and inventory updated");
    void supabase.from('audit_log').insert({
      actor_email: user?.email ?? null,
      action: `Marked ${req.item_name} as returned by ${req.student_name}`,
      action_type: 'UPDATE',
    });
    queryClient.invalidateQueries({ queryKey: ["issue_requests"] });
    queryClient.invalidateQueries({ queryKey: ["items"] });
  }

  const filteredRequests = allRequests.filter((r) => {
    if (statusFilter === "All") return true;
    return r.status === statusFilter.toLowerCase();
  });

  const maxQty = movementData && movementData.length > 0
    ? Math.max(1, ...movementData.map((d) => d.qty)) * 1.2
    : 100;

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
                <p className="text-[10px] text-zinc-500">Items issued / stock added over time</p>
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
              {movementLoading ? (
                <div className="h-full flex flex-col gap-2 justify-end pb-2">
                  {[40, 55, 35, 70, 60, 80, 65].map((h, i) => (
                    <div
                      key={i}
                      className="w-full rounded animate-pulse bg-zinc-200 dark:bg-zinc-800"
                      style={{ height: `${h}%`, alignSelf: "flex-end" }}
                    />
                  ))}
                </div>
              ) : !movementData || movementData.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <span className="text-xs text-zinc-500">No data available yet</span>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={movementData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="facultyAreaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#71717a" }} axisLine={false} tickLine={false} />
                    <YAxis
                      tick={{ fontSize: 9, fill: "#71717a" }}
                      axisLine={false}
                      tickLine={false}
                      domain={[0, maxQty]}
                      tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)}
                    />
                    <Tooltip contentStyle={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "8px", fontSize: "11px", color: "#fff" }} />
                    <Area type="monotone" dataKey="qty" stroke="#8b5cf6" strokeWidth={2} fill="url(#facultyAreaGrad)" name="Quantity" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Issue Activity chart */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Issue Activity</h3>
                <p className="text-[10px] text-zinc-500">Requests per period</p>
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
              {activityLoading ? (
                <div className="h-full flex items-end gap-1 pb-2">
                  {[50, 70, 45, 80, 60, 90, 55, 75, 65, 85, 40, 70].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded animate-pulse bg-zinc-200 dark:bg-zinc-800"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
              ) : !issueActivityData || issueActivityData.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <span className="text-xs text-zinc-500">No data available yet</span>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={issueActivityData} margin={{ top: 8, right: 0, left: -20, bottom: 0 }}>
                    <XAxis dataKey="month" tick={{ fontSize: 9, fill: "#71717a" }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="left" tick={{ fontSize: 9, fill: "#71717a" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => String(v)} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9, fill: "#71717a" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}%`} width={30} />
                    <Tooltip contentStyle={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "8px", fontSize: "11px", color: "#fff" }} />
                    <Bar yAxisId="left" dataKey="count" fill="#3f3f46" radius={[3, 3, 0, 0]} name="Requests" />
                    <Line yAxisId="right" type="monotone" dataKey="trend" stroke="#8b5cf6" strokeWidth={2} dot={false} name="Trend %" />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
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
                          onClick={() => { setApproveTarget(req); setApprovalReason(APPROVAL_REASONS[0]); setReturnDeadline(tomorrowStr); }}
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
                  {["STUDENT", "ITEM", "QTY", "PURPOSE", "STATUS", "SUBMITTED", "RETURN BY", "PHYSICAL STATUS", "ACTION"].map((h) => (
                    <th key={h} className="pb-2 text-left text-[9px] font-semibold uppercase tracking-wide text-zinc-500 px-2 first:pl-0 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRequests.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-zinc-500 text-xs">No requests found.</td>
                  </tr>
                )}
                {filteredRequests.map((req) => {
                  const ps = effectivePhysicalStatus(req);
                  const consumable = isConsumable(req);
                  const isApproved = req.status === "approved";
                  const isRowLoading = loadingRow === req.id;
                  const isConfirmingRow = confirmOpen === req.id;

                  return (
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

                      {/* STEP 3 — Physical Status column */}
                      <td className="py-2.5 px-2">
                        <div className="flex flex-col gap-0.5">
                          <PhysicalStatusBadge req={req} />
                          {isApproved && (ps === "returned" || ps === "consumed") && req.returned_at && (
                            <span className="text-[9px] text-zinc-600 whitespace-nowrap">
                              on {new Date(req.returned_at).toLocaleDateString("en-GB")}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* STEP 4 — Action column */}
                      <td className="py-2.5 px-2">
                        {!isApproved ? (
                          <span className="text-zinc-600">—</span>
                        ) : ps === "pending_handover" ? (
                          <div className="relative inline-block">
                            <button
                              disabled={isRowLoading}
                              onClick={() => setConfirmOpen(isConfirmingRow ? null : req.id)}
                              className="px-2.5 py-1 bg-violet-700 hover:bg-violet-600 disabled:opacity-50 text-white text-[10px] font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                            >
                              Mark Issued
                            </button>
                            {isConfirmingRow && (
                              <ConfirmPopover
                                message="Confirm item physically handed to student?"
                                confirmLabel="Yes, Mark Issued"
                                confirmClassName="bg-violet-700 hover:bg-violet-600 text-white"
                                loading={isRowLoading}
                                onConfirm={() => handleMarkIssued(req)}
                                onCancel={() => setConfirmOpen(null)}
                              />
                            )}
                          </div>
                        ) : ps === "issued" ? (
                          consumable ? (
                            <div className="relative inline-block">
                              <button
                                disabled={isRowLoading}
                                onClick={() => setConfirmOpen(isConfirmingRow ? null : req.id)}
                                className="px-2.5 py-1 bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white text-[10px] font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                              >
                                Mark Consumed
                              </button>
                              {isConfirmingRow && (
                                <ConfirmPopover
                                  message="Mark this item as fully consumed? This cannot be undone."
                                  confirmLabel="Yes, Consumed"
                                  confirmClassName="bg-purple-700 hover:bg-purple-600 text-white"
                                  loading={isRowLoading}
                                  onConfirm={() => handleMarkConsumed(req)}
                                  onCancel={() => setConfirmOpen(null)}
                                />
                              )}
                            </div>
                          ) : (
                            <div className="relative inline-block">
                              <button
                                disabled={isRowLoading}
                                onClick={() => setConfirmOpen(isConfirmingRow ? null : req.id)}
                                className="px-2.5 py-1 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-[10px] font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                              >
                                Mark Returned
                              </button>
                              {isConfirmingRow && (
                                <ConfirmPopover
                                  message="Confirm item has been physically returned by student?"
                                  confirmLabel="Yes, Returned"
                                  confirmClassName="bg-green-700 hover:bg-green-600 text-white"
                                  loading={isRowLoading}
                                  onConfirm={() => handleMarkReturned(req)}
                                  onCancel={() => setConfirmOpen(null)}
                                />
                              )}
                            </div>
                          )
                        ) : (
                          /* returned or consumed — no button */
                          <span className="text-zinc-600">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
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
                  min={tomorrowStr}
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
