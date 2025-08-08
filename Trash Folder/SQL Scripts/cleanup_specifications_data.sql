-- Data Cleanup Script for specifications column
-- This script cleans up malformed JSON structures in the specifications column
-- Run this AFTER running the main migration script

-- Step 1: Create a function to clean malformed JSON specifications
CREATE OR REPLACE FUNCTION clean_specifications_json(input_json jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
    result jsonb := '{}';
    features_array jsonb;
    features_string text;
    features_obj jsonb;
BEGIN
    -- Handle null or empty input
    IF input_json IS NULL OR input_json = '{}' THEN
        RETURN '{}';
    END IF;
    
    -- Check if it has the malformed structure with features array
    IF input_json ? 'features' AND jsonb_typeof(input_json->'features') = 'array' THEN
        -- Extract the features array
        features_array := input_json->'features';
        
        -- Get the first element if it exists
        IF jsonb_array_length(features_array) > 0 THEN
            features_string := features_array->>0;
            
            -- Try to parse the string as JSON
            BEGIN
                features_obj := features_string::jsonb;
                
                -- Extract all key-value pairs except description if it matches the main description
                SELECT jsonb_object_agg(key, value)
                INTO result
                FROM jsonb_each_text(features_obj)
                WHERE key != 'description' OR value IS DISTINCT FROM (input_json->>'description');
                
                -- If result is null, return empty object
                IF result IS NULL THEN
                    result := '{}';
                END IF;
                
            EXCEPTION WHEN OTHERS THEN
                -- If parsing fails, return the original
                result := input_json;
            END;
        END IF;
    ELSE
        -- If it's already a clean structure, return as is
        result := input_json;
    END IF;
    
    RETURN result;
END;
$$;

-- Step 2: Update all inventory_items with malformed specifications
UPDATE inventory_items 
SET specifications = clean_specifications_json(specifications)
WHERE specifications IS NOT NULL 
AND specifications != '{}'
AND (
    specifications ? 'features' 
    OR jsonb_typeof(specifications->'features') = 'array'
);

-- Step 3: Verify the cleanup
-- Uncomment to check the results
/*
SELECT 
    id,
    name,
    specifications,
    jsonb_typeof(specifications) as spec_type
FROM inventory_items 
WHERE specifications IS NOT NULL 
AND specifications != '{}'
LIMIT 10;
*/

-- Step 4: Drop the helper function (optional)
-- Uncomment if you don't need the function anymore
-- DROP FUNCTION IF EXISTS clean_specifications_json(jsonb);

-- Cleanup completed!
-- All specifications should now be clean key-value JSON objects
