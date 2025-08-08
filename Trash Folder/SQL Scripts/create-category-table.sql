-- Create category table
CREATE TABLE IF NOT EXISTS category (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    attributes JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_modified TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on name for faster searches
CREATE INDEX IF NOT EXISTS idx_category_name ON category(name);

-- Create trigger to update last_modified automatically
CREATE OR REPLACE FUNCTION update_last_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_modified = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_category_last_modified
    BEFORE UPDATE ON category
    FOR EACH ROW
    EXECUTE FUNCTION update_last_modified_column();

-- Insert some sample data
INSERT INTO category (name, attributes) VALUES 
    ('Laptops', '["Processor", "RAM", "Storage", "Display Size", "Graphics Card"]'::jsonb),
    ('Mobile Phones', '["Screen Size", "Camera", "Battery", "Storage", "RAM"]'::jsonb),
    ('Headphones', '["Driver Size", "Frequency Response", "Impedance", "Connection Type"]'::jsonb),
    ('GPU', '["Memory", "Core Clock", "Memory Clock", "Power Consumption", "Interface"]'::jsonb)
ON CONFLICT (name) DO NOTHING;
