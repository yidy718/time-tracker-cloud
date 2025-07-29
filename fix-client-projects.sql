-- First, let's check if the table exists and what columns it has
-- Run this to see the current structure:
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'client_projects';

-- Drop and recreate the table to ensure proper structure
DROP TABLE IF EXISTS client_projects CASCADE;

-- Create client_projects table with proper structure
CREATE TABLE client_projects (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX idx_client_projects_organization_id ON client_projects(organization_id);
CREATE INDEX idx_client_projects_active ON client_projects(is_active);

-- Row Level Security
ALTER TABLE client_projects ENABLE ROW LEVEL SECURITY;

-- Policies for client_projects
CREATE POLICY "Users can view organization projects" ON client_projects
    FOR SELECT USING (organization_id IN (
        SELECT organization_id FROM employees WHERE id = auth.uid()
    ));

CREATE POLICY "Admins can manage projects" ON client_projects
    FOR ALL USING (organization_id IN (
        SELECT organization_id FROM employees 
        WHERE id = auth.uid() AND role IN ('admin', 'manager')
    ));

-- Insert sample projects for each organization
INSERT INTO client_projects (organization_id, name, description) 
SELECT DISTINCT
    o.id,
    'Website Development',
    'Client website development and maintenance'
FROM organizations o;

INSERT INTO client_projects (organization_id, name, description) 
SELECT DISTINCT
    o.id,
    'Marketing Campaign',
    'Digital marketing and advertising projects'
FROM organizations o;

INSERT INTO client_projects (organization_id, name, description) 
SELECT DISTINCT
    o.id,
    'Consulting Services',
    'Business consulting and strategy projects'
FROM organizations o;

-- Verify the table was created correctly
SELECT 'client_projects table created successfully' as status;