import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '../lib/supabaseClient'
import { sendLowStockAlert } from '../lib/sendLowStockAlert'
import type { InventoryItem, ItemFormData } from '../types'

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
      if (newItem.quantity <= newItem.reorder_threshold) {
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
      queryClient.invalidateQueries({ queryKey: ['items'] })
      toast.success('Item updated')
      if (updatedItem.quantity <= updatedItem.reorder_threshold) {
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] })
      toast.success('Item deleted')
    },
    onError: () => toast.error('Failed to delete item'),
  })
}
