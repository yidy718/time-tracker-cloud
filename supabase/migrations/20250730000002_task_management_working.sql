-- Task Management System Schema (Working version for Supabase Dashboard)
-- Extends existing time tracker with comprehensive task management

-- Task status enum
CREATE TYPE task_status AS ENUM ('not_started', 'in_progress', 'completed', 'cancelled', 'on_hold');

-- Task priority enum  
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');

-- Tasks table
CREATE TABLE tasks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status task_status DEFAULT 'not_started',
    priority task_priority DEFAULT 'medium',
    due_date TIMESTAMP WITH TIME ZONE,
    estimated_hours DECIMAL(5,2),
    actual_hours DECIMAL(5,2) DEFAULT 0,
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    created_by UUID REFERENCES employees(id) ON DELETE SET NULL,
    assigned_to UUID REFERENCES employees(id) ON DELETE SET NULL,
    is_available_to_all BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Task assignments table
CREATE TABLE task_assignments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assigned_by UUID REFERENCES employees(id) ON DELETE SET NULL,
    UNIQUE(task_id, employee_id)
);

-- Task sessions table
CREATE TABLE task_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
    time_session_id UUID REFERENCES time_sessions(id) ON DELETE CASCADE NOT NULL,
    progress_before INTEGER DEFAULT 0,
    progress_after INTEGER DEFAULT 0,
    work_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Task comments table
CREATE TABLE task_comments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
    comment_text TEXT NOT NULL,
    is_status_change BOOLEAN DEFAULT false,
    old_status task_status,
    new_status task_status,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add task_id to time_sessions table
ALTER TABLE time_sessions ADD COLUMN IF NOT EXISTS task_id UUID REFERENCES tasks(id) ON DELETE SET NULL;

-- Create indexes
CREATE INDEX idx_tasks_organization_id ON tasks(organization_id);
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_task_assignments_task_id ON task_assignments(task_id);
CREATE INDEX idx_task_assignments_employee_id ON task_assignments(employee_id);
CREATE INDEX idx_task_sessions_task_id ON task_sessions(task_id);
CREATE INDEX idx_task_sessions_time_session_id ON task_sessions(time_session_id);
CREATE INDEX idx_task_comments_task_id ON task_comments(task_id);
CREATE INDEX idx_time_sessions_task_id ON time_sessions(task_id);

-- Function to update task actual hours
CREATE OR REPLACE FUNCTION update_task_actual_hours()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE tasks 
    SET actual_hours = COALESCE((
        SELECT SUM(EXTRACT(EPOCH FROM ts.work_duration) / 3600.0)
        FROM time_sessions ts 
        WHERE ts.task_id = COALESCE(NEW.task_id, OLD.task_id)
        AND ts.clock_out IS NOT NULL
    ), 0),
    updated_at = NOW()
    WHERE id = COALESCE(NEW.task_id, OLD.task_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Function to auto-update task status based on progress
CREATE OR REPLACE FUNCTION update_task_status_from_progress()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.progress_percentage = 100 AND NEW.status != 'completed' THEN
        NEW.status = 'completed';
        NEW.completed_at = NOW();
    ELSIF NEW.progress_percentage > 0 AND NEW.status = 'not_started' THEN
        NEW.status = 'in_progress';
    END IF;
    
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers (Fixed WHEN condition for DELETE)
CREATE TRIGGER update_task_hours_on_session_change
    AFTER INSERT OR UPDATE ON time_sessions
    FOR EACH ROW
    WHEN (NEW.task_id IS NOT NULL)
    EXECUTE FUNCTION update_task_actual_hours();

CREATE TRIGGER update_task_hours_on_session_delete
    AFTER DELETE ON time_sessions
    FOR EACH ROW
    WHEN (OLD.task_id IS NOT NULL)
    EXECUTE FUNCTION update_task_actual_hours();

CREATE TRIGGER update_task_status_trigger
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_task_status_from_progress();

CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tasks
CREATE POLICY "Users can view tasks in their organization" ON tasks
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM employees 
            WHERE id = auth.uid()::uuid
        )
    );

CREATE POLICY "Users can view their assigned tasks" ON tasks
    FOR SELECT USING (
        assigned_to = auth.uid()::uuid OR
        is_available_to_all = true OR
        EXISTS (
            SELECT 1 FROM task_assignments ta 
            WHERE ta.task_id = id AND ta.employee_id = auth.uid()::uuid
        )
    );

CREATE POLICY "Admins can manage tasks in their organization" ON tasks
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM employees 
            WHERE id = auth.uid()::uuid 
            AND organization_id = tasks.organization_id
            AND role IN ('admin', 'manager')
        )
    );

CREATE POLICY "Employees can update their assigned task progress" ON tasks
    FOR UPDATE USING (
        assigned_to = auth.uid()::uuid OR
        EXISTS (
            SELECT 1 FROM task_assignments ta 
            WHERE ta.task_id = id AND ta.employee_id = auth.uid()::uuid
        )
    );

-- RLS Policies for task_assignments
CREATE POLICY "Users can view task assignments in their organization" ON task_assignments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM tasks t 
            WHERE t.id = task_assignments.task_id 
            AND t.organization_id IN (
                SELECT organization_id FROM employees 
                WHERE id = auth.uid()::uuid
            )
        )
    );

