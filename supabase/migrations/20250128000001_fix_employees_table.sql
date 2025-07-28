-- Fix employees table to support both Auth users and custom employees
-- This migration addresses the "null value in column id violates not-null constraint" error

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop the existing foreign key constraint to auth.users
ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_id_fkey;

-- Modify the id column to have a default UUID generation
-- This allows the table to work for both:
-- 1. Supabase Auth users (admins) - where id is provided
-- 2. Custom employees - where id is auto-generated
ALTER TABLE employees ALTER COLUMN id SET DEFAULT uuid_generate_v4();

-- Ensure the id column is not null
ALTER TABLE employees ALTER COLUMN id SET NOT NULL;

-- Add username and password columns for custom employee authentication if they don't exist
ALTER TABLE employees ADD COLUMN IF NOT EXISTS username VARCHAR(100) UNIQUE;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS password VARCHAR(255);

-- Create index for faster username lookups
CREATE INDEX IF NOT EXISTS idx_employees_username ON employees(username) WHERE username IS NOT NULL;

-- Add RLS policies for the modified table structure
-- Allow admins to insert employees for their organization
DROP POLICY IF EXISTS "Admins can insert employees for their organization" ON employees;
CREATE POLICY "Admins can insert employees for their organization" ON employees
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees admin_emp 
      WHERE admin_emp.id = auth.uid() 
      AND admin_emp.organization_id = organization_id 
      AND admin_emp.role IN ('admin', 'manager')
    )
    OR 
    -- Allow super admins to create employees for any organization
    EXISTS (
      SELECT 1 FROM employees super_admin 
      WHERE super_admin.id = auth.uid() 
      AND super_admin.role = 'admin'
      AND super_admin.organization_id IS NULL
    )
  );

-- Update the select policy to work with the new structure
DROP POLICY IF EXISTS "Users can view employees in their organization" ON employees;
CREATE POLICY "Users can view employees in their organization" ON employees
  FOR SELECT USING (
    -- Users can see employees in their own organization
    organization_id IN (
      SELECT organization_id FROM employees 
      WHERE id = auth.uid()
    )
    OR
    -- Super admins can see all employees
    EXISTS (
      SELECT 1 FROM employees super_admin 
      WHERE super_admin.id = auth.uid() 
      AND super_admin.role = 'admin'
      AND super_admin.organization_id IS NULL
    )
  );

-- Add comment for documentation
COMMENT ON TABLE employees IS 'Employees table supporting both Supabase Auth users (admins/managers) and custom username/password employees';
COMMENT ON COLUMN employees.id IS 'UUID - auto-generated for custom employees, or Auth user ID for admins';
COMMENT ON COLUMN employees.username IS 'Username for custom employee authentication (NULL for Auth users)';
COMMENT ON COLUMN employees.password IS 'Password for custom employee authentication (NULL for Auth users)';

-- Example usage after this migration:
-- 1. For Auth users (admins): INSERT with specific id from auth.uid()
-- 2. For employees: INSERT without id, let it auto-generate