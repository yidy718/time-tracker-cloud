-- Fix RLS policies to allow super admin to create locations and client_projects

-- Update locations policies
DROP POLICY IF EXISTS "Admins can manage locations" ON locations;
CREATE POLICY "Admins can manage locations" ON locations
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM employees 
            WHERE id = auth.uid() AND role IN ('admin', 'manager')
        ) OR 
        -- Allow super admin to manage all locations
        auth.uid() IN (
            SELECT id FROM employees WHERE role = 'admin' 
            AND organization_id = (SELECT MIN(id) FROM organizations)
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
        -- Allow super admin to manage all projects
        auth.uid() IN (
            SELECT id FROM employees WHERE role = 'admin' 
            AND organization_id = (SELECT MIN(id) FROM organizations)
        )
    );
EOF < /dev/null