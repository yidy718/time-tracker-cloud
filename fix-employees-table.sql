-- Fix employees table to allow custom employee creation without Supabase Auth
-- This addresses the "null value in column id violates not-null constraint" error

-- First, drop the foreign key constraint to auth.users
ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_id_fkey;

-- Modify the id column to auto-generate UUIDs instead of referencing auth.users
ALTER TABLE employees ALTER COLUMN id SET DEFAULT uuid_generate_v4();

-- Add username and password fields for custom authentication (if not exists)
ALTER TABLE employees ADD COLUMN IF NOT EXISTS username VARCHAR(100) UNIQUE;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS password VARCHAR(255);

-- Make sure we have the uuid extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Add a check to ensure either auth user ID exists OR username/password exists
-- (This allows for both Supabase Auth users like admins AND custom employees)
ALTER TABLE employees ADD CONSTRAINT employee_auth_method CHECK (
    (id IS NOT NULL AND username IS NULL AND password IS NULL) OR 
    (username IS NOT NULL AND password IS NOT NULL)
);

-- Update existing employees table comment
COMMENT ON TABLE employees IS 'Stores both Supabase Auth users (admins) and custom username/password employees';
COMMENT ON COLUMN employees.id IS 'UUID - auto-generated for employees, or Supabase Auth user ID for admins';
COMMENT ON COLUMN employees.username IS 'Custom username for employee authentication (null for Supabase Auth users)';
COMMENT ON COLUMN employees.password IS 'Hashed password for employee authentication (null for Supabase Auth users)';

-- Create an index on username for faster lookups
CREATE INDEX IF NOT EXISTS idx_employees_username ON employees(username);

-- Example of how to create employees going forward:
-- For custom employees (most common):
-- INSERT INTO employees (organization_id, first_name, last_name, email, username, password, role)
-- VALUES (org_uuid, 'John', 'Doe', 'john@company.com', 'john.doe', 'hashed_password', 'employee');

-- For Supabase Auth users (admins):
-- INSERT INTO employees (id, organization_id, first_name, last_name, email, role)
-- VALUES (auth_user_uuid, org_uuid, 'Admin', 'User', 'admin@company.com', 'admin');