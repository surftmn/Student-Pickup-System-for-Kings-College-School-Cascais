-- Kings College School Pickup System Database Setup
-- Run these commands in your Supabase SQL Editor

-- 1. Create students table (if it doesn't exist or needs updating)
DROP TABLE IF EXISTS students CASCADE;
CREATE TABLE students (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    class TEXT NOT NULL,
    photo_url TEXT,
    status TEXT DEFAULT 'waiting',
    parent_contact TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create pickup_calls table for tracking response times
DROP TABLE IF EXISTS pickup_calls CASCADE;
CREATE TABLE pickup_calls (
    id BIGSERIAL PRIMARY KEY,
    student_id BIGINT REFERENCES students(id) ON DELETE CASCADE,
    student_name TEXT NOT NULL,
    called_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_time TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'called', -- 'called', 'completed', 'cancelled'
    security_user TEXT NOT NULL,
    response_time_seconds INTEGER, -- calculated when completed
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create pickup_log table (for completed pickups)
DROP TABLE IF EXISTS pickup_log CASCADE;
CREATE TABLE pickup_log (
    id BIGSERIAL PRIMARY KEY,
    student_id BIGINT REFERENCES students(id) ON DELETE CASCADE,
    parent_name TEXT NOT NULL,
    pickup_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT DEFAULT 'completed',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create chat_messages table
DROP TABLE IF EXISTS chat_messages CASCADE;
CREATE TABLE chat_messages (
    id BIGSERIAL PRIMARY KEY,
    user_role TEXT NOT NULL,
    user_name TEXT NOT NULL,
    message TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create parents table for user management
DROP TABLE IF EXISTS parents CASCADE;
CREATE TABLE parents (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    password_hash TEXT, -- In production, passwords should be hashed
    student_ids INTEGER[], -- Array of student IDs this parent can pick up
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Enable Row Level Security (optional - for production)
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE pickup_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE pickup_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE parents ENABLE ROW LEVEL SECURITY;

-- 7. Create policies for public access (for demo purposes)
-- In production, you should create more restrictive policies

-- Students policies
DROP POLICY IF EXISTS "Enable all operations for students" ON students;
CREATE POLICY "Enable all operations for students" ON students
    FOR ALL USING (true) WITH CHECK (true);

-- Pickup calls policies
DROP POLICY IF EXISTS "Enable all operations for pickup_calls" ON pickup_calls;
CREATE POLICY "Enable all operations for pickup_calls" ON pickup_calls
    FOR ALL USING (true) WITH CHECK (true);

-- Pickup log policies
DROP POLICY IF EXISTS "Enable all operations for pickup_log" ON pickup_log;
CREATE POLICY "Enable all operations for pickup_log" ON pickup_log
    FOR ALL USING (true) WITH CHECK (true);

-- Chat messages policies
DROP POLICY IF EXISTS "Enable all operations for chat_messages" ON chat_messages;
CREATE POLICY "Enable all operations for chat_messages" ON chat_messages
    FOR ALL USING (true) WITH CHECK (true);

-- Parents policies
DROP POLICY IF EXISTS "Enable all operations for parents" ON parents;
CREATE POLICY "Enable all operations for parents" ON parents
    FOR ALL USING (true) WITH CHECK (true);

-- 8. Create function to automatically calculate response time
CREATE OR REPLACE FUNCTION update_response_time()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND NEW.completed_time IS NOT NULL AND OLD.completed_time IS NULL THEN
        NEW.response_time_seconds = EXTRACT(EPOCH FROM (NEW.completed_time - NEW.called_time))::INTEGER;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Create trigger for automatic response time calculation
DROP TRIGGER IF EXISTS trigger_update_response_time ON pickup_calls;
CREATE TRIGGER trigger_update_response_time
    BEFORE UPDATE ON pickup_calls
    FOR EACH ROW
    EXECUTE FUNCTION update_response_time();

-- 10. Insert sample data
INSERT INTO students (name, class, photo_url, status, parent_contact) VALUES
('Emma Wilson', '3A', 'https://via.placeholder.com/150/4F46E5/FFFFFF?text=EW', 'waiting', 'Sarah Wilson - (555) 123-4567'),
('Liam Johnson', '2B', 'https://via.placeholder.com/150/7C3AED/FFFFFF?text=LJ', 'waiting', 'Michael Johnson - (555) 234-5678'),
('Sophia Davis', '4C', 'https://via.placeholder.com/150/DC2626/FFFFFF?text=SD', 'waiting', 'Jennifer Davis - (555) 345-6789'),
('Noah Brown', '1A', 'https://via.placeholder.com/150/059669/FFFFFF?text=NB', 'waiting', 'David Brown - (555) 456-7890'),
('Olivia Miller', '5B', 'https://via.placeholder.com/150/DB2777/FFFFFF?text=OM', 'waiting', 'Amanda Miller - (555) 567-8901'),
('Lucas Garcia', '2A', 'https://via.placeholder.com/150/F59E0B/FFFFFF?text=LG', 'waiting', 'Maria Garcia - (555) 678-9012'),
('Ava Martinez', '4B', 'https://via.placeholder.com/150/8B5CF6/FFFFFF?text=AM', 'waiting', 'Carlos Martinez - (555) 789-0123'),
('Ethan Anderson', '1C', 'https://via.placeholder.com/150/10B981/FFFFFF?text=EA', 'waiting', 'Lisa Anderson - (555) 890-1234')
ON CONFLICT DO NOTHING;

-- 11. Insert sample parents
INSERT INTO parents (name, email, phone, student_ids) VALUES
('Sarah Wilson', 'sarah.wilson@email.com', '(555) 123-4567', ARRAY[1]),
('Michael Johnson', 'michael.johnson@email.com', '(555) 234-5678', ARRAY[2]),
('Jennifer Davis', 'jennifer.davis@email.com', '(555) 345-6789', ARRAY[3]),
('David Brown', 'david.brown@email.com', '(555) 456-7890', ARRAY[4]),
('Amanda Miller', 'amanda.miller@email.com', '(555) 567-8901', ARRAY[5]),
('Maria Garcia', 'maria.garcia@email.com', '(555) 678-9012', ARRAY[6]),
('Carlos Martinez', 'carlos.martinez@email.com', '(555) 789-0123', ARRAY[7]),
('Lisa Anderson', 'lisa.anderson@email.com', '(555) 890-1234', ARRAY[8])
ON CONFLICT DO NOTHING;

-- 12. Insert sample pickup calls (some completed for testing averages)
INSERT INTO pickup_calls (student_id, student_name, called_time, completed_time, status, security_user, response_time_seconds) VALUES
(1, 'Emma Wilson', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 hour 55 minutes', 'completed', 'Security Guard 1', 300),
(2, 'Liam Johnson', NOW() - INTERVAL '1 hour 30 minutes', NOW() - INTERVAL '1 hour 25 minutes', 'completed', 'Security Guard 1', 300),
(3, 'Sophia Davis', NOW() - INTERVAL '45 minutes', NOW() - INTERVAL '42 minutes', 'completed', 'Security Guard 2', 180),
(4, 'Noah Brown', NOW() - INTERVAL '30 minutes', NULL, 'called', 'Security Guard 1', NULL),
(5, 'Olivia Miller', NOW() - INTERVAL '15 minutes', NULL, 'called', 'Security Guard 2', NULL)
ON CONFLICT DO NOTHING;

-- 13. Insert sample chat messages
INSERT INTO chat_messages (user_role, user_name, message) VALUES
('admin', 'System Administrator', 'Pickup system initialized successfully'),
('security', 'Security Guard', 'All pickup areas are ready'),
('monitor', 'Class Monitor', 'Students are in their classrooms')
ON CONFLICT DO NOTHING;

-- 14. Insert sample pickup log
INSERT INTO pickup_log (student_id, parent_name, status, notes) VALUES
(1, 'Sarah Wilson', 'completed', 'Picked up successfully'),
(2, 'Michael Johnson', 'completed', 'Picked up successfully'),
(3, 'Jennifer Davis', 'completed', 'Picked up successfully')
ON CONFLICT DO NOTHING; 