-- Fix Getting Lost company owner role from manager to admin
-- Run this SQL in your Supabase SQL Editor

BEGIN;

-- Update Getting Lost owner to admin role
UPDATE employees 
SET role = 'admin' 
WHERE email = 'info@gettinlost.com' 
  AND role = 'manager';

-- Verify the change
SELECT id, first_name, last_name, email, role, organization_id
FROM employees 
WHERE email = 'info@gettinlost.com';

-- Also check if there are any other company owners that should be admins
SELECT e.id, e.first_name, e.last_name, e.email, e.role, o.name as company_name
FROM employees e
JOIN organizations o ON e.organization_id = o.id
WHERE e.role = 'manager' 
  AND e.email LIKE '%@%'
  AND e.organization_id IN (
    SELECT organization_id 
    FROM employees 
    GROUP BY organization_id 
    HAVING COUNT(*) = 1  -- Only one employee in company (probably the owner)
  )
ORDER BY o.name;

COMMIT;

SELECT 'Getting Lost owner role fixed to admin. Future company creations will also create admins correctly.' as result;