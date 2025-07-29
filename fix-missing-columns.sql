-- Fix missing columns and RLS issues for projects

-- Step 1: Add missing billing_rate column to client_projects
ALTER TABLE client_projects 
ADD COLUMN IF NOT EXISTS billing_rate DECIMAL(10,2);

-- Step 2: Update existing projects with sample billing rates
UPDATE client_projects 
SET billing_rate = 
    CASE 
        WHEN name LIKE '%Website%' THEN 75.00
        WHEN name LIKE '%Marketing%' THEN 65.00  
        WHEN name LIKE '%Consulting%' THEN 85.00
        ELSE 50.00
    END
WHERE billing_rate IS NULL;

-- Step 3: Fix RLS policies to ensure employees can read projects
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view organization projects" ON client_projects;
DROP POLICY IF EXISTS "Admins can manage projects" ON client_projects;

-- Recreate policies with better permissions
-- Policy for viewing projects (employees can see their org's projects)
CREATE POLICY "Users can view organization projects" ON client_projects
    FOR SELECT 
    USING (
        organization_id IN (
            SELECT organization_id 
            FROM employees 
            WHERE id = auth.uid()
        )
    );

-- Policy for managing projects (admins/managers can do everything)
CREATE POLICY "Admins can insert projects" ON client_projects
    FOR INSERT 
    WITH CHECK (
        organization_id IN (
            SELECT organization_id 
            FROM employees 
            WHERE id = auth.uid() AND role IN ('admin', 'manager')
        )
    );

CREATE POLICY "Admins can update projects" ON client_projects
    FOR UPDATE 
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
    USING (
        organization_id IN (
            SELECT organization_id 
            FROM employees 
            WHERE id = auth.uid() AND role IN ('admin', 'manager')
        )
    );

-- Step 4: Grant explicit permissions
GRANT ALL ON client_projects TO authenticated;
GRANT ALL ON client_projects TO service_role;

-- Step 5: Verify the fixes
SELECT 'Fixed client_projects table:' as status;
SELECT 
    cp.name,
    cp.billing_rate,
    o.name as organization
FROM client_projects cp
JOIN organizations o ON cp.organization_id = o.id
ORDER BY o.name, cp.name;