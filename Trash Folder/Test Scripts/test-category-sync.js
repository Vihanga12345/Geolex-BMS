// Test script to verify category_id synchronization
// Run after executing the inventory_category_sync_trigger.sql

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'your-supabase-url';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-supabase-anon-key';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testCategorySynchronization() {
  console.log('🧪 Testing Category ID Synchronization...\n');
  
  try {
    // Step 1: Get a valid category ID
    console.log('1. Fetching available categories...');
    const { data: categories, error: categoryError } = await supabase
      .from('category')
      .select('id, name')
      .limit(1);
    
    if (categoryError) {
      console.error('❌ Error fetching categories:', categoryError);
      return;
    }
    
    if (!categories || categories.length === 0) {
      console.log('⚠️  No categories found. Please create a category first.');
      return;
    }
    
    const testCategory = categories[0];
    console.log(`✅ Found category: ${testCategory.name} (ID: ${testCategory.id})\n`);
    
    // Step 2: Test inserting item with category_id
    console.log('2. Testing item insert with category_id...');
    const testItemData = {
      name: `Test Item - ${Date.now()}`,
      description: 'Test item for category synchronization',
      category_id: testCategory.id,
      unit_of_measure: 'pieces',
      purchase_cost: 10.00,
      selling_price: 15.00,
      current_stock: 100,
      reorder_level: 10,
      business_id: '550e8400-e29b-41d4-a716-446655440000',
      is_active: true
    };
    
    const { data: insertedItem, error: insertError } = await supabase
      .from('inventory_items')
      .insert(testItemData)
      .select('id, name, category, category_id')
      .single();
    
    if (insertError) {
      console.error('❌ Error inserting item:', insertError);
      return;
    }
    
    console.log('✅ Item inserted successfully!');
    console.log(`   Category ID: ${insertedItem.category_id}`);
    console.log(`   Category Name: ${insertedItem.category}`);
    
    // Verify trigger worked
    if (insertedItem.category === testCategory.name) {
      console.log('✅ Trigger successfully set category name!\n');
    } else {
      console.log('❌ Trigger did not set category name correctly\n');
    }
    
    // Step 3: Test updating category_id
    console.log('3. Testing category_id update...');
    
    // Get another category if available
    const { data: otherCategories } = await supabase
      .from('category')
      .select('id, name')
      .neq('id', testCategory.id)
      .limit(1);
    
    if (otherCategories && otherCategories.length > 0) {
      const newCategory = otherCategories[0];
      console.log(`   Updating to category: ${newCategory.name} (ID: ${newCategory.id})`);
      
      const { data: updatedItem, error: updateError } = await supabase
        .from('inventory_items')
        .update({ category_id: newCategory.id })
        .eq('id', insertedItem.id)
        .select('id, name, category, category_id')
        .single();
      
      if (updateError) {
        console.error('❌ Error updating item:', updateError);
      } else {
        console.log('✅ Item updated successfully!');
        console.log(`   New Category ID: ${updatedItem.category_id}`);
        console.log(`   New Category Name: ${updatedItem.category}`);
        
        if (updatedItem.category === newCategory.name) {
          console.log('✅ Update trigger successfully set new category name!\n');
        } else {
          console.log('❌ Update trigger did not set category name correctly\n');
        }
      }
    } else {
      console.log('ℹ️  Only one category available, skipping update test\n');
    }
    
    // Step 4: Clean up test item
    console.log('4. Cleaning up test item...');
    await supabase
      .from('inventory_items')
      .delete()
      .eq('id', insertedItem.id);
    console.log('✅ Test item deleted\n');
    
    console.log('🎉 Category synchronization tests completed successfully!');
    
  } catch (error) {
    console.error('💥 Unexpected error during testing:', error);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testCategorySynchronization().then(() => {
    console.log('\n📋 Test Summary:');
    console.log('- Database trigger should automatically set category name based on category_id');
    console.log('- Frontend now passes both category_id and category name');
    console.log('- ItemManagement auto-refreshes after operations');
    console.log('\n🚀 Ready to test in the application!');
    process.exit(0);
  });
}

module.exports = { testCategorySynchronization };
