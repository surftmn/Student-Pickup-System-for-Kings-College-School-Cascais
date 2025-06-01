# Parent Management System - Setup Guide

## Overview

This automated parent management system allows you to import parent accounts in bulk from Excel/CSV files instead of creating them manually one by one in Supabase. The system automatically generates passwords and creates personalized logins for parents.

## Features

- **Bulk Import**: Import hundreds of parent accounts from a single CSV/Excel file
- **Auto Password Generation**: Automatically generates passwords using email prefix + 4 random digits (e.g., `john.smith@gmail.com` → `john1234`)
- **Parent-Child Mapping**: Associates children with their parents automatically
- **Custom Login System**: Parents login using the custom system instead of Supabase auth
- **Admin Management**: Super admins can view, search, and manage all parent accounts

## Setup Instructions

### 1. Database Setup

First, you need to create the parents_login table in your Supabase database:

1. Go to your Supabase dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `supabase-schema.sql`
4. Execute the SQL to create the table, indexes, and policies

### 2. CSV File Format

Your CSV file should have exactly 3 columns in this order:
```
Parent Name,Email,Child Names
John Smith,john.smith@gmail.com,Emma Smith;Liam Smith
Maria Garcia,maria.garcia@gmail.com,Sofia Garcia
```

**Important Notes:**
- **Column 1**: Parent's full name
- **Column 2**: Parent's email address (used for login)
- **Column 3**: Child names separated by semicolons (`;`)
- Use semicolons (`;`) to separate multiple children, not commas
- Don't include extra spaces around semicolons

### 3. Import Process

1. **Access Admin Dashboard**: Login as a super admin
2. **Open Parent Management**: Click on "Parent Management" in the action grid
3. **Upload File**: 
   - Drag and drop your CSV file or click "Browse Files"
   - The system will validate and parse the file
4. **Configure Options**:
   - ✅ Auto-generate passwords (recommended)
   - ⬜ Send email notifications (coming soon)
5. **Process Import**: Click "Process Import" to create all accounts

### 4. How It Works

#### Password Generation
- Email: `john.smith@gmail.com`
- Generated Password: `john` + `1234` (4 random digits)
- Result: `john1234`

#### Parent Login Process
1. Parent selects "Parent" role tab
2. Enters email and generated password
3. System checks custom `parents_login` table first
4. If found and password matches, creates session
5. Redirects to parent dashboard with their children's info 