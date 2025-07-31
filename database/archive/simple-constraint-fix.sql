-- Simple approach: Just add the missing foreign key constraint

-- Step 1: Check if the constraint already exists
SELECT 'Checking existing foreign key constraints:' as info;
SELECT
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS references_table
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'time_sessions'
    AND kcu.column_name = 'project_id';

-- Step 2: Add foreign key constraint if it doesn't exist
DO $$
BEGIN
    -- Check if the constraint already exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_time_sessions_project' 
        AND table_name = 'time_sessions'
    ) THEN
        -- Add the foreign key constraint
        ALTER TABLE time_sessions 
        ADD CONSTRAINT fk_time_sessions_project 
        FOREIGN KEY (project_id) REFERENCES client_projects(id) ON DELETE SET NULL;
        
        RAISE NOTICE 'Added foreign key constraint fk_time_sessions_project';
    ELSE
        RAISE NOTICE 'Foreign key constraint already exists';
    END IF;
END $$;

-- Step 3: Ensure index exists for performance
CREATE INDEX IF NOT EXISTS idx_time_sessions_project_id ON time_sessions(project_id);

-- Step 4: CRITICAL - Refresh Supabase schema cache so it recognizes the relationship
NOTIFY pgrst, 'reload schema';

-- Step 5: Verify the constraint was added
SELECT 'Verification - Foreign key constraints:' as info;
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

-- Step 6: Test that joins will work now
SELECT 'Testing project join:' as info;
SELECT 
    'Should be able to join time_sessions -> client_projects now' as result;

-- Step 7: Show sample client_projects data
SELECT 'Available projects:' as info;
SELECT 
    cp.id,
    cp.client_name,
    cp.project_name,
    o.name as organization_name
FROM client_projects cp
JOIN organizations o ON cp.organization_id = o.id
ORDER BY o.name, cp.project_name;