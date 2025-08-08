-- Fix database constraints to match TypeScript types
-- Run this script in Supabase SQL Editor to fix the constraint errors

-- Step 1: Fix sales_orders status constraint
-- Drop the existing constraint and create a new one with all required statuses
ALTER TABLE sales_orders 
DROP CONSTRAINT IF EXISTS sales_orders_status_check;

ALTER TABLE sales_orders 
ADD CONSTRAINT sales_orders_status_check 
CHECK (status = ANY (ARRAY['draft'::text, 'pending'::text, 'confirmed'::text, 'processing'::text, 'shipped'::text, 'delivered'::text, 'completed'::text, 'cancelled'::text]));

-- Step 2: Fix inventory_adjustments reason constraint
-- Drop the existing constraint and create a new one with all required reasons
ALTER TABLE inventory_adjustments 
DROP CONSTRAINT IF EXISTS inventory_adjustments_reason_check;

ALTER TABLE inventory_adjustments 
ADD CONSTRAINT inventory_adjustments_reason_check 
CHECK (reason = ANY (ARRAY['damage'::text, 'counting_error'::text, 'return'::text, 'theft'::text, 'other'::text, 'sale'::text, 'purchase'::text]));

-- Step 3: Verify the constraints were applied correctly
-- Uncomment to check the constraints
/*
SELECT 
    constraint_name,
    check_clause
FROM information_schema.check_constraints 
WHERE constraint_name IN ('sales_orders_status_check', 'inventory_adjustments_reason_check');
*/

-- Constraint fixes completed!
-- Your sales orders can now use all status values including 'completed' and 'draft'
-- Your inventory adjustments can now use 'sale' and 'purchase' as reasons
