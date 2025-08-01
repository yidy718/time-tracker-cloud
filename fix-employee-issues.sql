-- Fix employee issues for yidy accounts

BEGIN;

-- First, let's see what yidy accounts exist
SELECT 
  'Current Yidy Accounts:' as info,
  e.id,
  e.email,
  e.first_name,
  e.last_name,
  e.role,
  e.can_expense,
  o.name as organization_name
FROM employees e
LEFT JOIN organizations o ON e.organization_id = o.id
WHERE e.email LIKE '%yidy%' 
   OR e.first_name LIKE '%Yidy%'
   OR e.last_name LIKE '%Brier%'
   OR e.email = 'yidybreuer+ch@gmail.com'
ORDER BY e.email;

-- Enable expense permissions for yidy accounts (they should be able to expense)
UPDATE employees 
SET can_expense = true
WHERE email LIKE '%yidy%' 
   OR email = 'yidybreuer+ch@gmail.com'
   OR first_name LIKE '%Yidy%';

-- Verify the organization_id is properly set for all yidy accounts
-- Check if any yidy accounts have missing organization_id
SELECT 
  'Accounts with missing organization_id:' as warning,
  e.id,
  e.email,
  e.organization_id
FROM employees e
WHERE (e.email LIKE '%yidy%' OR e.email = 'yidybreuer+ch@gmail.com')
  AND e.organization_id IS NULL;

-- Get Chapeaux New York organization ID for reference
SELECT 
  'Chapeaux NY Organization:' as info,
  id,
  name
FROM organizations 
WHERE name LIKE '%Chapeaux%' OR name LIKE '%chapeaux%';

-- If yidybreuer+ch@gmail.com exists but has wrong organization, fix it
-- (Based on CLAUDE.md, yidybrier@gmail.com should be with Chapeaux New York)
UPDATE employees 
SET organization_id = (
  SELECT id FROM organizations 
  WHERE name LIKE '%Chapeaux%' 
  LIMIT 1
)
WHERE email = 'yidybreuer+ch@gmail.com'
  AND organization_id IS NULL;

-- Show final status
SELECT 
  'Fixed Employee Data:' as result,
  e.id,
  e.email,
  e.first_name,
  e.last_name,
  e.role,
  e.can_expense,
  e.organization_id,
  o.name as organization_name
FROM employees e
LEFT JOIN organizations o ON e.organization_id = o.id
WHERE e.email LIKE '%yidy%' 
   OR e.email = 'yidybreuer+ch@gmail.com'
   OR e.first_name LIKE '%Yidy%'
ORDER BY e.email;

COMMIT;