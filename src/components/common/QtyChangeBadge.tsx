export function QtyChangeBadge({ value }: { value?: number | null }) {
  if (value == null || value === 0) {
    return <span className="text-gray-400 dark:text-[#4b4b57]">—</span>
  }
  if (value > 0) {
    return <span className="font-mono font-semibold text-green-400">{`+${value}`}</span>
  }
  return <span className="font-mono font-semibold text-red-400">{value}</span>
}
