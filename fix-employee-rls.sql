-- Fix RLS policies for employee creation by company admins
-- The issue is that admins can't INSERT employees into their own organization

-- Drop and recreate the employee policies to allow INSERT operations
DROP POLICY IF EXISTS "Admins can manage employees" ON employees;
DROP POLICY IF EXISTS "Super admin can manage all employees" ON employees;

-- Create separate policies for different operations
-- Allow admins to view employees in their organization
CREATE POLICY "Users can view organization employees" ON employees
    FOR SELECT USING (organization_id IN (
        SELECT organization_id FROM employees WHERE id = auth.uid()
    ));

-- Allow users to update their own profile
CREATE POLICY "Users can update their own profile" ON employees
    FOR UPDATE USING (id = auth.uid());

-- Allow admins to INSERT employees in their organization
CREATE POLICY "Admins can create employees" ON employees
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM employees 
            WHERE id = auth.uid() AND role IN ('admin', 'manager')
        ) OR
        -- Allow super admin to create employees in any organization
        auth.uid() IN (
            SELECT e.id FROM employees e
            JOIN organizations o ON e.organization_id = o.id
            WHERE e.role = 'admin' 
            AND o.name ILIKE '%super admin%'
        )
    );

-- Allow admins to UPDATE employees in their organization
CREATE POLICY "Admins can update employees" ON employees
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id FROM employees 
            WHERE id = auth.uid() AND role IN ('admin', 'manager')
        ) OR
        -- Allow super admin to update employees in any organization
        auth.uid() IN (
            SELECT e.id FROM employees e
            JOIN organizations o ON e.organization_id = o.id
            WHERE e.role = 'admin' 
            AND o.name ILIKE '%super admin%'
        )
    );

-- Allow admins to DELETE employees in their organization
CREATE POLICY "Admins can delete employees" ON employees
    FOR DELETE USING (
        organization_id IN (
            SELECT organization_id FROM employees 
            WHERE id = auth.uid() AND role IN ('admin', 'manager')
        ) OR
        -- Allow super admin to delete employees in any organization
        auth.uid() IN (
            SELECT e.id FROM employees e
            JOIN organizations o ON e.organization_id = o.id
            WHERE e.role = 'admin' 
            AND o.name ILIKE '%super admin%'
        )
    );
EOF < /dev/null