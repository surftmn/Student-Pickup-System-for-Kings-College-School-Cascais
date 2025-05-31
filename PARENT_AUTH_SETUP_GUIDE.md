# Parent Authentication System Setup Guide

## Overview

This guide explains how to set up the parent authentication system for the Kings College School pickup system. The system allows multiple parents to have separate logins for the same child, and parents can see all their children in one dashboard.

## Database Structure Explanation

### Why We Need the Parents Table

You asked about the `parents` table vs just using `parent_contact` in the `students` table. Here's why we need a separate `parents` table:

1. **Authentication**: Each parent needs their own login credentials in Supabase Auth
2. **Multiple Parents**: A child can have multiple parents (mother, father, guardian) with separate logins
3. **Multiple Children**: A parent can have multiple children
4. **Relationships**: We need to track the relationship type (mother, father, guardian)
5. **Permissions**: Different parents might have different pickup permissions

### Current vs Recommended Structure

**Current Structure (Limited):**
```
students table:
- id
- name
- parent_contact (text field like "Sarah Johnson - (555) 123-4567")
```

**Recommended Structure (Flexible):**
```
students table:
- id, name, grade, class, photo_url, status

parents table:
- id, auth_user_id (links to Supabase Auth), name, email, phone, relationship

parent_student_relationships table:
- parent_id, student_id, relationship_type, can_pickup, is_primary_contact
```

## Step-by-Step Setup

### Step 1: Set Up Supabase Authentication

1. **Go to your Supabase Dashboard**
   - Navigate to Authentication > Settings
   - Enable email confirmation if desired
   - Set up email templates

2. **Create Parent Users in Supabase Auth**
   ```sql
   -- Example: Create a parent user
   -- This is done through Supabase Dashboard or API
   -- Email: sarah.johnson@email.com
   -- Password: (set by parent)
   -- Metadata: { "role": "parent", "name": "Sarah Johnson" }
   ```

### Step 2: Update Your Database Schema

Run the SQL from `database-schema.sql` in your Supabase SQL Editor:

1. **Create the new tables**
2. **Set up Row Level Security (RLS)**
3. **Create the helper functions**

### Step 3: Migrate Existing Data

If you have existing students with `parent_contact` data, you'll need to migrate:

```sql
-- Example migration script
-- This extracts parent info from the parent_contact field
INSERT INTO parents (name, email, phone, relationship)
SELECT 
    SPLIT_PART(parent_contact, ' - ', 1) as name,
    CONCAT(LOWER(REPLACE(SPLIT_PART(parent_contact, ' - ', 1), ' ', '.')), '@email.com') as email,
    SPLIT_PART(parent_contact, ' - ', 2) as phone,
    'parent' as relationship
FROM students 
WHERE parent_contact IS NOT NULL;

-- Then create relationships
INSERT INTO parent_student_relationships (parent_id, student_id, relationship_type, is_primary_contact, can_pickup)
SELECT 
    p.id,
    s.id,
    'parent',
    true,
    true
FROM students s
JOIN parents p ON p.name = SPLIT_PART(s.parent_contact, ' - ', 1);
```

### Step 4: Update the Parent Dashboard

The parent dashboard needs to be updated to:

1. **Load students based on authentication**
2. **Show only the parent's children**
3. **Allow pickup requests**

Here's the key change needed in `parent-dashboard.html`:

```javascript
// Replace the loadParentStudents function
async function loadParentStudents() {
    try {
        // Get current authenticated user
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            throw new Error('No authenticated user');
        }

        // Get parent's students using the database function
        const { data, error } = await supabase
            .rpc('get_parent_students', { parent_auth_id: user.id });

        if (error) throw error;

        parentStudents = data.map(student => ({
            id: student.student_id,
            name: student.student_name,
            class: student.student_class,
            grade: student.student_grade,
            photo: student.student_photo_url,
            status: student.student_status,
            relationship: student.relationship_type,
            canPickup: student.can_pickup
        }));

        console.log('✅ Parent students loaded successfully:', parentStudents);
        renderStudentCards();
    } catch (error) {
        console.error('Error loading parent students:', error);
        showToast('Failed to load students', 'error');
    }
}
```

### Step 5: Update Authentication Flow

The login system needs to:

1. **Authenticate with Supabase Auth** (already working)
2. **Check if user exists in parents table**
3. **Set proper session data**

## Example Parent Setup Process

### For Admin: Adding a New Parent

1. **Create Supabase Auth User**:
   ```javascript
   const { data, error } = await supabase.auth.admin.createUser({
     email: 'sarah.johnson@email.com',
     password: 'temporary_password',
     user_metadata: {
       role: 'parent',
       name: 'Sarah Johnson'
     }
   });
   ```

2. **Create Parent Record**:
   ```javascript
   const { data, error } = await supabase
     .from('parents')
     .insert({
       auth_user_id: user.id,
       name: 'Sarah Johnson',
       email: 'sarah.johnson@email.com',
       phone: '(555) 123-4567',
       relationship: 'mother'
     });
   ```

3. **Link to Students**:
   ```javascript
   const { data, error } = await supabase
     .from('parent_student_relationships')
     .insert({
       parent_id: parent.id,
       student_id: student.id,
       relationship_type: 'mother',
       is_primary_contact: true,
       can_pickup: true
     });
   ```

## Workflow Example

### Parent Login Process:
1. Parent goes to login page
2. Enters email/password
3. Supabase Auth validates credentials
4. System checks user role is 'parent'
5. Redirects to parent dashboard
6. Dashboard loads only their children

### Parent Pickup Request:
1. Parent sees their children on dashboard
2. Clicks "Request Pickup" for a child
3. System creates pickup_call record
4. Monitor sees the request
5. Monitor approves and sends to security
6. Security marks as completed

## Security Features

1. **Row Level Security**: Parents can only see their own data
2. **Authentication Required**: All actions require valid login
3. **Permission Checks**: Parents can only request pickup for authorized children
4. **Audit Trail**: All pickup requests are logged with timestamps

## Testing the System

1. **Create test parent accounts**
2. **Link them to test students**
3. **Test login flow**
4. **Test pickup request flow**
5. **Verify security restrictions**

## Next Steps

1. Run the database migration
2. Update the parent dashboard code
3. Test with sample data
4. Create parent accounts for real users
5. Train staff on the new system

Would you like me to help you implement any specific part of this system? 