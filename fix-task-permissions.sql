-- Fix task editing permissions for employees
-- Run this SQL in your Supabase SQL Editor

BEGIN;

-- Check current policies on tasks table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'tasks';

-- Enable RLS on tasks table if not already enabled
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies that might be blocking updates
DROP POLICY IF EXISTS "Enable employees to update assigned tasks" ON tasks;
DROP POLICY IF EXISTS "Enable employees to read assigned tasks" ON tasks;
DROP POLICY IF EXISTS "Tasks are viewable by organization members" ON tasks;
DROP POLICY IF EXISTS "Tasks are editable by organization members" ON tasks;

-- Create comprehensive policies for tasks
-- 1. Allow employees to read tasks in their organization
CREATE POLICY "Tasks are viewable by organization members" ON tasks
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM employees 
      WHERE id = auth.uid() OR employee_id = auth.jwt() ->> 'employee_id'
    )
  );

-- 2. Allow employees to update tasks assigned to them or created by them
CREATE POLICY "Enable employees to update assigned tasks" ON tasks
  FOR UPDATE USING (
    assigned_to IN (
      SELECT id FROM employees 
      WHERE id = auth.uid() OR employee_id = auth.jwt() ->> 'employee_id'
    )
    OR 
    created_by IN (
      SELECT id FROM employees 
      WHERE id = auth.uid() OR employee_id = auth.jwt() ->> 'employee_id'
    )
    OR
    organization_id IN (
      SELECT organization_id FROM employees 
      WHERE (id = auth.uid() OR employee_id = auth.jwt() ->> 'employee_id')
      AND role IN ('admin', 'manager')
    )
  );

-- 3. Allow admins and managers to create tasks
CREATE POLICY "Enable admins and managers to create tasks" ON tasks
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM employees 
      WHERE (id = auth.uid() OR employee_id = auth.jwt() ->> 'employee_id')
      AND role IN ('admin', 'manager')
    )
  );

-- 4. Allow admins and managers to delete tasks in their organization
CREATE POLICY "Enable admins and managers to delete tasks" ON tasks
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM employees 
      WHERE (id = auth.uid() OR employee_id = auth.jwt() ->> 'employee_id')
      AND role IN ('admin', 'manager')
    )
  );

COMMIT;

-- Test the policies
SELECT 'Task permissions updated successfully' as result;