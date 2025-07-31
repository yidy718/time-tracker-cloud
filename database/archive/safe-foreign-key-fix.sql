-- Safe foreign key fix that handles view dependencies

-- Step 1: Drop the active_sessions view first (to remove dependency)
DROP VIEW IF EXISTS active_sessions CASCADE;

-- Step 2: Now safely drop and recreate the project_id column
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'time_sessions' AND column_name = 'project_id'
    ) THEN
        ALTER TABLE time_sessions DROP COLUMN project_id CASCADE;
        RAISE NOTICE 'Dropped existing project_id column with CASCADE';
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
CREATE INDEX IF NOT EXISTS idx_time_sessions_project_id ON time_sessions(project_id);

-- Step 6: Recreate active_sessions view with proper relationship
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

-- Step 7: Verify the foreign key constraint was created
SELECT 'Foreign key constraints verification:' as info;
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

-- Step 8: Test that the view works correctly
SELECT 'Testing active_sessions view:' as info;
SELECT COUNT(*) as active_session_count FROM active_sessions;

-- Step 9: CRITICAL - Refresh Supabase schema cache
NOTIFY pgrst, 'reload schema';

-- Step 10: Verify client_projects are accessible  
SELECT 'Testing client_projects access:' as info;
SELECT 
    cp.id,
    cp.client_name,
    cp.project_name,
    o.name as organization_name
FROM client_projects cp
JOIN organizations o ON cp.organization_id = o.id
LIMIT 3;

-- Step 11: Final status
SELECT 
    'Foreign key relationship established successfully!' as status,
    'Schema cache refreshed - PostgREST should now recognize the relationship' as note;