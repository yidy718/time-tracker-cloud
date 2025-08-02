-- Add phone field to employees table for SMS authentication
-- Run this in Supabase SQL Editor

-- Add phone column to employees table
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS phone TEXT;

-- Add index for phone lookups (for performance)
CREATE INDEX IF NOT EXISTS idx_employees_phone ON employees(phone);

-- Add constraint to ensure phone format is valid (E.164 format)
ALTER TABLE employees 
ADD CONSTRAINT check_phone_format 
CHECK (phone IS NULL OR phone ~ '^\+[1-9]\d{1,14}$');

-- Update existing employees with placeholder phone numbers (admins should update these)
-- You can customize these phone numbers as needed

-- Example: Update specific employees with phone numbers
-- UPDATE employees SET phone = '+15551234567' WHERE email = 'admin@company.com';
-- UPDATE employees SET phone = '+15551234568' WHERE email = 'employee@company.com';

-- Or add a comment to remind admins to update phone numbers
COMMENT ON COLUMN employees.phone IS 'Phone number in E.164 format (e.g., +15551234567) for SMS authentication';

-- Optional: Add a function to validate and format phone numbers
CREATE OR REPLACE FUNCTION format_phone_number(input_phone TEXT, country_code TEXT DEFAULT '+1')
RETURNS TEXT AS $$
BEGIN
  -- Remove all non-digits
  input_phone := regexp_replace(input_phone, '[^0-9]', '', 'g');
  
  -- If already has country code (11 digits starting with 1), format it
  IF length(input_phone) = 11 AND substring(input_phone, 1, 1) = '1' THEN
    RETURN '+' || input_phone;
  END IF;
  
  -- If 10 digits, add default country code
  IF length(input_phone) = 10 THEN
    RETURN country_code || input_phone;
  END IF;
  
  -- Return original if can't format
  RETURN input_phone;
END;
$$ LANGUAGE plpgsql;

-- Create a helper view to show employees without phone numbers
CREATE OR REPLACE VIEW employees_without_phone AS
SELECT 
  id,
  first_name,
  last_name,
  email,
  username,
  organization_id,
  role
FROM employees 
WHERE phone IS NULL AND is_active = true;

COMMENT ON VIEW employees_without_phone IS 'Shows active employees who need phone numbers added for SMS authentication';

-- Create RPC function for admins to update employee phone numbers
CREATE OR REPLACE FUNCTION admin_update_employee_phone(
  employee_id_input UUID,
  phone_input TEXT
)
RETURNS JSON AS $$
DECLARE
  formatted_phone TEXT;
  result JSON;
BEGIN
  -- Format the phone number
  formatted_phone := format_phone_number(phone_input);
  
  -- Validate format
  IF formatted_phone !~ '^\+[1-9]\d{1,14}$' THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'Invalid phone number format. Use E.164 format like +15551234567'
    );
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

-- Grant execute permission to authenticated users (admins)
GRANT EXECUTE ON FUNCTION admin_update_employee_phone TO authenticated;

-- Create a trigger to format phone numbers on insert/update
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

-- Show helpful information
SELECT 
  'Database updated successfully!' as status,
  'Next steps:' as todo,
  '1. Update employee phone numbers using admin_update_employee_phone() function' as step1,
  '2. Configure Supabase Phone Auth in dashboard' as step2,
  '3. Test SMS authentication' as step3;