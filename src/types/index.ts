export interface Category {
  id: string;
  name: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  category_id: string;
  category?: Category;
  quantity: number;
  reorder_threshold: number;
  supplier: string;
  created_at: string;
}

export type ItemFormData = Omit<InventoryItem, 'id' | 'created_at' | 'category'>;
