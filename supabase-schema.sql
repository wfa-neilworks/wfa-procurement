-- WFA Procurement - Supabase Database Schema
-- Migration from Firebase Firestore to PostgreSQL

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- SUPPLIERS TABLE
-- ============================================================================
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  contact TEXT,
  email TEXT,
  phone TEXT,
  certificates JSONB DEFAULT '[]'::jsonb, -- Array of {title, url}
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_suppliers_name ON suppliers(name);

-- ============================================================================
-- PRODUCTS TABLE
-- ============================================================================
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  soh INTEGER DEFAULT 0, -- Stock on hand
  min_stock INTEGER,
  target_stock INTEGER,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  supplier_name TEXT, -- Denormalized for performance
  price DECIMAL(10, 2),
  total_in INTEGER DEFAULT 0,
  total_out INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_products_code ON products(code);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_supplier_id ON products(supplier_id);

-- ============================================================================
-- STOCK MOVEMENTS TABLE (Audit Trail)
-- ============================================================================
CREATE TABLE stock_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  qty_delta INTEGER NOT NULL, -- Positive for additions, negative for deductions
  note TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_stock_movements_product_id ON stock_movements(product_id);
CREATE INDEX idx_stock_movements_created_at ON stock_movements(created_at DESC);

-- ============================================================================
-- ORDER FORMS TABLE (Saved Deduction Forms)
-- ============================================================================
CREATE TABLE order_forms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  item_ids UUID[] NOT NULL, -- Array of product IDs
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_order_forms_created_at ON order_forms(created_at DESC);
CREATE INDEX idx_order_forms_created_by ON order_forms(created_by);

-- ============================================================================
-- PURCHASE ORDERS TABLE
-- ============================================================================
CREATE TABLE purchase_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  po_number TEXT NOT NULL UNIQUE,
  supplier TEXT,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'backorder', 'received')),
  backorder_note TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_purchase_orders_po_number ON purchase_orders(po_number);
CREATE INDEX idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX idx_purchase_orders_created_at ON purchase_orders(created_at DESC);

-- ============================================================================
-- SDS CHEMICALS TABLE
-- ============================================================================
CREATE TABLE sds_chemicals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sds_chemicals_name ON sds_chemicals(name);
CREATE INDEX idx_sds_chemicals_location ON sds_chemicals(location);

-- ============================================================================
-- PALLET UNLOADS TABLE
-- ============================================================================
CREATE TABLE pallet_unloads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  container TEXT NOT NULL,
  date DATE NOT NULL,
  count INTEGER NOT NULL,
  note TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pallet_unloads_date ON pallet_unloads(date DESC);
CREATE INDEX idx_pallet_unloads_container ON pallet_unloads(container);

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_order_forms_updated_at BEFORE UPDATE ON order_forms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_purchase_orders_updated_at BEFORE UPDATE ON purchase_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sds_chemicals_updated_at BEFORE UPDATE ON sds_chemicals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE sds_chemicals ENABLE ROW LEVEL SECURITY;
ALTER TABLE pallet_unloads ENABLE ROW LEVEL SECURITY;

-- SUPPLIERS: Public read, authenticated write
CREATE POLICY "Public can read suppliers" ON suppliers FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Authenticated users can insert suppliers" ON suppliers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update suppliers" ON suppliers FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete suppliers" ON suppliers FOR DELETE TO authenticated USING (true);

-- PRODUCTS: Public read, authenticated write
CREATE POLICY "Public can read products" ON products FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Authenticated users can insert products" ON products FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update products" ON products FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete products" ON products FOR DELETE TO authenticated USING (true);

-- STOCK MOVEMENTS: Public read, authenticated create only (append-only audit log)
CREATE POLICY "Public can read stock movements" ON stock_movements FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Authenticated users can insert stock movements" ON stock_movements FOR INSERT TO authenticated WITH CHECK (true);
-- No update or delete policies - this is an append-only audit log

