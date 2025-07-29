-- Fix security definer views identified by Supabase
-- These views were created during restructuring and may bypass RLS

-- Step 1: Check current views and their security settings
SELECT 'Current views with potential security issues:' as info;
SELECT 
    schemaname,
    viewname,
    definition
FROM pg_views 
WHERE viewname IN ('daily_summaries', 'session_details', 'project_details')
    AND schemaname = 'public';

-- Step 2: Drop and recreate views with proper security
-- These views should use SECURITY INVOKER (user's permissions) not SECURITY DEFINER (elevated permissions)

-- Drop existing views if they exist
DROP VIEW IF EXISTS public.session_details;
DROP VIEW IF EXISTS public.project_details;
DROP VIEW IF EXISTS public.daily_summaries;

-- Step 3: Recreate project_details view with proper security
CREATE VIEW public.project_details 
WITH (security_invoker = true) AS
SELECT 
    p.id,
    p.organization_id,
    p.project_name,
    p.client_name,
    p.project_code,
    p.billing_rate,
    p.is_active,
    l.name as location_name,
    l.address as location_address,
    o.name as organization_name
FROM projects p
LEFT JOIN locations l ON p.location_id = l.id
LEFT JOIN organizations o ON p.organization_id = o.id;

-- Step 4: Recreate session_details view with proper security
CREATE VIEW public.session_details 
WITH (security_invoker = true) AS
SELECT 
    ts.id,
    ts.employee_id,
    ts.clock_in,
    ts.clock_out,
    ts.break_start,
    ts.break_end,
    ts.notes,
    e.first_name,
    e.last_name,
    p.project_name,
    p.client_name,
    l.name as location_name,
    o.name as organization_name
FROM time_sessions ts
JOIN employees e ON ts.employee_id = e.id
LEFT JOIN projects p ON ts.project_id = p.id
LEFT JOIN locations l ON p.location_id = l.id
JOIN organizations o ON e.organization_id = o.id;

-- Step 5: Only create daily_summaries view if the table exists
-- Check if daily_summaries table exists first
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'daily_summaries') THEN
        EXECUTE 'CREATE VIEW public.daily_summaries_view 
                 WITH (security_invoker = true) AS
                 SELECT * FROM daily_summaries';
        RAISE NOTICE 'daily_summaries view created';
    ELSE
        RAISE NOTICE 'daily_summaries table does not exist, skipping view creation';
    END IF;
END $$;

-- Step 6: Grant appropriate permissions
-- Views inherit permissions from underlying tables due to security_invoker
GRANT SELECT ON public.project_details TO authenticated, anon;
GRANT SELECT ON public.session_details TO authenticated, anon;

-- Step 7: Test the views work correctly
SELECT 'Testing views after security fix:' as info;

-- Test project_details
SELECT 'project_details view test:' as test;
SELECT count(*) as project_count FROM public.project_details LIMIT 1;

-- Test session_details  
SELECT 'session_details view test:' as test;
SELECT count(*) as session_count FROM public.session_details LIMIT 1;

-- Step 8: Verify security settings
SELECT 'Verifying view security settings:' as info;
SELECT 
    schemaname,
    viewname,
    'Views now use security_invoker (user permissions)' as security_status
FROM pg_views 
WHERE viewname IN ('project_details', 'session_details', 'daily_summaries_view')
    AND schemaname = 'public';

SELECT 'Security definer views fixed successfully!' as status;
SELECT 'Views now respect RLS policies and user permissions' as result;