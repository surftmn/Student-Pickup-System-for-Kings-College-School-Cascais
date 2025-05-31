-- Kings College School - Simple Migration Script for Parent Authentication System
-- This script safely adds new tables and columns to your existing database
-- Step-by-step approach to avoid auth.users reference issues

-- Step 1: Add missing columns to students table if they don't exist
DO $$ 
BEGIN
    -- Add grade column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'students' AND column_name = 'grade') THEN
        ALTER TABLE students ADD COLUMN grade VARCHAR(50);
        RAISE NOTICE 'Added grade column to students table';
    END IF;
    
    -- Add class column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'students' AND column_name = 'class') THEN
        ALTER TABLE students ADD COLUMN class VARCHAR(50);
        RAISE NOTICE 'Added class column to students table';
    END IF;
    
    -- Add photo_url column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'students' AND column_name = 'photo_url') THEN
        ALTER TABLE students ADD COLUMN photo_url TEXT;
        RAISE NOTICE 'Added photo_url column to students table';
    END IF;
    
    -- Add status column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'students' AND column_name = 'status') THEN
        ALTER TABLE students ADD COLUMN status VARCHAR(20) DEFAULT 'waiting';
        RAISE NOTICE 'Added status column to students table';
    END IF;
    
    -- Add updated_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'students' AND column_name = 'updated_at') THEN
        ALTER TABLE students ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
        RAISE NOTICE 'Added updated_at column to students table';
    END IF;
END $$;

-- Step 2: Create parents table (without auth.users reference for now)
CREATE TABLE IF NOT EXISTS parents (
    id SERIAL PRIMARY KEY,
    auth_user_id UUID, -- Will link to Supabase Auth users
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    relationship VARCHAR(50), -- 'mother', 'father', 'guardian', etc.
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Step 3: Create parent_student_relationships table
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

-- Step 4: Handle pickup_calls table
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pickup_calls') THEN
        -- Table exists, add missing columns
        RAISE NOTICE 'pickup_calls table exists, adding missing columns...';
        
        -- Add parent_id column if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'pickup_calls' AND column_name = 'parent_id') THEN
            ALTER TABLE pickup_calls ADD COLUMN parent_id INTEGER REFERENCES parents(id);
            RAISE NOTICE 'Added parent_id column to pickup_calls table';
        END IF;
        
        -- Add monitor_id column if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'pickup_calls' AND column_name = 'monitor_id') THEN
            ALTER TABLE pickup_calls ADD COLUMN monitor_id UUID;
            RAISE NOTICE 'Added monitor_id column to pickup_calls table';
        END IF;
        
        -- Add security_completed_by column if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'pickup_calls' AND column_name = 'security_completed_by') THEN
            ALTER TABLE pickup_calls ADD COLUMN security_completed_by UUID;
            RAISE NOTICE 'Added security_completed_by column to pickup_calls table';
        END IF;
        
        -- Add completed_at column if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'pickup_calls' AND column_name = 'completed_at') THEN
            ALTER TABLE pickup_calls ADD COLUMN completed_at TIMESTAMP;
            RAISE NOTICE 'Added completed_at column to pickup_calls table';
        END IF;
        
    ELSE
        -- Table doesn't exist, create it
        RAISE NOTICE 'Creating pickup_calls table...';
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

-- Step 5: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_parents_auth_user_id ON parents(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_parents_email ON parents(email);
CREATE INDEX IF NOT EXISTS idx_parent_student_parent_id ON parent_student_relationships(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_student_student_id ON parent_student_relationships(student_id);
CREATE INDEX IF NOT EXISTS idx_pickup_calls_student_id ON pickup_calls(student_id);
CREATE INDEX IF NOT EXISTS idx_pickup_calls_parent_id ON pickup_calls(parent_id);

-- Step 6: Create helper functions (without RLS for now)
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
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Basic migration completed successfully!';
    RAISE NOTICE 'Tables created: parents, parent_student_relationships';
    RAISE NOTICE 'Columns added to students table';
    RAISE NOTICE 'Helper functions created';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Create parent accounts in Supabase Auth';
    RAISE NOTICE '2. Add parent records to parents table';
    RAISE NOTICE '3. Link parents to students';
    RAISE NOTICE '4. Test the parent dashboard';
    RAISE NOTICE '==============================================';
END $$; 