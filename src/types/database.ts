// Auto-generated types based on Supabase schema
// You can generate these automatically using: npx supabase gen types typescript

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      products: {
        Row: {
          id: string
          code: string
          description: string
          category: string
          soh: number
          min_stock: number | null
          target_stock: number | null
          supplier_id: string | null
          supplier_name: string | null
          price: number | null
          total_in: number
          total_out: number
          order_status: 'none' | 'ordered' | 'arrived'
          order_date: string | null
          expected_arrival: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          code: string
          description: string
          category: string
          soh?: number
          min_stock?: number | null
          target_stock?: number | null
          supplier_id?: string | null
          supplier_name?: string | null
          price?: number | null
          total_in?: number
          total_out?: number
          order_status?: 'none' | 'ordered' | 'arrived'
          order_date?: string | null
          expected_arrival?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          code?: string
          description?: string
          category?: string
          soh?: number
          min_stock?: number | null
          target_stock?: number | null
          supplier_id?: string | null
          supplier_name?: string | null
          price?: number | null
          total_in?: number
          total_out?: number
          order_status?: 'none' | 'ordered' | 'arrived'
          order_date?: string | null
          expected_arrival?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      stock_movements: {
        Row: {
          id: string
          product_id: string
          qty_delta: number
          note: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          product_id: string
          qty_delta: number
          note?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          qty_delta?: number
          note?: string | null
          created_by?: string | null
          created_at?: string
        }
      }
      order_forms: {
        Row: {
          id: string
          title: string
          item_ids: string[]
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          item_ids: string[]
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          item_ids?: string[]
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      suppliers: {
        Row: {
          id: string
          name: string
          contact: string | null
          email: string | null
          phone: string | null
          certificates: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          contact?: string | null
          email?: string | null
          phone?: string | null
          certificates?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          contact?: string | null
          email?: string | null
          phone?: string | null
          certificates?: Json
          created_at?: string
          updated_at?: string
        }
      }
      supplier_certificates: {
        Row: {
          id: string
          supplier_id: string
          file_name: string
          file_url: string
          valid_since: string
          valid_until: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          supplier_id: string
          file_name: string
          file_url: string
          valid_since: string
          valid_until: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          supplier_id?: string
          file_name?: string
          file_url?: string
          valid_since?: string
          valid_until?: string
          created_at?: string
          updated_at?: string
        }
      }
      sds_chemicals: {
        Row: {
          id: string
          name: string
          location: string
          pdf_url: string | null
          valid_since: string | null
          valid_until: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          location: string
          pdf_url?: string | null
          valid_since?: string | null
          valid_until?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          location?: string
          pdf_url?: string | null
          valid_since?: string | null
          valid_until?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      batch_logs: {
        Row: {
          id: number
          product_code: string
          product_name: string
          batch_reference: string
          pallet_number: string
          scanned_date: string
          scanned_time: string
          created_at: string
        }
        Insert: {
          id?: number
          product_code: string
          product_name: string
          batch_reference: string
          pallet_number: string
          scanned_date: string
          scanned_time: string
          created_at?: string
        }
        Update: {
          id?: number
          product_code?: string
          product_name?: string
          batch_reference?: string
          pallet_number?: string
          scanned_date?: string
          scanned_time?: string
          created_at?: string
        }
      }
      pallet_unloads: {
        Row: {
          id: string
          container: string
          date: string
          count: number
          note: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          container: string
          date: string
          count: number
          note?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          container?: string
          date?: string
          count?: number
          note?: string | null
          created_by?: string | null
          created_at?: string
        }
      }
      purchase_orders: {
        Row: {
          id: string
          po_number: string
          supplier: string | null
          description: string | null
          status: 'pending' | 'backorder' | 'received'
          backorder_note: string | null
          created_by: string | null
          created_at: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          po_number: string
          supplier?: string | null
          description?: string | null
          status?: 'pending' | 'backorder' | 'received'
          backorder_note?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          po_number?: string
          supplier?: string | null
          description?: string | null
          status?: 'pending' | 'backorder' | 'received'
          backorder_note?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
          updated_by?: string | null
        }
      }
    }
    Views: {
      products_low_stock: {
        Row: {
          id: string
          code: string
          description: string
          category: string
          soh: number
          min_stock: number | null
          target_stock: number | null
          supplier_id: string | null
          supplier_name: string | null
          supplier_name_full: string | null
          price: number | null
          total_in: number
          total_out: number
          created_at: string
          updated_at: string
        }
      }
      stock_movements_detailed: {
        Row: {
          id: string
          product_id: string
          qty_delta: number
          note: string | null
          created_by: string | null
          created_at: string
          product_code: string
          product_description: string
          product_category: string
        }
      }
      purchase_orders_summary: {
        Row: {
          status: string
          count: number
          po_numbers: string[]
        }
      }
    }
    Functions: {}
    Enums: {}
  }
}
