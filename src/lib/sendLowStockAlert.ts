import { supabase } from './supabaseClient'

export async function sendLowStockAlert(item: {
  name: string
  sku: string
  quantity: number
  reorder_threshold: number
  supplier?: string
}) {
  try {
    // Fetch faculty emails from DB
    const { data: facultyEmails } = await supabase
      .from('faculty_emails')
      .select('email')

    const toEmails = facultyEmails?.map((f: { email: string }) => f.email) ?? ['lab.incharge@opju.ac.in']

    const { error } = await supabase.functions.invoke('low-stock-alert', {
      body: {
        itemName: item.name,
        sku: item.sku,
        quantity: item.quantity,
        reorderThreshold: item.reorder_threshold,
        supplierName: item.supplier,
        toEmails
      }
    })
    if (error) throw error
    return { success: true }
  } catch (error) {
    console.error('Failed to send low stock alert')
    return { success: false }
  }
}
