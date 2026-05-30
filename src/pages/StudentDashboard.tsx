import { useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "../components/layout/AppShell";
import { useItems } from "../hooks/useItems";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { supabase } from "../lib/supabaseClient";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  X, BookOpen, ShoppingCart, Package,
  Clock, CheckCircle, RotateCcw, Search,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

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
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

// ─── Badges ───────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  if (status === "pending")
    return (
      <span className="inline-flex items-center rounded-full border border-amber-400/20 bg-amber-400/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-400">
        Pending
      </span>
    );
  if (status === "approved")
    return (
      <span className="inline-flex items-center rounded-full border border-green-400/20 bg-green-400/10 px-2.5 py-0.5 text-[11px] font-semibold text-green-400">
        Approved
      </span>
    );
  if (status === "rejected")
    return (
      <span className="inline-flex items-center rounded-full border border-red-400/20 bg-red-400/10 px-2.5 py-0.5 text-[11px] font-semibold text-red-400">
        Rejected
      </span>
    );
  return null;
}

function AvailBadge({ qty, threshold }: { qty: number; threshold: number }) {
  if (qty === 0)
    return (
      <span className="inline-flex items-center rounded-full border border-red-400/20 bg-red-400/10 px-2.5 py-0.5 text-[11px] font-semibold text-red-400">
        Unavailable
      </span>
    );
  if (qty <= threshold)
    return (
      <span className="inline-flex items-center rounded-full border border-amber-400/20 bg-amber-400/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-400">
        Low Stock
      </span>
    );
  return (
    <span className="inline-flex items-center rounded-full border border-green-400/20 bg-green-400/10 px-2.5 py-0.5 text-[11px] font-semibold text-green-400">
      Available
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function StudentDashboard() {
  const { user } = useAuth();
  const { data: items = [] } = useItems();
  const { addToCart, cartCount } = useCart();

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [modalItem, setModalItem] = useState<any>(null);
  const [requestQty, setRequestQty] = useState<number | "">(1);
  const [purpose, setPurpose] = useState("");

  const studentEmail = user?.email ?? "";

  // Fetch student's own requests
  const { data: myRequests = [] } = useQuery<IssueRequest[]>({
    queryKey: ["issue_requests", "mine", studentEmail],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("issue_requests")
        .select("*")
        .eq("student_email", studentEmail)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!studentEmail,
  });

  const pendingCount  = myRequests.filter((r) => r.status === "pending").length;
  const approvedCount = myRequests.filter((r) => r.status === "approved").length;
  const toReturnCount = myRequests.filter(
    (r) => r.status === "approved" && r.return_deadline
  ).length;

  // Derive real categories from items data
  const uniqueCategories = Array.from(
    new Set((items as any[]).map((i: any) => i.category?.name).filter(Boolean))
  ) as string[];
  const CATEGORIES = ["All", ...uniqueCategories];

  const filtered = (items as any[]).filter((item) => {
    const matchSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.sku.toLowerCase().includes(search.toLowerCase());
    const matchCat =
      categoryFilter === "All" ||
      (item.category?.name ?? "").includes(categoryFilter);
    return matchSearch && matchCat;
  });

  const totalAvailable = (items as any[]).filter((i) => i.quantity > 0).length;

  const statCards = [
    {
      label: "Items Available",
      value: totalAvailable,
      icon: Package,
      numCls:  "text-violet-400",
      dotCls:  "bg-violet-400",
      bgCls:   "bg-violet-500/10",
      iconCls: "text-violet-400",
    },
    {
      label: "Pending Requests",
      value: pendingCount,
      icon: Clock,
      numCls:  "text-amber-400",
      dotCls:  "bg-amber-400",
      bgCls:   "bg-amber-500/10",
      iconCls: "text-amber-400",
    },
    {
      label: "Approved Requests",
      value: approvedCount,
      icon: CheckCircle,
      numCls:  "text-green-400",
      dotCls:  "bg-green-400",
      bgCls:   "bg-green-500/10",
      iconCls: "text-green-400",
    },
    {
      label: "Items to Return",
      value: toReturnCount,
      icon: RotateCcw,
      numCls:  "text-red-400",
      dotCls:  "bg-red-400",
      bgCls:   "bg-red-500/10",
      iconCls: "text-red-400",
    },
  ] as const;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <AppShell title="IdeaLab — Student Portal">
      <div className="mx-auto max-w-[1100px] px-6 pb-24 pt-6">

        {/* ── Header ── */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/[0.12] px-3 py-1.5 text-xs font-semibold text-violet-400">
              <BookOpen className="h-3.5 w-3.5" />
              OPJU IdeaLab
            </div>
            <h1 className="text-[28px] font-extrabold tracking-[-0.02em] text-white">
              Student Portal
            </h1>
            <p className="mt-1 text-sm text-[#9a9aa6]">
              Browse and request components from the lab inventory
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              to="/student/requests"
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-[13px] font-semibold text-[#9a9aa6] transition hover:bg-white/[0.07] hover:text-white"
            >
              My Requests →
            </Link>
            <Link
              to="/cart"
              className="relative inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-gradient-to-b from-violet-500 to-violet-700 px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_1px_0_rgba(255,255,255,0.14)_inset,0_8px_20px_-10px_rgba(124,58,237,0.6)] transition-transform hover:-translate-y-px active:translate-y-px"
            >
              <ShoppingCart className="h-3.5 w-3.5" />
              Cart
              {cartCount > 0 && (
                <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[9px] font-bold text-violet-700">
                  {cartCount}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* ── Stat cards ── */}
        <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
          {statCards.map(({ label, value, icon: Icon, numCls, dotCls, bgCls, iconCls }) => (
            <div key={label} className="rounded-[13px] border border-white/10 bg-[#111114] px-4 py-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-[#6e6e78]">
                  {label}
                </span>
                <div className={`rounded-lg p-1.5 ${bgCls}`}>
                  <Icon className={`h-3.5 w-3.5 ${iconCls}`} />
                </div>
              </div>
              <div className={`text-[26px] font-extrabold tabular-nums leading-none ${numCls}`}>
                {value}
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-[11px] text-[#6e6e78]">
                <span className={`h-[7px] w-[7px] rounded-full ${dotCls}`} />
                {label}
              </div>
            </div>
          ))}
        </div>

        {/* ── Browse Inventory ── */}
        <div className="mb-6 rounded-2xl border border-white/10 bg-[#111114]">
          {/* Section header */}
          <div className="flex items-center justify-between gap-4 border-b border-white/[0.08] px-5 py-4">
            <h2 className="text-sm font-bold text-white">Browse Inventory</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#6e6e78]" />
              <input
                type="text"
                placeholder="Search items or SKU…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-52 rounded-xl border border-white/10 bg-[#0a0a0b] py-2 pl-9 pr-3 text-[13px] text-white placeholder-[#6e6e78] outline-none transition focus:border-violet-500/60"
              />
            </div>
          </div>

          {/* Category filter tabs */}
          <div className="flex flex-wrap gap-1.5 px-5 py-3 border-b border-white/[0.06]">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-[12px] font-medium transition-all ${
                  categoryFilter === cat
                    ? "border-transparent bg-[#7c3aed] text-white"
                    : "border-white/10 text-[#9a9aa6] hover:border-white/20 hover:text-white"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Table */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <Package className="h-8 w-8 text-[#4b4b57]" />
              <p className="text-sm text-[#6e6e78]">No items found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    {["Item / SKU", "Category", "Available", "Status", "Action"].map((h) => (
                      <th
                        key={h}
                        className="px-5 py-3.5 text-[10px] font-semibold uppercase tracking-widest text-[#6e6e78]"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {filtered.map((item: any) => {
                    const qty       = item.quantity;
                    const threshold = item.reorder_threshold ?? 0;
                    const unavail   = qty === 0;
                    const catName   = item.category?.name ?? "Uncategorized";

                    return (
                      <tr key={item.id} className="transition-colors hover:bg-white/[0.02]">
                        {/* Item / SKU */}
                        <td className="px-5 py-3.5">
                          <div className="font-semibold text-[#f4f4f6]">{item.name}</div>
                          <div className="mt-0.5 font-mono text-[10.5px] text-[#6e6e78]">{item.sku}</div>
                        </td>

                        {/* Category */}
                        <td className="px-5 py-3.5">
                          <span className="inline-flex items-center rounded-full border border-violet-400/20 bg-violet-400/10 px-2.5 py-0.5 text-[11px] font-semibold text-violet-400">
                            {catName}
                          </span>
                        </td>

                        {/* Available qty + bar */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <span className="w-7 shrink-0 text-right text-[12px] font-bold tabular-nums text-[#f4f4f6]">
                              {qty}
                            </span>
                            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/[0.08]">
                              <div
                                className={`h-full rounded-full ${
                                  qty === 0
                                    ? "bg-red-500"
                                    : qty <= threshold
                                    ? "bg-yellow-400"
                                    : "bg-green-400"
                                }`}
                                style={{
                                  width: qty === 0
                                    ? "0%"
                                    : `${Math.min(100, Math.round((qty / Math.max(qty, threshold * 2, 20)) * 100))}%`,
                                }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-5 py-3.5">
                          <AvailBadge qty={qty} threshold={threshold} />
                        </td>

                        {/* Action */}
                        <td className="px-5 py-3.5">
                          <button
                            disabled={unavail}
                            onClick={() => {
                              setModalItem(item);
                              setRequestQty(1);
                              setPurpose("");
                            }}
                            className={`inline-flex cursor-pointer items-center gap-1.5 rounded-[9px] px-3 py-1.5 text-[12px] font-semibold transition ${
                              unavail
                                ? "cursor-not-allowed border border-white/[0.06] bg-white/[0.03] text-[#4b4b57] opacity-50"
                                : "border border-violet-500/40 bg-violet-500/[0.1] text-violet-400 hover:bg-violet-500/[0.2]"
                            }`}
                          >
                            Add to Cart
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── My Requests ── */}
        <div className="rounded-2xl border border-white/10 bg-[#111114]">
          <div className="flex items-center gap-3 border-b border-white/[0.08] px-5 py-4">
            <h2 className="text-sm font-bold text-white">My Requests</h2>
            {myRequests.length > 0 && (
              <span className="rounded-full border border-violet-400/20 bg-violet-400/10 px-2.5 py-0.5 text-[10px] font-semibold text-violet-400">
                {myRequests.length}
              </span>
            )}
          </div>

          {myRequests.length === 0 ? (
            <div className="py-14 text-center text-sm text-[#6e6e78]">
              No requests yet. Browse inventory above and add items to cart.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    {["Item", "Qty", "Purpose", "Status", "Submitted", "Return By"].map((h) => (
                      <th
                        key={h}
                        className="px-5 py-3.5 text-[10px] font-semibold uppercase tracking-widest text-[#6e6e78]"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {myRequests.map((req) => (
                    <tr key={req.id} className="transition-colors hover:bg-white/[0.02]">
                      <td className="px-5 py-3.5 font-semibold text-[#f4f4f6]">
                        {req.item_name}
                      </td>
                      <td className="px-5 py-3.5 tabular-nums text-[#9a9aa6]">
                        {req.quantity_requested}
                      </td>
                      <td className="max-w-[200px] truncate px-5 py-3.5 text-[#9a9aa6]">
                        {req.purpose || "—"}
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={req.status} />
                      </td>
                      <td className="px-5 py-3.5 text-[#6e6e78]">
                        {fmtDate(req.created_at)}
                      </td>
                      <td className="px-5 py-3.5 text-[#6e6e78]">
                        {req.return_deadline ? fmtDate(req.return_deadline) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* ── Add to Cart Modal ── */}
      {modalItem && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-[rgba(5,5,7,0.75)] p-6 backdrop-blur-[6px]"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setModalItem(null); }}
        >
          <div className="w-full max-w-[440px] rounded-[18px] border border-white/10 bg-[#16161b] p-6 shadow-[0_40px_90px_-30px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.04)]">
            {/* Modal header */}
            <div className="mb-1 flex items-center justify-between">
              <h3 className="text-[17px] font-bold text-white">Add to Cart</h3>
              <button
                onClick={() => setModalItem(null)}
                className="grid h-8 w-8 cursor-pointer place-items-center rounded-[9px] border border-white/10 bg-white/[0.04] text-[#9a9aa6] transition hover:bg-white/[0.08] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mb-5 text-[13px] text-[#9a9aa6]">{modalItem.name}</p>

            <div className="space-y-4">
              {/* Quantity */}
              <div>
                <label className="mb-1.5 block text-[12.5px] font-semibold text-[#f4f4f6]">
                  Quantity{" "}
                  <span className="font-normal text-[#6e6e78]">(max {modalItem.quantity})</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={modalItem.quantity}
                  value={requestQty}
                  onChange={(e) => {
                    if (e.target.value === "") {
                      setRequestQty("");
                    } else {
                      setRequestQty(Number(e.target.value));
                    }
                  }}
                  onBlur={() => {
                    let val = Number(requestQty);
                    if (isNaN(val) || val < 1) val = 1;
                    if (val > modalItem.quantity) val = modalItem.quantity;
                    setRequestQty(val);
                  }}
                  className="w-full rounded-[11px] border border-white/10 bg-[#0a0a0b] px-3 py-[11px] text-[14px] text-white outline-none transition focus:border-violet-500 focus:shadow-[0_0_0_3px_rgba(124,58,237,0.16)]"
                />
              </div>

              {/* Purpose */}
              <div>
                <label className="mb-1.5 block text-[12.5px] font-semibold text-[#f4f4f6]">
                  Purpose{" "}
                  <span className="font-normal text-[#6e6e78]">(optional — set in cart)</span>
                </label>
                <textarea
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="Describe your project or purpose for this item…"
                  rows={3}
                  className="w-full resize-none rounded-[11px] border border-white/10 bg-[#0a0a0b] px-3 py-[11px] text-[14px] leading-relaxed text-white placeholder-[#6e6e78] outline-none transition focus:border-violet-500 focus:shadow-[0_0_0_3px_rgba(124,58,237,0.16)]"
                />
              </div>

              {/* Submit */}
              <button
                onClick={() => {
                  addToCart({
                    item_id: modalItem.id,
                    item_name: modalItem.name,
                    sku: modalItem.sku ?? "",
                    quantity_requested: Math.min(
                      modalItem.quantity,
                      Math.max(1, Number(requestQty) || 1)
                    ),
                    available_quantity: modalItem.quantity,
                    purpose,
                  });
                  toast.success(`"${modalItem.name}" added to cart. Go to Cart to submit.`);
                  setModalItem(null);
                  setPurpose("");
                  setRequestQty(1);
                }}
                className="w-full cursor-pointer rounded-xl bg-gradient-to-b from-violet-500 to-violet-700 py-3 text-[14px] font-semibold text-white shadow-[0_1px_0_rgba(255,255,255,0.14)_inset] transition-opacity hover:opacity-90"
              >
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
