-- Initial Time Tracker Schema with Multi-Company Support
-- This creates the complete database structure

-- Enable Row Level Security
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Employee roles enum
CREATE TYPE employee_role AS ENUM ('admin', 'manager', 'employee');

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
    client_name VARCHAR(255),
    project_code VARCHAR(50),
    billing_rate DECIMAL(10,2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Client Projects table
CREATE TABLE client_projects (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    client_name VARCHAR(255) NOT NULL,
    project_name VARCHAR(255) NOT NULL,
    project_code VARCHAR(50),
    start_date DATE,
    end_date DATE,
    billing_rate DECIMAL(10,2),
    location_id UUID REFERENCES locations(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Employees table (extends Supabase auth.users)
CREATE TABLE employees (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    employee_id VARCHAR(50) UNIQUE,
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
    client_project_id UUID REFERENCES client_projects(id),
    clock_in TIMESTAMP WITH TIME ZONE NOT NULL,
    clock_out TIMESTAMP WITH TIME ZONE,
    break_start TIMESTAMP WITH TIME ZONE,
    break_end TIMESTAMP WITH TIME ZONE,
    break_duration INTERVAL DEFAULT '0 minutes',
    total_duration INTERVAL,
    work_duration INTERVAL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
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
    IF NEW.clock_out IS NOT NULL THEN
        NEW.total_duration = NEW.clock_out - NEW.clock_in;
        
        IF NEW.break_start IS NOT NULL AND NEW.break_end IS NOT NULL THEN
            NEW.break_duration = NEW.break_end - NEW.break_start;
        ELSE
            NEW.break_duration = '0 minutes'::interval;
        END IF;
        
        NEW.work_duration = NEW.total_duration - NEW.break_duration;
    END IF;
    
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER calculate_durations_trigger
    BEFORE INSERT OR UPDATE ON time_sessions
    FOR EACH ROW
    EXECUTE FUNCTION calculate_session_durations();

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

CREATE TRIGGER update_client_projects_updated_at
    BEFORE UPDATE ON client_projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Useful Views
CREATE VIEW active_sessions AS
SELECT 
    ts.*,
    e.first_name,
    e.last_name,
    e.employee_id as badge_number,
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

CREATE VIEW detailed_time_reports AS
SELECT 
    ts.*,
    e.first_name,
    e.last_name,
    e.employee_id as badge_number,
    o.name as company_name,
    l.name as location_name,
    l.client_name,
    cp.client_name as project_client,
    cp.project_name,
    cp.project_code,
    cp.billing_rate as project_rate,
    EXTRACT(EPOCH FROM (ts.clock_out - ts.clock_in))/3600 as hours_worked,
    CASE 
        WHEN cp.billing_rate IS NOT NULL THEN cp.billing_rate * EXTRACT(EPOCH FROM (ts.clock_out - ts.clock_in))/3600
        WHEN e.hourly_rate IS NOT NULL THEN e.hourly_rate * EXTRACT(EPOCH FROM (ts.clock_out - ts.clock_in))/3600
        ELSE 0
    END as calculated_pay
FROM time_sessions ts
JOIN employees e ON ts.employee_id = e.id
JOIN organizations o ON e.organization_id = o.id
LEFT JOIN locations l ON ts.location_id = l.id
LEFT JOIN client_projects cp ON ts.client_project_id = cp.id
WHERE ts.clock_out IS NOT NULL;

-- Indexes for performance
CREATE INDEX idx_time_sessions_employee_id ON time_sessions(employee_id);
CREATE INDEX idx_time_sessions_clock_in ON time_sessions(clock_in);
CREATE INDEX idx_time_sessions_location_id ON time_sessions(location_id);
CREATE INDEX idx_time_sessions_project ON time_sessions(client_project_id);
CREATE INDEX idx_employees_organization_id ON employees(organization_id);
CREATE INDEX idx_employees_role ON employees(role);
CREATE INDEX idx_locations_organization_id ON locations(organization_id);
CREATE INDEX idx_client_projects_organization ON client_projects(organization_id);
CREATE INDEX idx_client_projects_active ON client_projects(is_active);