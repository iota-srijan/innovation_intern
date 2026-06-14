import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'
import type { Consumable } from '../types'

export function useConsumables() {
  const { data: consumables = [], isLoading } = useQuery({
    queryKey: ['consumables'],
    queryFn: async (): Promise<Consumable[]> => {
      const { data, error } = await supabase
        .from('consumables')
        .select('*, category:consumable_categories(*)')
        .order('name')
      if (error) throw error
      return data as Consumable[]
    },
    staleTime: 0,
    refetchOnMount: 'always',
  })

  return { consumables, isLoading }
}
