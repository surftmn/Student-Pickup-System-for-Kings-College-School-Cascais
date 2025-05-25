# 🚀 Supabase Setup Guide for School Pickup System

This guide will help you set up Supabase to enable cloud storage and real-time features for your school pickup system.

## 📋 What You'll Get

After setup, your system will have:
- ✅ **Shared data** across all devices and staff members
- ✅ **Real-time sync** - changes appear instantly on all connected devices
- ✅ **Data persistence** - no more data loss from browser clearing
- ✅ **Multi-user support** - multiple staff can use the system simultaneously
- ✅ **Backup & recovery** - data is safely stored in the cloud

## 🌟 Step 1: Create a Supabase Account

1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project" 
3. Sign up with GitHub, Google, or email
4. Create a new project:
   - **Name**: `school-pickup-system`
   - **Database Password**: Create a strong password
   - **Region**: Choose closest to your location
   - Click "Create new project"

⏰ **Wait 2-3 minutes** for your project to be ready.

## 🔧 Step 2: Get Your Project Credentials

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy these two values:
   - **Project URL** (starts with `https://`)
   - **anon public key** (long string starting with `eyJ`)

## 📝 Step 3: Configure Your Project

1. Open `supabase-config.js` in your project
2. Replace the placeholder values:

```javascript
// REPLACE THESE WITH YOUR ACTUAL SUPABASE PROJECT CREDENTIALS
const SUPABASE_URL = 'https://your-project-ref.supabase.co'; // Your Project URL
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // Your anon key
```

## 🗄️ Step 4: Create Database Tables

1. In your Supabase dashboard, go to **SQL Editor**
2. Click **New query**
3. Copy and paste this SQL code:

```sql
-- Create students table
CREATE TABLE students (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    grade TEXT NOT NULL,
    parent_contact TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create pickup_queue table
CREATE TABLE pickup_queue (
    id BIGSERIAL PRIMARY KEY,
    parent_name TEXT NOT NULL,
    student_ids JSONB NOT NULL,
    vehicle_info TEXT,
    special_instructions TEXT,
    timestamp TEXT NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create school_settings table
CREATE TABLE school_settings (
    id BIGSERIAL PRIMARY KEY,
    school_name TEXT DEFAULT 'School Pickup System',
    timezone TEXT DEFAULT 'America/New_York',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE pickup_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for public access
-- Students table policies
CREATE POLICY "Enable read access for all users" ON students FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON students FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON students FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON students FOR DELETE USING (true);

-- Pickup queue table policies
CREATE POLICY "Enable read access for all users" ON pickup_queue FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON pickup_queue FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON pickup_queue FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON pickup_queue FOR DELETE USING (true);

-- School settings table policies
CREATE POLICY "Enable read access for all users" ON school_settings FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON school_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON school_settings FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON school_settings FOR DELETE USING (true);

-- Enable real-time subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE students;
ALTER PUBLICATION supabase_realtime ADD TABLE pickup_queue;
ALTER PUBLICATION supabase_realtime ADD TABLE school_settings;
```

4. Click **Run** to execute the SQL

## ✅ Step 5: Test Your Setup

1. Open `index.html` in your browser
2. You should see a "Connecting to database..." message
3. If successful, you'll see "Connected! Loading data..." followed by "Real-time sync enabled!"
4. If it offers to load demo data, click "OK" to test

## 🔒 Security Considerations

### For Production Use

The current setup uses public access policies for simplicity. For production, consider:

1. **User Authentication**: Add Supabase Auth
2. **Row Level Security**: Implement proper RLS policies
3. **API Key Protection**: Use environment variables

### Example: Add User Authentication (Optional)

```sql
-- Create user profiles table
CREATE TABLE profiles (
    id UUID REFERENCES auth.users PRIMARY KEY,
    email TEXT UNIQUE,
    role TEXT DEFAULT 'staff',
    school_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Update policies to check authentication
DROP POLICY "Enable read access for all users" ON students;
CREATE POLICY "Enable read for authenticated users" ON students 
    FOR SELECT USING (auth.role() = 'authenticated');
```

## 🛠️ Troubleshooting

### Common Issues

**"Failed to connect to database"**
- ✅ Check your Project URL and anon key are correct
- ✅ Make sure your project is fully deployed (wait a few minutes)
- ✅ Check browser console for detailed error messages

**"Tables need to be created"**
- ✅ Run the SQL commands from Step 4
- ✅ Refresh your browser

**"Database setup required"**
- ✅ Check the browser console for the SQL commands
- ✅ Copy and run them in the Supabase SQL Editor

**Real-time not working**
- ✅ Make sure you enabled real-time subscriptions in the SQL
- ✅ Check your browser supports WebSocket connections
- ✅ Try refreshing the page

### Getting Help

1. Check the browser console (F12) for error messages
2. Verify your Supabase project is active in the dashboard
3. Test the connection in the Supabase dashboard under **Table Editor**

## 🎉 Success!

Once setup is complete, you'll have:

- **Multi-device sync**: Add a student on one device, see it instantly on others
- **Real-time updates**: Staff can see new pickups appear live
- **Data backup**: Everything is safely stored in Supabase
- **Scalability**: Support unlimited users and data

