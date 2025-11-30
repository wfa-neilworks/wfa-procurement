-- ============================================================================
-- SUPPLIER CERTIFICATES MIGRATION
-- ============================================================================
-- This migration updates the suppliers table to properly store certificate
-- information with validity dates.
--
-- Run this SQL in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new

-- Step 1: Create a new table for supplier certificates
CREATE TABLE IF NOT EXISTS public.supplier_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  valid_since DATE NOT NULL,
  valid_until DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Enable RLS on the new table
ALTER TABLE public.supplier_certificates ENABLE ROW LEVEL SECURITY;

-- Step 3: Create RLS policies for supplier_certificates
CREATE POLICY "Enable read access for all users"
ON public.supplier_certificates FOR SELECT
USING (true);

CREATE POLICY "Enable insert for authenticated users"
ON public.supplier_certificates FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users"
ON public.supplier_certificates FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Enable delete for authenticated users"
ON public.supplier_certificates FOR DELETE
TO authenticated
USING (true);

-- Step 4: Create an index for better query performance
CREATE INDEX idx_supplier_certificates_supplier_id ON public.supplier_certificates(supplier_id);

-- Step 5: Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_supplier_certificates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Create a trigger to automatically update updated_at
CREATE TRIGGER set_supplier_certificates_updated_at
BEFORE UPDATE ON public.supplier_certificates
FOR EACH ROW
EXECUTE FUNCTION update_supplier_certificates_updated_at();

-- ============================================================================
-- MIGRATION OF EXISTING DATA (Optional)
-- ============================================================================
-- If you have existing certificate data in the suppliers.certificates JSON column,
-- you can migrate it using a custom script. For now, we'll leave the old
-- certificates column in place for backward compatibility.
--
-- You can manually migrate data or drop the old column later:
-- ALTER TABLE public.suppliers DROP COLUMN certificates;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these to verify the migration was successful:

-- Check if the table was created
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'supplier_certificates'
ORDER BY ordinal_position;

-- Check if RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'supplier_certificates';

-- Check if policies were created
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'supplier_certificates';
