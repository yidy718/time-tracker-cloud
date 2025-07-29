-- 📅 MONTHLY BACKUP SCRIPT
-- Copy this entire script and run in Supabase SQL Editor
-- Save ALL the results to your external drive

SELECT '🗄️ Starting Monthly Database Backup...' as status;
SELECT NOW() as backup_time;

-- ================================
-- 1. ORGANIZATIONS
-- ================================
SELECT '📊 ORGANIZATIONS:' as table_name;
SELECT * FROM organizations ORDER BY created_at;

-- ================================  
-- 2. EMPLOYEES
-- ================================
SELECT '👥 EMPLOYEES:' as table_name;
SELECT * FROM employees ORDER BY organization_id, created_at;

-- ================================
-- 3. LOCATIONS  
-- ================================
SELECT '📍 LOCATIONS:' as table_name;
SELECT * FROM locations ORDER BY organization_id, name;

-- ================================
-- 4. PROJECTS
-- ================================
SELECT '💼 PROJECTS:' as table_name;
SELECT * FROM projects ORDER BY organization_id, project_name;

-- ================================
-- 5. TIME SESSIONS (Last 90 Days)
-- ================================
SELECT '⏰ TIME SESSIONS (Last 90 Days):' as table_name;
SELECT * FROM time_sessions 
WHERE clock_in >= NOW() - INTERVAL '90 days'
ORDER BY clock_in DESC;

-- ================================
-- 6. BACKUP VERIFICATION
-- ================================
SELECT '✅ BACKUP VERIFICATION COUNTS:' as verification;
SELECT 
  'organizations' as table_name, 
  COUNT(*) as total_records
FROM organizations
UNION ALL
SELECT 
  'employees' as table_name, 
  COUNT(*) as total_records  
FROM employees
UNION ALL
SELECT 
  'locations' as table_name, 
  COUNT(*) as total_records
FROM locations  
UNION ALL
SELECT 
  'projects' as table_name, 
  COUNT(*) as total_records
FROM projects
UNION ALL
SELECT 
  'time_sessions' as table_name, 
  COUNT(*) as total_records
FROM time_sessions
UNION ALL
SELECT 
  'time_sessions_last_90_days' as table_name, 
  COUNT(*) as total_records
FROM time_sessions 
WHERE clock_in >= NOW() - INTERVAL '90 days';

SELECT '🎉 Monthly Backup Completed Successfully!' as status;
SELECT 'Save these results as: backup_' || TO_CHAR(NOW(), 'YYYY_MM_DD') || '.sql' as filename_suggestion;