export interface Product {
  id: string
  code: string
  description: string
  category: string
  soh: number
  min_stock?: number
  target_stock?: number
  supplier?: string
  price?: number
  total_in?: number
  total_out?: number
  created_at?: string
  updated_at?: string
}

export interface StockMovement {
  id: string
  product_id: string
  qty_delta: number
  note: string
  created_by?: string
  created_at: string
}

export interface OrderForm {
  id: string
  title: string
  item_ids: string[]
  created_by: string
  created_at: string
  updated_at?: string
}

export interface Supplier {
  id: string
  name: string
  contact?: string
  email?: string
  phone?: string
  certificates?: { title: string; url: string }[]
  created_at?: string
  updated_at?: string
}

export interface SDSChemical {
  id: string
  name: string
  location: string
  pdf_url?: string
  created_at?: string
  updated_at?: string
}

export interface PalletUnload {
  id: string
  container: string
  date: string
  count: number
  note?: string
  created_by?: string
  created_at?: string
}

export interface PurchaseOrder {
  id: string
  po_number: string
  supplier?: string
  description?: string
  status: 'pending' | 'backorder' | 'received'
  backorder_note?: string
  created_by?: string
  created_at: string
  updated_at?: string
  updated_by?: string
}

export type InventoryCategory =
  | 'cartons-and-lids'
  | 'films-and-bags'
  | 'labels'
  | 'chemicals'
  | 'gloves-and-sundries'
  | 'spares-and-maintenance'

export const INVENTORY_CATEGORIES: { id: InventoryCategory; label: string }[] = [
  { id: 'cartons-and-lids', label: 'Cartons and Lids' },
  { id: 'films-and-bags', label: 'Films and Bags' },
  { id: 'labels', label: 'Labels' },
  { id: 'chemicals', label: 'Chemicals' },
  { id: 'gloves-and-sundries', label: 'Gloves and Sundries' },
  { id: 'spares-and-maintenance', label: 'Spares and Maintenance' },
]

export const SDS_LOCATIONS = [
  'Operations',
  'Warehouse',
  'Workshop',
  'QA Lab',
  'Cold Room',
  'Other',
]