CREATE POLICY "Admins can manage task assignments in their organization" ON task_assignments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM tasks t 
            JOIN employees e ON e.organization_id = t.organization_id
            WHERE t.id = task_assignments.task_id 
            AND e.id = auth.uid()::uuid
            AND e.role IN ('admin', 'manager')
        )
    );

-- RLS Policies for task_sessions
CREATE POLICY "Users can view task sessions for their tasks" ON task_sessions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM time_sessions ts
            JOIN employees e ON e.id = ts.employee_id
            WHERE ts.id = task_sessions.time_session_id
            AND e.id = auth.uid()::uuid
        ) OR
        EXISTS (
            SELECT 1 FROM tasks t
            WHERE t.id = task_sessions.task_id
            AND (t.assigned_to = auth.uid()::uuid OR EXISTS (
                SELECT 1 FROM task_assignments ta 
                WHERE ta.task_id = t.id AND ta.employee_id = auth.uid()::uuid
            ))
        )
    );

CREATE POLICY "Users can create task sessions for their time sessions" ON task_sessions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM time_sessions ts
            WHERE ts.id = task_sessions.time_session_id
            AND ts.employee_id = auth.uid()::uuid
        )
    );

-- RLS Policies for task_comments
CREATE POLICY "Users can view comments on tasks in their organization" ON task_comments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM tasks t 
            WHERE t.id = task_comments.task_id 
            AND t.organization_id IN (
                SELECT organization_id FROM employees 
                WHERE id = auth.uid()::uuid
            )
        )
    );

CREATE POLICY "Users can create comments on their assigned tasks" ON task_comments
    FOR INSERT WITH CHECK (
        employee_id = auth.uid()::uuid AND
        EXISTS (
            SELECT 1 FROM tasks t 
            WHERE t.id = task_comments.task_id 
            AND (t.assigned_to = auth.uid()::uuid OR 
                 EXISTS (SELECT 1 FROM task_assignments ta 
                        WHERE ta.task_id = t.id AND ta.employee_id = auth.uid()::uuid) OR
                 EXISTS (SELECT 1 FROM employees e 
                        WHERE e.id = auth.uid()::uuid 
                        AND e.organization_id = t.organization_id
                        AND e.role IN ('admin', 'manager')))
        )
    );

-- Create views
CREATE VIEW task_details AS
SELECT 
    t.*,
    e_assigned.first_name as assigned_first_name,
    e_assigned.last_name as assigned_last_name,
    e_assigned.employee_id as assigned_employee_id,
    e_created.first_name as created_by_first_name,
    e_created.last_name as created_by_last_name,
    p.project_name,
    p.client_name,
    p.project_code,
    o.name as organization_name,
    CASE 
        WHEN t.due_date < NOW() AND t.status NOT IN ('completed', 'cancelled') THEN true
        ELSE false
    END as is_overdue,
    CASE 
        WHEN t.estimated_hours > 0 THEN (t.actual_hours / t.estimated_hours * 100)
        ELSE NULL
    END as time_efficiency_percentage
FROM tasks t
LEFT JOIN employees e_assigned ON t.assigned_to = e_assigned.id
LEFT JOIN employees e_created ON t.created_by = e_created.id
LEFT JOIN projects p ON t.project_id = p.id
LEFT JOIN organizations o ON t.organization_id = o.id;

CREATE VIEW employee_task_summary AS
SELECT 
    e.id as employee_id,
    e.first_name,
    e.last_name,
    e.organization_id,
    COUNT(t.id) as total_tasks,
    COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed_tasks,
    COUNT(CASE WHEN t.status = 'in_progress' THEN 1 END) as in_progress_tasks,
    COUNT(CASE WHEN t.due_date < NOW() AND t.status NOT IN ('completed', 'cancelled') THEN 1 END) as overdue_tasks,
    SUM(t.actual_hours) as total_task_hours,
    AVG(t.progress_percentage) as avg_progress
FROM employees e
LEFT JOIN tasks t ON e.id = t.assigned_to
GROUP BY e.id, e.first_name, e.last_name, e.organization_id;

CREATE VIEW project_task_summary AS
SELECT 
    p.id as project_id,
    p.project_name,
    p.client_name,
    p.organization_id,
    COUNT(t.id) as total_tasks,
    COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed_tasks,
    COUNT(CASE WHEN t.status = 'in_progress' THEN 1 END) as in_progress_tasks,
    COUNT(CASE WHEN t.status = 'not_started' THEN 1 END) as not_started_tasks,
    SUM(t.estimated_hours) as total_estimated_hours,
    SUM(t.actual_hours) as total_actual_hours,
    AVG(t.progress_percentage) as avg_progress
FROM projects p
LEFT JOIN tasks t ON p.id = t.project_id
GROUP BY p.id, p.project_name, p.client_name, p.organization_id;

-- Grant permissions
GRANT SELECT ON task_details TO authenticated;
GRANT SELECT ON employee_task_summary TO authenticated;
GRANT SELECT ON project_task_summary TO authenticated;