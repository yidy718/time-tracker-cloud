-- Check projects table RLS policies
SELECT 
    policyname,
    cmd,
    permissive,
    roles,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'projects'
ORDER BY cmd, policyname;
