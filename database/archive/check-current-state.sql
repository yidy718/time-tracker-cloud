-- Quick check of current database state

-- Check if client_projects table exists and has data
SELECT 'client_projects table:' as info;
SELECT COUNT(*) as project_count FROM client_projects;

-- Check if time_sessions has project_id column
SELECT 'time_sessions project_id column:' as info;
SELECT 
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'time_sessions' AND column_name = 'project_id'
    ) THEN 'EXISTS' ELSE 'MISSING' END as project_id_column;

-- Check foreign key relationships
SELECT 'Foreign keys on time_sessions:' as info;
SELECT
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS references_table,
    ccu.column_name AS references_column
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'time_sessions';

-- Check RLS policies on client_projects
SELECT 'RLS policies on client_projects:' as info;
SELECT policyname, cmd, permissive
FROM pg_policies 
WHERE tablename = 'client_projects';

-- Sample data check
SELECT 'Sample client_projects data:' as info;
SELECT 
    cp.client_name,
    cp.project_name,
    o.name as org_name
FROM client_projects cp
JOIN organizations o ON cp.organization_id = o.id
LIMIT 3;