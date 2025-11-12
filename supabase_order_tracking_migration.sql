-- SQL Migration for Order Tracking
-- Run this in your Supabase SQL Editor

-- Add order tracking columns to products table
ALTER TABLE products
ADD COLUMN IF NOT EXISTS order_status TEXT DEFAULT 'none' CHECK (order_status IN ('none', 'ordered', 'arrived')),
ADD COLUMN IF NOT EXISTS order_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS expected_arrival DATE;

-- Add comment for documentation
COMMENT ON COLUMN products.order_status IS 'Order status: none (default), ordered (waiting for delivery), arrived (just received)';
COMMENT ON COLUMN products.order_date IS 'Timestamp when product was marked as ordered';
COMMENT ON COLUMN products.expected_arrival IS 'Expected delivery date (optional)';

-- Create index for faster queries on order_status
CREATE INDEX IF NOT EXISTS idx_products_order_status ON products(order_status);
