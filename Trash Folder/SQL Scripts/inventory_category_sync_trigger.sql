-- Database Trigger Solution for Category Name Sync
-- Run this script in Supabase SQL Editor

-- Step 1: Create function to validate category_id and update category name
CREATE OR REPLACE FUNCTION sync_inventory_category()
RETURNS TRIGGER AS $$
BEGIN
    -- If category_id is NULL, set category to NULL
    IF NEW.category_id IS NULL THEN
        NEW.category := NULL;
        RETURN NEW;
    END IF;
    
    -- Check if category_id exists and get the name
    SELECT name INTO NEW.category 
    FROM category 
    WHERE id = NEW.category_id;
    
    -- If category_id doesn't exist, raise an error
    IF NEW.category IS NULL THEN
        RAISE EXCEPTION 'Category with ID % does not exist. Please select a valid category.', NEW.category_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Create trigger for INSERT operations
CREATE OR REPLACE TRIGGER inventory_category_sync_insert
    BEFORE INSERT ON inventory_items
    FOR EACH ROW
    EXECUTE FUNCTION sync_inventory_category();

-- Step 3: Create trigger for UPDATE operations (only when category_id changes)
CREATE OR REPLACE TRIGGER inventory_category_sync_update
    BEFORE UPDATE OF category_id ON inventory_items
    FOR EACH ROW
    WHEN (OLD.category_id IS DISTINCT FROM NEW.category_id)
    EXECUTE FUNCTION sync_inventory_category();

-- Step 4: Update existing records to sync category names (optional)
-- Uncomment to fix existing records
/*
UPDATE inventory_items 
SET category = c.name
FROM category c
WHERE inventory_items.category_id = c.id
AND inventory_items.category_id IS NOT NULL;

-- Set category to NULL where category_id is NULL
UPDATE inventory_items 
SET category = NULL
WHERE category_id IS NULL;
*/

-- Step 5: Test the trigger (optional)
-- Uncomment to test
/*
-- Test 1: Valid category_id
INSERT INTO inventory_items (name, category_id, unit_of_measure, purchase_cost, selling_price, current_stock, reorder_level)
VALUES ('Test Item', 'existing-category-id-here', 'pieces', 100, 150, 10, 5);

-- Test 2: Invalid category_id (should fail)
INSERT INTO inventory_items (name, category_id, unit_of_measure, purchase_cost, selling_price, current_stock, reorder_level)
VALUES ('Test Item 2', 'invalid-category-id', 'pieces', 100, 150, 10, 5);

-- Test 3: NULL category_id
INSERT INTO inventory_items (name, category_id, unit_of_measure, purchase_cost, selling_price, current_stock, reorder_level)
VALUES ('Test Item 3', NULL, 'pieces', 100, 150, 10, 5);
*/

-- Trigger setup completed!
-- The trigger will now automatically:
-- 1. Validate category_id exists before insert/update
-- 2. Update category name based on category_id
-- 3. Set category to NULL if category_id is NULL
-- 4. Fail the operation if category_id doesn't exist
