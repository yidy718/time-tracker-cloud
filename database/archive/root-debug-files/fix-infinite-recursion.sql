-- Fix infinite recursion by consolidating policies
-- Run this in Supabase Dashboard SQL Editor

-- Drop all task policies to eliminate conflicts
DROP POLICY IF EXISTS "tasks_org_only" ON tasks;
DROP POLICY IF EXISTS "tasks_employee_can_update" ON tasks;

-- Create one comprehensive policy that handles all operations
CREATE POLICY "tasks_comprehensive" ON tasks
    FOR ALL USING (
        -- Must be in same organization
        EXISTS (
            SELECT 1 FROM employees 
            WHERE id = auth.uid() 
            AND organization_id = tasks.organization_id
        )
        AND
        -- For SELECT: anyone in org can view
        -- For UPDATE/DELETE: only admins OR assigned employees
        (
            -- Always allow SELECT for org members
            (CURRENT_SETTING('request.method', true) = 'GET') OR
            -- Allow INSERT/UPDATE/DELETE for admins
            EXISTS (
                SELECT 1 FROM employees 
                WHERE id = auth.uid() 
                AND organization_id = tasks.organization_id
                AND role IN ('admin', 'manager')
            ) OR
            -- Allow UPDATE for assigned employees (non-recursive check)
            (assigned_to = auth.uid() OR is_available_to_all = true)
        )
    );