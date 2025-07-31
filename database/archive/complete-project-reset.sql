-- COMPLETE PROJECT RESET SCRIPT
-- This will clean up and properly set up all project-related functionality
-- Run this in Supabase SQL Editor

-- Step 1: Drop existing project-related objects to start fresh
DROP VIEW IF EXISTS active_sessions CASCADE;
DROP TABLE IF EXISTS client_projects CASCADE;

-- Step 2: Remove project_id column from time_sessions if it exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'time_sessions' AND column_name = 'project_id'
    ) THEN
        ALTER TABLE time_sessions DROP COLUMN project_id;
        RAISE NOTICE 'Removed existing project_id column from time_sessions';
    END IF;
END $$;

-- Step 3: Create client_projects table with proper structure
CREATE TABLE client_projects (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 4: Add indexes
CREATE INDEX idx_client_projects_organization_id ON client_projects(organization_id);
CREATE INDEX idx_client_projects_active ON client_projects(is_active);
CREATE INDEX idx_client_projects_name ON client_projects(name);

-- Step 5: Enable RLS and create policies
ALTER TABLE client_projects ENABLE ROW LEVEL SECURITY;

-- Policy for viewing projects (all users in organization can view)
CREATE POLICY "Users can view organization projects" ON client_projects
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM employees WHERE id = auth.uid()
        )
    );

-- Policy for managing projects (only admins/managers can manage)
CREATE POLICY "Admins can manage projects" ON client_projects
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM employees 
            WHERE id = auth.uid() AND role IN ('admin', 'manager')
        )
    );

-- Step 6: Add project_id column to time_sessions
ALTER TABLE time_sessions 
ADD COLUMN project_id UUID REFERENCES client_projects(id) ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX idx_time_sessions_project_id ON time_sessions(project_id);

-- Step 7: Recreate active_sessions view with project support
CREATE VIEW active_sessions AS
SELECT 
    ts.*,
    e.first_name,
    e.last_name,
    e.employee_id as badge_number,
    l.name as location_name,
    COALESCE(cp.name, 'No Project') as project_name
FROM time_sessions ts
JOIN employees e ON ts.employee_id = e.id
LEFT JOIN locations l ON ts.location_id = l.id
LEFT JOIN client_projects cp ON ts.project_id = cp.id
WHERE ts.clock_out IS NULL AND e.is_active = true;

-- Step 8: Insert sample projects for each organization
INSERT INTO client_projects (organization_id, name, description) 
SELECT DISTINCT
    o.id,
    'Website Development',
    'Client website development and maintenance projects'
FROM organizations o;

INSERT INTO client_projects (organization_id, name, description) 
SELECT DISTINCT
    o.id,
    'Marketing Campaign',
    'Digital marketing and advertising campaigns'
FROM organizations o;

INSERT INTO client_projects (organization_id, name, description) 
SELECT DISTINCT
    o.id,
    'Consulting Services',
    'Business consulting and strategy implementation'
FROM organizations o;

-- Step 9: Grant necessary permissions (if needed)
-- Note: Supabase usually handles this automatically, but just in case
GRANT ALL ON client_projects TO authenticated;
GRANT ALL ON client_projects TO service_role;

-- Step 10: Verify everything is working
SELECT 
    'Setup completed successfully!' as status,
    COUNT(*) as projects_created
FROM client_projects;

-- Show sample data
SELECT 
    o.name as organization_name,
    cp.name as project_name,
    cp.is_active
FROM client_projects cp
JOIN organizations o ON cp.organization_id = o.id
ORDER BY o.name, cp.name;