import { supabase } from './supabaseClient'

export async function sendLowStockAlert(item: {
  name: string
  sku: string
  quantity: number
  reorder_threshold: number
  supplier?: string
}) {
  try {
    const { error } = await supabase.functions.invoke('low-stock-alert', {
      body: {
        itemName: item.name,
        sku: item.sku,
        quantity: item.quantity,
        reorderThreshold: item.reorder_threshold,
        supplierName: item.supplier
      }
    })
    if (error) throw error
    return { success: true }
  } catch (error) {
    console.error('Failed to send low stock alert:', error)
    return { success: false }
  }
}
