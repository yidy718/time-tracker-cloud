-- Restore Super Admin Setup
-- This will recreate the super admin organization and user

-- Step 1: Create the super admin organization
INSERT INTO organizations (id, name, created_at, updated_at)
VALUES (
    '59590af0-3c38-403e-b4c9-ef4ba8db2a0b', 
    'VAS Hours Super Admin',
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    name = 'VAS Hours Super Admin',
    updated_at = NOW();

-- Step 2: Create/restore the super admin employee record
INSERT INTO employees (
    id, 
    organization_id, 
    first_name, 
    last_name, 
    email, 
    role, 
    is_active,
    created_at,
    updated_at
) VALUES (
    '882247fb-71f2-4d1d-8cfd-f33d8c5a3b0f',
    '59590af0-3c38-403e-b4c9-ef4ba8db2a0b',
    'Yidy',
    'Breuer',
    'yidy@pm.me',
    'admin',
    true,
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    organization_id = '59590af0-3c38-403e-b4c9-ef4ba8db2a0b',
    first_name = 'Yidy',
    last_name = 'Breuer',
    email = 'yidy@pm.me',
    role = 'admin',
    is_active = true,
    updated_at = NOW();

-- Verify the setup
SELECT 'Super Admin Setup Complete\!' as status;
SELECT 
    e.first_name,
    e.last_name,
    e.email,
    e.role,
    o.name as organization_name
FROM employees e
JOIN organizations o ON e.organization_id = o.id
WHERE e.id = '882247fb-71f2-4d1d-8cfd-f33d8c5a3b0f';
EOF < /dev/null