-- Fix RLS policies to allow employees to read projects

-- Step 1: Check current RLS policies
SELECT 'Current RLS policies on client_projects:' as info;
SELECT 
    policyname,
    cmd,
    permissive,
    qual
FROM pg_policies 
WHERE tablename = 'client_projects';

-- Step 2: Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Users can view organization projects" ON client_projects;
DROP POLICY IF EXISTS "Admins can insert projects" ON client_projects;
DROP POLICY IF EXISTS "Admins can update projects" ON client_projects;
DROP POLICY IF EXISTS "Admins can delete projects" ON client_projects;
DROP POLICY IF EXISTS "Admins can manage projects" ON client_projects;

-- Step 3: Create a simple, permissive policy for reading projects
-- This allows ANY authenticated user to read projects from their organization
CREATE POLICY "Everyone can view organization projects" ON client_projects
    FOR SELECT 
    TO authenticated
    USING (
        organization_id IN (
            SELECT organization_id 
            FROM employees 
            WHERE id = auth.uid()
        )
    );

-- Step 4: Create admin-only policies for managing projects
CREATE POLICY "Admins can insert projects" ON client_projects
    FOR INSERT 
    TO authenticated
    WITH CHECK (
        organization_id IN (
            SELECT organization_id 
            FROM employees 
            WHERE id = auth.uid() AND role IN ('admin', 'manager')
        )
    );

CREATE POLICY "Admins can update projects" ON client_projects
    FOR UPDATE 
    TO authenticated
    USING (
        organization_id IN (
            SELECT organization_id 
            FROM employees 
            WHERE id = auth.uid() AND role IN ('admin', 'manager')
        )
    )
    WITH CHECK (
        organization_id IN (
            SELECT organization_id 
            FROM employees 
            WHERE id = auth.uid() AND role IN ('admin', 'manager')
        )
    );

CREATE POLICY "Admins can delete projects" ON client_projects
    FOR DELETE 
    TO authenticated
    USING (
        organization_id IN (
            SELECT organization_id 
            FROM employees 
            WHERE id = auth.uid() AND role IN ('admin', 'manager')
        )
    );

-- Step 5: Ensure RLS is enabled
ALTER TABLE client_projects ENABLE ROW LEVEL SECURITY;

-- Step 6: Grant necessary permissions to authenticated users
GRANT SELECT ON client_projects TO authenticated;
GRANT ALL ON client_projects TO service_role;

-- Step 7: Test the policy by checking what an employee should see
-- (This simulates what happens when an employee queries projects)
SELECT 'Testing employee access simulation:' as info;
SELECT 
    cp.id,
    cp.client_name,
    cp.project_name,
    cp.project_code,
    e.role as employee_role,
    o.name as org_name
FROM client_projects cp
JOIN organizations o ON cp.organization_id = o.id
JOIN employees e ON e.organization_id = o.id
WHERE cp.organization_id = 'a7435890-3249-4b1d-888d-93bb8a0c6c65'
LIMIT 3;

-- Step 8: Verify the new policies
SELECT 'New RLS policies:' as info;
SELECT 
    policyname,
    cmd,
    permissive,
    roles
FROM pg_policies 
WHERE tablename = 'client_projects'
ORDER BY cmd;

-- Step 9: Force schema refresh
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';

SELECT 'RLS policies updated for employee access!' as status;