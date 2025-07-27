-- Row Level Security (RLS) Policies for Multi-Company Isolation

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_projects ENABLE ROW LEVEL SECURITY;

-- Organizations policies
CREATE POLICY "Users can view their organization" ON organizations
    FOR SELECT USING (id IN (
        SELECT organization_id FROM employees WHERE id = auth.uid()
    ));

-- Super admin can manage all organizations
CREATE POLICY "Super admin can manage organizations" ON organizations
    FOR ALL USING (
        auth.uid() IN (
            SELECT id FROM employees WHERE role = 'admin' 
            AND organization_id = (SELECT MIN(id) FROM organizations)
        )
    );

-- Locations policies  
CREATE POLICY "Users can view organization locations" ON locations
    FOR SELECT USING (organization_id IN (
        SELECT organization_id FROM employees WHERE id = auth.uid()
    ));

CREATE POLICY "Admins can manage locations" ON locations
    FOR ALL USING (organization_id IN (
        SELECT organization_id FROM employees 
        WHERE id = auth.uid() AND role IN ('admin', 'manager')
    ));

-- Client Projects policies
CREATE POLICY "Users can view organization projects" ON client_projects
    FOR SELECT USING (organization_id IN (
        SELECT organization_id FROM employees WHERE id = auth.uid()
    ));

CREATE POLICY "Admins can manage projects" ON client_projects
    FOR ALL USING (organization_id IN (
        SELECT organization_id FROM employees 
        WHERE id = auth.uid() AND role IN ('admin', 'manager')
    ));

-- Employees policies
CREATE POLICY "Users can view organization employees" ON employees
    FOR SELECT USING (organization_id IN (
        SELECT organization_id FROM employees WHERE id = auth.uid()
    ));

CREATE POLICY "Users can update their own profile" ON employees
    FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Admins can manage employees" ON employees
    FOR ALL USING (organization_id IN (
        SELECT organization_id FROM employees 
        WHERE id = auth.uid() AND role IN ('admin', 'manager')
    ));

-- Super admin can manage all employees
CREATE POLICY "Super admin can manage all employees" ON employees
    FOR ALL USING (
        auth.uid() IN (
            SELECT id FROM employees WHERE role = 'admin' 
            AND organization_id = (SELECT MIN(id) FROM organizations)
        )
    );

-- Time sessions policies
CREATE POLICY "Users can view organization time sessions" ON time_sessions
    FOR SELECT USING (employee_id IN (
        SELECT id FROM employees 
        WHERE organization_id IN (
            SELECT organization_id FROM employees WHERE id = auth.uid()
        )
    ));

CREATE POLICY "Users can manage their own time sessions" ON time_sessions
    FOR ALL USING (employee_id = auth.uid());

CREATE POLICY "Admins can manage all time sessions" ON time_sessions
    FOR ALL USING (employee_id IN (
        SELECT id FROM employees 
        WHERE organization_id IN (
            SELECT organization_id FROM employees 
            WHERE id = auth.uid() AND role IN ('admin', 'manager')
        )
    ));