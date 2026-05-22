import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabaseClient";
import { mockItems, mockCategories } from "../lib/mockData";
import type { InventoryItem, ItemFormData } from "../types";

const USE_MOCK = !import.meta.env.VITE_SUPABASE_URL;

let localMockItems = [...mockItems];

export function useItems() {
  return useQuery({
    queryKey: ["items"],
    queryFn: async (): Promise<InventoryItem[]> => {
      if (USE_MOCK) {
        return Promise.resolve(
          localMockItems.map((item) => ({
            ...item,
            category: mockCategories.find((c) => c.id === item.category_id),
          }))
        );
      }

      const { data, error } = await supabase
        .from("items")
        .select(`
          *,
          category:categories(*)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as InventoryItem[];
    },
  });
}

export function useCreateItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newItem: ItemFormData) => {
      if (USE_MOCK) {
        const item: InventoryItem = {
          ...newItem,
          id: `item-${Date.now()}`,
          created_at: new Date().toISOString(),
          category: mockCategories.find((c) => c.id === newItem.category_id),
        };
        localMockItems = [item, ...localMockItems];
        return Promise.resolve(item);
      }

      const { data, error } = await supabase
        .from("items")
        .insert([newItem])
        .select(`
          *,
          category:categories(*)
        `)
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
  });
}

export function useUpdateItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<ItemFormData>;
    }) => {
      if (USE_MOCK) {
        const index = localMockItems.findIndex((i) => i.id === id);
        if (index > -1) {
          localMockItems[index] = {
            ...localMockItems[index],
            ...updates,
            category: updates.category_id
              ? mockCategories.find((c) => c.id === updates.category_id)
              : localMockItems[index].category,
          };
          return Promise.resolve(localMockItems[index]);
        }
        throw new Error("Item not found");
      }

      const { data, error } = await supabase
        .from("items")
        .update(updates)
        .eq("id", id)
        .select(`
          *,
          category:categories(*)
        `)
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
  });
}

export function useDeleteItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (USE_MOCK) {
        localMockItems = localMockItems.filter((i) => i.id !== id);
        return Promise.resolve(id);
      }

      const { error } = await supabase.from("items").delete().eq("id", id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
  });
}
