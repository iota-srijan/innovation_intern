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
  reorder_threshold: number | null;
  supplier: string;
  unit_price?: number;
  status?: string;
  created_at: string;
}

export type ItemFormData = Omit<InventoryItem, 'id' | 'created_at' | 'category'>;

export interface CartItem {
  item_id: string;
  item_name: string;
  sku: string;
  quantity_requested: number;
  available_quantity: number;
  purpose: string;
}

export interface TeamMember {
  name: string;
  email: string;
}

export interface IssueRequest {
  id: string;
  student_id?: string;
  student_email: string;
  student_name: string;
  item_id: string;
  item_name: string;
  quantity_requested: number;
  purpose: string;
  status: 'pending' | 'approved' | 'rejected';
  physical_status?: 'pending_handover' | 'issued' | 'returned' | 'consumed' | null;
  reviewed_by?: string;
  review_note?: string;
  return_deadline?: string | null;
  professor_email?: string | null;
  team_members?: TeamMember[];
  assigned_mentor_email?: string | null;
  archived_at?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface ServiceMachine {
  id: string;
  name: string;
  type: string;
  description: string | null;
  is_active: boolean;
}

export interface ServiceRequest {
  id: string;
  student_id: string | null;
  student_email: string;
  student_name: string;
  machine_id: string;
  machine_name: string;
  material_type: string | null;
  dim_l: number | null;
  dim_w: number | null;
  dim_h: number | null;
  infill_percent: number | null;
  copies: number;
  purpose: string;
  stl_file_url: string | null;
  stl_file_name: string | null;
  status: 'pending' | 'approved' | 'rejected';
  assigned_slot: string | null;
  slot_duration_mins: number | null;
  review_note: string | null;
  reviewed_by: string | null;
  professor_email?: string | null;
  team_members?: TeamMember[];
  assigned_mentor_email?: string | null;
  archived_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConsumableCategory {
  id: string;
  name: string;
  unit: string;
  created_at: string;
}

export interface Consumable {
  id: string;
  name: string;
  category_id: string | null;
  quantity: number;
  unit: string;
  reorder_threshold: number | null;
  supplier: string | null;
  unit_price: number | null;
  created_at: string;
  updated_at: string;
  category?: ConsumableCategory;
}

export type AuditActionType = 'CREATE' | 'UPDATE' | 'DELETE' | 'admin_action';

export interface AuditLogEntry {
  id: string;
  actor_email: string | null;
  action: string;
  action_type: AuditActionType;
  item_id?: string | null;
  item_name?: string | null;
  quantity_change?: number | null;
  previous_quantity?: number | null;
  new_quantity?: number | null;
  created_at: string;
}

