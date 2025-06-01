-- Test the get_parent_children_details function
SELECT * FROM get_parent_children_details('testreal@email.com');

-- Also check if the parent exists and has student_ids
SELECT id, name, email, student_ids FROM parents WHERE email = 'testreal@email.com';

-- Check if students 17 and 13 exist
SELECT id, name, class, grade FROM students WHERE id IN (17, 13); 