-- Add progress notes field to tasks table
-- Run this SQL in your Supabase SQL Editor

BEGIN;

-- Add progress notes field to tasks table
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS progress_notes TEXT;

-- Add comment to the column
COMMENT ON COLUMN tasks.progress_notes IS 'Employee progress notes and updates on task completion';

COMMIT;

-- Display current tasks with progress notes
SELECT 
  t.title,
  t.status,
  t.progress_percentage,
  t.progress_notes,
  e.first_name || ' ' || e.last_name as assigned_to,
  o.name as organization
FROM tasks t
LEFT JOIN employees e ON t.assigned_to = e.id
LEFT JOIN organizations o ON t.organization_id = o.id
WHERE t.progress_notes IS NOT NULL
ORDER BY t.updated_at DESC;