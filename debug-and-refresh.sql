-- Debug current state and refresh everything

-- Step 1: Check what's actually in client_projects table
SELECT 'Current client_projects table structure:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'client_projects'
ORDER BY ordinal_position;

-- Step 2: Check if there's any data
SELECT 'Sample client_projects data:' as info;
SELECT 
    id,
    client_name,
    project_name,
    billing_rate,
    is_active
FROM client_projects
LIMIT 3;

-- Step 3: Check active_sessions view definition
SELECT 'active_sessions view definition:' as info;
SELECT definition 
FROM pg_views 
WHERE viewname = 'active_sessions';

-- Step 4: Test a simple project query to see what fails
SELECT 'Testing simple client_projects query:' as info;
SELECT 
    cp.id,
    cp.project_name
FROM client_projects cp
LIMIT 1;

-- Step 5: Force refresh of PostgREST schema cache multiple times
SELECT 'Refreshing schema cache...' as info;
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';

-- Step 6: Check if there are any cached prepared statements that might be causing issues
SELECT 'Checking for prepared statements:' as info;
SELECT name, statement FROM pg_prepared_statements;

-- Step 7: Also refresh the database statistics
ANALYZE client_projects;
ANALYZE time_sessions;

-- Step 8: Final verification
SELECT 'Final verification:' as info;
SELECT 
    'client_projects table exists with project_name column' as status
WHERE EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'client_projects' AND column_name = 'project_name'
);