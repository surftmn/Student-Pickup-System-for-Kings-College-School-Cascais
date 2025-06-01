-- Fix the get_parent_children_details function to handle array comparison correctly
CREATE OR REPLACE FUNCTION get_parent_children_details(parent_email VARCHAR)
RETURNS TABLE (
    student_id INTEGER,
    student_name TEXT,
    student_class TEXT,
    student_grade TEXT,
    student_photo_url TEXT,
    student_status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id::INTEGER,
        s.name,
        s.class,
        s.grade,
        s.photo_url,
        COALESCE(s.status, 'waiting') as status
    FROM students s
    INNER JOIN parents p ON s.id = ANY(p.student_ids)
    WHERE p.email = parent_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 