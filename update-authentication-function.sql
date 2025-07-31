-- Update authenticate_employee function to support phone number login
-- This enables employees to log in using their phone number instead of username

BEGIN;

-- First, check if the function exists
SELECT 'Current authenticate_employee function:' as info;
SELECT 
  proname as function_name,
  prosrc as source
FROM pg_proc 
WHERE proname = 'authenticate_employee';

-- Drop existing function first to avoid return type conflicts
DROP FUNCTION IF EXISTS authenticate_employee(TEXT, TEXT);

-- Create the updated authenticate_employee function to handle phone numbers
CREATE FUNCTION authenticate_employee(
  input_username TEXT,
  input_password TEXT
)
RETURNS TABLE(
  employee_id UUID,
  organization_id UUID, 
  first_name VARCHAR,
  last_name VARCHAR,
  email VARCHAR,
  phone VARCHAR,
  role employee_role,
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
    
    RAISE LOG 'Phone authentication failed, no matching phone found';
  END IF;
  
  -- If not a phone number, or phone lookup failed, try username lookup
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
    RAISE LOG 'Username authentication failed';
  END IF;
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION authenticate_employee(TEXT, TEXT) TO authenticated;

-- Test the updated function with some examples
SELECT 'Testing phone number detection:' as info;

-- Test phone number patterns (these should be detected as phone numbers)
SELECT 
  '555-123-4567' as input,
  ('555-123-4567' ~ '^[\d\s\-\(\)\+\.]+$') as is_phone_pattern;
  
SELECT 
  '(555) 123-4567' as input,
  ('(555) 123-4567' ~ '^[\d\s\-\(\)\+\.]+$') as is_phone_pattern;
  
SELECT 
  '+1-555-123-4567' as input,
  ('+1-555-123-4567' ~ '^[\d\s\-\(\)\+\.]+$') as is_phone_pattern;

-- Test username patterns (these should NOT be detected as phone numbers)  
SELECT 
  'john.doe' as input,
  ('john.doe' ~ '^[\d\s\-\(\)\+\.]+$') as is_phone_pattern;
  
SELECT 
  'employee123' as input,
  ('employee123' ~ '^[\d\s\-\(\)\+\.]+$') as is_phone_pattern;

-- Test phone number normalization
SELECT 'Testing phone number normalization:' as info;
SELECT 
  '(555) 123-4567' as original,
  regexp_replace('(555) 123-4567', '[^0-9]', '', 'g') as normalized;
  
SELECT 
  '+1-555-123-4567' as original,
  regexp_replace('+1-555-123-4567', '[^0-9]', '', 'g') as normalized;

COMMIT;

-- Show the updated function
SELECT 'Updated authenticate_employee function is now ready!' as status;
SELECT 'Supports both username and phone number authentication' as feature1;
SELECT 'Phone numbers are normalized by removing non-digits' as feature2;
SELECT 'Maintains backward compatibility with existing username login' as feature3;

-- Usage examples:
SELECT 'Usage Examples:' as info;
SELECT 'authenticate_employee(''john.doe'', ''password123'')' as username_login;
SELECT 'authenticate_employee(''555-123-4567'', ''password123'')' as phone_login;
SELECT 'authenticate_employee(''(555) 123-4567'', ''password123'')' as phone_login_formatted;