-- Enhanced schema for multi-company setup
-- Add these to your existing database-schema.sql

-- Add company/client management to locations table
ALTER TABLE locations ADD COLUMN IF NOT EXISTS client_name VARCHAR(255);
ALTER TABLE locations ADD COLUMN IF NOT EXISTS project_code VARCHAR(50);
ALTER TABLE locations ADD COLUMN IF NOT EXISTS billing_rate DECIMAL(10,2);
ALTER TABLE locations ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Add job sites / client projects table
CREATE TABLE IF NOT EXISTS client_projects (
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

-- Add project tracking to time sessions
ALTER TABLE time_sessions ADD COLUMN IF NOT EXISTS client_project_id UUID REFERENCES client_projects(id);

-- Enhanced employee roles for company managers
UPDATE employees SET role = 'manager' WHERE role = 'admin' AND id NOT IN (
    SELECT id FROM employees WHERE organization_id = (
        SELECT id FROM organizations LIMIT 1
    ) AND role = 'admin' LIMIT 1
);

-- Add company manager permissions view
CREATE OR REPLACE VIEW company_managers AS
SELECT 
    e.*,
    o.name as company_name
FROM employees e
JOIN organizations o ON e.organization_id = o.id
WHERE e.role IN ('admin', 'manager');

-- Add comprehensive reporting view
CREATE OR REPLACE VIEW detailed_time_reports AS
SELECT 
    ts.*,
    e.first_name,
    e.last_name,
    e.employee_id as badge_number,
    o.name as company_name,
    l.name as location_name,
    l.client_name,
    cp.client_name as project_client,
    cp.project_name,
    cp.project_code,
    cp.billing_rate as project_rate,
    EXTRACT(EPOCH FROM (ts.clock_out - ts.clock_in))/3600 as hours_worked,
    CASE 
        WHEN cp.billing_rate IS NOT NULL THEN cp.billing_rate * EXTRACT(EPOCH FROM (ts.clock_out - ts.clock_in))/3600
        WHEN e.hourly_rate IS NOT NULL THEN e.hourly_rate * EXTRACT(EPOCH FROM (ts.clock_out - ts.clock_in))/3600
        ELSE 0
    END as calculated_pay
FROM time_sessions ts
JOIN employees e ON ts.employee_id = e.id
JOIN organizations o ON e.organization_id = o.id
LEFT JOIN locations l ON ts.location_id = l.id
LEFT JOIN client_projects cp ON ts.client_project_id = cp.id
WHERE ts.clock_out IS NOT NULL;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_client_projects_organization ON client_projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_client_projects_active ON client_projects(is_active);
CREATE INDEX IF NOT EXISTS idx_time_sessions_project ON time_sessions(client_project_id);

-- Updated triggers
CREATE TRIGGER IF NOT EXISTS update_client_projects_updated_at
    BEFORE UPDATE ON client_projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();