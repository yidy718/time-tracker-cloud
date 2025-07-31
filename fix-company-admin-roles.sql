-- Fix company owners who have 'manager' role instead of 'admin' role
-- This prevents them from being able to create projects and manage their companies properly
-- Run this SQL in your Supabase SQL Editor

BEGIN;

-- First, identify company owners who are currently set as 'manager' but should be 'admin'
-- These are typically users who are the only employee in their company or the first employee created
SELECT 
  e.id, 
  e.first_name, 
  e.last_name, 
  e.email, 
  e.role as current_role,
  o.name as company_name,
  (SELECT COUNT(*) FROM employees WHERE organization_id = e.organization_id) as employee_count
FROM employees e
JOIN organizations o ON e.organization_id = o.id
WHERE e.role = 'manager' 
  AND e.organization_id IN (
    -- Find companies where there's only one employee (likely the owner)
    -- OR companies where this manager is the first/primary admin contact
    SELECT organization_id 
    FROM employees 
    GROUP BY organization_id 
    HAVING COUNT(*) = 1 
    OR MIN(created_at) = MAX(created_at)  -- Only one creation time (single employee)
  )
ORDER BY o.name;

-- Fix the specific 'Getting Lost' company admin role
UPDATE employees 
SET role = 'admin' 
WHERE email = 'info@gettinlost.com' 
  AND role = 'manager';

-- Fix any other single-employee companies where the owner is marked as 'manager'
UPDATE employees 
SET role = 'admin' 
WHERE role = 'manager' 
  AND organization_id IN (
    SELECT organization_id 
    FROM employees 
    GROUP BY organization_id 
    HAVING COUNT(*) = 1  -- Only one employee in company (definitely the owner)
  );

-- Optional: Fix managers in small companies (2-3 employees) who are likely owners
-- Uncomment the next block if you want to be more aggressive about fixing roles
/*
UPDATE employees 
SET role = 'admin' 
WHERE role = 'manager' 
  AND email IN (
    -- Find managers whose email domain matches their company setup pattern
    SELECT DISTINCT e.email
    FROM employees e
    JOIN organizations o ON e.organization_id = o.id
    WHERE e.role = 'manager'
      AND (
        LOWER(e.email) LIKE '%@' || LOWER(REPLACE(o.name, ' ', '')) || '.com'
        OR (SELECT COUNT(*) FROM employees WHERE organization_id = e.organization_id) <= 3
      )
  );
*/

-- Verify the changes
SELECT 
  e.id, 
  e.first_name, 
  e.last_name, 
  e.email, 
  e.role,
  o.name as company_name,
  (SELECT COUNT(*) FROM employees WHERE organization_id = e.organization_id) as total_employees
FROM employees e
JOIN organizations o ON e.organization_id = o.id
WHERE e.role = 'admin'
  AND e.organization_id NOT IN (
    SELECT id FROM organizations WHERE LOWER(name) LIKE '%super admin%'
  )
ORDER BY o.name, e.first_name;

COMMIT;

-- Success message
SELECT 
  'Company admin roles have been fixed. Users who were incorrectly set as "manager" instead of "admin" can now create projects and manage their companies properly.' as result;

-- Show a summary of the changes
SELECT 
  'Total company admins (excluding super admins): ' || COUNT(*) as summary
FROM employees e
JOIN organizations o ON e.organization_id = o.id
WHERE e.role = 'admin'
  AND LOWER(o.name) NOT LIKE '%super admin%';