## 📱 Next Steps

1. **Test with multiple devices**: Open the app on different computers/phones
2. **Customize your school name**: Update the header in `index.html`
3. **Add your students**: Use the Staff Interface to add real student data
4. **Train your staff**: Show them how to use the new real-time features

## 🆘 Need Help?

- **Supabase Documentation**: [docs.supabase.com](https://docs.supabase.com)
- **Community Support**: [github.com/supabase/supabase/discussions](https://github.com/supabase/supabase/discussions)
- **Feature Requests**: Contact your system administrator

---

**🎯 Congratulations! Your school pickup system is now powered by Supabase with real-time collaboration features!** 

## 🔧 **Fix the Database Structure**

### **Step 1: Check Your Current Students Table Structure**

Go to your Supabase dashboard and run this to see what columns you actually have:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'students';
```

Or:

```sql
-- Check what columns exist
SELECT * FROM students LIMIT 1;
```

### **Step 2: Fix the Students Table**

Based on your existing table, you likely have different column names. Let's fix this:

**Option A: If you have a column called something else (like `grade`):**
```sql
-- Check what columns exist
SELECT * FROM students LIMIT 1;

-- If you have 'grade' instead of 'class', rename it:
ALTER TABLE students RENAME COLUMN grade TO class;
```

**Option B: If the `class` column is completely missing:**
```sql
-- Add the missing class column
ALTER TABLE students ADD COLUMN class TEXT;

-- Update existing records with default values
UPDATE students SET class = '1A' WHERE class IS NULL;
```

### **Step 3: Create the Missing pickup_log Table**

```sql
CREATE TABLE pickup_log (
    id BIGSERIAL PRIMARY KEY,
    student_id BIGINT REFERENCES students(id) ON DELETE CASCADE,
    parent_name TEXT,
    pickup_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT DEFAULT 'completed',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### **Step 4: Create chat_messages Table (if missing)**

```sql
CREATE TABLE chat_messages (
    id BIGSERIAL PRIMARY KEY,
    user_role TEXT NOT NULL,
    user_name TEXT NOT NULL,
    message TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### **Step 5: Set Up Permissions**

```sql
-- Enable RLS for new tables
ALTER TABLE pickup_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Create policies for all tables
CREATE POLICY "Enable all access for pickup_log" ON pickup_log FOR ALL USING (true);
CREATE POLICY "Enable all access for chat_messages" ON chat_messages FOR ALL USING (true);

-- Make sure students table has proper policies too
DROP POLICY IF EXISTS "Enable all access for students" ON students;
CREATE POLICY "Enable all access for students" ON students FOR ALL USING (true);
```

## 🔍 **Quick Fix Alternative**

If you want to see exactly what your current `students` table looks like first, run this in your Supabase SQL Editor:

```sql
-- Show table structure
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'students' 
ORDER BY ordinal_position;

-- Show sample data
SELECT * FROM students LIMIT 3;
```

Then let me know what columns you see, and I can give you the exact commands to fix the mismatch.

## 🚀 **After Fixing**

Once you've run the SQL commands:

1. **Go back to your admin dashboard**
2. **Refresh the page**
3. **Try adding a student again**
4. **Check the browser console** - errors should be gone

The most likely fix is that your table has a different column name than `class`. Can you run the first SQL query to check your table structure and let me know what columns you see? 

## 🔧 **Add Missing Columns to Students Table**

Go to your **Supabase SQL Editor** and run these commands:

### **Step 1: Add the missing columns:**
```sql
-- Add status column
ALTER TABLE students ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'not_called';

-- Add photo_url column (if missing)
ALTER TABLE students ADD COLUMN IF NOT EXISTS photo_url TEXT;
```

### **Step 2: Update existing students with default status:**
```sql
-- Set default status for existing students
UPDATE students SET status = 'not_called' WHERE status IS NULL;
```

### **Step 3: Verify the table structure:**
```sql
-- Check all columns now exist
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'students' 
ORDER BY ordinal_position;
```

## 🧪 **Test the Fix**

After running the SQL commands:

1. **Go back to your admin dashboard**
2. **Refresh the page** (`Ctrl+F5`) 
3. **Check the browser console** (F12) - the status column error should be gone
4. **You should now see students listed in the admin dashboard**

## ✅ **Expected Table Structure**

Your `students` table should now have these columns:
- `id` (BIGSERIAL PRIMARY KEY)
- `name` (TEXT)
- `class` (TEXT) 
- `photo_url` (TEXT)
- `status` (TEXT, default: 'not_called')
- `parent_contact` (TEXT) - from your original table
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

## 🔍 **Quick Browser Test**

After adding the columns, test in the browser console:

```javascript
// This should now work without errors
window.supabaseManager.getStudents()
```

## 📝 **Optional: Add Some Test Students**

If you want to add some students with photos for testing:

```sql
INSERT INTO students (name, class, photo_url, status, parent_contact) VALUES
('Emma Johnson', '3A', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face', 'not_called', 'parent@email.com'),
('Liam Smith', '2B', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face', 'not_called', 'parent2@email.com');
```

Let me know when you've added the `status` column - the error should disappear and you should be able to see and manage students in the admin dashboard! 🎉 