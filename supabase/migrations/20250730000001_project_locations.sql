-- Add support for multiple locations per project
-- Create a junction table to allow many-to-many relationship between projects and locations

-- Create project_locations junction table
CREATE TABLE IF NOT EXISTS project_locations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
    location_id UUID REFERENCES locations(id) ON DELETE CASCADE NOT NULL,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id, location_id)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_project_locations_project_id ON project_locations(project_id);
CREATE INDEX IF NOT EXISTS idx_project_locations_location_id ON project_locations(location_id);
CREATE INDEX IF NOT EXISTS idx_project_locations_primary ON project_locations(is_primary);

-- Enable RLS
ALTER TABLE project_locations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view project locations in their organization" ON project_locations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM projects p 
            JOIN organizations o ON p.organization_id = o.id
            WHERE p.id = project_locations.project_id
            AND o.id IN (
                SELECT organization_id FROM employees 
                WHERE id = auth.uid()::uuid
            )
        )
    );

CREATE POLICY "Admins can manage project locations in their organization" ON project_locations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM projects p 
            JOIN organizations o ON p.organization_id = o.id
            JOIN employees e ON e.organization_id = o.id
            WHERE p.id = project_locations.project_id
            AND e.id = auth.uid()::uuid
            AND e.role IN ('admin', 'manager')
        )
    );

-- Migrate existing project locations to the new table
-- For projects that have a location_id, create a primary location relationship
INSERT INTO project_locations (project_id, location_id, is_primary)
SELECT id, location_id, true
FROM projects 
WHERE location_id IS NOT NULL;

-- Add trigger to ensure only one primary location per project
CREATE OR REPLACE FUNCTION ensure_single_primary_location()
RETURNS TRIGGER AS $$
BEGIN
    -- If setting a location as primary, unset other primary locations for this project
    IF NEW.is_primary = true THEN
        UPDATE project_locations 
        SET is_primary = false 
        WHERE project_id = NEW.project_id 
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ensure_single_primary_location
    BEFORE INSERT OR UPDATE ON project_locations
    FOR EACH ROW
    EXECUTE FUNCTION ensure_single_primary_location();

-- Create a view to easily get projects with their locations
CREATE OR REPLACE VIEW projects_with_locations AS
SELECT 
    p.*,
    COALESCE(
        json_agg(
            json_build_object(
                'id', l.id,
                'name', l.name,
                'address', l.address,
                'is_primary', pl.is_primary
            ) ORDER BY pl.is_primary DESC, l.name
        ) FILTER (WHERE l.id IS NOT NULL),
        '[]'::json
    ) as available_locations,
    (
        SELECT json_build_object(
            'id', l.id,
            'name', l.name,
            'address', l.address
        )
        FROM project_locations pl
        JOIN locations l ON l.id = pl.location_id
        WHERE pl.project_id = p.id AND pl.is_primary = true
        LIMIT 1
    ) as primary_location
FROM projects p
LEFT JOIN project_locations pl ON pl.project_id = p.id
LEFT JOIN locations l ON l.id = pl.location_id
GROUP BY p.id, p.organization_id, p.project_name, p.client_name, p.project_code, p.description, p.location_id, p.billing_rate, p.start_date, p.end_date, p.is_active, p.created_at, p.updated_at;

-- Grant access to the view
GRANT SELECT ON projects_with_locations TO authenticated;