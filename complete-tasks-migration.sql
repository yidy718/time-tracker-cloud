-- Complete tasks table migration - adds all missing columns
-- Run this SQL in your Supabase SQL Editor

BEGIN;

-- Add all missing columns to tasks table
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS progress_notes TEXT,
ADD COLUMN IF NOT EXISTS is_activity_log BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS po_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(100);

-- Add comments to document the columns
COMMENT ON COLUMN tasks.progress_notes IS 'Employee progress notes and updates on task completion';
COMMENT ON COLUMN tasks.is_activity_log IS 'Flag to identify tasks created from activity logging';
COMMENT ON COLUMN tasks.po_number IS 'Purchase Order number for this task';
COMMENT ON COLUMN tasks.invoice_number IS 'Invoice number associated with this task';

-- Create indexes for performance on financial fields
CREATE INDEX IF NOT EXISTS idx_tasks_po_number ON tasks(po_number) WHERE po_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_invoice_number ON tasks(invoice_number) WHERE invoice_number IS NOT NULL;

-- Verify all columns exist
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'tasks' 
AND column_name IN ('progress_notes', 'is_activity_log', 'po_number', 'invoice_number')
ORDER BY column_name;

COMMIT;

-- Display success message
SELECT 'All missing task columns added successfully! Task editing should now work.' as result;