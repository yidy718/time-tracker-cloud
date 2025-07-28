-- Create a secure authentication function for employees
-- This bypasses RLS while maintaining security by only returning limited data

-- Create a function to authenticate employees
CREATE OR REPLACE FUNCTION authenticate_employee(
  input_username TEXT,
  input_password TEXT
)
RETURNS TABLE (
  employee_id UUID,
  organization_id UUID,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  role TEXT,
  is_active BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER -- This allows the function to bypass RLS
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.organization_id,
    e.first_name,
    e.last_name,
    e.email,
    e.role::TEXT,
    e.is_active
  FROM employees e
  WHERE e.username = input_username 
    AND e.password = input_password 
    AND e.is_active = true
    AND e.username IS NOT NULL  -- Only custom employees, not auth users
    AND e.password IS NOT NULL;
END;
$$;

-- Grant execute permission to authenticated and anonymous users
GRANT EXECUTE ON FUNCTION authenticate_employee TO anon;
GRANT EXECUTE ON FUNCTION authenticate_employee TO authenticated;

-- Test the function
-- SELECT * FROM authenticate_employee('test10.test', 'emp123');