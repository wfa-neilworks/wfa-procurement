-- SQL Functions for Database Size Monitoring
-- Run this in your Supabase SQL Editor

-- Function to get total database size
CREATE OR REPLACE FUNCTION get_database_size()
RETURNS TABLE (
  database_size TEXT,
  size_bytes BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pg_size_pretty(pg_database_size(current_database())) as database_size,
    pg_database_size(current_database()) as size_bytes;
END;
$$;

-- Function to get size of each table
CREATE OR REPLACE FUNCTION get_table_sizes()
RETURNS TABLE (
  tablename TEXT,
  size TEXT,
  size_bytes BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    schemaname||'.'||t.tablename as tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||t.tablename)) AS size,
    pg_total_relation_size(schemaname||'.'||t.tablename) as size_bytes
  FROM pg_tables t
  WHERE schemaname = 'public'
  ORDER BY pg_total_relation_size(schemaname||'.'||t.tablename) DESC;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_database_size() TO authenticated;
GRANT EXECUTE ON FUNCTION get_table_sizes() TO authenticated;
