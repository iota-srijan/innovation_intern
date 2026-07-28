import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '../lib/supabaseClient'
import { sendLowStockAlert } from '../lib/sendLowStockAlert'
import { isLowStock } from '../lib/inventoryUtils'
import type { InventoryItem, ItemFormData } from '../types'

async function logItemAudit(payload: {
  action: string
  action_type: 'CREATE' | 'UPDATE' | 'DELETE'
  item_id: string
  item_name: string
  quantity_change?: number
  previous_quantity?: number
  new_quantity?: number
}) {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    const actorEmail = session?.user?.email ?? 'system'
    await supabase.from('audit_log').insert({ actor_email: actorEmail, ...payload })
  } catch {
    // audit failures are non-fatal
  }
}

export function useItems() {
  return useQuery({
    queryKey: ['items'],
    queryFn: async (): Promise<InventoryItem[]> => {
      const { data, error } = await supabase
        .from('inventory_items')
        .select(`*, category:categories(*)`)
        .order('name')
      if (error) throw error
      return data as InventoryItem[]
    },
    staleTime: 0,
    refetchOnMount: 'always',
  })
}

export function useCreateItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (item: ItemFormData) => {
      const { data, error } = await supabase
        .from('inventory_items')
        .insert([item])
        .select(`*, category:categories(*)`)
        .single()
      if (error) throw error
      return data
    },
    onSuccess: async (newItem) => {
      queryClient.invalidateQueries({ queryKey: ['items'] })
      toast.success('Item added successfully')
      await logItemAudit({
        action: `Item created: ${newItem.name}`,
        action_type: 'CREATE',
        item_id: newItem.id,
        item_name: newItem.name,
      })
      if (isLowStock(newItem)) {
        await sendLowStockAlert(newItem)
        toast.warning(`Low stock alert sent for ${newItem.name}`)
      }
    },
    onError: () => toast.error('Failed to add item'),
  })
}

export function useUpdateItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...item }: ItemFormData & { id: string }) => {
      const { data, error } = await supabase
        .from('inventory_items')
        .update({ ...item, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select(`*, category:categories(*)`)
        .single()
      if (error) throw error
      return data
    },
    onSuccess: async (updatedItem) => {
      const previousItem = queryClient.getQueryData<InventoryItem[]>(['items'])?.find(i => i.id === updatedItem.id)

      queryClient.invalidateQueries({ queryKey: ['items'] })
      toast.success('Item updated')

      const auditExtra = previousItem && previousItem.quantity !== updatedItem.quantity
        ? {
            quantity_change: updatedItem.quantity - previousItem.quantity,
            previous_quantity: previousItem.quantity,
            new_quantity: updatedItem.quantity,
          }
        : {}
      await logItemAudit({
        action: `Item updated: ${updatedItem.name}`,
        action_type: 'UPDATE',
        item_id: updatedItem.id,
        item_name: updatedItem.name,
        ...auditExtra,
      })

      if (isLowStock(updatedItem)) {
        await sendLowStockAlert(updatedItem)
        toast.warning(`Low stock alert sent for ${updatedItem.name}`)
      }
    },
    onError: () => toast.error('Failed to update item'),
  })
}

export function useDeleteItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('inventory_items')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: async (_data, id) => {
      const deletedItem = queryClient.getQueryData<InventoryItem[]>(['items'])?.find(i => i.id === id)

      queryClient.invalidateQueries({ queryKey: ['items'] })
      toast.success('Item deleted')

      if (deletedItem) {
        await logItemAudit({
          action: `Item deleted: ${deletedItem.name}`,
          action_type: 'DELETE',
          item_id: deletedItem.id,
          item_name: deletedItem.name,
        })
      }
    },
    onError: () => toast.error('Failed to delete item'),
  })
}
