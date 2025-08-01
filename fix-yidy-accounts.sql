-- Fix yidy account issues: expenses and organization data

BEGIN;

-- Show current state of yidy-related accounts
SELECT 
  'Current Yidy Accounts:' as info,
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
   OR e.email LIKE '%yidybreuer%'
   OR e.first_name LIKE '%Yidy%'
   OR e.last_name LIKE '%Brier%'
ORDER BY e.email;

-- Enable expenses for all yidy accounts (they're admin/manager level)
UPDATE employees 
SET can_expense = true
WHERE email LIKE '%yidy%' 
   OR email LIKE '%yidybreuer%'
   OR first_name LIKE '%Yidy%'
   OR last_name LIKE '%Brier%';

-- Make sure yidy accounts have proper organization assignments
-- Get Chapeaux New York organization ID
DO $$
DECLARE
    chapeaux_org_id UUID;
BEGIN
    SELECT id INTO chapeaux_org_id 
    FROM organizations 
    WHERE name ILIKE '%chapeaux%' 
    LIMIT 1;
    
    IF chapeaux_org_id IS NOT NULL THEN
        -- Update yidybrier accounts to Chapeaux if they don't have an organization
        UPDATE employees 
        SET organization_id = chapeaux_org_id
        WHERE (email LIKE '%yidybrier%' OR email LIKE '%yidy%brier%')
          AND organization_id IS NULL;
          
        RAISE NOTICE 'Updated yidy accounts with Chapeaux organization: %', chapeaux_org_id;
    ELSE
        RAISE NOTICE 'Chapeaux organization not found';
    END IF;
END $$;

-- Show final state after fixes
SELECT 
  'Fixed Yidy Accounts:' as result,
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
   OR e.email LIKE '%yidybreuer%'
   OR e.first_name LIKE '%Yidy%'
   OR e.last_name LIKE '%Brier%'
ORDER BY e.email;

-- Verify expense permissions are working
SELECT 
  'Employees with expense permissions:' as summary,
  COUNT(*) as total_count,
  COUNT(CASE WHEN can_expense = true THEN 1 END) as can_expense_count
FROM employees
WHERE email LIKE '%yidy%' 
   OR email LIKE '%yidybreuer%'
   OR first_name LIKE '%Yidy%';

COMMIT;