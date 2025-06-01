-- Kings College School Parent Management System
-- SQL Schema for Supabase Database

-- Create the parents table
CREATE TABLE IF NOT EXISTS parents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL, -- Store generated password for admin reference
    children JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of child names
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create an index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_parents_email ON parents(email);

-- Create an index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_parents_created_at ON parents(created_at);

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create a trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_parents_updated_at ON parents;
CREATE TRIGGER update_parents_updated_at
    BEFORE UPDATE ON parents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE parents ENABLE ROW LEVEL SECURITY;

-- Create policies for the parents table

-- Allow admins to read all parent records
CREATE POLICY "Admins can read all parents" ON parents
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND (
                auth.users.user_metadata->>'role' = 'admin'
                OR auth.users.app_metadata->>'role' = 'admin'
            )
        )
    );

-- Allow admins to insert parent records
CREATE POLICY "Admins can insert parents" ON parents
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND (
                auth.users.user_metadata->>'role' = 'admin'
                OR auth.users.app_metadata->>'role' = 'admin'
            )
        )
    );

-- Allow admins to update parent records
CREATE POLICY "Admins can update parents" ON parents
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND (
                auth.users.user_metadata->>'role' = 'admin'
                OR auth.users.app_metadata->>'role' = 'admin'
            )
        )
    );

-- Allow parents to read their own record (for login verification)
CREATE POLICY "Parents can read their own record" ON parents
    FOR SELECT
    USING (email = auth.jwt() ->> 'email');

-- Insert some sample parent data for testing
INSERT INTO parents (email, name, password, children) VALUES 
    ('john.smith@gmail.com', 'John Smith', 'john1234', '["Emma Smith", "Liam Smith"]'),
    ('maria.garcia@gmail.com', 'Maria Garcia', 'maria5678', '["Sofia Garcia"]'),
    ('david.johnson@gmail.com', 'David Johnson', 'david9012', '["Oliver Johnson", "Isabella Johnson"]'),
    ('sarah.brown@gmail.com', 'Sarah Brown', 'sarah3456', '["Noah Brown"]'),
    ('michael.davis@gmail.com', 'Michael Davis', 'michael7890', '["Ava Davis", "Ethan Davis", "Mia Davis"]')
ON CONFLICT (email) DO NOTHING;

-- Create a view for easy admin access to parent information
CREATE OR REPLACE VIEW parent_summary AS
SELECT 
    id,
    email,
    name,
    password,
    jsonb_array_length(children) as num_children,
    children,
    created_at,
    updated_at
FROM parents
ORDER BY created_at DESC;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON parents TO authenticated;
GRANT SELECT ON parent_summary TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE parents IS 'Stores parent account information for the school pickup system';
COMMENT ON COLUMN parents.email IS 'Parent email address, used for login';
COMMENT ON COLUMN parents.name IS 'Full name of the parent';
COMMENT ON COLUMN parents.password IS 'Generated password (stored for admin reference)';
COMMENT ON COLUMN parents.children IS 'JSON array of child names associated with this parent';
COMMENT ON COLUMN parents.created_at IS 'Timestamp when the parent account was created';
COMMENT ON COLUMN parents.updated_at IS 'Timestamp when the parent account was last updated'; 