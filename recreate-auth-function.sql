-- Recreate the authenticate_employee function to ensure it includes can_expense

BEGIN;

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS authenticate_employee(TEXT, TEXT);

-- Recreate the function with can_expense included
CREATE OR REPLACE FUNCTION authenticate_employee(
  input_username TEXT,
  input_password TEXT
)
RETURNS TABLE(
  employee_id UUID,
  organization_id UUID,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  role TEXT,
  is_active BOOLEAN,
  can_expense BOOLEAN
) AS $$
BEGIN
  -- Log the authentication attempt for debugging
  RAISE LOG 'authenticate_employee called with input: %', input_username;
  
  -- Check if input looks like a phone number (contains mostly digits and phone characters)
  IF input_username ~ '^[\d\s\-\(\)\+\.]+$' THEN
    -- Input looks like a phone number - search by phone
    RAISE LOG 'Input appears to be phone number, searching phone field';
    
    RETURN QUERY
    SELECT 
      e.id as employee_id,
      e.organization_id,
      e.first_name,
      e.last_name, 
      e.email,
      e.phone,
      e.role,
      e.is_active,
      e.can_expense
    FROM employees e
    WHERE e.phone IS NOT NULL 
      AND regexp_replace(e.phone, '[^0-9]', '', 'g') = regexp_replace(input_username, '[^0-9]', '', 'g')
      AND e.password = input_password
      AND e.is_active = true;
      
    -- If phone lookup found results, return them
    IF FOUND THEN
      RAISE LOG 'Phone authentication successful';
      RETURN;
    END IF;
  END IF;
  
  -- Try username-based authentication (main path)
  RAISE LOG 'Trying username authentication';
  
  RETURN QUERY
  SELECT 
    e.id as employee_id,
    e.organization_id,
    e.first_name,
    e.last_name,
    e.email, 
    e.phone,
    e.role,
    e.is_active,
    e.can_expense
  FROM employees e
  WHERE e.username = input_username
    AND e.password = input_password
    AND e.is_active = true;
    
  IF FOUND THEN
    RAISE LOG 'Username authentication successful';
  ELSE
    RAISE LOG 'Authentication failed for username: %', input_username;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION authenticate_employee(TEXT, TEXT) TO authenticated;

-- Test the recreated function
SELECT 
  'Testing recreated function:' as test,
  employee_id,
  email,
  can_expense,
  role
FROM authenticate_employee('yidy.breuer', 'TempPass123!');

COMMIT;