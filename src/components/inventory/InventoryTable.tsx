import { useState, useMemo, useEffect, useCallback } from "react";
import { Search, ChevronDown, ArrowUpDown, Edit2, Trash2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useItems, useDeleteItem } from "../../hooks/useItems";
import { useCategories } from "../../hooks/useCategories";
import type { InventoryItem } from "../../types";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

type SortField = "name" | "sku" | "category" | "quantity" | "supplier";
type SortOrder = "asc" | "desc";

interface InventoryTableProps {
  onEdit: (item: InventoryItem) => void;
  lowStockFilter?: boolean;
}

export function InventoryTable({ onEdit, lowStockFilter = false }: InventoryTableProps) {
  const navigate = useNavigate();
  const { data: items } = useItems();
  const { data: categories } = useCategories();
  const deleteMutation = useDeleteItem();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null);

  // New state for enterprise features
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [editingQtyId, setEditingQtyId] = useState<string | null>(null);
  const [tempQty, setTempQty] = useState("");
  const [expandedItem, setExpandedItem] = useState<InventoryItem | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  const filteredAndSortedItems = useMemo(() => {
    if (!items) return [];
    let result = items.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.sku.toLowerCase().includes(search.toLowerCase());
      const matchesCategory =
        categoryFilter === "all" || item.category_id === categoryFilter;
      if (!matchesSearch || !matchesCategory) return false;
      if (lowStockFilter) {
        const qty = item.quantity ?? 0;
        const threshold = item.reorder_threshold;
        const matchesStatus = item.status === 'low_stock';
        const matchesThreshold = threshold != null && threshold > 0 && qty <= threshold;
        return matchesStatus || matchesThreshold;
      }
      return true;
    });
    result = result.sort((a, b) => {
      let aVal: string | number | undefined = a[sortField as keyof InventoryItem] as string | number;
      let bVal: string | number | undefined = b[sortField as keyof InventoryItem] as string | number;
      if (sortField === "category") { aVal = a.category?.name || ""; bVal = b.category?.name || ""; }
      if (aVal === undefined) aVal = "";
      if (bVal === undefined) bVal = "";
      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
    return result;
  }, [items, search, categoryFilter, sortField, sortOrder, lowStockFilter]);

  const totalPages = Math.ceil(filteredAndSortedItems.length / ITEMS_PER_PAGE);
  const paginatedItems = filteredAndSortedItems.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [search, categoryFilter, sortField, sortOrder]);

  const toggleSort = useCallback((field: SortField) => {
    setSortOrder((prev) => (sortField === field && prev === "asc" ? "desc" : "asc"));
    setSortField(field);
  }, [sortField]);

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      await deleteMutation.mutateAsync(itemToDelete.id);
      toast.success("Item deleted successfully");
      setSelectedRows(prev => prev.filter(id => id !== itemToDelete.id));
    } catch {
      toast.error("Failed to delete item");
    } finally {
      setItemToDelete(null);
    }
  };

  const handleBulkDelete = () => {
    queryClient.setQueryData(['items'], (old: InventoryItem[] | undefined) => 
      old ? old.filter(i => !selectedRows.includes(i.id)) : []
    );
    toast.success(`Deleted ${selectedRows.length} items`);
    setSelectedRows([]);
  };

  const saveQty = (id: string) => {
    const newQty = parseInt(tempQty, 10);
    if (!isNaN(newQty) && newQty >= 0) {
      queryClient.setQueryData(['items'], (old: InventoryItem[] | undefined) => 
        old ? old.map(i => i.id === id ? { ...i, quantity: newQty } : i) : []
      );
      toast.success("Quantity updated");
    }
    setEditingQtyId(null);
  };

  const toggleSelectAll = () => {
    if (selectedRows.length === paginatedItems.length && paginatedItems.length > 0) {
      setSelectedRows([]);
    } else {
      setSelectedRows(paginatedItems.map(i => i.id));
    }
  };

  const toggleRow = (id: string) => {
    setSelectedRows(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]);
  };

  const SortHeader = ({ field, label }: { field: SortField; label: string }) => (
    <th
      className="cursor-pointer px-4 py-3 text-left transition-colors hover:bg-white/4"
      onClick={() => toggleSort(field)}
    >
      <div className="flex items-center gap-1 select-none text-[9px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
        {label}
        <ArrowUpDown className="h-2.5 w-2.5 text-zinc-400" />
      </div>
    </th>
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Delete confirm dialog */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 dark:border-white/8 dark:bg-[#1a1a1a]">
            <h3 className="mb-2 text-base font-semibold text-zinc-900 dark:text-white">Delete Inventory Item</h3>
            <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
              Are you sure you want to delete <span className="font-semibold">{itemToDelete.name}</span>?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setItemToDelete(null)}
                className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:bg-white/6 dark:text-zinc-300 dark:hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Delete Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Row Expand Drawer */}
      {expandedItem && (
        <>
          <div className="fixed inset-0 z-30 bg-black/10 backdrop-blur-[1px]" onClick={() => setExpandedItem(null)} />
          <div className="fixed right-0 top-0 h-full w-80 bg-white dark:bg-zinc-900 border-l border-slate-200 dark:border-zinc-800 z-40 p-6 shadow-2xl transform translate-x-0 transition-transform">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white truncate pr-4">{expandedItem.name}</h3>
              <button onClick={() => setExpandedItem(null)} className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4 text-sm">
              <div className="flex justify-between border-b border-slate-100 dark:border-zinc-800 pb-2">
                <span className="text-zinc-500">SKU</span>
                <span className="font-medium text-zinc-900 dark:text-zinc-200">{expandedItem.sku}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 dark:border-zinc-800 pb-2">
                <span className="text-zinc-500">Category</span>
                <span className="font-medium text-zinc-900 dark:text-zinc-200">{expandedItem.category?.name || "None"}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 dark:border-zinc-800 pb-2">
                <span className="text-zinc-500">Supplier</span>
                <span className="font-medium text-zinc-900 dark:text-zinc-200">{expandedItem.supplier}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 dark:border-zinc-800 pb-2">
                <span className="text-zinc-500">Quantity</span>
                <span className="font-bold text-violet-600 dark:text-violet-400">{expandedItem.quantity}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 dark:border-zinc-800 pb-2">
                <span className="text-zinc-500">Threshold</span>
                <span className="font-medium text-zinc-900 dark:text-zinc-200">{expandedItem.reorder_threshold}</span>
              </div>
            </div>

            <div className="mt-8">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-4">Reorder History</h4>
              <div className="space-y-3">
                {[
                  { date: "May 12, 2026", qty: 50 },
                  { date: "Apr 04, 2026", qty: 25 },
                  { date: "Feb 18, 2026", qty: 100 },
                ].map((entry, idx) => (
                  <div key={idx} className="flex justify-between items-center text-sm p-2 rounded-lg bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-800">
                    <span className="text-zinc-600 dark:text-zinc-400 text-xs">{entry.date}</span>
                    <span className="font-medium text-zinc-900 dark:text-zinc-200">+{entry.qty} units</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Filters & Bulk Action Row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between">
        <div className="flex gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500 dark:text-zinc-600" />
            <input
              type="text"
              placeholder="Search name or SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 w-full rounded-lg border border-zinc-200 bg-white py-0 pl-9 pr-4 text-xs text-zinc-700 outline-none focus:border-violet-600 dark:border-white/8 dark:bg-white/6 dark:text-zinc-900 dark:placeholder:text-zinc-500"
            />
          </div>
          <div className="relative w-full sm:w-52">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-8 w-full appearance-none rounded-lg border border-zinc-200 bg-white py-0 pl-3 pr-8 text-xs text-zinc-700 outline-none focus:border-violet-600 dark:border-white/8 dark:bg-white/6 dark:text-zinc-900"
            >
              <option value="all">All Categories</option>
              {categories?.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
          </div>
        </div>

        {/* Bulk action bar */}
        {selectedRows.length > 0 && (
          <div className="flex items-center gap-3 px-4 py-1.5 bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800 rounded-xl">
            <span className="text-xs font-semibold text-violet-700 dark:text-violet-400">
              {selectedRows.length} items selected
            </span>
            <button className="text-xs font-medium text-violet-600 hover:text-violet-800 dark:text-violet-300 dark:hover:text-violet-100 transition-colors">
              Export Selected
            </button>
            <button onClick={handleBulkDelete} className="text-xs font-medium text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors">
              Delete Selected
            </button>
          </div>
        )}
      </div>

      {/* Low-stock filter header: clear button */}
      {lowStockFilter && (
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Showing low stock items only
          </span>
          <button
            onClick={() => navigate('/inventory')}
            className="text-xs text-white/50 hover:text-white underline bg-transparent border-0 p-0 cursor-pointer"
          >
            Clear filter ×
          </button>
        </div>
      )}

      {/* Table card */}
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-white/8 dark:bg-[#1a1a1a]">
        <div className="overflow-x-auto">
          <table className="w-full whitespace-nowrap text-left text-xs">
            <thead className="border-b border-zinc-200 dark:border-white/8 bg-zinc-50 dark:bg-[#1a1a1a]">
              <tr>
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={selectedRows.length > 0 && selectedRows.length === paginatedItems.length}
                    onChange={toggleSelectAll}
                    className="rounded border-zinc-300 text-violet-600 focus:ring-violet-600 bg-white dark:bg-zinc-800 dark:border-zinc-600"
                  />
                </th>
                <SortHeader field="name" label="Item Name" />
                <SortHeader field="sku" label="SKU" />
                <SortHeader field="category" label="Category" />
                <SortHeader field="quantity" label="Qty" />
                <SortHeader field="supplier" label="Supplier" />
                <th className="px-4 py-3 text-[9px] font-semibold uppercase tracking-wide text-zinc-400">Status</th>
                <th className="px-4 py-3 text-right text-[9px] font-semibold uppercase tracking-wide text-zinc-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-white/6">
              {paginatedItems.length === 0 && lowStockFilter ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-sm text-white/50">
                    No low stock items found
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item) => {
                  const fillPct = Math.min((item.quantity / 50) * 100, 100);
                  const barColor = item.quantity < 10 ? "bg-red-400" : item.quantity < 20 ? "bg-amber-400" : "bg-green-400";
                  
                  return (
                    <tr
                      key={item.id}
                      onClick={() => setExpandedItem(item)}
                      className="group transition-colors hover:bg-zinc-50 dark:hover:bg-white/4 cursor-pointer"
                    >
                      <td className="px-4 py-2.5 w-10" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedRows.includes(item.id)}
                          onChange={() => toggleRow(item.id)}
                          className="rounded border-zinc-300 text-violet-600 focus:ring-violet-600 bg-white dark:bg-zinc-800 dark:border-zinc-600"
                        />
                      </td>
                      <td className="px-4 py-2.5 font-medium text-zinc-900 dark:text-zinc-200">
                        {item.name}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-[10px] text-zinc-500 dark:text-zinc-400">
                        {item.sku}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="inline-flex items-center rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[10px] font-medium text-zinc-600 dark:border-white/8 dark:bg-white/6 dark:text-zinc-400">
                          {item.category?.name || "Uncategorized"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                        {editingQtyId === item.id ? (
                          <input
                            type="number"
                            autoFocus
                            value={tempQty}
                            onChange={(e) => setTempQty(e.target.value)}
                            onBlur={() => saveQty(item.id)}
                            onKeyDown={(e) => { if (e.key === 'Enter') saveQty(item.id); }}
                            className="w-16 bg-transparent border-b border-violet-500 text-sm focus:outline-none dark:text-zinc-900"
                          />
                        ) : (
                          <div className="flex flex-col w-16">
                            <span 
                              onClick={() => { setEditingQtyId(item.id); setTempQty(item.quantity.toString()); }}
                              className="font-medium text-zinc-900 dark:text-zinc-200 hover:text-violet-600 dark:hover:text-violet-400 cursor-text"
                            >
                              {item.quantity}
                            </span>
                            <div className="h-1 w-full rounded-full bg-slate-100 dark:bg-zinc-800 mt-1 overflow-hidden">
                              <div className={`h-full ${barColor}`} style={{ width: `${fillPct}%` }} />
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-zinc-500 dark:text-zinc-400">
                        {item.supplier}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex items-center rounded-full px-2 py-px text-[9px] font-medium ${
                          item.quantity === 0 ? "bg-red-500/15 text-red-400" :
                          item.quantity <= item.reorder_threshold ? "bg-amber-500/15 text-amber-400" :
                          "bg-green-500/15 text-green-400"
                        }`}>
                          {item.quantity === 0 ? "Out of Stock" : item.quantity <= item.reorder_threshold ? "Low Stock" : "In Stock"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="relative inline-block text-left">
                          <button
                            onClick={() => { onEdit(item); }}
                            className="text-zinc-400 hover:text-violet-600 transition-colors mr-3"
                            title="Edit"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setItemToDelete(item)}
                            className="text-zinc-400 hover:text-red-600 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2 mt-2 text-xs text-zinc-500">
          <button 
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => prev - 1)}
            className="px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-zinc-800 disabled:opacity-50"
          >
            Previous
          </button>
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentPage(i + 1)}
              className={`w-7 h-7 flex items-center justify-center rounded-md transition-colors ${
                currentPage === i + 1 
                  ? "bg-violet-600 text-white" 
                  : "hover:bg-slate-100 dark:hover:bg-zinc-800"
              }`}
            >
              {i + 1}
            </button>
          ))}
          <button 
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(prev => prev + 1)}
            className="px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-zinc-800 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