-- ORDER FORMS: Public read, authenticated write
CREATE POLICY "Public can read order forms" ON order_forms FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Authenticated users can insert order forms" ON order_forms FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update order forms" ON order_forms FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete order forms" ON order_forms FOR DELETE TO authenticated USING (true);

-- PURCHASE ORDERS: Authenticated users only
CREATE POLICY "Authenticated users can read purchase orders" ON purchase_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert purchase orders" ON purchase_orders FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update purchase orders" ON purchase_orders FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete purchase orders" ON purchase_orders FOR DELETE TO authenticated USING (true);

-- SDS CHEMICALS: Public read, authenticated write
CREATE POLICY "Public can read sds chemicals" ON sds_chemicals FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Authenticated users can insert sds chemicals" ON sds_chemicals FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update sds chemicals" ON sds_chemicals FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete sds chemicals" ON sds_chemicals FOR DELETE TO authenticated USING (true);

-- PALLET UNLOADS: Public read, authenticated write
CREATE POLICY "Public can read pallet unloads" ON pallet_unloads FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Authenticated users can insert pallet unloads" ON pallet_unloads FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update pallet unloads" ON pallet_unloads FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete pallet unloads" ON pallet_unloads FOR DELETE TO authenticated USING (true);

-- ============================================================================
-- USEFUL VIEWS
-- ============================================================================

-- View: Products with low stock
CREATE VIEW products_low_stock AS
SELECT
  p.*,
  s.name as supplier_name_full
FROM products p
LEFT JOIN suppliers s ON p.supplier_id = s.id
WHERE p.min_stock IS NOT NULL AND p.soh <= p.min_stock
ORDER BY p.category, p.code;

-- View: Stock movements with product details
CREATE VIEW stock_movements_detailed AS
SELECT
  sm.*,
  p.code as product_code,
  p.description as product_description,
  p.category as product_category
FROM stock_movements sm
JOIN products p ON sm.product_id = p.id
ORDER BY sm.created_at DESC;

-- View: Purchase order summary
CREATE VIEW purchase_orders_summary AS
SELECT
  status,
  COUNT(*) as count,
  ARRAY_AGG(po_number ORDER BY created_at DESC) as po_numbers
FROM purchase_orders
GROUP BY status;

-- ============================================================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================================================

-- Insert sample supplier
-- INSERT INTO suppliers (name, contact, email, phone) VALUES
--   ('Sample Supplier Ltd', 'John Doe', 'john@supplier.com', '+1234567890');

-- Insert sample product
-- INSERT INTO products (code, description, category, soh, min_stock, target_stock) VALUES
--   ('CTN001', 'Carton Box 20x20x20', 'cartons-and-lids', 150, 50, 200);

-- ============================================================================
-- MIGRATION NOTES
-- ============================================================================
--
-- Firebase → Supabase Migration Checklist:
--
-- 1. Export Firebase data:
--    - Use Firebase Admin SDK or Firestore export
--    - Convert document IDs to UUIDs
--    - Transform timestamps to ISO 8601 format
--
-- 2. Data transformations required:
--    - suppliers.certificates: Keep as JSONB array
--    - order_forms.item_ids: Convert to UUID array
--    - Denormalize supplier_name in products for performance
--
-- 3. Auth migration:
--    - Export Firebase Auth users
--    - Import to Supabase Auth
--    - Map user IDs in created_by/updated_by fields
--
-- 4. File storage migration:
--    - Move PDFs from project folder to Supabase Storage
--    - Update pdf_url fields in sds_chemicals
--    - Update certificates URLs in suppliers
--
-- 5. Security:
--    - RLS policies mirror Firebase security rules
--    - stock_movements is append-only (no update/delete)
--    - purchase_orders requires authentication for all operations
--
-- 6. Indexes:
--    - Added for common query patterns
--    - Consider adding more based on query analysis
--
-- ============================================================================
