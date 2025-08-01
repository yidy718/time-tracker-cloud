-- Fix employee by username (since they login with username, not email)

BEGIN;

-- Find the employee by username
SELECT 
  'Employee found by username:' as info,
  id,
  username,
  email,
  first_name,
  last_name,
  role,
  can_expense,
  organization_id
FROM employees 
WHERE username = 'yidy.breuer';

-- Update the specific employee by username
UPDATE employees 
SET can_expense = true
WHERE username = 'yidy.breuer';

-- Verify the update worked
SELECT 
  'Updated employee by username:' as result,
  id,
  username,
  email,
  first_name,
  last_name,
  role,
  can_expense,
  organization_id
FROM employees 
WHERE username = 'yidy.breuer';

-- Also check if there are other yidy usernames that need fixing
UPDATE employees 
SET can_expense = true
WHERE username LIKE '%yidy%' 
   OR username LIKE '%brier%'
   OR username LIKE '%breuer%';

-- Show all yidy-related accounts after fix
SELECT 
  'All yidy accounts after fix:' as summary,
  username,
  email,
  can_expense,
  CASE 
    WHEN can_expense IS NULL THEN 'NULL - still needs fix'
    WHEN can_expense = false THEN 'FALSE - still needs fix' 
    WHEN can_expense = true THEN 'TRUE - fixed!'
    ELSE 'UNKNOWN'
  END as status
FROM employees 
WHERE username LIKE '%yidy%' 
   OR username LIKE '%brier%'
   OR username LIKE '%breuer%'
   OR email LIKE '%yidy%'
   OR email LIKE '%yidybreuer%'
ORDER BY username;

COMMIT;