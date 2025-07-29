-- Create client_projects table if it doesn't exist
CREATE TABLE IF NOT EXISTS client_projects (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_client_projects_organization_id ON client_projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_client_projects_active ON client_projects(is_active);

-- Row Level Security
ALTER TABLE client_projects ENABLE ROW LEVEL SECURITY;

-- Policies for client_projects
DROP POLICY IF EXISTS "Users can view organization projects" ON client_projects;
CREATE POLICY "Users can view organization projects" ON client_projects
    FOR SELECT USING (organization_id IN (
        SELECT organization_id FROM employees WHERE id = auth.uid()
    ));

DROP POLICY IF EXISTS "Admins can manage projects" ON client_projects;
CREATE POLICY "Admins can manage projects" ON client_projects
    FOR ALL USING (organization_id IN (
        SELECT organization_id FROM employees 
        WHERE id = auth.uid() AND role IN ('admin', 'manager')
    ));

-- Insert some sample projects for testing
INSERT INTO client_projects (organization_id, name, description) 
SELECT 
    o.id,
    'Sample Project ' || generate_series(1, 3),
    'Sample project description for testing'
FROM organizations o
WHERE NOT EXISTS (
    SELECT 1 FROM client_projects cp WHERE cp.organization_id = o.id
)
LIMIT 3;