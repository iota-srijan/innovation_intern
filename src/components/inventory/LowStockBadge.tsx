
interface LowStockBadgeProps {
  quantity: number;
  threshold: number;
}

export function LowStockBadge({ quantity, threshold }: LowStockBadgeProps) {
  const badgeClass = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium";

  if (quantity >= threshold) {
    return (
      <span className={`${badgeClass} bg-green-100 text-green-700`}>
        In Stock
      </span>
    );
  }

  if (quantity >= threshold * 0.5) {
    return (
      <span className={`${badgeClass} bg-amber-100 text-amber-700`}>
        Limited
      </span>
    );
  }

  return (
    <span className={`${badgeClass} bg-red-100 text-red-700`}>
      Low Stock
    </span>
  );
}
