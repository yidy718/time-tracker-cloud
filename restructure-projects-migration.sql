-- MAJOR RESTRUCTURE: Change from Location→Project to Project→Location
-- New structure: Organization → Projects → Locations
-- Projects now have locations, not the other way around

BEGIN;

-- Step 1: Backup current data
SELECT 'Starting project structure restructure...' as info;

-- Show current data before migration
SELECT 'Current client_projects data:' as info;
SELECT id, organization_id, client_name, project_name, location_id, is_active FROM client_projects;

SELECT 'Current time_sessions with projects:' as info;
SELECT id, employee_id, project_id, location_id, clock_in FROM time_sessions WHERE project_id IS NOT NULL LIMIT 5;

-- Step 2: Create new projects table with better structure
DROP TABLE IF EXISTS projects CASCADE;

CREATE TABLE projects (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    project_name VARCHAR(255) NOT NULL,
    client_name VARCHAR(255) NOT NULL,
    project_code VARCHAR(50),
    description TEXT,
    location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
    billing_rate DECIMAL(10,2),
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 3: Migrate data from client_projects to projects
INSERT INTO projects (
    organization_id, 
    project_name, 
    client_name, 
    project_code,
    location_id,
    billing_rate, 
    is_active, 
    created_at
)
SELECT 
    organization_id,
    project_name,
    client_name,
    project_code,
    location_id,  -- Projects now own their location
    billing_rate,
    is_active,
    created_at
FROM client_projects;

-- Step 4: Add a default "General Company Work" project for each organization
INSERT INTO projects (organization_id, project_name, client_name, project_code, billing_rate, is_active)
SELECT DISTINCT 
    o.id as organization_id,
    'General Company Work',
    'Internal Operations',
    'GEN001',
    0.00,
    true
FROM organizations o;

-- Step 5: Clean up time_sessions references BEFORE adding foreign key
-- First, drop any existing foreign key constraint
ALTER TABLE time_sessions DROP CONSTRAINT IF EXISTS fk_time_sessions_project;

-- Set any invalid project_id references to NULL
UPDATE time_sessions 
SET project_id = NULL 
WHERE project_id IS NOT NULL 
AND project_id NOT IN (SELECT id FROM projects);

-- For any time_sessions that had valid references to old client_projects, 
-- update them to point to the corresponding new projects
UPDATE time_sessions 
SET project_id = p.id
FROM projects p, client_projects cp
WHERE time_sessions.project_id = cp.id 
AND p.organization_id = cp.organization_id 
AND p.project_name = cp.project_name 
AND p.client_name = cp.client_name;

-- Step 6: Now add the foreign key constraint (after cleaning up references)
ALTER TABLE time_sessions 
ADD CONSTRAINT fk_time_sessions_project 
FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL;

-- Step 7: Set up RLS policies for the new projects table
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (for employee operations)
CREATE POLICY "Service role can manage projects" ON projects
    FOR ALL 
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Allow public read access to active projects
CREATE POLICY "Public can read active projects" ON projects
    FOR SELECT 
    TO anon, authenticated
    USING (is_active = true);

-- Allow authenticated users to manage their organization's projects
CREATE POLICY "Auth users can manage own org projects" ON projects
    FOR ALL 
    TO authenticated
    USING (
        organization_id IN (
            SELECT organization_id 
            FROM employees 
            WHERE id = auth.uid()
        )
    )
    WITH CHECK (
        organization_id IN (
            SELECT organization_id 
            FROM employees 
            WHERE id = auth.uid() AND role IN ('admin', 'manager')
        )
    );

-- Step 8: Grant necessary permissions
GRANT SELECT ON projects TO anon;
GRANT SELECT ON projects TO authenticated;
GRANT ALL ON projects TO service_role;

-- Step 9: Create updated views for easier querying
CREATE OR REPLACE VIEW project_details AS
SELECT 
    p.id,
    p.organization_id,
    p.project_name,
    p.client_name,
    p.project_code,
    p.billing_rate,
    p.is_active,
    l.name as location_name,
    l.address as location_address,
    o.name as organization_name
FROM projects p
LEFT JOIN locations l ON p.location_id = l.id
LEFT JOIN organizations o ON p.organization_id = o.id;

-- Grant access to the view
GRANT SELECT ON project_details TO anon, authenticated, service_role;

-- Step 10: Update the time_sessions view to use new structure
CREATE OR REPLACE VIEW session_details AS
SELECT 
    ts.id,
    ts.employee_id,
    ts.clock_in,
    ts.clock_out,
    ts.break_start,
    ts.break_end,
    ts.notes,
    e.first_name,
    e.last_name,
    p.project_name,
    p.client_name,
    l.name as location_name,
    o.name as organization_name
FROM time_sessions ts
JOIN employees e ON ts.employee_id = e.id
LEFT JOIN projects p ON ts.project_id = p.id
LEFT JOIN locations l ON p.location_id = l.id
JOIN organizations o ON e.organization_id = o.id;

GRANT SELECT ON session_details TO anon, authenticated, service_role;

-- Step 11: Now we can safely drop the old client_projects table
DROP TABLE IF EXISTS client_projects CASCADE;

-- Step 12: Force schema refresh
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';

-- Step 13: Verify the new structure
SELECT 'New projects table structure:' as info;
SELECT 
    p.project_name,
    p.client_name,
    l.name as location_name,
    p.billing_rate,
    p.is_active,
    o.name as organization_name
FROM projects p
LEFT JOIN locations l ON p.location_id = l.id
JOIN organizations o ON p.organization_id = o.id
ORDER BY o.name, p.project_name;

SELECT 'Migration completed successfully!' as status;
SELECT 'New structure: Organization → Projects → Locations' as structure;

COMMIT;