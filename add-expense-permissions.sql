-- Add expense permissions to employees table
-- Run this SQL in your Supabase SQL Editor

BEGIN;

-- Add can_expense column to employees table
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS can_expense BOOLEAN DEFAULT false;

-- Set default expense permissions based on role
-- Admins and managers can expense by default
UPDATE employees 
SET can_expense = true 
WHERE role IN ('admin', 'manager');

-- Non-clock workers should have expense permissions by default (since they're typically paid weekly)
UPDATE employees 
SET can_expense = true 
WHERE role = 'non_clock_worker';

-- Add comment to the column
COMMENT ON COLUMN employees.can_expense IS 'Whether this employee can submit expense reports';

-- Update the employee update function to handle can_expense
CREATE OR REPLACE FUNCTION update_employee_permissions(
  employee_id UUID,
  new_can_expense BOOLEAN DEFAULT NULL
) RETURNS void AS $$
BEGIN
  -- Only update if new_can_expense is provided
  IF new_can_expense IS NOT NULL THEN
    UPDATE employees 
    SET can_expense = new_can_expense 
    WHERE id = employee_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions on the function
GRANT EXECUTE ON FUNCTION update_employee_permissions(UUID, BOOLEAN) TO authenticated;

COMMIT;

-- Display current expense permissions
SELECT 
  e.first_name,
  e.last_name,
  e.role,
  e.can_expense,
  o.name as organization
FROM employees e
JOIN organizations o ON e.organization_id = o.id
WHERE e.is_active = true
ORDER BY o.name, e.first_name;