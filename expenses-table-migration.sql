-- Expenses table migration - add missing columns and ensure proper structure
-- Run this SQL in your Supabase SQL Editor

BEGIN;

-- First, let's see what columns currently exist
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'expenses' 
ORDER BY ordinal_position;

-- Add missing columns to expenses table
ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'Work Related',
ADD COLUMN IF NOT EXISTS location VARCHAR(255),
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS date DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Ensure we have the basic required columns (in case table is incomplete)
ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES employees(id),
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id),
ADD COLUMN IF NOT EXISTS amount DECIMAL(10,2) NOT NULL,
ADD COLUMN IF NOT EXISTS description TEXT;

-- Add comments to document the columns
COMMENT ON COLUMN expenses.category IS 'Expense category (Work Related, Travel, Meals, Materials, Equipment, Other)';
COMMENT ON COLUMN expenses.location IS 'Location where expense was incurred';
COMMENT ON COLUMN expenses.status IS 'Expense status (pending, approved, rejected)';
COMMENT ON COLUMN expenses.date IS 'Date the expense was incurred';
COMMENT ON COLUMN expenses.employee_id IS 'Employee who incurred the expense';
COMMENT ON COLUMN expenses.organization_id IS 'Organization the expense belongs to';
COMMENT ON COLUMN expenses.amount IS 'Expense amount in currency';
COMMENT ON COLUMN expenses.description IS 'Description of the expense';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_expenses_employee_id ON expenses(employee_id);
CREATE INDEX IF NOT EXISTS idx_expenses_organization_id ON expenses(organization_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(status);

-- Add RLS policies for expenses
DROP POLICY IF EXISTS "Employees can insert own expenses" ON expenses;
CREATE POLICY "Employees can insert own expenses" ON expenses
  FOR INSERT WITH CHECK (
    employee_id = auth.uid() OR
    employee_id IN (
      SELECT id FROM employees 
      WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Employees can view own expenses" ON expenses;
CREATE POLICY "Employees can view own expenses" ON expenses
  FOR SELECT USING (
    employee_id = auth.uid() OR
    organization_id IN (
      SELECT organization_id FROM employees 
      WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Managers can view organization expenses" ON expenses;
CREATE POLICY "Managers can view organization expenses" ON expenses
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM employees 
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- Enable RLS on expenses table
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Verify all columns exist after migration
SELECT 
  'expenses' as table_name,
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'expenses' 
AND column_name IN ('employee_id', 'organization_id', 'amount', 'description', 'location', 'category', 'date', 'status', 'created_at')
ORDER BY column_name;

COMMIT;

-- Display success message
SELECT 'Expenses table migration completed successfully! Expense submission should now work.' as result;