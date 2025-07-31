-- Multi-Company Assignment and Enhanced Roles Migration
-- This migration adds multi-company support, new roles, and expenses feature

-- 1. Add new roles to employees table
ALTER TABLE employees 
ALTER COLUMN role TYPE text;

DROP TYPE IF EXISTS employee_role CASCADE;
CREATE TYPE employee_role AS ENUM ('admin', 'employee', 'manager', 'non_clock_worker');

ALTER TABLE employees 
ALTER COLUMN role TYPE employee_role USING role::employee_role;

-- 2. Create user_organizations table for multi-company assignment
CREATE TABLE IF NOT EXISTS user_organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    role employee_role NOT NULL DEFAULT 'employee',
    is_active BOOLEAN DEFAULT true,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assigned_by UUID REFERENCES employees(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique combinations
    UNIQUE(user_id, organization_id),
    UNIQUE(employee_id, organization_id)
);

-- 3. Add enable_expenses to organizations table
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS enable_expenses BOOLEAN DEFAULT false;

-- 4. Create expenses table
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    time_session_id UUID REFERENCES time_sessions(id) ON DELETE SET NULL,
    amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
    description TEXT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_organizations_user_id ON user_organizations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_organizations_organization_id ON user_organizations(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_organizations_employee_id ON user_organizations(employee_id);
CREATE INDEX IF NOT EXISTS idx_expenses_employee_id ON expenses(employee_id);
CREATE INDEX IF NOT EXISTS idx_expenses_organization_id ON expenses(organization_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_time_session_id ON expenses(time_session_id);

-- 6. Enable RLS on new tables
ALTER TABLE user_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies for user_organizations
CREATE POLICY "Users can view their own organization assignments" ON user_organizations
    FOR SELECT USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM employees e 
            WHERE e.id = employee_id 
            AND e.organization_id IN (
                SELECT uo.organization_id FROM user_organizations uo 
                WHERE uo.user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Admins can manage organization assignments" ON user_organizations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM employees e 
            JOIN user_organizations uo ON e.id = uo.employee_id
            WHERE uo.user_id = auth.uid() 
            AND e.role = 'admin'
            AND (e.organization_id = organization_id OR e.role = 'admin')
        )
    );

-- 8. RLS Policies for expenses
CREATE POLICY "Employees can view their own expenses" ON expenses
    FOR SELECT USING (
        employee_id IN (
            SELECT e.id FROM employees e 
            JOIN user_organizations uo ON e.id = uo.employee_id
            WHERE uo.user_id = auth.uid()
        )
    );

CREATE POLICY "Employees can insert their own expenses" ON expenses
    FOR INSERT WITH CHECK (
        employee_id IN (
            SELECT e.id FROM employees e 
            JOIN user_organizations uo ON e.id = uo.employee_id
            WHERE uo.user_id = auth.uid()
        )
    );

CREATE POLICY "Admins and managers can view organization expenses" ON expenses
    FOR SELECT USING (
        organization_id IN (
            SELECT uo.organization_id FROM user_organizations uo 
            JOIN employees e ON uo.employee_id = e.id
            WHERE uo.user_id = auth.uid() 
            AND e.role IN ('admin', 'manager')
        )
    );

-- 9. Function to get user's organizations
CREATE OR REPLACE FUNCTION get_user_organizations(user_uuid UUID DEFAULT auth.uid())
RETURNS TABLE (
    organization_id UUID,
    organization_name TEXT,
    role employee_role,
    is_active BOOLEAN
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        uo.organization_id,
        o.name as organization_name,
        uo.role,
        uo.is_active
    FROM user_organizations uo
    JOIN organizations o ON uo.organization_id = o.id
    WHERE uo.user_id = user_uuid AND uo.is_active = true
    ORDER BY o.name;
END;
$$;

-- 10. Function to assign user to organization
CREATE OR REPLACE FUNCTION assign_user_to_organization(
    target_user_id UUID,
    target_employee_id UUID,
    target_organization_id UUID,
    target_role employee_role DEFAULT 'employee'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    assigner_role employee_role;
BEGIN
    -- Check if current user has permission to assign
    SELECT e.role INTO assigner_role
    FROM employees e 
    JOIN user_organizations uo ON e.id = uo.employee_id
    WHERE uo.user_id = auth.uid() 
    AND (e.organization_id = target_organization_id OR e.role = 'admin');
    
    IF assigner_role NOT IN ('admin') THEN
        RAISE EXCEPTION 'Insufficient permissions to assign users to organizations';
    END IF;
    
    -- Insert or update assignment
    INSERT INTO user_organizations (user_id, employee_id, organization_id, role, assigned_by)
    VALUES (target_user_id, target_employee_id, target_organization_id, target_role, 
            (SELECT uo.employee_id FROM user_organizations uo WHERE uo.user_id = auth.uid() LIMIT 1))
    ON CONFLICT (user_id, organization_id) 
    DO UPDATE SET 
        role = target_role,
        is_active = true,
        updated_at = NOW();
    
    RETURN TRUE;
END;
$$;

-- 11. Migrate existing employees to user_organizations table
-- This ensures backwards compatibility
DO $$
DECLARE
    emp_record RECORD;
BEGIN
    FOR emp_record IN SELECT * FROM employees WHERE is_active = true
    LOOP
        -- Check if user already exists in user_organizations
        IF NOT EXISTS (
            SELECT 1 FROM user_organizations 
            WHERE employee_id = emp_record.id 
            AND organization_id = emp_record.organization_id
        ) THEN
            -- Create auth user if it doesn't exist (for employee login compatibility)
            INSERT INTO user_organizations (employee_id, organization_id, role, is_active)
            VALUES (emp_record.id, emp_record.organization_id, emp_record.role, emp_record.is_active);
        END IF;
    END LOOP;
END $$;

-- 12. Update authenticate_employee function to work with multi-company
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
    role employee_role,
    is_active BOOLEAN,
    organizations JSONB
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    emp_record RECORD;
    orgs_json JSONB;
BEGIN
    -- Get employee data
    SELECT e.* INTO emp_record
    FROM employees e
    WHERE e.username = input_username 
    AND e.password = input_password 
    AND e.is_active = true
    LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN;
    END IF;
    
    -- Get all organizations this employee has access to
    SELECT jsonb_agg(
        jsonb_build_object(
            'organization_id', uo.organization_id,
            'organization_name', o.name,
            'role', uo.role,
            'is_active', uo.is_active
        )
    ) INTO orgs_json
    FROM user_organizations uo
    JOIN organizations o ON uo.organization_id = o.id
    WHERE uo.employee_id = emp_record.id AND uo.is_active = true;
    
    -- If no multi-company assignments, use default organization
    IF orgs_json IS NULL THEN
        SELECT jsonb_agg(
            jsonb_build_object(
                'organization_id', emp_record.organization_id,
                'organization_name', o.name,
                'role', emp_record.role,
                'is_active', true
            )
        ) INTO orgs_json
        FROM organizations o
        WHERE o.id = emp_record.organization_id;
    END IF;
    
    RETURN QUERY SELECT 
        emp_record.id,
        emp_record.organization_id,
        emp_record.first_name,
        emp_record.last_name,
        emp_record.email,
        emp_record.role,
        emp_record.is_active,
        orgs_json;
END;
$$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON user_organizations TO authenticated;
GRANT ALL ON expenses TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_organizations TO authenticated;
GRANT EXECUTE ON FUNCTION assign_user_to_organization TO authenticated;
GRANT EXECUTE ON FUNCTION authenticate_employee TO anon, authenticated;