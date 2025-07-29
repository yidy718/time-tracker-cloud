-- Manual Database Backup Script
-- Run this periodically to create backups

-- Export all important tables
-- Copy this output and save as backup files

SELECT 'Starting database backup...' as status;

-- 1. Organizations backup
SELECT 'Backing up organizations...' as status;
COPY (SELECT * FROM organizations) TO STDOUT WITH CSV HEADER;

-- 2. Employees backup  
SELECT 'Backing up employees...' as status;
COPY (SELECT * FROM employees) TO STDOUT WITH CSV HEADER;

-- 3. Locations backup
SELECT 'Backing up locations...' as status;
COPY (SELECT * FROM locations) TO STDOUT WITH CSV HEADER;

-- 4. Projects backup
SELECT 'Backing up projects...' as status;
COPY (SELECT * FROM projects) TO STDOUT WITH CSV HEADER;

-- 5. Time sessions backup (last 90 days to keep manageable)
SELECT 'Backing up recent time_sessions...' as status;
COPY (
  SELECT * FROM time_sessions 
  WHERE clock_in >= NOW() - INTERVAL '90 days'
) TO STDOUT WITH CSV HEADER;

-- 6. Get table counts for verification
SELECT 'Backup verification counts:' as status;
SELECT 
  'organizations' as table_name, 
  COUNT(*) as record_count 
FROM organizations
UNION ALL
SELECT 
  'employees' as table_name, 
  COUNT(*) as record_count 
FROM employees
UNION ALL
SELECT 
  'locations' as table_name, 
  COUNT(*) as record_count 
FROM locations
UNION ALL
SELECT 
  'projects' as table_name, 
  COUNT(*) as record_count 
FROM projects
UNION ALL
SELECT 
  'time_sessions' as table_name, 
  COUNT(*) as record_count 
FROM time_sessions;

SELECT 'Database backup completed!' as status;