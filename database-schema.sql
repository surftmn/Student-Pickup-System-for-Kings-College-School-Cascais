-- Kings College School - Database Schema for Parent Authentication System
-- This file documents the recommended Supabase database structure

-- 1. STUDENTS TABLE (Enhanced)
-- This table stores student information with proper parent relationships
CREATE TABLE students (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    grade VARCHAR(50),
    class VARCHAR(50),
    photo_url TEXT,
    status VARCHAR(20) DEFAULT 'waiting',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. PARENTS TABLE (Enhanced for Authentication)
-- This table stores parent information and links to Supabase Auth
CREATE TABLE parents (
    id SERIAL PRIMARY KEY,
    auth_user_id UUID REFERENCES auth.users(id), -- Links to Supabase Auth
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    relationship VARCHAR(50), -- 'mother', 'father', 'guardian', etc.
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. PARENT_STUDENT_RELATIONSHIPS TABLE (Many-to-Many)
-- This allows multiple parents per student and multiple students per parent
CREATE TABLE parent_student_relationships (
    id SERIAL PRIMARY KEY,
    parent_id INTEGER REFERENCES parents(id) ON DELETE CASCADE,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
    relationship_type VARCHAR(50), -- 'mother', 'father', 'guardian', etc.
    is_primary_contact BOOLEAN DEFAULT FALSE,
    can_pickup BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(parent_id, student_id)
);

-- 4. PICKUP_CALLS TABLE (Enhanced)
-- Track pickup requests and their status
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

-- 5. INDEXES for better performance
CREATE INDEX idx_parents_auth_user_id ON parents(auth_user_id);
CREATE INDEX idx_parents_email ON parents(email);
CREATE INDEX idx_parent_student_parent_id ON parent_student_relationships(parent_id);
CREATE INDEX idx_parent_student_student_id ON parent_student_relationships(student_id);
CREATE INDEX idx_pickup_calls_student_id ON pickup_calls(student_id);
CREATE INDEX idx_pickup_calls_parent_id ON pickup_calls(parent_id);

-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- Enable RLS on all tables
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_student_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE pickup_calls ENABLE ROW LEVEL SECURITY;

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

-- Admin/Monitor/Security have full access (you'll need to set up roles)
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

-- 7. FUNCTIONS for common operations
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