-- Add missing columns to tasks table
-- Run this SQL in your Supabase SQL Editor

BEGIN;

-- Add progress_notes column if it doesn't exist
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS progress_notes TEXT;

-- Add is_activity_log column if it doesn't exist  
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS is_activity_log BOOLEAN DEFAULT false;

-- Add comments to document the columns
COMMENT ON COLUMN tasks.progress_notes IS 'Employee progress notes and updates on task completion';
COMMENT ON COLUMN tasks.is_activity_log IS 'Flag to identify tasks created from activity logging';

-- Verify the columns were added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'tasks' 
AND column_name IN ('progress_notes', 'is_activity_log')
ORDER BY column_name;

COMMIT;

-- Display success message
SELECT 'Missing task columns added successfully' as result;