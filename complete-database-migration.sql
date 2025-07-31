-- Complete database migration - ensures all required columns exist
-- Run this SQL in your Supabase SQL Editor

BEGIN;

-- 1. Add missing columns to tasks table
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS progress_notes TEXT,
ADD COLUMN IF NOT EXISTS is_activity_log BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS po_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(100);

-- 2. Add missing columns to employees table (expense permissions)
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS can_expense BOOLEAN DEFAULT false;

-- 3. Update existing employees to have expense permissions based on role
UPDATE employees 
SET can_expense = true 
WHERE role IN ('admin', 'manager') AND can_expense IS NULL;

-- 4. Add comments to document the columns
COMMENT ON COLUMN tasks.progress_notes IS 'Employee progress notes and updates on task completion';
COMMENT ON COLUMN tasks.is_activity_log IS 'Flag to identify tasks created from activity logging';
COMMENT ON COLUMN tasks.po_number IS 'Purchase Order number for this task';
COMMENT ON COLUMN tasks.invoice_number IS 'Invoice number associated with this task';
COMMENT ON COLUMN employees.can_expense IS 'Whether employee can create and submit expenses';

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_po_number ON tasks(po_number) WHERE po_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_invoice_number ON tasks(invoice_number) WHERE invoice_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_activity_log ON tasks(is_activity_log) WHERE is_activity_log = true;

-- 6. Update RLS policies for task editing (simplified version)
DROP POLICY IF EXISTS "Allow employees to update tasks in their organization" ON tasks;
CREATE POLICY "Allow employees to update tasks in their organization" ON tasks
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM employees 
      WHERE id = auth.uid()
    )
  );

-- 7. Ensure employees can read tasks in their organization  
DROP POLICY IF EXISTS "Tasks are viewable by organization members" ON tasks;
CREATE POLICY "Tasks are viewable by organization members" ON tasks
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM employees 
      WHERE id = auth.uid()
    )
  );

-- 8. Verify all columns exist
SELECT 
  'tasks' as table_name,
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'tasks' 
AND column_name IN ('progress_notes', 'is_activity_log', 'po_number', 'invoice_number')

UNION ALL

SELECT 
  'employees' as table_name,
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'employees' 
AND column_name = 'can_expense'

ORDER BY table_name, column_name;

COMMIT;

-- Display success message
SELECT 'Complete database migration completed successfully! All features should now work.' as result;