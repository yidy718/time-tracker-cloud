-- Debug script to check employees table and fix issues
-- Run this in your Supabase SQL Editor

-- 1. First, check if the employees table exists and what columns it has
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'employees' 
ORDER BY ordinal_position;

-- 2. Check if username and password columns exist
SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employees' AND column_name = 'username'
) as username_exists,
EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employees' AND column_name = 'password'
) as password_exists;

-- 3. Apply the migration if username/password columns don't exist
-- (Run this only if the above query shows false for username_exists or password_exists)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop foreign key constraint if it exists
ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_id_fkey;

-- Set default UUID generation for id column
ALTER TABLE employees ALTER COLUMN id SET DEFAULT uuid_generate_v4();

-- Add username and password columns if they don't exist
ALTER TABLE employees ADD COLUMN IF NOT EXISTS username VARCHAR(100) UNIQUE;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS password VARCHAR(255);

-- Create index for username
CREATE INDEX IF NOT EXISTS idx_employees_username ON employees(username) WHERE username IS NOT NULL;

-- 4. Check what employees currently exist
SELECT id, first_name, last_name, email, username, password, role, is_active, organization_id
FROM employees 
ORDER BY created_at DESC;

-- 5. Check RLS policies on employees table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'employees';

-- 6. Temporarily disable RLS for testing (ONLY FOR DEBUGGING - RE-ENABLE AFTER)
-- ALTER TABLE employees DISABLE ROW LEVEL SECURITY;

-- 7. Test creating a sample employee (replace with actual organization_id)
-- INSERT INTO employees (organization_id, first_name, last_name, email, username, password, role)
-- VALUES ('your-org-uuid-here', 'Test', 'User', 'test@example.com', 'test.user', 'testpass', 'employee')
-- RETURNING *;

-- 8. Test querying employees by username
-- SELECT * FROM employees WHERE username = 'test.user';

-- Remember to re-enable RLS after debugging:
-- ALTER TABLE employees ENABLE ROW LEVEL SECURITY;