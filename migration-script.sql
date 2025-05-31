-- Kings College School - Migration Script for Parent Authentication System
-- This script safely adds new tables and columns to your existing database

-- First, let's check what columns exist in your current students table
-- and add any missing ones

-- Add missing columns to students table if they don't exist
DO $$ 
BEGIN
    -- Add grade column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'students' AND column_name = 'grade') THEN
        ALTER TABLE students ADD COLUMN grade VARCHAR(50);
    END IF;
    
    -- Add class column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'students' AND column_name = 'class') THEN
        ALTER TABLE students ADD COLUMN class VARCHAR(50);
    END IF;
    
    -- Add photo_url column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'students' AND column_name = 'photo_url') THEN
        ALTER TABLE students ADD COLUMN photo_url TEXT;
    END IF;
    
    -- Add status column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'students' AND column_name = 'status') THEN
        ALTER TABLE students ADD COLUMN status VARCHAR(20) DEFAULT 'waiting';
    END IF;
    
    -- Add updated_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'students' AND column_name = 'updated_at') THEN
        ALTER TABLE students ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
    END IF;
END $$;

-- Create parents table (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS parents (
    id SERIAL PRIMARY KEY,
    auth_user_id UUID REFERENCES auth.users(id), -- Links to Supabase Auth
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    relationship VARCHAR(50), -- 'mother', 'father', 'guardian', etc.
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create parent_student_relationships table (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS parent_student_relationships (
    id SERIAL PRIMARY KEY,
    parent_id INTEGER REFERENCES parents(id) ON DELETE CASCADE,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
    relationship_type VARCHAR(50), -- 'mother', 'father', 'guardian', etc.
    is_primary_contact BOOLEAN DEFAULT FALSE,
    can_pickup BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(parent_id, student_id)
);

-- Check if pickup_calls table exists and modify it, or create it
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pickup_calls') THEN
        -- Table exists, add missing columns
        
        -- Add parent_id column if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'pickup_calls' AND column_name = 'parent_id') THEN
            ALTER TABLE pickup_calls ADD COLUMN parent_id INTEGER REFERENCES parents(id);
        END IF;
        
        -- Add monitor_id column if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'pickup_calls' AND column_name = 'monitor_id') THEN
            ALTER TABLE pickup_calls ADD COLUMN monitor_id UUID;
        END IF;
        
        -- Add security_completed_by column if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'pickup_calls' AND column_name = 'security_completed_by') THEN
            ALTER TABLE pickup_calls ADD COLUMN security_completed_by UUID;
        END IF;
        
        -- Add completed_at column if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'pickup_calls' AND column_name = 'completed_at') THEN
            ALTER TABLE pickup_calls ADD COLUMN completed_at TIMESTAMP;
        END IF;
        
    ELSE
        -- Table doesn't exist, create it
        CREATE TABLE pickup_calls (
            id SERIAL PRIMARY KEY,
            student_id INTEGER REFERENCES students(id),
            parent_id INTEGER REFERENCES parents(id), -- Who requested the pickup
            caller_name VARCHAR(255),
            called_time TIMESTAMP DEFAULT NOW(),
            status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'completed', 'cancelled'
            response_time_seconds INTEGER,
            notes TEXT,
            monitor_id UUID, -- Who processed the call
            security_completed_by UUID, -- Who marked as completed
            completed_at TIMESTAMP
        );
    END IF;
END $$;

