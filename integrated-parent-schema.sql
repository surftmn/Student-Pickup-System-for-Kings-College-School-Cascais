-- Kings College School - Integrated Parent Management System
-- This schema integrates the new parent login system with existing students table

-- Step 1: Create the new parents_login table (separate from existing students.parent_contact)
CREATE TABLE IF NOT EXISTS parents_login (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    relationship VARCHAR(50) DEFAULT 'parent', -- 'mother', 'father', 'guardian', etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Create parent_student_relationships table to link parents with students
CREATE TABLE IF NOT EXISTS parent_student_relationships (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    parent_id UUID REFERENCES parents_login(id) ON DELETE CASCADE,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
    relationship_type VARCHAR(50) DEFAULT 'parent', -- 'mother', 'father', 'guardian'
    is_primary_contact BOOLEAN DEFAULT FALSE,
    can_pickup BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(parent_id, student_id)
);

-- Step 3: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_parents_login_email ON parents_login(email);
CREATE INDEX IF NOT EXISTS idx_parent_student_parent_id ON parent_student_relationships(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_student_student_id ON parent_student_relationships(student_id);

-- Step 4: Create trigger for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_parents_login_updated_at ON parents_login;
CREATE TRIGGER update_parents_login_updated_at
    BEFORE UPDATE ON parents_login
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Step 5: Enable Row Level Security
ALTER TABLE parents_login ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_student_relationships ENABLE ROW LEVEL SECURITY;

-- Step 6: Create RLS policies for parents_login table
CREATE POLICY "Admins can manage all parent logins" ON parents_login
    FOR ALL
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

-- Step 7: Create RLS policies for parent_student_relationships
CREATE POLICY "Admins can manage all relationships" ON parent_student_relationships
    FOR ALL
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

-- Step 8: Create helpful views
CREATE OR REPLACE VIEW parent_children_view AS
SELECT 
    pl.id as parent_id,
    pl.email,
    pl.name as parent_name,
    pl.password,
    pl.phone,
    pl.relationship,
    s.id as student_id,
    s.name as student_name,
    s.class,
    s.grade,
    s.parent_contact as original_parent_contact,
    psr.relationship_type,
    psr.is_primary_contact,
    psr.can_pickup
FROM parents_login pl
LEFT JOIN parent_student_relationships psr ON pl.id = psr.parent_id
LEFT JOIN students s ON psr.student_id = s.id
ORDER BY pl.name, s.name;

-- Step 9: Create function to get parent's children for login
CREATE OR REPLACE FUNCTION get_parent_children(parent_email VARCHAR)
RETURNS TABLE (
    student_id INTEGER,
    student_name VARCHAR,
    student_class VARCHAR,
    student_grade VARCHAR,
    relationship_type VARCHAR,
    can_pickup BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.name,
        s.class,
        s.grade,
        psr.relationship_type,
        psr.can_pickup
    FROM students s
    JOIN parent_student_relationships psr ON s.id = psr.student_id
    JOIN parents_login pl ON psr.parent_id = pl.id
    WHERE pl.email = parent_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 10: Create function for parent login authentication
CREATE OR REPLACE FUNCTION authenticate_parent(
    p_email VARCHAR,
    p_password VARCHAR
)
RETURNS TABLE (
    success BOOLEAN,
    parent_id UUID,
    parent_name VARCHAR,
    message TEXT
) AS $$
DECLARE
    parent_record parents_login%ROWTYPE;
BEGIN
    -- Check if parent exists and password matches
    SELECT * INTO parent_record 
    FROM parents_login 
    WHERE email = p_email AND password = p_password;
    
    IF FOUND THEN
        RETURN QUERY SELECT TRUE, parent_record.id, parent_record.name, 'Login successful'::TEXT;
    ELSE
        RETURN QUERY SELECT FALSE, NULL::UUID, NULL::VARCHAR, 'Invalid email or password'::TEXT;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 11: Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON parents_login TO authenticated;
GRANT ALL ON parent_student_relationships TO authenticated;
GRANT SELECT ON parent_children_view TO authenticated;

-- Step 12: Add helpful comments
COMMENT ON TABLE parents_login IS 'Stores parent login credentials separate from Supabase auth';
COMMENT ON TABLE parent_student_relationships IS 'Links parents with their children (many-to-many relationship)';
COMMENT ON COLUMN parents_login.email IS 'Parent email address for login';
COMMENT ON COLUMN parents_login.password IS 'Auto-generated password (email prefix + 4 digits)';
COMMENT ON COLUMN parent_student_relationships.can_pickup IS 'Whether this parent is authorized to pick up this child';
COMMENT ON VIEW parent_children_view IS 'Easy view to see parent-child relationships with all details';

-- Step 13: INSERT SAMPLE PARENT DATA WITH GENERATED PASSWORDS
-- Based on sample-parents-test.csv data
INSERT INTO parents_login (email, name, password, relationship) VALUES 
    ('john.smith@gmail.com', 'John Smith', 'john1234', 'parent'),
    ('maria.garcia@gmail.com', 'Maria Garcia', 'maria5678', 'parent'),
    ('david.johnson@gmail.com', 'David Johnson', 'david9012', 'parent'),
    ('sarah.brown@gmail.com', 'Sarah Brown', 'sarah3456', 'parent'),
    ('michael.davis@gmail.com', 'Michael Davis', 'michael7890', 'parent'),
    ('jennifer.wilson@gmail.com', 'Jennifer Wilson', 'jennifer1234', 'parent'),
    ('robert.miller@gmail.com', 'Robert Miller', 'robert5678', 'parent'),
    ('lisa.anderson@gmail.com', 'Lisa Anderson', 'lisa9012', 'parent'),
    ('william.taylor@gmail.com', 'William Taylor', 'william3456', 'parent'),
    ('jessica.thomas@gmail.com', 'Jessica Thomas', 'jessica7890', 'parent'),
    ('christopher.jackson@gmail.com', 'Christopher Jackson', 'christopher1234', 'parent'),
    ('amanda.white@gmail.com', 'Amanda White', 'amanda5678', 'parent'),
    ('matthew.harris@gmail.com', 'Matthew Harris', 'matthew9012', 'parent'),
    ('ashley.martin@gmail.com', 'Ashley Martin', 'ashley3456', 'parent'),
    ('daniel.thompson@gmail.com', 'Daniel Thompson', 'daniel7890', 'parent')
ON CONFLICT (email) DO NOTHING;

-- Step 14: CREATE HELPER FUNCTION TO ENSURE STUDENTS EXIST AND LINK PARENTS
-- This function will create students if they don't exist and link them to parents
CREATE OR REPLACE FUNCTION ensure_student_exists_and_link_parent(
    student_name VARCHAR,
    parent_email VARCHAR,
    student_class VARCHAR DEFAULT NULL,
    student_grade VARCHAR DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    student_record students%ROWTYPE;
    parent_record parents_login%ROWTYPE;
    student_id_result INTEGER;
BEGIN
    -- Get parent record
    SELECT * INTO parent_record FROM parents_login WHERE email = parent_email;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Parent with email % not found', parent_email;
    END IF;
    
    -- Check if student exists
    SELECT * INTO student_record FROM students WHERE name = student_name;
    
    IF NOT FOUND THEN
        -- Create the student if they don't exist
        INSERT INTO students (name, class, grade, parent_contact)
        VALUES (
            student_name, 
            COALESCE(student_class, 'TBD'),
            COALESCE(student_grade, 'TBD'),
            parent_record.name || ' - ' || parent_record.email
        )
        RETURNING id INTO student_id_result;
        
        RAISE NOTICE 'Created new student: % (ID: %)', student_name, student_id_result;
    ELSE
        student_id_result := student_record.id;
        RAISE NOTICE 'Found existing student: % (ID: %)', student_name, student_id_result;
    END IF;
    
    -- Create parent-student relationship if it doesn't exist
    INSERT INTO parent_student_relationships (parent_id, student_id, relationship_type, is_primary_contact, can_pickup)
    VALUES (parent_record.id, student_id_result, 'parent', TRUE, TRUE)
    ON CONFLICT (parent_id, student_id) DO NOTHING;
    
    RETURN student_id_result;
END;
$$ LANGUAGE plpgsql;

-- Step 15: CREATE ALL PARENT-CHILD RELATIONSHIPS BASED ON CSV DATA
-- This will create students if they don't exist and link them to parents

-- John Smith's children
SELECT ensure_student_exists_and_link_parent('Emma Smith', 'john.smith@gmail.com', 'Class 2A', 'Grade 2');
SELECT ensure_student_exists_and_link_parent('Liam Smith', 'john.smith@gmail.com', 'Class 4B', 'Grade 4');

-- Maria Garcia's children
SELECT ensure_student_exists_and_link_parent('Sofia Garcia', 'maria.garcia@gmail.com', 'Class 1A', 'Grade 1');

-- David Johnson's children
SELECT ensure_student_exists_and_link_parent('Oliver Johnson', 'david.johnson@gmail.com', 'Class 3C', 'Grade 3');
SELECT ensure_student_exists_and_link_parent('Isabella Johnson', 'david.johnson@gmail.com', 'Class 5A', 'Grade 5');

-- Sarah Brown's children
SELECT ensure_student_exists_and_link_parent('Noah Brown', 'sarah.brown@gmail.com', 'Class 2B', 'Grade 2');

-- Michael Davis's children
SELECT ensure_student_exists_and_link_parent('Ava Davis', 'michael.davis@gmail.com', 'Class 1B', 'Grade 1');
SELECT ensure_student_exists_and_link_parent('Ethan Davis', 'michael.davis@gmail.com', 'Class 3A', 'Grade 3');
SELECT ensure_student_exists_and_link_parent('Mia Davis', 'michael.davis@gmail.com', 'Class 5B', 'Grade 5');

-- Jennifer Wilson's children
SELECT ensure_student_exists_and_link_parent('Lucas Wilson', 'jennifer.wilson@gmail.com', 'Class 4A', 'Grade 4');

-- Robert Miller's children
SELECT ensure_student_exists_and_link_parent('Sophia Miller', 'robert.miller@gmail.com', 'Class 2C', 'Grade 2');
SELECT ensure_student_exists_and_link_parent('James Miller', 'robert.miller@gmail.com', 'Class 6A', 'Grade 6');

-- Lisa Anderson's children
SELECT ensure_student_exists_and_link_parent('Charlotte Anderson', 'lisa.anderson@gmail.com', 'Class 1C', 'Grade 1');

-- William Taylor's children
SELECT ensure_student_exists_and_link_parent('Benjamin Taylor', 'william.taylor@gmail.com', 'Class 3B', 'Grade 3');
SELECT ensure_student_exists_and_link_parent('Amelia Taylor', 'william.taylor@gmail.com', 'Class 5C', 'Grade 5');

-- Jessica Thomas's children
SELECT ensure_student_exists_and_link_parent('Henry Thomas', 'jessica.thomas@gmail.com', 'Class 4C', 'Grade 4');

-- Christopher Jackson's children
SELECT ensure_student_exists_and_link_parent('Harper Jackson', 'christopher.jackson@gmail.com', 'Class 2A', 'Grade 2');
SELECT ensure_student_exists_and_link_parent('Alexander Jackson', 'christopher.jackson@gmail.com', 'Class 6B', 'Grade 6');

-- Amanda White's children
SELECT ensure_student_exists_and_link_parent('Evelyn White', 'amanda.white@gmail.com', 'Class 1A', 'Grade 1');

-- Matthew Harris's children
SELECT ensure_student_exists_and_link_parent('Sebastian Harris', 'matthew.harris@gmail.com', 'Class 3C', 'Grade 3');
SELECT ensure_student_exists_and_link_parent('Aria Harris', 'matthew.harris@gmail.com', 'Class 5A', 'Grade 5');

-- Ashley Martin's children
SELECT ensure_student_exists_and_link_parent('Gabriel Martin', 'ashley.martin@gmail.com', 'Class 4B', 'Grade 4');

-- Daniel Thompson's children
SELECT ensure_student_exists_and_link_parent('Chloe Thompson', 'daniel.thompson@gmail.com', 'Class 2B', 'Grade 2');
SELECT ensure_student_exists_and_link_parent('Owen Thompson', 'daniel.thompson@gmail.com', 'Class 4A', 'Grade 4');
SELECT ensure_student_exists_and_link_parent('Luna Thompson', 'daniel.thompson@gmail.com', 'Class 6C', 'Grade 6');

-- Step 16: Create summary view for testing
CREATE OR REPLACE VIEW parent_login_summary AS
SELECT 
    pl.email,
    pl.name as parent_name,
    pl.password,
    COUNT(psr.student_id) as num_children,
    STRING_AGG(s.name, '; ' ORDER BY s.name) as children_names,
    STRING_AGG(s.class, '; ' ORDER BY s.name) as children_classes
FROM parents_login pl
LEFT JOIN parent_student_relationships psr ON pl.id = psr.parent_id
LEFT JOIN students s ON psr.student_id = s.id
GROUP BY pl.id, pl.email, pl.name, pl.password
ORDER BY pl.name;

-- Step 17: Success message and next steps
DO $$ 
BEGIN
    RAISE NOTICE '✅ Parent login system setup complete!';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Run: SELECT * FROM parent_login_summary; to see all parent accounts';
    RAISE NOTICE '2. Test login with: SELECT * FROM authenticate_parent(''john.smith@gmail.com'', ''john1234'');';
    RAISE NOTICE '3. See parent children: SELECT * FROM get_parent_children(''john.smith@gmail.com'');';
    RAISE NOTICE '4. View all relationships: SELECT * FROM parent_children_view;';
    RAISE NOTICE '';
    RAISE NOTICE 'All parents now have accounts and can login to see their children!';
END $$; 