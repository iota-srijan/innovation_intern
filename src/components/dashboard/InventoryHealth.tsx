import { Activity } from "lucide-react";
import type { InventoryItem } from "../../types";
import { SectionCard } from "../common/SectionCard";
import { Skeleton } from "../common/Skeleton";

interface InventoryHealthProps {
  items: InventoryItem[];
  isLoading?: boolean;
}

export function InventoryHealth({ items, isLoading }: InventoryHealthProps) {
  const totalItems = items.length;
  const lowStockItems = items.filter((i) => i.quantity < i.reorder_threshold).length;
  const healthyItems = totalItems - lowStockItems;

  const healthyPercentage = totalItems === 0 ? 0 : Math.round((healthyItems / totalItems) * 100);

  return (
    <SectionCard title="Inventory Health" icon={Activity}>
      {isLoading ? (
        <div className="flex flex-1 flex-col justify-center space-y-4 pt-4">
          <Skeleton className="h-4 w-full rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ) : totalItems === 0 ? (
        <div className="flex flex-1 items-center justify-center py-8 text-sm text-slate-500">
          No inventory data available.
        </div>
      ) : (
        <div className="flex flex-1 flex-col justify-center">
          <div className="mb-2 flex items-end justify-between">
            <span className="text-3xl font-bold tracking-tight text-slate-900">{healthyPercentage}%</span>
            <span className="mb-1 text-sm font-medium text-slate-500">Healthy</span>
          </div>
          
          <div className="mb-6 h-3 w-full overflow-hidden rounded-full border border-slate-200 bg-slate-50" role="progressbar" aria-valuenow={healthyPercentage} aria-valuemin={0} aria-valuemax={100}>
            <div 
              className="h-full bg-orange-500 transition-all duration-1000 ease-out"
              style={{ width: `${healthyPercentage}%` }}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-orange-500" aria-hidden="true" />
                <span className="text-sm font-medium text-slate-700">Optimal Stock</span>
              </div>
              <span className="text-sm font-semibold text-slate-900">{healthyItems}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-amber-100 bg-amber-50/50 px-3 py-2">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-amber-500" aria-hidden="true" />
                <span className="text-sm font-medium text-slate-700">Low Stock</span>
              </div>
              <span className="text-sm font-semibold text-slate-900">{lowStockItems}</span>
            </div>
          </div>
        </div>
      )}
    </SectionCard>
  );
}
