-- Fix RLS policies to allow super admin to create locations and client_projects
-- Use organization name instead of MIN(id) since UUID doesn't support MIN()

-- Update locations policies
DROP POLICY IF EXISTS "Admins can manage locations" ON locations;
CREATE POLICY "Admins can manage locations" ON locations
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM employees 
            WHERE id = auth.uid() AND role IN ('admin', 'manager')
        ) OR 
        -- Allow super admin to manage all locations (check by org name)
        auth.uid() IN (
            SELECT e.id FROM employees e
            JOIN organizations o ON e.organization_id = o.id
            WHERE e.role = 'admin' 
            AND o.name ILIKE '%super admin%'
        )
    );

-- Update client_projects policies  
DROP POLICY IF EXISTS "Admins can manage projects" ON client_projects;
CREATE POLICY "Admins can manage projects" ON client_projects
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM employees 
            WHERE id = auth.uid() AND role IN ('admin', 'manager')
        ) OR
        -- Allow super admin to manage all projects (check by org name)
        auth.uid() IN (
            SELECT e.id FROM employees e
            JOIN organizations o ON e.organization_id = o.id
            WHERE e.role = 'admin' 
            AND o.name ILIKE '%super admin%'
        )
    );
EOF < /dev/null