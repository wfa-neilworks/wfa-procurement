-- SQL Trigger to Auto-Reset Order Status When Stock is Healthy
-- Run this in your Supabase SQL Editor

-- Create function that resets order status when stock is above threshold
CREATE OR REPLACE FUNCTION auto_reset_order_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if product has min_stock set and SOH is now above 120% of min_stock
  IF NEW.min_stock IS NOT NULL AND NEW.soh > (NEW.min_stock * 1.2) THEN
    -- If order_status is 'ordered', reset it to 'none'
    IF NEW.order_status = 'ordered' THEN
      NEW.order_status := 'none';
      NEW.order_date := NULL;
      NEW.expected_arrival := NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger that fires before update on products table
DROP TRIGGER IF EXISTS trigger_auto_reset_order_status ON products;

CREATE TRIGGER trigger_auto_reset_order_status
  BEFORE UPDATE ON products
  FOR EACH ROW
  WHEN (OLD.soh IS DISTINCT FROM NEW.soh) -- Only trigger when SOH changes
  EXECUTE FUNCTION auto_reset_order_status();

-- Add comment for documentation
COMMENT ON FUNCTION auto_reset_order_status() IS 'Automatically resets order_status to none when SOH goes above 120% of min_stock';
