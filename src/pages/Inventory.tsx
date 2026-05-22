import { useState } from "react";
import { Plus } from "lucide-react";
import { AppShell } from "../components/layout/AppShell";
import { InventoryTable } from "../components/inventory/InventoryTable";
import { AddEditItemModal } from "../components/inventory/AddEditItemModal";
import type { InventoryItem } from "../types";

export default function Inventory() {
  const [modalOpen, setModalOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<InventoryItem | null>(null);

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

        <InventoryTable onEdit={handleOpenEditModal} />
      </div>

      <AddEditItemModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        item={itemToEdit}
      />
    </AppShell>
  );
}
