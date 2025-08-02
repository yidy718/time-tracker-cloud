-- Create missing PostgreSQL functions for phone management
-- Run this in Supabase SQL Editor

-- Function to update employee phone numbers with admin privileges
CREATE OR REPLACE FUNCTION admin_update_employee_phone(
  employee_id_input UUID,
  phone_input TEXT
)
RETURNS JSON AS $$
DECLARE
  formatted_phone TEXT;
  result JSON;
BEGIN
  -- Handle null/empty input
  IF phone_input IS NULL OR TRIM(phone_input) = '' THEN
    formatted_phone := NULL;
  ELSE
    -- Format the phone number
    -- Remove all non-digits first
    formatted_phone := regexp_replace(phone_input, '[^0-9]', '', 'g');
    
    -- Format based on length
    IF LENGTH(formatted_phone) = 10 THEN
      -- 10 digits - add US country code
      formatted_phone := '+1' || formatted_phone;
    ELSIF LENGTH(formatted_phone) = 11 AND substring(formatted_phone, 1, 1) = '1' THEN
      -- 11 digits starting with 1 - add plus
      formatted_phone := '+' || formatted_phone;
    ELSIF phone_input ~ '^\+[1-9]\d{1,14}$' THEN
      -- Already valid E.164
      formatted_phone := phone_input;
    ELSE
      -- Invalid format
      RETURN json_build_object(
        'success', false, 
        'error', 'Invalid phone number format. Use 10-digit US number or E.164 format like +15551234567'
      );
    END IF;
  END IF;
  
  -- Update the employee
  UPDATE employees 
  SET phone = formatted_phone 
  WHERE id = employee_id_input;
  
  -- Check if update was successful
  IF FOUND THEN
    RETURN json_build_object(
      'success', true, 
      'phone', formatted_phone,
      'message', 'Phone number updated successfully'
    );
  ELSE
    RETURN json_build_object(
      'success', false, 
      'error', 'Employee not found'
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION admin_update_employee_phone TO authenticated;
GRANT EXECUTE ON FUNCTION admin_update_employee_phone TO anon;

-- Function to format phone numbers
CREATE OR REPLACE FUNCTION format_phone_number(input_phone TEXT, country_code TEXT DEFAULT '+1')
RETURNS TEXT AS $$
BEGIN
  -- Return NULL if input is NULL or empty
  IF input_phone IS NULL OR TRIM(input_phone) = '' THEN
    RETURN NULL;
  END IF;
  
  -- Remove all non-digits
  input_phone := regexp_replace(input_phone, '[^0-9]', '', 'g');
  
  -- If already has country code (11 digits starting with 1), format it
  IF LENGTH(input_phone) = 11 AND substring(input_phone, 1, 1) = '1' THEN
    RETURN '+' || input_phone;
  END IF;
  
  -- If 10 digits, add default country code
  IF LENGTH(input_phone) = 10 THEN
    RETURN country_code || input_phone;
  END IF;
  
  -- Return NULL if can't format
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION format_phone_number TO authenticated;
GRANT EXECUTE ON FUNCTION format_phone_number TO anon;

-- Create trigger function for automatic phone formatting
CREATE OR REPLACE FUNCTION trigger_format_phone_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.phone IS NOT NULL AND NEW.phone != '' THEN
    NEW.phone := format_phone_number(NEW.phone);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the trigger
DROP TRIGGER IF EXISTS format_phone_on_change ON employees;
CREATE TRIGGER format_phone_on_change
  BEFORE INSERT OR UPDATE ON employees
  FOR EACH ROW
  EXECUTE FUNCTION trigger_format_phone_number();

-- Test the function
SELECT 'Functions created successfully!' as status;

-- Show example usage
SELECT 
  'EXAMPLE USAGE:' as info,
  admin_update_employee_phone(
    (SELECT id FROM employees LIMIT 1),
    '555-123-4567'
  ) as example_result;