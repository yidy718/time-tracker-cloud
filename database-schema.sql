-- Time Tracker Cloud Database Schema
-- To be used with Supabase PostgreSQL

-- Enable Row Level Security
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Organizations table (for multi-tenant support)
CREATE TABLE organizations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Locations table
CREATE TABLE locations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Employee roles enum
CREATE TYPE employee_role AS ENUM ('admin', 'manager', 'employee');

-- Employees table (extends Supabase auth.users)
CREATE TABLE employees (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    employee_id VARCHAR(50) UNIQUE, -- Optional employee ID/badge number
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    role employee_role DEFAULT 'employee',
    department VARCHAR(100),
    hire_date DATE,
    hourly_rate DECIMAL(10,2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Time sessions table
CREATE TABLE time_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    location_id UUID REFERENCES locations(id),
    clock_in TIMESTAMP WITH TIME ZONE NOT NULL,
    clock_out TIMESTAMP WITH TIME ZONE,
    break_start TIMESTAMP WITH TIME ZONE,
    break_end TIMESTAMP WITH TIME ZONE,
    break_duration INTERVAL DEFAULT '0 minutes',
    total_duration INTERVAL,
    work_duration INTERVAL, -- total_duration - break_duration
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_clock_out CHECK (clock_out IS NULL OR clock_out > clock_in),
    CONSTRAINT valid_break_times CHECK (
        (break_start IS NULL AND break_end IS NULL) OR
        (break_start IS NOT NULL AND break_end IS NOT NULL AND break_end > break_start)
    )
);

-- Function to calculate durations automatically
CREATE OR REPLACE FUNCTION calculate_session_durations()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate total duration if clocked out
    IF NEW.clock_out IS NOT NULL THEN
        NEW.total_duration = NEW.clock_out - NEW.clock_in;
        
        -- Calculate break duration
        IF NEW.break_start IS NOT NULL AND NEW.break_end IS NOT NULL THEN
            NEW.break_duration = NEW.break_end - NEW.break_start;
        ELSE
            NEW.break_duration = '0 minutes'::interval;
        END IF;
        
        -- Calculate work duration
        NEW.work_duration = NEW.total_duration - NEW.break_duration;
    END IF;
    
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-calculate durations
CREATE TRIGGER calculate_durations_trigger
    BEFORE INSERT OR UPDATE ON time_sessions
    FOR EACH ROW
    EXECUTE FUNCTION calculate_session_durations();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers to all tables
CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_locations_updated_at
    BEFORE UPDATE ON locations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employees_updated_at
    BEFORE UPDATE ON employees
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_sessions ENABLE ROW LEVEL SECURITY;

-- Organizations policies
CREATE POLICY "Users can view their organization" ON organizations
    FOR SELECT USING (id IN (
        SELECT organization_id FROM employees WHERE id = auth.uid()
    ));

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

-- Useful Views
CREATE VIEW active_sessions AS
SELECT 
    ts.*,
    e.first_name,
    e.last_name,
    e.employee_id,
    l.name as location_name
FROM time_sessions ts
JOIN employees e ON ts.employee_id = e.id
LEFT JOIN locations l ON ts.location_id = l.id
WHERE ts.clock_out IS NULL AND e.is_active = true;

CREATE VIEW daily_summaries AS
SELECT 
    DATE(clock_in AT TIME ZONE 'UTC') as work_date,
    employee_id,
    COUNT(*) as session_count,
    SUM(EXTRACT(EPOCH FROM work_duration)/3600) as total_hours,
    SUM(EXTRACT(EPOCH FROM break_duration)/3600) as break_hours
FROM time_sessions
WHERE clock_out IS NOT NULL
GROUP BY DATE(clock_in AT TIME ZONE 'UTC'), employee_id;

-- Indexes for better performance
CREATE INDEX idx_time_sessions_employee_id ON time_sessions(employee_id);
CREATE INDEX idx_time_sessions_clock_in ON time_sessions(clock_in);
CREATE INDEX idx_time_sessions_location_id ON time_sessions(location_id);
CREATE INDEX idx_employees_organization_id ON employees(organization_id);
CREATE INDEX idx_employees_role ON employees(role);
CREATE INDEX idx_locations_organization_id ON locations(organization_id);