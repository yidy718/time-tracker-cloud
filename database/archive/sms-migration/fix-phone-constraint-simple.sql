-- Simple and reliable phone constraint fix
-- Run this in Supabase SQL Editor

-- Step 1: Check current phone data
SELECT 
  'CURRENT PHONE DATA ANALYSIS' as step,
  CASE 
    WHEN phone IS NULL THEN 'NULL'
    WHEN phone = '' THEN 'EMPTY'
    WHEN phone ~ '^\+[1-9]\d{1,14}$' THEN 'VALID E.164'
    ELSE 'INVALID: ' || phone
  END as phone_status,
  COUNT(*) as count
FROM employees 
GROUP BY phone_status
ORDER BY count DESC;

-- Step 2: Clean up empty/null phone numbers
UPDATE employees 
SET phone = NULL 
WHERE phone = '' OR TRIM(phone) = '';

-- Step 3: Fix common phone number formats
UPDATE employees 
SET phone = CASE
  -- Already valid E.164
  WHEN phone ~ '^\+[1-9]\d{1,14}$' THEN phone
  -- 11 digits starting with 1 (US with country code)
  WHEN phone ~ '^1[0-9]{10}$' THEN '+' || phone
  -- 10 digits (US without country code)
  WHEN phone ~ '^[2-9][0-9]{9}$' THEN '+1' || phone
  -- Remove non-digits and try to format
  WHEN LENGTH(regexp_replace(phone, '[^0-9]', '', 'g')) = 10 THEN 
    '+1' || regexp_replace(phone, '[^0-9]', '', 'g')
  WHEN LENGTH(regexp_replace(phone, '[^0-9]', '', 'g')) = 11 
    AND substring(regexp_replace(phone, '[^0-9]', '', 'g'), 1, 1) = '1' THEN 
    '+' || regexp_replace(phone, '[^0-9]', '', 'g')
  -- Can't parse - set to NULL
  ELSE NULL
END
WHERE phone IS NOT NULL;

-- Step 4: Show what we have after cleaning
SELECT 
  'AFTER CLEANING' as step,
  CASE 
    WHEN phone IS NULL THEN 'NULL (needs phone)'
    WHEN phone ~ '^\+[1-9]\d{1,14}$' THEN 'VALID E.164'
    ELSE 'STILL INVALID: ' || phone
  END as phone_status,
  COUNT(*) as count
FROM employees 
GROUP BY phone_status
ORDER BY count DESC;

-- Step 5: Remove any remaining invalid phone numbers
UPDATE employees 
SET phone = NULL 
WHERE phone IS NOT NULL AND phone !~ '^\+[1-9]\d{1,14}$';

-- Step 6: Drop existing constraint if it exists
ALTER TABLE employees DROP CONSTRAINT IF EXISTS check_phone_format;

-- Step 7: Add the constraint (this should work now)
ALTER TABLE employees 
ADD CONSTRAINT check_phone_format 
CHECK (phone IS NULL OR phone ~ '^\+[1-9]\d{1,14}$');

-- Step 8: Create index for performance
CREATE INDEX IF NOT EXISTS idx_employees_phone ON employees(phone);

-- Step 9: Show final results
SELECT 
  'FINAL RESULT' as step,
  CASE 
    WHEN phone IS NULL THEN 'NULL (ready for SMS setup)'
    WHEN phone ~ '^\+[1-9]\d{1,14}$' THEN 'VALID E.164 ✅'
    ELSE 'ERROR: ' || phone
  END as phone_status,
  COUNT(*) as count
FROM employees 
GROUP BY phone_status;

-- Step 10: Show employees that need phone numbers
SELECT 
  'EMPLOYEES NEEDING PHONE NUMBERS' as info,
  id,
  first_name || ' ' || last_name as name,
  email,
  role,
  organization_id
FROM employees 
WHERE phone IS NULL AND is_active = true
ORDER BY first_name
LIMIT 10;

-- Success message
SELECT '✅ Phone constraint fixed successfully!' as status;