# Supabase Authentication Setup Guide
## Kings College School - Student Pickup Management System

This guide will help you set up Supabase authentication to replace the hardcoded demo credentials with a proper authentication system.

## 📋 Prerequisites

1. A Supabase account (free at [supabase.com](https://supabase.com))
2. Basic understanding of web development
3. Access to your project files

## 🚀 Step 1: Create Supabase Project

1. **Go to [supabase.com](https://supabase.com)** and sign up/login
2. **Click "New Project"**
3. **Fill out project details:**
   - Organization: Choose or create one
   - Name: `Kings College School Pickup`
   - Database Password: Create a strong password (save this!)
   - Region: Choose closest to your location

4. **Wait for project creation** (takes 1-2 minutes)

## 🔑 Step 2: Get Your Credentials

1. **In your Supabase dashboard, go to Settings → API**
2. **Copy these values:**
   - `Project URL` (starts with https://...)
   - `anon public` key (long string starting with eyJ...)

3. **Update `supabase-config.js`:**
   ```javascript
   const SUPABASE_URL = 'YOUR_PROJECT_URL_HERE';
   const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY_HERE';
   ```

## 👥 Step 3: Create System Users

### Method A: Using Supabase Dashboard (Recommended)

1. **Go to Authentication → Users in your Supabase dashboard**
2. **Click "Add User"**
3. **Create these 4 system users:**

   **Admin Account:**
   - Email: `admin@kingscollegeschool.com`
   - Password: `admin123` (change in production!)
   - User Metadata (Raw JSON):
   ```json
   {
     "role": "admin",
     "name": "School Administrator"
   }
   ```

   **Security Guard Account:**
   - Email: `security@kingscollegeschool.com`
   - Password: `security123` (change in production!)
   - User Metadata (Raw JSON):
   ```json
   {
     "role": "security",
     "name": "Security Guard"
   }
   ```

   **Monitor Account:**
   - Email: `monitor@kingscollegeschool.com`
   - Password: `monitor123` (change in production!)
   - User Metadata (Raw JSON):
   ```json
   {
     "role": "monitor",
     "name": "Monitor Station"
   }
   ```

   **Demo Parent Account:**
   - Email: `parent@kingscollegeschool.com`
   - Password: `parent123` (change in production!)
   - User Metadata (Raw JSON):
   ```json
   {
     "role": "parent",
     "name": "Sarah Johnson",
     "children": ["Emma Johnson", "Sophia Williams"]
   }
   ```

### Method B: Using Code (Advanced)

If you prefer to create users via code, you can use the admin functions in `supabase-config.js`.

## 👨‍👩‍👧‍👦 Step 4: Adding Parent Accounts

### For Production Use:

You'll need to manually add each parent account. Here's the process:

1. **Go to Authentication → Users in Supabase dashboard**
2. **For each parent, click "Add User"**
3. **Fill out:**
   - Email: Parent's email address
   - Password: Generate or let parent choose
   - User Metadata (example):
   ```json
   {
     "role": "parent",
     "name": "Parent Full Name",
     "phone": "+351-xxx-xxx-xxx",
     "children": [
       {
         "name": "Child Name",
         "class": "Class 2C",
         "pickup_authorized": true
       }
     ]
   }
   ```

### Bulk Import Option:

For hundreds of parents, consider:
1. **Prepare a CSV file** with parent data
2. **Use Supabase's bulk import feature** (in Authentication → Users)
3. **Or create a custom admin script** to bulk-create accounts

## 🔐 Step 5: Configure Authentication Settings

1. **Go to Authentication → Settings**
2. **Configure these settings:**

   **Site URL:** `http://localhost:8080` (for development)
   
   **Redirect URLs:** Add your domain when you deploy
   
   **Email Templates:** Customize if needed
   
   **Password Requirements:** Set minimum length (8+ recommended)

## 🛡️ Step 6: Set Up Row Level Security (Optional but Recommended)

If you plan to add database tables later:

1. **Go to SQL Editor in Supabase**
2. **Create policies for data access:**
   ```sql
   -- Example policy for parents to only see their own data
   CREATE POLICY "Parents can only see their own children" 
   ON students 
   FOR SELECT 
   USING (auth.jwt() ->> 'email' = parent_email);
   ```

## 🔄 Step 7: Update Your Application

1. **Replace your current login.html with login-supabase.html**
2. **Make sure supabase-config.js is loaded in all protected pages**
3. **Add authentication checks to each page:**

   Add this to the top of each protected page's JavaScript:
   ```javascript
   // Check authentication when page loads
   document.addEventListener('DOMContentLoaded', async function() {
       const isAuthenticated = await checkAuth('role_name'); // admin, security, monitor, parent
       if (!isAuthenticated) {
           return; // Will redirect to login
       }
       // Continue with page initialization
   });
   ```

## 🧪 Step 8: Test the System

1. **Open your application**
2. **Try logging in with each account type:**
   - Admin: `admin@kingscollegeschool.com` / `admin123`
   - Security: `security@kingscollegeschool.com` / `security123`
   - Monitor: `monitor@kingscollegeschool.com` / `monitor123`
   - Parent: `parent@kingscollegeschool.com` / `parent123`

3. **Verify role-based redirects work correctly**

## 🔒 Step 9: Security Best Practices

### For Production:

1. **Change all default passwords**
2. **Enable email confirmation** (Authentication → Settings → Email)
3. **Set up proper redirect URLs** for your domain
4. **Enable MFA** for admin accounts
5. **Regular password rotation** policy
6. **Remove demo accounts section** from login page

## 📊 Step 10: Monitor Usage

1. **Use Supabase Analytics** to monitor login attempts
2. **Set up alerts** for failed login attempts
3. **Regular backup** of user data
4. **Monitor API usage** to stay within limits

## 🛠️ Troubleshooting

### Common Issues:

**"Invalid login credentials"**
- Check email/password are correct
- Verify user exists in Supabase dashboard
- Check user metadata includes proper role

**"User not found"**
- User might not be created yet
- Check email spelling
- Verify in Authentication → Users

**"Network error"**
- Check SUPABASE_URL and SUPABASE_ANON_KEY
- Verify internet connection
- Check browser console for errors

**Role redirect not working**
- Check user metadata has correct role
- Verify redirectToDashboard function
- Check browser console for JavaScript errors

## 💡 Tips for Managing Hundreds of Parents

1. **Use spreadsheet templates** for parent data collection
2. **Batch create accounts** during off-hours
3. **Send welcome emails** with login instructions
4. **Create a parent onboarding guide**
5. **Set up a help desk** for login issues
6. **Consider parent self-registration** with admin approval

## 📞 Support

If you encounter issues:
1. Check the browser console for errors
2. Verify your Supabase project settings
3. Test with a fresh browser session
4. Check Supabase status page for service issues

---

## Next Steps

Once authentication is working:
1. ✅ Remove hardcoded credentials
2. ✅ Test all user roles
3. 🔄 Add real parent accounts
4. 🔒 Implement proper security policies
5. 📱 Consider mobile app integration
6. 📊 Set up user analytics

**Your Kings College School pickup system is now secure and production-ready!** 🎉 