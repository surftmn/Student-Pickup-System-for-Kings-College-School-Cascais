-- Kings College School - Schema for Existing Parents Table with Student IDs
-- This works with your existing parents table structure and adds login functionality

-- Step 1: Enhance your existing parents table with login fields
-- Add missing columns to existing parents table if they don't exist
DO $$ 
BEGIN
    -- Add email column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'parents' AND column_name = 'email') THEN
        ALTER TABLE parents ADD COLUMN email VARCHAR(255) UNIQUE;
        RAISE NOTICE 'Added email column to parents table';
    END IF;
    
    -- Add password column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'parents' AND column_name = 'password') THEN
        ALTER TABLE parents ADD COLUMN password VARCHAR(255);
        RAISE NOTICE 'Added password column to parents table';
    END IF;
    
    -- Add phone column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'parents' AND column_name = 'phone') THEN
        ALTER TABLE parents ADD COLUMN phone VARCHAR(20);
        RAISE NOTICE 'Added phone column to parents table';
    END IF;
    
    -- Add relationship column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'parents' AND column_name = 'relationship') THEN
        ALTER TABLE parents ADD COLUMN relationship VARCHAR(50) DEFAULT 'parent';
        RAISE NOTICE 'Added relationship column to parents table';
    END IF;
    
    -- Add created_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'parents' AND column_name = 'created_at') THEN
        ALTER TABLE parents ADD COLUMN created_at TIMESTAMP DEFAULT NOW();
        RAISE NOTICE 'Added created_at column to parents table';
    END IF;
    
    -- Add updated_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'parents' AND column_name = 'updated_at') THEN
        ALTER TABLE parents ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
        RAISE NOTICE 'Added updated_at column to parents table';
    END IF;
END $$;

-- Step 2: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_parents_email ON parents(email);
CREATE INDEX IF NOT EXISTS idx_parents_student_ids ON parents USING GIN(student_ids);

-- Step 3: Create trigger for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_parents_updated_at ON parents;
CREATE TRIGGER update_parents_updated_at
    BEFORE UPDATE ON parents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Step 4: Enable Row Level Security
ALTER TABLE parents ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS policies
-- Allow admins to manage all parent records
CREATE POLICY "Admins can manage all parents" ON parents
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

-- Step 6: Create function for parent login authentication
CREATE OR REPLACE FUNCTION authenticate_parent(
    p_email VARCHAR,
    p_password VARCHAR
)
RETURNS TABLE (
    success BOOLEAN,
    parent_id INTEGER,
    parent_name VARCHAR,
    student_ids INTEGER[],
    message TEXT
) AS $$
DECLARE
    parent_record parents%ROWTYPE;
BEGIN
    -- Check if parent exists and password matches
    SELECT * INTO parent_record 
    FROM parents 
    WHERE email = p_email AND password = p_password;
    
    IF FOUND THEN
        RETURN QUERY SELECT TRUE, parent_record.id, parent_record.name, parent_record.student_ids, 'Login successful'::TEXT;
    ELSE
        RETURN QUERY SELECT FALSE, NULL::INTEGER, NULL::VARCHAR, NULL::INTEGER[], 'Invalid email or password'::TEXT;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Create function to get parent's children details
