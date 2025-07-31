-- Check all database objects that might reference the old 'name' column

-- Step 1: Check all views for any references to client_projects.name
SELECT 'Views that might reference client_projects:' as info;
SELECT 
    viewname,
    definition
FROM pg_views 
WHERE definition LIKE '%client_projects%';

-- Step 2: Check all functions that might reference client_projects
SELECT 'Functions that might reference client_projects:' as info;
SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines 
WHERE routine_definition LIKE '%client_projects%'
    AND routine_type = 'FUNCTION';

-- Step 3: Check if there are any triggers on client_projects
SELECT 'Triggers on client_projects:' as info;
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'client_projects';

-- Step 4: Check for any stored procedures or rules
SELECT 'Rules on client_projects:' as info;
SELECT 
    rulename,
    definition
FROM pg_rules 
WHERE tablename = 'client_projects';

-- Step 5: Force multiple schema cache refreshes
SELECT 'Forcing schema cache refresh...' as info;
NOTIFY pgrst, 'reload schema';
SELECT pg_sleep(1);
NOTIFY pgrst, 'reload config';
SELECT pg_sleep(1);
NOTIFY pgrst, 'reload schema';

-- Step 6: Test the exact query that might be failing
SELECT 'Testing problematic query pattern:' as info;
SELECT 
    ts.id,
    cp.project_name
FROM time_sessions ts
LEFT JOIN client_projects cp ON ts.project_id = cp.id
LIMIT 1;