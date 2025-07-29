-- Apply the project migration to add project_id column to time_sessions
-- Run this AFTER creating the client_projects table

-- Check if project_id column already exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'time_sessions' AND column_name = 'project_id'
    ) THEN
        -- Add project_id column to time_sessions table
        ALTER TABLE time_sessions 
        ADD COLUMN project_id UUID REFERENCES client_projects(id) ON DELETE SET NULL;
        
        RAISE NOTICE 'project_id column added to time_sessions table';
    ELSE
        RAISE NOTICE 'project_id column already exists in time_sessions table';
    END IF;
END $$;

-- Add index for better query performance (only if column was added)
CREATE INDEX IF NOT EXISTS idx_time_sessions_project_id ON time_sessions(project_id);

-- Update the active_sessions view to include project information
DROP VIEW IF EXISTS active_sessions;
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

-- Verify everything is set up correctly
SELECT 'Project migration applied successfully' as status;