CREATE OR REPLACE FUNCTION get_parent_children_details(parent_email VARCHAR)
RETURNS TABLE (
    student_id INTEGER,
    student_name VARCHAR,
    student_class VARCHAR,
    student_grade VARCHAR,
    student_photo_url TEXT,
    student_status VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.name,
        s.class,
        s.grade,
        s.photo_url,
        COALESCE(s.status, 'waiting') as status
    FROM students s
    WHERE s.id = ANY(
        SELECT student_ids 
        FROM parents 
        WHERE email = parent_email
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 8: Create function to find student ID by name
CREATE OR REPLACE FUNCTION find_student_id_by_name(student_name VARCHAR)
RETURNS INTEGER AS $$
DECLARE
    student_id_result INTEGER;
BEGIN
    SELECT id INTO student_id_result 
    FROM students 
    WHERE name ILIKE student_name;
    
    RETURN student_id_result;
END;
$$ LANGUAGE plpgsql;

-- Step 9: Create function to process CSV import and update parents
CREATE OR REPLACE FUNCTION process_parent_csv_import(
    p_parent_name VARCHAR,
    p_email VARCHAR,
    p_children_names TEXT[], -- Array of child names
    p_auto_generate_password BOOLEAN DEFAULT TRUE
)
RETURNS TABLE (
    success BOOLEAN,
    parent_id INTEGER,
    matched_student_ids INTEGER[],
    unmatched_children TEXT[],
    generated_password VARCHAR,
    message TEXT
) AS $$
DECLARE
    parent_record parents%ROWTYPE;
    child_name TEXT;
    student_id_found INTEGER;
    matched_ids INTEGER[] := '{}';
    unmatched_names TEXT[] := '{}';
    generated_pwd VARCHAR;
    email_prefix VARCHAR;
BEGIN
    -- Generate password if requested
    IF p_auto_generate_password THEN
        -- Extract email prefix (before @)
        email_prefix := split_part(p_email, '@', 1);
        -- Remove dots and get first part
        email_prefix := split_part(email_prefix, '.', 1);
        -- Generate password: email_prefix + 4 random digits
        generated_pwd := email_prefix || LPAD((RANDOM() * 9999)::INTEGER::TEXT, 4, '0');
    ELSE
        generated_pwd := 'temp1234'; -- Default temporary password
    END IF;
    
    -- Process each child name to find student IDs
    FOREACH child_name IN ARRAY p_children_names
    LOOP
        student_id_found := find_student_id_by_name(TRIM(child_name));
        
        IF student_id_found IS NOT NULL THEN
            matched_ids := array_append(matched_ids, student_id_found);
        ELSE
            unmatched_names := array_append(unmatched_names, TRIM(child_name));
        END IF;
    END LOOP;
    
    -- Insert or update parent record
    INSERT INTO parents (name, email, password, student_ids, relationship, created_at, updated_at)
    VALUES (p_parent_name, p_email, generated_pwd, matched_ids, 'parent', NOW(), NOW())
    ON CONFLICT (email) 
    DO UPDATE SET 
        name = EXCLUDED.name,
        password = EXCLUDED.password,
        student_ids = EXCLUDED.student_ids,
        updated_at = NOW()
    RETURNING id INTO parent_record.id;
    
    -- Return results
    RETURN QUERY SELECT 
        TRUE,
        parent_record.id,
        matched_ids,
        unmatched_names,
        generated_pwd,
        CASE 
            WHEN array_length(unmatched_names, 1) > 0 THEN
                'Parent created with ' || array_length(matched_ids, 1)::TEXT || ' matched children. ' ||
                array_length(unmatched_names, 1)::TEXT || ' children not found in students table.'
            ELSE
                'Parent created successfully with ' || array_length(matched_ids, 1)::TEXT || ' children.'
        END::TEXT;
    
EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT FALSE, NULL::INTEGER, NULL::INTEGER[], NULL::TEXT[], NULL::VARCHAR, SQLERRM::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Step 10: Create helper view for parent management
CREATE OR REPLACE VIEW parent_management_view AS
SELECT 
    p.id,
    p.name as parent_name,
    p.email,
    p.password,
    p.phone,
    p.relationship,
    p.student_ids,
    array_length(p.student_ids, 1) as num_children,
    STRING_AGG(s.name, '; ' ORDER BY s.name) as children_names,
    STRING_AGG(s.class, '; ' ORDER BY s.name) as children_classes,
    p.created_at,
    p.updated_at
FROM parents p
LEFT JOIN students s ON s.id = ANY(p.student_ids)
GROUP BY p.id, p.name, p.email, p.password, p.phone, p.relationship, p.student_ids, p.created_at, p.updated_at
ORDER BY p.created_at DESC;

-- Step 11: Insert sample data based on your CSV
-- Process each parent from the CSV file
SELECT process_parent_csv_import(
    'John Smith',
    'john.smith@gmail.com',
    ARRAY['Emma Smith', 'Liam Smith']
);

SELECT process_parent_csv_import(
    'Maria Garcia',
    'maria.garcia@gmail.com',
    ARRAY['Sofia Garcia']
);

SELECT process_parent_csv_import(
    'David Johnson',
    'david.johnson@gmail.com',
    ARRAY['Oliver Johnson', 'Isabella Johnson']
);

SELECT process_parent_csv_import(
    'Sarah Brown',
    'sarah.brown@gmail.com',
    ARRAY['Noah Brown']
);

SELECT process_parent_csv_import(
    'Michael Davis',
    'michael.davis@gmail.com',
    ARRAY['Ava Davis', 'Ethan Davis', 'Mia Davis']
);

SELECT process_parent_csv_import(
    'Jennifer Wilson',
    'jennifer.wilson@gmail.com',
    ARRAY['Lucas Wilson']
);

SELECT process_parent_csv_import(
    'Robert Miller',
    'robert.miller@gmail.com',
    ARRAY['Sophia Miller', 'James Miller']
);

SELECT process_parent_csv_import(
    'Lisa Anderson',
    'lisa.anderson@gmail.com',
    ARRAY['Charlotte Anderson']
);

SELECT process_parent_csv_import(
    'William Taylor',
    'william.taylor@gmail.com',
    ARRAY['Benjamin Taylor', 'Amelia Taylor']
);

SELECT process_parent_csv_import(
    'Jessica Thomas',
    'jessica.thomas@gmail.com',
    ARRAY['Henry Thomas']
);

SELECT process_parent_csv_import(
    'Christopher Jackson',
    'christopher.jackson@gmail.com',
    ARRAY['Harper Jackson', 'Alexander Jackson']
);

SELECT process_parent_csv_import(
    'Amanda White',
    'amanda.white@gmail.com',
    ARRAY['Evelyn White']
);

SELECT process_parent_csv_import(
    'Matthew Harris',
    'matthew.harris@gmail.com',
    ARRAY['Sebastian Harris', 'Aria Harris']
);

SELECT process_parent_csv_import(
    'Ashley Martin',
    'ashley.martin@gmail.com',
    ARRAY['Gabriel Martin']
);

SELECT process_parent_csv_import(
    'Daniel Thompson',
    'daniel.thompson@gmail.com',
    ARRAY['Chloe Thompson', 'Owen Thompson', 'Luna Thompson']
);

-- Step 12: Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON parents TO authenticated;
GRANT ALL ON students TO authenticated;
GRANT SELECT ON parent_management_view TO authenticated;

-- Step 13: Add helpful comments
COMMENT ON TABLE parents IS 'Stores parent information with student_ids array linking to their children';
COMMENT ON COLUMN parents.email IS 'Parent email address for login';
COMMENT ON COLUMN parents.password IS 'Auto-generated password (email prefix + 4 digits)';
COMMENT ON COLUMN parents.student_ids IS 'Array of student IDs that belong to this parent';
COMMENT ON VIEW parent_management_view IS 'Comprehensive view of parents with their children details';

-- Step 14: Success message and testing queries
DO $$ 
BEGIN
    RAISE NOTICE '✅ Parent login system setup complete with existing parents table!';
    RAISE NOTICE '';
    RAISE NOTICE 'Testing Commands:';
    RAISE NOTICE '1. View all parents: SELECT * FROM parent_management_view;';
    RAISE NOTICE '2. Test login: SELECT * FROM authenticate_parent(''john.smith@gmail.com'', ''john1234'');';
    RAISE NOTICE '3. Get children: SELECT * FROM get_parent_children_details(''john.smith@gmail.com'');';
    RAISE NOTICE '4. Process new parent: SELECT * FROM process_parent_csv_import(''Test Parent'', ''test@email.com'', ARRAY[''Child Name'']);';
    RAISE NOTICE '';
    RAISE NOTICE 'Workflow:';
    RAISE NOTICE '1. Upload CSV with parent names, emails, and children';
    RAISE NOTICE '2. System matches children to existing students';
    RAISE NOTICE '3. Updates parents table with student_ids';
    RAISE NOTICE '4. Parents can login and see their children cards';
END $$; 