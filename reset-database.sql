-- Complete database reset for clean multi-company setup
-- ⚠️ WARNING: This will delete ALL existing data!

-- Drop all existing tables in correct order (reverse dependencies)
DROP VIEW IF EXISTS daily_summaries CASCADE;
DROP VIEW IF EXISTS active_sessions CASCADE;
DROP VIEW IF EXISTS detailed_time_reports CASCADE;
DROP VIEW IF EXISTS company_managers CASCADE;

DROP TABLE IF EXISTS client_projects CASCADE;
DROP TABLE IF EXISTS time_sessions CASCADE;
DROP TABLE IF EXISTS employees CASCADE;
DROP TABLE IF EXISTS locations CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;

-- Drop existing functions and triggers
DROP FUNCTION IF EXISTS calculate_session_durations() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Drop existing types
DROP TYPE IF EXISTS employee_role CASCADE;

-- Clear auth users (this removes all user accounts)
-- ⚠️ WARNING: This deletes ALL user accounts including yours!
-- DELETE FROM auth.users;  -- Uncomment if you want to clear all users

-- Success message
SELECT 'Database cleared successfully! Now run the enhanced-schema.sql' as message;