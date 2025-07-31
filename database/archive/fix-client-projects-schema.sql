-- Fix client_projects table to match the expected schema from AdminDashboard

-- Step 1: Drop and recreate client_projects with proper schema
DROP TABLE IF EXISTS client_projects CASCADE;

CREATE TABLE client_projects (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    client_name VARCHAR(255) NOT NULL,
    project_name VARCHAR(255) NOT NULL,
    project_code VARCHAR(50),
    start_date DATE,
    end_date DATE,
    billing_rate DECIMAL(10,2),
    location_id UUID REFERENCES locations(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Add indexes
CREATE INDEX idx_client_projects_organization_id ON client_projects(organization_id);
CREATE INDEX idx_client_projects_active ON client_projects(is_active);
CREATE INDEX idx_client_projects_code ON client_projects(project_code);

-- Step 3: Enable RLS and create proper policies
ALTER TABLE client_projects ENABLE ROW LEVEL SECURITY;

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

-- Policies for managing projects (admins/managers can do CRUD)
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

-- Step 4: Re-add project_id column to time_sessions if needed
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'time_sessions' AND column_name = 'project_id'
    ) THEN
        ALTER TABLE time_sessions 
        ADD COLUMN project_id UUID REFERENCES client_projects(id) ON DELETE SET NULL;
        
        CREATE INDEX idx_time_sessions_project_id ON time_sessions(project_id);
        RAISE NOTICE 'Added project_id column to time_sessions';
    END IF;
END $$;

-- Step 5: Recreate active_sessions view
DROP VIEW IF EXISTS active_sessions;
CREATE VIEW active_sessions AS
SELECT 
    ts.*,
    e.first_name,
    e.last_name,
    e.employee_id as badge_number,
    l.name as location_name,
    COALESCE(cp.project_name, 'No Project') as project_name
FROM time_sessions ts
JOIN employees e ON ts.employee_id = e.id
LEFT JOIN locations l ON ts.location_id = l.id
LEFT JOIN client_projects cp ON ts.project_id = cp.id
WHERE ts.clock_out IS NULL AND e.is_active = true;

-- Step 6: Insert sample projects with proper schema
INSERT INTO client_projects (organization_id, client_name, project_name, project_code, billing_rate) 
SELECT DISTINCT
    o.id,
    'Acme Corp',
    'Website Development',
    'WEB001',
    75.00
FROM organizations o;

INSERT INTO client_projects (organization_id, client_name, project_name, project_code, billing_rate) 
SELECT DISTINCT
    o.id,
    'TechStart Inc',
    'Marketing Campaign',
    'MKT001', 
    65.00
FROM organizations o;

INSERT INTO client_projects (organization_id, client_name, project_name, project_code, billing_rate) 
SELECT DISTINCT
    o.id,
    'Global Solutions',
    'Consulting Services',
    'CON001',
    85.00
FROM organizations o;

-- Step 7: Grant permissions
GRANT ALL ON client_projects TO authenticated;
GRANT ALL ON client_projects TO service_role;

-- Step 8: Verify the setup
SELECT 'client_projects setup completed!' as status;
SELECT 
    cp.client_name,
    cp.project_name,
    cp.project_code,
    cp.billing_rate,
    o.name as organization
FROM client_projects cp
JOIN organizations o ON cp.organization_id = o.id
ORDER BY o.name, cp.project_name;