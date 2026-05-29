import { useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "../components/layout/AppShell";
import { useItems } from "../hooks/useItems";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { supabase } from "../lib/supabaseClient";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { X, BookOpen, ShoppingCart } from "lucide-react";

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

function StatusBadge({ status }: { status: string }) {
  if (status === "pending")
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/20 text-amber-400">
        Pending
      </span>
    );
  if (status === "approved")
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-500/20 text-green-400">
        Approved
      </span>
    );
  if (status === "rejected")
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-500/20 text-red-400">
        Rejected
      </span>
    );
  return null;
}

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
  const pendingCount = myRequests.filter((r) => r.status === "pending").length;
  const approvedCount = myRequests.filter((r) => r.status === "approved").length;
  const toReturnCount = myRequests.filter(
    (r) => r.status === "approved" && r.return_deadline
  ).length;

  // Filter items
  const CATEGORIES = ["All", "IoT Devices", "3D Printing", "Electronics"];
  const filtered = (items as any[]).filter((item) => {
    const matchSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.sku.toLowerCase().includes(search.toLowerCase());
    const matchCat =
      categoryFilter === "All" ||
      (item.category?.name ?? "").includes(categoryFilter);
    return matchSearch && matchCat;
  });

  // Stat counts
  const totalAvailable = (items as any[]).filter((i) => i.quantity > 0).length;
  const statCards = [
    { label: "Total Items Available", value: totalAvailable, color: "text-violet-400" },
    { label: "My Pending Requests", value: pendingCount, color: "text-amber-400" },
    { label: "My Approved Requests", value: approvedCount, color: "text-green-400" },
    { label: "Items to Return", value: toReturnCount, color: "text-red-400" },
  ];

  return (
    <AppShell title="IdeaLab — Student Portal">
      <div className="flex flex-col gap-5 p-5">

        {/* Page header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-violet-400" />
              <h2 className="text-lg font-medium text-zinc-900 dark:text-white">IdeaLab Inventory</h2>
            </div>
            <p className="text-sm text-zinc-400 mt-0.5">
              Browse and request components from OPJU IdeaLab.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/student/requests"
              className="text-xs text-zinc-400 hover:text-violet-400 transition-colors"
            >
              My requests →
            </Link>
            <Link
              to="/cart"
              className="relative flex items-center gap-1.5 rounded-xl bg-violet-700 hover:bg-violet-600 px-4 py-2 text-xs font-semibold text-white transition-colors"
            >
              <ShoppingCart className="h-3.5 w-3.5" />
              Cart
              {cartCount > 0 && (
                <span className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[9px] font-bold text-violet-700">
                  {cartCount}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statCards.map((card) => (
            <div
              key={card.label}
              className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 dark:border-white/8 dark:bg-[#1a1a1a]"
            >
              <div className={`text-3xl font-bold ${card.color} mb-1`}>
                {card.value}
              </div>
              <div className="text-xs text-zinc-500">{card.label}</div>
            </div>
          ))}
        </div>

        {/* Browse Inventory */}
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 dark:border-white/8 dark:bg-[#1a1a1a] p-5">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <span className="text-sm font-medium text-zinc-900 dark:text-white">Browse Inventory</span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Search items or SKU…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-violet-500 w-48"
              />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-violet-500 cursor-pointer"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-white/8">
                  {["ITEM NAME", "SKU", "CATEGORY", "AVAILABLE QTY", "STATUS", "ACTION"].map((h) => (
                    <th
                      key={h}
                      className="pb-2 text-left text-[9px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500 px-2 first:pl-0"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-zinc-500 text-xs">
                      No items found.
                    </td>
                  </tr>
                )}
                {filtered.map((item: any) => {
                  const qty = item.quantity;
                  const threshold = item.reorder_threshold;
                  const unavailable = qty === 0;
                  const lowStock = qty > 0 && qty <= threshold;

                  return (
                    <tr
                      key={item.id}
                      className="border-b border-zinc-100 dark:border-white/6 hover:bg-zinc-100 dark:hover:bg-white/4 last:border-0"
                    >
                      <td className="py-2.5 px-2 first:pl-0 font-medium text-zinc-900 dark:text-zinc-200">
                        {item.name}
                      </td>
                      <td className="py-2.5 px-2 text-zinc-500 dark:text-zinc-400 font-mono">
                        {item.sku}
                      </td>
                      <td className="py-2.5 px-2 text-zinc-500 dark:text-zinc-400">
                        {item.category?.name ?? "—"}
                      </td>
                      <td className="py-2.5 px-2 text-zinc-900 dark:text-zinc-200 font-medium">
                        {qty}
                      </td>
                      <td className="py-2.5 px-2">
                        {unavailable ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-500/20 text-red-400">
                            Unavailable
                          </span>
                        ) : lowStock ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/20 text-amber-400">
                            Low Stock
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-500/20 text-green-400">
                            Available
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-2">
                        <button
                          disabled={unavailable}
                          onClick={() => {
                            setModalItem(item);
                            setRequestQty(1);
                            setPurpose("");
                          }}
                          className={`px-3 py-1 text-white text-xs rounded-lg transition-colors ${
                            unavailable
                              ? "bg-zinc-700 text-zinc-500 cursor-not-allowed opacity-50"
                              : "bg-violet-700 hover:bg-violet-600 cursor-pointer"
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
        </div>

        {/* My Requests */}
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 dark:border-white/8 dark:bg-[#1a1a1a] p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm font-medium text-zinc-900 dark:text-white">My Requests</span>
            {myRequests.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-500/20 text-violet-400">
                {myRequests.length}
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-white/8">
                  {["ITEM", "QTY", "PURPOSE", "STATUS", "SUBMITTED", "RETURN BY"].map((h) => (
                    <th
                      key={h}
                      className="pb-2 text-left text-[9px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500 px-2 first:pl-0"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {myRequests.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-zinc-500 text-xs">
                      No requests yet. Browse inventory and submit an issue request.
                    </td>
                  </tr>
                )}
                {myRequests.map((req) => (
                  <tr
                    key={req.id}
                    className="border-b border-zinc-100 dark:border-white/6 hover:bg-zinc-100 dark:hover:bg-white/4 last:border-0"
                  >
                    <td className="py-2.5 px-2 first:pl-0 font-medium text-zinc-900 dark:text-zinc-200">
                      {req.item_name}
                    </td>
                    <td className="py-2.5 px-2 text-zinc-500 dark:text-zinc-400">{req.quantity_requested}</td>
                    <td className="py-2.5 px-2 text-zinc-500 dark:text-zinc-400 max-w-[180px] truncate">
                      {req.purpose}
                    </td>
                    <td className="py-2.5 px-2">
                      <StatusBadge status={req.status} />
                    </td>
                    <td className="py-2.5 px-2 text-zinc-500 dark:text-zinc-400">
                      {new Date(req.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-2.5 px-2 text-zinc-500 dark:text-zinc-400">
                      {req.return_deadline
                        ? new Date(req.return_deadline).toLocaleDateString()
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Issue Request Modal */}
      {modalItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setModalItem(null)}
        >
          <div
            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 w-full max-w-md relative mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-4 right-4 text-zinc-500 hover:text-white cursor-pointer transition-colors"
              onClick={() => setModalItem(null)}
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-lg font-semibold text-white mb-1">Add to Cart</h3>
            <p className="text-xs text-zinc-400 mb-5">{modalItem.name}</p>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-zinc-400 block mb-1">
                  Quantity{" "}
                  <span className="text-zinc-600">
                    (max {modalItem.quantity})
                  </span>
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
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-400 block mb-1">
                  Purpose / Project Description
                  <span className="text-zinc-600 ml-1">(optional — set in cart)</span>
                </label>
                <textarea
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="Describe your project or purpose for this item…"
                  rows={3}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-500 transition-colors resize-none"
                />
              </div>

              <button
                onClick={() => {
                  addToCart({
                    item_id: modalItem.id,
                    item_name: modalItem.name,
                    sku: modalItem.sku ?? '',
                    quantity_requested: Math.min(modalItem.quantity, Math.max(1, Number(requestQty) || 1)),
                    available_quantity: modalItem.quantity,
                    purpose,
                  });
                  toast.success(`"${modalItem.name}" added to cart. Go to Cart to submit.`);
                  setModalItem(null);
                  setPurpose('');
                  setRequestQty(1);
                }}
                className="w-full py-2.5 bg-violet-700 hover:bg-violet-600 text-white text-sm font-medium rounded-xl transition-colors cursor-pointer"
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
