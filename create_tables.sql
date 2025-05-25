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

-- 2. Create pickup_log table
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

-- 3. Create chat_messages table
DROP TABLE IF EXISTS chat_messages CASCADE;
CREATE TABLE chat_messages (
    id BIGSERIAL PRIMARY KEY,
    user_role TEXT NOT NULL,
    user_name TEXT NOT NULL,
    message TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Enable Row Level Security (optional - for production)
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE pickup_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- 5. Create policies for public access (for demo purposes)
-- In production, you should create more restrictive policies

-- Students policies
DROP POLICY IF EXISTS "Enable all operations for students" ON students;
CREATE POLICY "Enable all operations for students" ON students
    FOR ALL USING (true) WITH CHECK (true);

-- Pickup log policies
DROP POLICY IF EXISTS "Enable all operations for pickup_log" ON pickup_log;
CREATE POLICY "Enable all operations for pickup_log" ON pickup_log
    FOR ALL USING (true) WITH CHECK (true);

-- Chat messages policies
DROP POLICY IF EXISTS "Enable all operations for chat_messages" ON chat_messages;
CREATE POLICY "Enable all operations for chat_messages" ON chat_messages
    FOR ALL USING (true) WITH CHECK (true);

-- 6. Insert sample data
INSERT INTO students (name, class, photo_url, status, parent_contact) VALUES
('Emma Wilson', '3A', 'https://via.placeholder.com/150/4F46E5/FFFFFF?text=EW', 'waiting', 'Sarah Wilson - (555) 123-4567'),
('Liam Johnson', '2B', 'https://via.placeholder.com/150/7C3AED/FFFFFF?text=LJ', 'waiting', 'Michael Johnson - (555) 234-5678'),
('Sophia Davis', '4C', 'https://via.placeholder.com/150/DC2626/FFFFFF?text=SD', 'waiting', 'Jennifer Davis - (555) 345-6789'),
('Noah Brown', '1A', 'https://via.placeholder.com/150/059669/FFFFFF?text=NB', 'waiting', 'David Brown - (555) 456-7890'),
('Olivia Miller', '5B', 'https://via.placeholder.com/150/DB2777/FFFFFF?text=OM', 'waiting', 'Amanda Miller - (555) 567-8901')
ON CONFLICT DO NOTHING;

-- 7. Insert sample chat messages
INSERT INTO chat_messages (user_role, user_name, message) VALUES
('admin', 'System Administrator', 'Pickup system initialized successfully'),
('security', 'Security Guard', 'All pickup areas are ready'),
('monitor', 'Class Monitor', 'Students are in their classrooms')
ON CONFLICT DO NOTHING;

-- 8. Insert sample pickup log
INSERT INTO pickup_log (student_id, parent_name, status, notes) VALUES
(1, 'Sarah Wilson', 'completed', 'Picked up successfully'),
(2, 'Michael Johnson', 'completed', 'Picked up successfully')
ON CONFLICT DO NOTHING; 