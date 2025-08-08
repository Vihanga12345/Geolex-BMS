-- Safe Migration script for inventory_items table
-- Based on actual schema: inventory_items table
-- Run this script in Supabase SQL Editor

-- Step 1: Add category_id column to inventory_items table
ALTER TABLE inventory_items 
ADD COLUMN IF NOT EXISTS category_id uuid;

-- Step 2: Add foreign key constraint for category_id (with safety check)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'inventory_items_category_id_fkey'
        AND table_name = 'inventory_items'
    ) THEN
        ALTER TABLE inventory_items 
        ADD CONSTRAINT inventory_items_category_id_fkey 
        FOREIGN KEY (category_id) REFERENCES category(id);
    END IF;
END $$;

-- Step 3: Update category_id based on existing category text values
-- This maps the text category values to the corresponding category IDs
UPDATE inventory_items 
SET category_id = c.id
FROM category c
WHERE inventory_items.category = c.name
AND inventory_items.category_id IS NULL;

-- Step 4: Check for unmapped categories (optional - for debugging)
-- Uncomment to see which categories couldn't be mapped
/*
SELECT DISTINCT category, COUNT(*) as item_count
FROM inventory_items 
WHERE category IS NOT NULL 
AND category_id IS NULL
GROUP BY category;
*/

-- Step 5: Convert specifications column (plural) from text to jsonb
-- Your schema shows 'specifications' (plural) - this is correct
ALTER TABLE inventory_items 
ALTER COLUMN specifications TYPE jsonb USING 
  CASE 
    WHEN specifications IS NULL OR specifications = '' THEN '{}'::jsonb
    WHEN specifications ~ '^[\[\{].*[\]\}]$' THEN specifications::jsonb
    ELSE jsonb_build_object('description', specifications)
  END;

-- Step 6: Set default value for specifications column
ALTER TABLE inventory_items 
ALTER COLUMN specifications SET DEFAULT '{}'::jsonb;

-- Step 7: Create or replace the inventory_items_view (backward compatible)
DROP VIEW IF EXISTS inventory_items_view;

CREATE VIEW inventory_items_view AS
SELECT 
  ii.id,
  ii.business_id,
  ii.name,
  ii.name as item_name,  -- Alias for new code
  ii.description,
  ii.category,
  ii.category_id,
  c.name as category_name,
  ii.unit_of_measure,
  ii.purchase_cost,
  ii.purchase_cost as unit_cost,  -- Alias for new code
  ii.selling_price,
  ii.selling_price as unit_price,  -- Alias for new code
  ii.current_stock,
  ii.current_stock as quantity_on_hand,  -- Alias for new code
  ii.reorder_level,
  ii.sku,
  ii.is_active,
  ii.is_website_item,
  ii.image_url,
  ii.additional_images,
  ii.specifications,
  ii.weight,
  ii.dimensions,
  ii.url_slug,
  ii.meta_description,
  ii.is_featured,
  ii.sale_price,
  ii.created_at,
  ii.updated_at
FROM inventory_items ii
LEFT JOIN category c ON ii.category_id = c.id;

-- Step 8: Add helpful indexes for better performance
CREATE INDEX IF NOT EXISTS idx_inventory_items_category_id 
ON inventory_items(category_id);

CREATE INDEX IF NOT EXISTS idx_inventory_items_specifications_gin 
ON inventory_items USING GIN (specifications);

CREATE INDEX IF NOT EXISTS idx_inventory_items_business_id 
ON inventory_items(business_id);

-- Step 9: Add comments to document the changes
COMMENT ON COLUMN inventory_items.category_id IS 'Foreign key reference to category table';
COMMENT ON COLUMN inventory_items.specifications IS 'JSONB column storing item specifications and dynamic attributes';
COMMENT ON VIEW inventory_items_view IS 'Comprehensive view of inventory items with category information and JSONB specifications';

-- Step 10: Verify the migration (optional)
-- Uncomment to check the results
/*
SELECT 
  COUNT(*) as total_items,
  COUNT(category_id) as items_with_category_id,
  COUNT(*) - COUNT(category_id) as items_without_category_id
FROM inventory_items;

-- Check some sample specifications
SELECT id, name, specifications 
FROM inventory_items 
LIMIT 5;

-- Test the view
SELECT * FROM inventory_items_view LIMIT 3;
*/

-- Migration completed successfully!
-- Your system will continue to work with both old and new column references.