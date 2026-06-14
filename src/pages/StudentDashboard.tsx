import { useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "../components/layout/AppShell";
import { useItems } from "../hooks/useItems";
import { useServiceRequests } from "../hooks/useServiceRequests";
import { useConsumables } from "../hooks/useConsumables";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { supabase } from "../lib/supabaseClient";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Consumable } from "../types";
import {
  X, BookOpen, ShoppingCart, Package,
  Clock, CheckCircle, RotateCcw, Search,
  Wrench, FlaskConical, ChevronDown,
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

  // Service request state
  const { machines, submitServiceRequest, isSubmitting } = useServiceRequests();
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [serviceMachineId, setServiceMachineId] = useState("");
  const [serviceMaterial, setServiceMaterial] = useState("PLA");
  const [serviceDimL, setServiceDimL] = useState<number | "">("");
  const [serviceDimW, setServiceDimW] = useState<number | "">("");
  const [serviceDimH, setServiceDimH] = useState<number | "">("");
  const [serviceInfill, setServiceInfill] = useState(20);
  const [serviceCopies, setServiceCopies] = useState<number | "">(1);
  const [servicePurpose, setServicePurpose] = useState("");
  const [serviceStlFile, setServiceStlFile] = useState<File | null>(null);

  // Consumables state
  const { consumables } = useConsumables();
  const [consumableModalItem, setConsumableModalItem] = useState<Consumable | null>(null);
  const [consumableQty, setConsumableQty] = useState<number | "">(1);
  const [consumablePurpose, setConsumablePurpose] = useState("");
  const [isSubmittingConsumable, setIsSubmittingConsumable] = useState(false);

  const studentEmail = user?.email ?? "";
  const studentName = (user?.user_metadata?.full_name as string | undefined) ?? studentEmail;

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
    staleTime: 0,
    refetchOnMount: "always",
    refetchInterval: 30000,
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
      (item.name ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (item.sku ?? '').toLowerCase().includes(search.toLowerCase());
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
      numCls:  "text-orange-300",
      dotCls:  "bg-orange-300",
      bgCls:   "bg-orange-400/10",
      iconCls: "text-orange-300",
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

  // ── Service request helpers ──────────────────────────────────────────────

  function resetServiceForm() {
    setServiceMachineId("");
    setServiceMaterial("PLA");
    setServiceDimL("");
    setServiceDimW("");
    setServiceDimH("");
    setServiceInfill(20);
    setServiceCopies(1);
    setServicePurpose("");
    setServiceStlFile(null);
  }

  const selectedMachine = machines.find((m) => m.id === serviceMachineId);
  const isPrinter = selectedMachine?.type === "3d_printer";

  async function handleServiceSubmit() {
    if (!selectedMachine) {
      toast.error("Please select a machine.");
      return;
    }
    if (!servicePurpose.trim()) {
      toast.error("Please describe the purpose of your request.");
      return;
    }
    try {
      await submitServiceRequest({
        student_id: user?.id ?? null,
        student_email: studentEmail,
        student_name: studentName,
        machine_id: selectedMachine.id,
        machine_name: selectedMachine.name,
        material_type: isPrinter ? serviceMaterial : null,
        dim_l: serviceDimL === "" ? null : Number(serviceDimL),
        dim_w: serviceDimW === "" ? null : Number(serviceDimW),
        dim_h: serviceDimH === "" ? null : Number(serviceDimH),
        infill_percent: isPrinter ? serviceInfill : null,
        copies: Math.max(1, Number(serviceCopies) || 1),
        purpose: servicePurpose.trim(),
        stlFile: serviceStlFile,
      });
      toast.success("Service request submitted. Admin will assign your slot.");
      setShowServiceModal(false);
      resetServiceForm();
    } catch {
      toast.error("Failed to submit service request. Please try again.");
    }
  }

  // ── Consumable request helper ────────────────────────────────────────────

  async function handleConsumableSubmit() {
    if (!consumableModalItem) return;
    const qty = Math.max(1, Number(consumableQty) || 1);
    setIsSubmittingConsumable(true);

    const baseRow = {
      item_id: consumableModalItem.id,
      item_name: consumableModalItem.name,
      quantity_requested: qty,
      purpose: consumablePurpose.trim(),
      status: "pending",
      student_id: user?.id,
      student_email: studentEmail,
      student_name: studentName,
    };

    let { error } = await supabase
      .from("issue_requests")
      .insert({ ...baseRow, item_type: "consumable" });

    if (error?.code === "42703") {
      // item_type column doesn't exist yet — retry without it
      ({ error } = await supabase.from("issue_requests").insert(baseRow));
    }

    setIsSubmittingConsumable(false);

    if (error) {
      toast.error("Failed to submit request. Please try again.");
      return;
    }

    toast.success(`Request for "${consumableModalItem.name}" submitted.`);
    setConsumableModalItem(null);
    setConsumableQty(1);
    setConsumablePurpose("");
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <AppShell title="IdeaLab — Student Portal">
      <div className="mx-auto max-w-[1100px] px-6 pb-24 pt-6">

        {/* ── Header ── */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-orange-400/30 bg-orange-400/[0.12] px-3 py-1.5 text-xs font-semibold text-orange-300">
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
            <button
              onClick={() => setShowServiceModal(true)}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-[13px] font-semibold text-[#9a9aa6] transition hover:bg-white/[0.07] hover:text-white"
            >
              <Wrench className="h-3.5 w-3.5" />
              Request a Service
            </button>
            <Link
              to="/cart"
              className="relative inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-gradient-to-b from-orange-400 to-orange-500 px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_1px_0_rgba(255,255,255,0.14)_inset,0_8px_20px_-10px_rgba(124,58,237,0.6)] transition-transform hover:-translate-y-px active:translate-y-px"
            >
              <ShoppingCart className="h-3.5 w-3.5" />
              Cart
              {cartCount > 0 && (
                <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[9px] font-bold text-orange-500">
                  {cartCount}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* ── Stat cards ── */}
        <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
          {statCards.map(({ label, value, icon: Icon, numCls, dotCls, bgCls, iconCls }) => (
            <div key={label} className="rounded-[13px] border border-white/10 bg-[#1a1108] px-4 py-4">
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
        <div className="mb-6 rounded-2xl border border-white/10 bg-[#1a1108]">
          {/* Section header */}
          <div className="flex items-center justify-between gap-4 border-b border-white/[0.08] px-5 py-4">
            <h2 className="text-sm font-bold text-white">Browse Inventory</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400 dark:text-zinc-500" />
              <input
                type="text"
                placeholder="Search items or SKU…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-52 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 py-2 pl-9 pr-3 text-[13px] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-500 outline-none transition focus:border-orange-400/60"
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
                    ? "border-transparent bg-[#f97316] text-white"
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
                          <div className="font-semibold text-gray-900 dark:text-white">{item.name}</div>
                          <div className="mt-0.5 font-mono text-[10.5px] text-gray-500 dark:text-zinc-400">{item.sku}</div>
                        </td>

                        {/* Category */}
                        <td className="px-5 py-3.5">
                          <span className="inline-flex items-center rounded-full border border-orange-300/20 bg-orange-300/10 px-2.5 py-0.5 text-[11px] font-semibold text-orange-300">
                            {catName}
                          </span>
                        </td>

                        {/* Available qty + bar */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <span className="w-7 shrink-0 text-right text-[12px] font-bold tabular-nums text-gray-900 dark:text-white">
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
                                : "border border-orange-400/40 bg-orange-400/[0.1] text-orange-300 hover:bg-orange-400/[0.2]"
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

        {/* ── Consumables ── */}
        <div className="mb-6 rounded-2xl border border-white/10 bg-[#1a1108]">
          {/* Section header */}
          <div className="flex items-center justify-between gap-4 border-b border-white/[0.08] px-5 py-4">
            <h2 className="text-sm font-bold text-white">Consumables</h2>
          </div>

          {/* Table */}
          {consumables.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <FlaskConical className="h-8 w-8 text-[#4b4b57]" />
              <p className="text-sm text-[#6e6e78]">No consumables available.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    {["Item", "Category", "Quantity", "Status", "Action"].map((h) => (
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
                  {consumables.map((c) => {
                    const qty       = c.quantity;
                    const threshold = c.reorder_threshold ?? 0;
                    const unavail   = qty === 0;
                    const catName   = c.category?.name ?? "Uncategorized";

                    return (
                      <tr key={c.id} className="transition-colors hover:bg-white/[0.02]">
                        {/* Name */}
                        <td className="px-5 py-3.5">
                          <div className="font-semibold text-gray-900 dark:text-white">{c.name}</div>
                        </td>

                        {/* Category */}
                        <td className="px-5 py-3.5">
                          <span className="inline-flex items-center rounded-full border border-orange-300/20 bg-orange-300/10 px-2.5 py-0.5 text-[11px] font-semibold text-orange-300">
                            {catName}
                          </span>
                        </td>

                        {/* Quantity + unit */}
                        <td className="px-5 py-3.5">
                          <span className="text-[12px] font-bold tabular-nums text-gray-900 dark:text-white">
                            {qty}{" "}
                            <span className="font-normal text-gray-500 dark:text-zinc-400">{c.unit}</span>
                          </span>
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
                              setConsumableModalItem(c);
                              setConsumableQty(1);
                              setConsumablePurpose("");
                            }}
                            className={`inline-flex cursor-pointer items-center gap-1.5 rounded-[9px] px-3 py-1.5 text-[12px] font-semibold transition ${
                              unavail
                                ? "cursor-not-allowed border border-white/[0.06] bg-white/[0.03] text-[#4b4b57] opacity-50"
                                : "border border-orange-400/40 bg-orange-400/[0.1] text-orange-300 hover:bg-orange-400/[0.2]"
                            }`}
                          >
                            Request
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

      </div>

      {/* ── Add to Cart Modal ── */}
      {modalItem && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-[rgba(5,5,7,0.75)] p-6 backdrop-blur-[6px]"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setModalItem(null); }}
        >
          <div className="w-full max-w-[440px] rounded-[18px] border border-gray-200 dark:border-white/10 bg-white dark:bg-[#16161b] p-6 shadow-xl dark:shadow-[0_40px_90px_-30px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.04)]">
            {/* Modal header */}
            <div className="mb-1 flex items-center justify-between">
              <h3 className="text-[17px] font-bold text-gray-900 dark:text-white">Add to Cart</h3>
              <button
                onClick={() => setModalItem(null)}
                className="grid h-8 w-8 cursor-pointer place-items-center rounded-[9px] border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.04] text-gray-500 dark:text-[#9a9aa6] transition hover:bg-gray-100 dark:hover:bg-white/[0.08] hover:text-gray-900 dark:hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mb-5 text-[13px] text-gray-600 dark:text-[#9a9aa6]">{modalItem.name}</p>

            <div className="space-y-4">
              {/* Quantity */}
              <div>
                <label className="mb-1.5 block text-[12.5px] font-semibold text-gray-900 dark:text-[#f4f4f6]">
                  Quantity{" "}
                  <span className="font-normal text-gray-500 dark:text-[#6e6e78]">(max {modalItem.quantity})</span>
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
                  onKeyDown={(e) => { if (e.key === '-' || e.key === 'e') e.preventDefault() }}
                  onBlur={() => {
                    if (requestQty === "" || requestQty === undefined) setRequestQty(1);
                  }}
                  className="w-full rounded-[11px] border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0d0a08] px-3 py-[11px] text-[14px] text-gray-900 dark:text-white outline-none transition focus:border-orange-400 focus:shadow-[0_0_0_3px_rgba(124,58,237,0.16)]"
                />
              </div>

              {/* Purpose */}
              <div>
                <label className="mb-1.5 block text-[12.5px] font-semibold text-gray-900 dark:text-[#f4f4f6]">
                  Purpose{" "}
                  <span className="font-normal text-gray-500 dark:text-[#6e6e78]">(optional — set in cart)</span>
                </label>
                <textarea
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="Describe your project or purpose for this item…"
                  rows={3}
                  className="w-full resize-none rounded-[11px] border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0d0a08] px-3 py-[11px] text-[14px] leading-relaxed text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#6e6e78] outline-none transition focus:border-orange-400 focus:shadow-[0_0_0_3px_rgba(124,58,237,0.16)]"
                />
              </div>

              {/* Submit */}
              <button
                onClick={() => {
                  const qty = parseInt(String(requestQty), 10);
                  if (isNaN(qty) || qty < 1 || qty === 0) {
                    toast.error("Quantity must be at least 1");
                    return;
                  }
                  if (qty > modalItem.quantity) {
                    toast.error("Quantity exceeds available stock");
                    return;
                  }
                  addToCart({
                    item_id: modalItem.id,
                    item_name: modalItem.name,
                    sku: modalItem.sku ?? "",
                    quantity_requested: Math.max(1, Math.floor(Number(requestQty))),
                    available_quantity: modalItem.quantity,
                    purpose,
                  });
                  toast.success(`"${modalItem.name}" added to cart. Go to Cart to submit.`);
                  setModalItem(null);
                  setPurpose("");
                  setRequestQty(1);
                }}
                className="w-full cursor-pointer rounded-xl bg-gradient-to-b from-orange-400 to-orange-500 py-3 text-[14px] font-semibold text-white shadow-[0_1px_0_rgba(255,255,255,0.14)_inset] transition-opacity hover:opacity-90"
              >
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Request a Service Modal ── */}
      {showServiceModal && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-[rgba(5,5,7,0.75)] p-6 backdrop-blur-[6px]"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !isSubmitting) setShowServiceModal(false);
          }}
        >
          <div className="max-h-[90vh] w-full max-w-[520px] overflow-y-auto rounded-[18px] border border-gray-200 dark:border-white/10 bg-white dark:bg-[#16161b] p-6 shadow-xl dark:shadow-[0_40px_90px_-30px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.04)]">
            {/* Modal header */}
            <div className="mb-1 flex items-center justify-between">
              <h3 className="text-[17px] font-bold text-gray-900 dark:text-white">Request a Service</h3>
              <button
                onClick={() => setShowServiceModal(false)}
                disabled={isSubmitting}
                className="grid h-8 w-8 cursor-pointer place-items-center rounded-[9px] border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.04] text-gray-500 dark:text-[#9a9aa6] transition hover:bg-gray-100 dark:hover:bg-white/[0.08] hover:text-gray-900 dark:hover:text-white disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mb-5 text-[13px] text-gray-600 dark:text-[#9a9aa6]">
              Submit a fabrication or lab service request — an admin will review and assign a slot.
            </p>

            <div className="space-y-4">
              {/* Machine selector */}
              <div>
                <label className="mb-1.5 block text-[12.5px] font-semibold text-gray-900 dark:text-[#f4f4f6]">
                  Machine
                </label>
                <div className="relative">
                  <select
                    value={serviceMachineId}
                    onChange={(e) => setServiceMachineId(e.target.value)}
                    className="w-full appearance-none rounded-[11px] border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0d0a08] px-3 py-[11px] pr-9 text-[14px] text-gray-900 dark:text-white outline-none transition focus:border-orange-400 focus:shadow-[0_0_0_3px_rgba(124,58,237,0.16)]"
                  >
                    <option value="">Select a machine…</option>
                    {machines.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-[#6e6e78]" />
                </div>
              </div>

              {/* Material type — 3D printers only */}
              {isPrinter && (
                <div>
                  <label className="mb-1.5 block text-[12.5px] font-semibold text-gray-900 dark:text-[#f4f4f6]">
                    Material Type
                  </label>
                  <div className="relative">
                    <select
                      value={serviceMaterial}
                      onChange={(e) => setServiceMaterial(e.target.value)}
                      className="w-full appearance-none rounded-[11px] border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0d0a08] px-3 py-[11px] pr-9 text-[14px] text-gray-900 dark:text-white outline-none transition focus:border-orange-400 focus:shadow-[0_0_0_3px_rgba(124,58,237,0.16)]"
                    >
                      {["PLA", "ABS", "PETG", "Resin"].map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-[#6e6e78]" />
                  </div>
                </div>
              )}

              {/* Dimensions */}
              <div>
                <label className="mb-1.5 block text-[12.5px] font-semibold text-gray-900 dark:text-[#f4f4f6]">
                  Dimensions (mm){" "}
                  <span className="font-normal text-gray-500 dark:text-[#6e6e78]">— L × W × H</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="number"
                    min={0}
                    placeholder="L"
                    value={serviceDimL}
                    onChange={(e) => setServiceDimL(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full rounded-[11px] border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0d0a08] px-3 py-[11px] text-[14px] text-gray-900 dark:text-white outline-none transition focus:border-orange-400 focus:shadow-[0_0_0_3px_rgba(124,58,237,0.16)]"
                  />
                  <input
                    type="number"
                    min={0}
                    placeholder="W"
                    value={serviceDimW}
                    onChange={(e) => setServiceDimW(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full rounded-[11px] border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0d0a08] px-3 py-[11px] text-[14px] text-gray-900 dark:text-white outline-none transition focus:border-orange-400 focus:shadow-[0_0_0_3px_rgba(124,58,237,0.16)]"
                  />
                  <input
                    type="number"
                    min={0}
                    placeholder="H"
                    value={serviceDimH}
                    onChange={(e) => setServiceDimH(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full rounded-[11px] border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0d0a08] px-3 py-[11px] text-[14px] text-gray-900 dark:text-white outline-none transition focus:border-orange-400 focus:shadow-[0_0_0_3px_rgba(124,58,237,0.16)]"
                  />
                </div>
              </div>

              {/* Infill % — 3D printers only */}
              {isPrinter && (
                <div>
                  <label className="mb-1.5 block text-[12.5px] font-semibold text-gray-900 dark:text-[#f4f4f6]">
                    Infill %
                  </label>
                  <div className="relative">
                    <select
                      value={serviceInfill}
                      onChange={(e) => setServiceInfill(Number(e.target.value))}
                      className="w-full appearance-none rounded-[11px] border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0d0a08] px-3 py-[11px] pr-9 text-[14px] text-gray-900 dark:text-white outline-none transition focus:border-orange-400 focus:shadow-[0_0_0_3px_rgba(124,58,237,0.16)]"
                    >
                      {[10, 20, 50, 100].map((v) => (
                        <option key={v} value={v}>{v}%</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-[#6e6e78]" />
                  </div>
                </div>
              )}

              {/* Number of copies */}
              <div>
                <label className="mb-1.5 block text-[12.5px] font-semibold text-gray-900 dark:text-[#f4f4f6]">
                  Number of Copies
                </label>
                <input
                  type="number"
                  min={1}
                  value={serviceCopies}
                  onChange={(e) => setServiceCopies(e.target.value === "" ? "" : Number(e.target.value))}
                  onBlur={() => {
                    let val = Number(serviceCopies);
                    if (isNaN(val) || val < 1) val = 1;
                    setServiceCopies(val);
                  }}
                  className="w-full rounded-[11px] border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0d0a08] px-3 py-[11px] text-[14px] text-gray-900 dark:text-white outline-none transition focus:border-orange-400 focus:shadow-[0_0_0_3px_rgba(124,58,237,0.16)]"
                />
              </div>

              {/* Purpose */}
              <div>
                <label className="mb-1.5 block text-[12.5px] font-semibold text-gray-900 dark:text-[#f4f4f6]">
                  Purpose <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={servicePurpose}
                  onChange={(e) => setServicePurpose(e.target.value)}
                  placeholder="Describe your project or what you need this service for…"
                  rows={3}
                  className="w-full resize-none rounded-[11px] border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0d0a08] px-3 py-[11px] text-[14px] leading-relaxed text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#6e6e78] outline-none transition focus:border-orange-400 focus:shadow-[0_0_0_3px_rgba(124,58,237,0.16)]"
                />
              </div>

              {/* STL upload */}
              <div>
                <label className="mb-1.5 block text-[12.5px] font-semibold text-gray-900 dark:text-[#f4f4f6]">
                  STL File <span className="font-normal text-gray-500 dark:text-[#6e6e78]">(optional)</span>
                </label>
                <input
                  type="file"
                  accept=".stl"
                  onChange={(e) => setServiceStlFile(e.target.files?.[0] ?? null)}
                  className="w-full cursor-pointer rounded-[11px] border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0d0a08] text-[13px] text-gray-500 dark:text-[#9a9aa6] outline-none transition file:my-1.5 file:ml-1 file:cursor-pointer file:rounded-[8px] file:border-0 file:bg-orange-400/20 file:px-3 file:py-2 file:text-[12px] file:font-semibold file:text-orange-300 hover:file:bg-orange-400/30"
                />
              </div>

              {/* Submit */}
              <button
                onClick={handleServiceSubmit}
                disabled={isSubmitting}
                className="w-full cursor-pointer rounded-xl bg-gradient-to-b from-orange-400 to-orange-500 py-3 text-[14px] font-semibold text-white shadow-[0_1px_0_rgba(255,255,255,0.14)_inset] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? "Submitting…" : "Submit Request"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Request Consumable Modal ── */}
      {consumableModalItem && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-[rgba(5,5,7,0.75)] p-6 backdrop-blur-[6px]"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setConsumableModalItem(null); }}
        >
          <div className="w-full max-w-[440px] rounded-[18px] border border-gray-200 dark:border-white/10 bg-white dark:bg-[#16161b] p-6 shadow-xl dark:shadow-[0_40px_90px_-30px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.04)]">
            {/* Modal header */}
            <div className="mb-1 flex items-center justify-between">
              <h3 className="text-[17px] font-bold text-gray-900 dark:text-white">Request Consumable</h3>
              <button
                onClick={() => setConsumableModalItem(null)}
                className="grid h-8 w-8 cursor-pointer place-items-center rounded-[9px] border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.04] text-gray-500 dark:text-[#9a9aa6] transition hover:bg-gray-100 dark:hover:bg-white/[0.08] hover:text-gray-900 dark:hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mb-5 text-[13px] text-gray-600 dark:text-[#9a9aa6]">{consumableModalItem.name}</p>

            <div className="space-y-4">
              {/* Item name (read only) */}
              <div>
                <label className="mb-1.5 block text-[12.5px] font-semibold text-gray-900 dark:text-[#f4f4f6]">
                  Item
                </label>
                <input
                  type="text"
                  value={consumableModalItem.name}
                  readOnly
                  disabled
                  className="w-full cursor-not-allowed rounded-[11px] border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-[#0d0a08]/60 px-3 py-[11px] text-[14px] text-gray-500 dark:text-[#9a9aa6] outline-none"
                />
              </div>

              {/* Quantity needed */}
              <div>
                <label className="mb-1.5 block text-[12.5px] font-semibold text-gray-900 dark:text-[#f4f4f6]">
                  Quantity Needed{" "}
                  <span className="font-normal text-gray-500 dark:text-[#6e6e78]">({consumableModalItem.unit})</span>
                </label>
                <input
                  type="number"
                  min={1}
                  value={consumableQty}
                  onChange={(e) => setConsumableQty(e.target.value === "" ? "" : Number(e.target.value))}
                  onBlur={() => {
                    let val = Number(consumableQty);
                    if (isNaN(val) || val < 1) val = 1;
                    setConsumableQty(val);
                  }}
                  className="w-full rounded-[11px] border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0d0a08] px-3 py-[11px] text-[14px] text-gray-900 dark:text-white outline-none transition focus:border-orange-400 focus:shadow-[0_0_0_3px_rgba(124,58,237,0.16)]"
                />
              </div>

              {/* Purpose */}
              <div>
                <label className="mb-1.5 block text-[12.5px] font-semibold text-gray-900 dark:text-[#f4f4f6]">
                  Purpose
                </label>
                <textarea
                  value={consumablePurpose}
                  onChange={(e) => setConsumablePurpose(e.target.value)}
                  placeholder="Describe your project or purpose for this consumable…"
                  rows={3}
                  className="w-full resize-none rounded-[11px] border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0d0a08] px-3 py-[11px] text-[14px] leading-relaxed text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#6e6e78] outline-none transition focus:border-orange-400 focus:shadow-[0_0_0_3px_rgba(124,58,237,0.16)]"
                />
              </div>

              {/* Submit */}
              <button
                onClick={handleConsumableSubmit}
                disabled={isSubmittingConsumable}
                className="w-full cursor-pointer rounded-xl bg-gradient-to-b from-orange-400 to-orange-500 py-3 text-[14px] font-semibold text-white shadow-[0_1px_0_rgba(255,255,255,0.14)_inset] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmittingConsumable ? "Submitting…" : "Submit Request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
