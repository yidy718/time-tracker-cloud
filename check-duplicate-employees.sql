-- Check for duplicate employee records that might be causing confusion

-- Find all employees with similar usernames or emails
SELECT 
  'Potential duplicate employees:' as info,
  id,
  username,
  email,
  first_name,
  last_name,
  role,
  can_expense,
  is_active,
  organization_id
FROM employees 
WHERE username LIKE '%yidy%' 
   OR username LIKE '%breuer%'
   OR email LIKE '%yidy%'
   OR email LIKE '%breuer%'
   OR first_name LIKE '%Yidy%'
ORDER BY username, email;

-- Check for exact ID matches
SELECT 
  'Employee with ID daef2292-e95a-4f6b-a8e1-542d4b1f1e66:' as specific_check,
  id,
  username,
  email,
  first_name,
  last_name,
  role,
  can_expense,
  is_active,
  organization_id
FROM employees 
WHERE id = 'daef2292-e95a-4f6b-a8e1-542d4b1f1e66';

-- Check if there are multiple records with same email but different usernames
SELECT 
  'Same email, different records:' as email_check,
  COUNT(*) as record_count,
  email,
  array_agg(username) as usernames,
  array_agg(id::text) as ids,
  array_agg(can_expense) as can_expense_values
FROM employees 
WHERE email = 'yidybreuer+ch@gmail.com'
GROUP BY email;

-- Check if there are multiple records with same username
SELECT 
  'Same username, different records:' as username_check,
  COUNT(*) as record_count,
  username,
  array_agg(email) as emails,
  array_agg(id::text) as ids,
  array_agg(can_expense) as can_expense_values
FROM employees 
WHERE username = 'yidy.breuer'
GROUP BY username;