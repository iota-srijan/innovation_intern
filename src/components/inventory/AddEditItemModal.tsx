import { useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, ChevronDown } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { useCreateItem, useUpdateItem } from "../../hooks/useItems";
import { useCategories } from "../../hooks/useCategories";
import type { InventoryItem, ItemFormData } from "../../types";

const schema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  sku: z.string().min(1, "SKU is required").max(50, "SKU is too long"),
  category_id: z.string().min(1, "Please select a category"),
  quantity: z.number().int().nonnegative("Must be a positive number"),
  reorder_threshold: z.number().int().nonnegative("Must be a positive number"),
  supplier: z.string().min(1, "Supplier is required").max(100, "Supplier name is too long"),
});

interface AddEditItemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: InventoryItem | null;
}

const inputCls =
  "w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-violet-600 focus:ring-1 focus:ring-violet-600 disabled:opacity-50 dark:border-white/8 dark:bg-white/6 dark:text-zinc-900 dark:placeholder:text-zinc-500 dark:focus:border-violet-500";

const labelCls = "text-xs font-medium text-zinc-700 dark:text-zinc-400";

export function AddEditItemModal({ open, onOpenChange, item }: AddEditItemModalProps) {
  const { data: categories, isLoading: categoriesLoading } = useCategories();
  const createMutation = useCreateItem();
  const updateMutation = useUpdateItem();
  const isEditing = !!item;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ItemFormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", sku: "", category_id: "", quantity: 0, reorder_threshold: 0, supplier: "" },
  });

  useEffect(() => {
    if (open) {
      if (item) {
        reset({
          name: item.name,
          sku: item.sku,
          category_id: item.category_id,
          quantity: item.quantity,
          reorder_threshold: item.reorder_threshold,
          supplier: item.supplier,
        });
      } else {
        reset({ name: "", sku: "", category_id: "", quantity: 0, reorder_threshold: 0, supplier: "" });
      }
    }
  }, [open, item, reset]);

  const onSubmit = async (data: ItemFormData) => {
    try {
      if (isEditing && item) {
        await updateMutation.mutateAsync({ id: item.id, ...data });
        toast.success("Item updated successfully");
      } else {
        await createMutation.mutateAsync(data);
        toast.success("Item created successfully");
      }
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || (isEditing ? "Failed to update item" : "Failed to create item"));
    }
  };

  const isPending = isSubmitting || createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 max-h-[90vh] overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-6 focus:outline-none scrollbar-thin dark:border-white/8 dark:bg-[#1a1a1a]">
          <Dialog.Title className="mb-6 text-lg font-semibold text-zinc-900 dark:text-white">
            {isEditing ? "Edit Inventory Item" : "Add New Inventory Item"}
          </Dialog.Title>
          <Dialog.Close className="absolute right-5 top-5 rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-white/8 dark:hover:text-zinc-200">
            <X className="h-4 w-4" />
          </Dialog.Close>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <label className={labelCls}>Name</label>
              <input {...register("name")} className={inputCls} placeholder="e.g. MacBook Pro M3" disabled={isPending} />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className={labelCls}>SKU</label>
                <input {...register("sku")} className={inputCls} placeholder="e.g. LAP-MP-M3" disabled={isPending} />
                {errors.sku && <p className="text-xs text-red-500">{errors.sku.message}</p>}
              </div>
              <div className="space-y-1.5">
                <label className={labelCls}>Category</label>
                <div className="relative">
                  <select
                    {...register("category_id")}
                    className={inputCls + " appearance-none pr-8"}
                    disabled={categoriesLoading || isPending}
                  >
                    <option value="">Select a category</option>
                    {categories?.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                </div>
                {errors.category_id && <p className="text-xs text-red-500">{errors.category_id.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className={labelCls}>Quantity</label>
                <input type="number" {...register("quantity", { valueAsNumber: true })} className={inputCls} disabled={isPending} />
                {errors.quantity && <p className="text-xs text-red-500">{errors.quantity.message}</p>}
              </div>
              <div className="space-y-1.5">
                <label className={labelCls}>Reorder Threshold</label>
                <input type="number" {...register("reorder_threshold", { valueAsNumber: true })} className={inputCls} disabled={isPending} />
                {errors.reorder_threshold && <p className="text-xs text-red-500">{errors.reorder_threshold.message}</p>}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className={labelCls}>Supplier</label>
              <input {...register("supplier")} className={inputCls} placeholder="e.g. Apple Inc." disabled={isPending} />
              {errors.supplier && <p className="text-xs text-red-500">{errors.supplier.message}</p>}
            </div>

            <div className="mt-6 flex justify-end gap-3 border-t border-zinc-100 pt-5 dark:border-white/8">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
                className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-white/8 dark:bg-white/6 dark:text-zinc-300 dark:hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="flex min-w-[120px] items-center justify-center gap-2 rounded-lg bg-violet-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-600 disabled:opacity-50"
              >
                {isPending && (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                )}
                {isEditing ? "Save Changes" : "Create Item"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
