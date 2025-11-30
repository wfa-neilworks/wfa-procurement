-- ============================================================================
-- SDS CHEMICALS VALIDITY DATES MIGRATION
-- ============================================================================
-- This migration adds validity date columns to the sds_chemicals table
--
-- Run this SQL in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new

-- Step 1: Add validity date columns to sds_chemicals table
ALTER TABLE public.sds_chemicals
ADD COLUMN IF NOT EXISTS valid_since DATE,
ADD COLUMN IF NOT EXISTS valid_until DATE;

-- Step 2: Set default values for existing records (optional)
-- You can update existing records with appropriate dates if needed
-- UPDATE public.sds_chemicals
-- SET valid_since = created_at::date,
--     valid_until = (created_at::date + INTERVAL '1 year')
-- WHERE valid_since IS NULL;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these to verify the migration was successful:

-- Check if the columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'sds_chemicals'
AND column_name IN ('valid_since', 'valid_until')
ORDER BY ordinal_position;
