import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, AlertCircle } from "lucide-react";
import { AppShell } from "../components/layout/AppShell";
import { InventoryTable } from "../components/inventory/InventoryTable";
import { AddEditItemModal } from "../components/inventory/AddEditItemModal";
import { useItems } from "../hooks/useItems";
import type { InventoryItem } from "../types";

export default function Inventory() {
  const [modalOpen, setModalOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<InventoryItem | null>(null);
  const { isLoading, error } = useItems();
  const [searchParams] = useSearchParams();

  const handleOpenAddModal = () => {
    setItemToEdit(null);
    setModalOpen(true);
  };

  const handleOpenEditModal = (item: InventoryItem) => {
    setItemToEdit(item);
    setModalOpen(true);
  };

  return (
    <AppShell title="Inventory">
      <div className="p-5">
        {/* Header row */}
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-zinc-900 dark:text-white">Manage Inventory</h2>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              Search, filter, and modify your inventory stock.
            </p>
          </div>
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 rounded-lg bg-violet-700 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-violet-600"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Item
          </button>
        </div>

        {/* Loading skeleton */}
        {isLoading && (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse bg-zinc-100 dark:bg-zinc-800 h-10 rounded-lg"
              />
            ))}
          </div>
        )}

        {/* Error state */}
        {error && !isLoading && (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-zinc-500 dark:text-zinc-400">
            <AlertCircle className="h-8 w-8 text-red-400" />
            <span className="text-sm">Failed to load inventory</span>
          </div>
        )}

        {/* Table (only rendered when not loading and no error) */}
        {!isLoading && !error && (
          <InventoryTable onEdit={handleOpenEditModal} lowStockFilter={searchParams.get('lowStockFilter') === 'true'} />
        )}
      </div>

      <AddEditItemModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        item={itemToEdit}
      />
    </AppShell>
  );
}
