-- Test the authenticate_employee function to see what it actually returns

-- First, check if the function exists and what its signature is
SELECT 
  routine_name,
  routine_type,
  data_type,
  routine_definition
FROM information_schema.routines 
WHERE routine_name = 'authenticate_employee';

-- Test the function with the actual login credentials
SELECT 
  'Testing authenticate_employee function:' as test,
  * 
FROM authenticate_employee('yidy.breuer', 'TempPass123!');

-- Also check the raw employee data to compare
SELECT 
  'Raw employee data from table:' as comparison,
  id,
  username,
  email,
  first_name,
  last_name,
  role,
  is_active,
  can_expense,
  organization_id
FROM employees 
WHERE username = 'yidy.breuer';

-- Check if the function returns the can_expense field
SELECT 
  'Function result columns:' as info,
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_name IN (
  SELECT routine_name 
  FROM information_schema.routines 
  WHERE routine_name = 'authenticate_employee'
);