-- Create indexes for better performance (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_parents_auth_user_id ON parents(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_parents_email ON parents(email);
CREATE INDEX IF NOT EXISTS idx_parent_student_parent_id ON parent_student_relationships(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_student_student_id ON parent_student_relationships(student_id);
CREATE INDEX IF NOT EXISTS idx_pickup_calls_student_id ON pickup_calls(student_id);
CREATE INDEX IF NOT EXISTS idx_pickup_calls_parent_id ON pickup_calls(parent_id);

-- Enable Row Level Security on all tables
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_student_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE pickup_calls ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Parents can view own profile" ON parents;
DROP POLICY IF EXISTS "Parents can update own profile" ON parents;
DROP POLICY IF EXISTS "Parents can view their students" ON students;
DROP POLICY IF EXISTS "Parents can view their relationships" ON parent_student_relationships;
DROP POLICY IF EXISTS "Parents can view their pickup calls" ON pickup_calls;
DROP POLICY IF EXISTS "Parents can create pickup calls" ON pickup_calls;
DROP POLICY IF EXISTS "Staff full access students" ON students;
DROP POLICY IF EXISTS "Staff full access parents" ON parents;
DROP POLICY IF EXISTS "Staff full access relationships" ON parent_student_relationships;
DROP POLICY IF EXISTS "Staff full access pickup calls" ON pickup_calls;

-- Create RLS policies
-- Parents can only see their own data
CREATE POLICY "Parents can view own profile" ON parents
    FOR SELECT USING (auth_user_id = auth.uid());

CREATE POLICY "Parents can update own profile" ON parents
    FOR UPDATE USING (auth_user_id = auth.uid());

-- Parents can only see their own students
CREATE POLICY "Parents can view their students" ON students
    FOR SELECT USING (
        id IN (
            SELECT student_id FROM parent_student_relationships 
            WHERE parent_id IN (
                SELECT id FROM parents WHERE auth_user_id = auth.uid()
            )
        )
    );

-- Parents can only see their own relationships
CREATE POLICY "Parents can view their relationships" ON parent_student_relationships
    FOR SELECT USING (
        parent_id IN (
            SELECT id FROM parents WHERE auth_user_id = auth.uid()
        )
    );

-- Parents can only see pickup calls for their students
CREATE POLICY "Parents can view their pickup calls" ON pickup_calls
    FOR SELECT USING (
        student_id IN (
            SELECT student_id FROM parent_student_relationships 
            WHERE parent_id IN (
                SELECT id FROM parents WHERE auth_user_id = auth.uid()
            )
        )
    );

-- Parents can create pickup calls for their students
CREATE POLICY "Parents can create pickup calls" ON pickup_calls
    FOR INSERT WITH CHECK (
        student_id IN (
            SELECT student_id FROM parent_student_relationships 
            WHERE parent_id IN (
                SELECT id FROM parents WHERE auth_user_id = auth.uid()
            )
            AND can_pickup = TRUE
        )
    );

-- Admin/Monitor/Security have full access
CREATE POLICY "Staff full access students" ON students
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND raw_user_meta_data->>'role' IN ('admin', 'monitor', 'security')
        )
    );

CREATE POLICY "Staff full access parents" ON parents
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND raw_user_meta_data->>'role' IN ('admin', 'monitor', 'security')
        )
    );

CREATE POLICY "Staff full access relationships" ON parent_student_relationships
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND raw_user_meta_data->>'role' IN ('admin', 'monitor', 'security')
        )
    );

CREATE POLICY "Staff full access pickup calls" ON pickup_calls
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND raw_user_meta_data->>'role' IN ('admin', 'monitor', 'security')
        )
    );

-- Create helper functions
-- Function to get parent's students
CREATE OR REPLACE FUNCTION get_parent_students(parent_auth_id UUID)
RETURNS TABLE (
    student_id INTEGER,
    student_name VARCHAR,
    student_grade VARCHAR,
    student_class VARCHAR,
    student_photo_url TEXT,
    student_status VARCHAR,
    relationship_type VARCHAR,
    is_primary_contact BOOLEAN,
    can_pickup BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.name,
        s.grade,
        s.class,
        s.photo_url,
        s.status,
        psr.relationship_type,
        psr.is_primary_contact,
        psr.can_pickup
    FROM students s
    JOIN parent_student_relationships psr ON s.id = psr.student_id
    JOIN parents p ON psr.parent_id = p.id
    WHERE p.auth_user_id = parent_auth_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create a pickup request
CREATE OR REPLACE FUNCTION create_pickup_request(
    p_student_id INTEGER,
    p_parent_auth_id UUID,
    p_notes TEXT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    parent_record parents%ROWTYPE;
    pickup_id INTEGER;
BEGIN
    -- Get parent record
    SELECT * INTO parent_record 
    FROM parents 
    WHERE auth_user_id = p_parent_auth_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Parent not found';
    END IF;
    
    -- Check if parent can pickup this student
    IF NOT EXISTS (
        SELECT 1 FROM parent_student_relationships 
        WHERE parent_id = parent_record.id 
        AND student_id = p_student_id 
        AND can_pickup = TRUE
    ) THEN
        RAISE EXCEPTION 'Parent not authorized to pickup this student';
    END IF;
    
    -- Create pickup call
    INSERT INTO pickup_calls (student_id, parent_id, caller_name, notes)
    VALUES (p_student_id, parent_record.id, parent_record.name, p_notes)
    RETURNING id INTO pickup_id;
    
    RETURN pickup_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Success message
DO $$ 
BEGIN
    RAISE NOTICE 'Migration completed successfully! New tables and columns have been added.';
END $$; 