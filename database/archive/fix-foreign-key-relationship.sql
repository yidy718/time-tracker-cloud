-- Fix foreign key relationship and final project setup

-- Step 1: Check current state of time_sessions project_id column
SELECT 'Current time_sessions project_id column:' as info;
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'time_sessions' AND column_name = 'project_id';

-- Step 2: Drop existing project_id column if it exists (to recreate properly)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'time_sessions' AND column_name = 'project_id'
    ) THEN
        ALTER TABLE time_sessions DROP COLUMN project_id;
        RAISE NOTICE 'Dropped existing project_id column';
    END IF;
END $$;

-- Step 3: Add project_id column with proper foreign key constraint
ALTER TABLE time_sessions 
ADD COLUMN project_id UUID;

-- Step 4: Add the foreign key constraint explicitly
ALTER TABLE time_sessions 
ADD CONSTRAINT fk_time_sessions_project 
FOREIGN KEY (project_id) REFERENCES client_projects(id) ON DELETE SET NULL;

-- Step 5: Add index for performance
CREATE INDEX idx_time_sessions_project_id ON time_sessions(project_id);

-- Step 6: Recreate active_sessions view to use the proper relationship
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

-- Step 7: Test the foreign key relationship by checking constraints
SELECT 'Foreign key constraints on time_sessions:' as info;
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'time_sessions'
    AND kcu.column_name = 'project_id';

-- Step 8: Test that employees can actually read projects
-- This should return projects for the organization
SELECT 'Testing project visibility:' as info;
SELECT 
    cp.id,
    cp.client_name,
    cp.project_name,
    cp.project_code,
    cp.billing_rate,
    o.name as organization_name
FROM client_projects cp
JOIN organizations o ON cp.organization_id = o.id
ORDER BY o.name, cp.project_name;

-- Step 9: Refresh Supabase schema cache (important!)
-- This tells Supabase to recognize the new foreign key relationship
NOTIFY pgrst, 'reload schema';

-- Step 10: Final verification
SELECT 'Setup verification completed!' as status;
SELECT 
    'time_sessions.project_id -> client_projects.id relationship established' as relationship_status;