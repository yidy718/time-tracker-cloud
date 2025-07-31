-- Enable phone-only employee accounts (make email optional when phone is provided)
-- This allows employees to be created with just phone numbers for easier authentication

BEGIN;

-- First, let's see current employees without phones
SELECT 
  'Current employees without phone numbers:' as info,
  COUNT(*) as count
FROM employees 
WHERE phone IS NULL OR phone = '';

-- Make email optional in employees table
-- We can't simply remove NOT NULL constraint because some employees might not have phones
-- Instead, we'll add a constraint that requires either email OR phone
ALTER TABLE employees 
DROP CONSTRAINT IF EXISTS employees_email_key;

ALTER TABLE employees 
ALTER COLUMN email DROP NOT NULL;

-- Add constraint to ensure at least email OR phone is provided
ALTER TABLE employees 
ADD CONSTRAINT email_or_phone_required 
CHECK (
  (email IS NOT NULL AND email != '') OR 
  (phone IS NOT NULL AND phone != '')
);

-- Add unique constraint on phone when it's provided
ALTER TABLE employees 
ADD CONSTRAINT employees_phone_unique 
UNIQUE (phone);

-- Create index for phone-based lookups
CREATE INDEX IF NOT EXISTS employees_phone_idx ON employees(phone) 
WHERE phone IS NOT NULL AND phone != '';

-- Create index for username-based lookups (for existing login system)
CREATE INDEX IF NOT EXISTS employees_username_idx ON employees(username) 
WHERE username IS NOT NULL AND username != '';

-- Update RLS policies to work with phone-only employees
-- First check current policies
SELECT 'Current RLS policies on employees:' as info;
SELECT 
    policyname,
    cmd,
    permissive,
    qual
FROM pg_policies 
WHERE tablename = 'employees';

-- Update any policies that rely on email to also work with phone
-- Most existing policies should work fine since they use employee ID

-- Add helper function to generate phone-based usernames
CREATE OR REPLACE FUNCTION generate_phone_username(input_phone TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Convert phone number to username format
  -- Remove all non-digits, then add 'ph' prefix
  -- Example: "+1 (555) 123-4567" becomes "ph15551234567"
  RETURN 'ph' || regexp_replace(input_phone, '[^0-9]', '', 'g');
END;
$$ LANGUAGE plpgsql;

-- Test the phone username generation
SELECT 
  'Testing phone username generation:' as info,
  generate_phone_username('+1 (555) 123-4567') as example1,
  generate_phone_username('555-123-4567') as example2,
  generate_phone_username('5551234567') as example3;

-- Show final constraint information
SELECT 
  'Updated employees table constraints:' as info,
  conname as constraint_name,
  contype as constraint_type
FROM pg_constraint 
WHERE conrelid = 'employees'::regclass
  AND conname IN ('email_or_phone_required', 'employees_phone_unique');

COMMIT;

-- Success message and next steps
SELECT 
  'Phone-only employee accounts are now enabled!' as status,
  'Next steps:' as info,
  '1. Update frontend forms to include phone field' as step1,
  '2. Update employee creation logic to handle phone-only accounts' as step2,
  '3. Add phone-based authentication to login system' as step3,
  '4. Test creating employees with phone-only credentials' as step4;

-- Show example of what's now possible
SELECT 
  'Examples of valid employee records after this migration:' as info,
  'Email + Phone: email@company.com + 555-1234' as example1,
  'Email only: email@company.com (phone can be NULL)' as example2,  
  'Phone only: NULL + 555-1234 (email can be NULL)' as example3;