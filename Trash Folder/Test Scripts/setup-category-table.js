const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Replace these with your actual Supabase URL and service role key (not anon key)
const SUPABASE_URL = 'https://zgdfjcodbzpkjlgnjxrk.supabase.co';
const SUPABASE_SERVICE_KEY = 'YOUR_SERVICE_ROLE_KEY_HERE'; // You need to get this from your Supabase dashboard

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function createCategoryTable() {
  console.log('Creating category table...');
  
  try {
    // Read the SQL file
    const sql = fs.readFileSync('create-category-table.sql', 'utf8');
    console.log('SQL file read successfully');
    
    // For now, let's try to execute each statement individually
    const statements = [
      `CREATE TABLE IF NOT EXISTS category (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL UNIQUE,
        attributes JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        last_modified TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_category_name ON category(name)`,
      `CREATE OR REPLACE FUNCTION update_last_modified_column()
       RETURNS TRIGGER AS $$
       BEGIN
           NEW.last_modified = NOW();
           RETURN NEW;
       END;
       $$ language 'plpgsql'`,
      `CREATE TRIGGER update_category_last_modified
       BEFORE UPDATE ON category
       FOR EACH ROW
       EXECUTE FUNCTION update_last_modified_column()`,
      `INSERT INTO category (name, attributes) VALUES 
       ('Laptops', '["Processor", "RAM", "Storage", "Display Size", "Graphics Card"]'::jsonb),
       ('Mobile Phones', '["Screen Size", "Camera", "Battery", "Storage", "RAM"]'::jsonb),
       ('Headphones', '["Driver Size", "Frequency Response", "Impedance", "Connection Type"]'::jsonb),
       ('GPU', '["Memory", "Core Clock", "Memory Clock", "Power Consumption", "Interface"]'::jsonb)
       ON CONFLICT (name) DO NOTHING`
    ];
    
    for (let i = 0; i < statements.length; i++) {
      console.log(`Executing statement ${i + 1}/${statements.length}...`);
      const { error } = await supabase.rpc('exec_sql', { sql_query: statements[i] });
      if (error) {
        console.error(`Error in statement ${i + 1}:`, error);
      } else {
        console.log(`Statement ${i + 1} executed successfully`);
      }
    }
    
    console.log('Category table setup completed!');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

createCategoryTable();
