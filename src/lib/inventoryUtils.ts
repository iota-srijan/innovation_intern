export function isLowStock(item: {
  quantity: number
  reorder_threshold: number | null
}): boolean {
  const threshold = item.reorder_threshold
  if (threshold === null || threshold === 0) return false
  return item.quantity <= threshold
}

export function isOutOfStock(item: { quantity: number }): boolean {
  return item.quantity === 0
}
