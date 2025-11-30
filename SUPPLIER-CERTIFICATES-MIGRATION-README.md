# Supplier Certificates Migration Guide

## Overview
This migration adds proper certificate management to suppliers with validity dates and expiration tracking.

## Changes
- Creates a new `supplier_certificates` table to store certificates with:
  - Certificate file name and URL
  - Valid since date
  - Valid until date
  - Automatic expiration tracking

## Migration Steps

### Step 1: Run the SQL Migration
1. Open your Supabase dashboard
2. Go to the SQL Editor: `https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new`
3. Copy and paste the entire contents of `supplier-certificates-migration.sql`
4. Click "Run" to execute the migration

### Step 2: Verify the Migration
After running the migration, verify it was successful by running these queries in the SQL Editor:

```sql
-- Check if the table was created
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'supplier_certificates'
ORDER BY ordinal_position;

-- Check if RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'supplier_certificates';
```

### Step 3: (Optional) Migrate Existing Data
If you have existing certificate data in the `suppliers.certificates` JSON column, you'll need to migrate it manually. The old column is kept for backward compatibility.

To drop the old column after migrating data (optional):
```sql
ALTER TABLE public.suppliers DROP COLUMN certificates;
```

## New Certificate Structure
Each certificate now has:
- `id`: Unique identifier
- `supplier_id`: Reference to the supplier
- `file_name`: Original filename of the certificate
- `file_url`: Public URL to access the certificate
- `valid_since`: Start date of certificate validity
- `valid_until`: End date of certificate validity
- `created_at`: When the certificate was uploaded
- `updated_at`: Last update timestamp

## Features After Migration
✅ Add certificates one at a time with validity dates
✅ View all certificates for a supplier in a table
✅ See days remaining until expiration
✅ Automatic expiration tracking
✅ Better certificate management

## Need Help?
If you encounter any issues during migration, check:
1. Your Supabase project has the necessary permissions
2. The SQL Editor shows no errors
3. The verification queries return expected results
