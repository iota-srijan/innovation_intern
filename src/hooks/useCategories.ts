import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabaseClient";
import { mockCategories } from "../lib/mockData";
import type { Category } from "../types";

const USE_MOCK = !import.meta.env.VITE_SUPABASE_URL;

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async (): Promise<Category[]> => {
      if (USE_MOCK) {
        return Promise.resolve(mockCategories);
      }

      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name");

      if (error) throw error;
      return data as Category[];
    },
  });
}
