-- Fix the specific employee yidybreuer+ch@gmail.com

BEGIN;

-- First, find this exact employee
SELECT 
  'Current employee data:' as info,
  id,
  email,
  first_name,
  last_name,
  role,
  can_expense,
  organization_id
FROM employees 
WHERE email = 'yidybreuer+ch@gmail.com';

-- Check if the column exists and has the right type
SELECT 
  'Column info:' as info,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'employees' 
  AND column_name = 'can_expense';

-- Update this specific employee
UPDATE employees 
SET can_expense = true
WHERE email = 'yidybreuer+ch@gmail.com';

-- Verify the update worked
SELECT 
  'Updated employee data:' as result,
  id,
  email,
  first_name,
  last_name,
  role,
  can_expense,
  organization_id
FROM employees 
WHERE email = 'yidybreuer+ch@gmail.com';

-- Also check if there are any other yidy accounts that need fixing
SELECT 
  'All yidy accounts:' as summary,
  email,
  can_expense,
  CASE 
    WHEN can_expense IS NULL THEN 'NULL - needs fix'
    WHEN can_expense = false THEN 'FALSE - needs fix' 
    WHEN can_expense = true THEN 'TRUE - correct'
    ELSE 'UNKNOWN'
  END as status
FROM employees 
WHERE email LIKE '%yidy%' 
   OR email LIKE '%yidybreuer%'
ORDER BY email;

COMMIT;