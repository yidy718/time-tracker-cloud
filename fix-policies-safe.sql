-- Safe policy fix that handles existing policies
-- Run this in Supabase Dashboard SQL Editor

-- Drop ALL existing policies (this will work even if some don't exist)
DROP POLICY IF EXISTS "Users can view tasks in their organization" ON tasks;
DROP POLICY IF EXISTS "Users can view their assigned tasks" ON tasks;
DROP POLICY IF EXISTS "Admins can manage tasks in their organization" ON tasks;
DROP POLICY IF EXISTS "Employees can update their assigned task progress" ON tasks;
DROP POLICY IF EXISTS "Employees can update assigned task progress" ON tasks;
DROP POLICY IF EXISTS "Employees can update their own task progress" ON tasks;
DROP POLICY IF EXISTS "View tasks in organization" ON tasks;
DROP POLICY IF EXISTS "Admin manage tasks" ON tasks;
DROP POLICY IF EXISTS "Employee update task progress" ON tasks;

-- Drop task_sessions policies
DROP POLICY IF EXISTS "Users can view task sessions for their tasks" ON task_sessions;
DROP POLICY IF EXISTS "Users can create task sessions for their time sessions" ON task_sessions;
DROP POLICY IF EXISTS "View own task sessions" ON task_sessions;
DROP POLICY IF EXISTS "Create own task sessions" ON task_sessions;

-- Drop task_comments policies
DROP POLICY IF EXISTS "Users can view comments on tasks in their organization" ON task_comments;
DROP POLICY IF EXISTS "Users can create comments on their assigned tasks" ON task_comments;
DROP POLICY IF EXISTS "Employees can add comments to assigned tasks" ON task_comments;
DROP POLICY IF EXISTS "View task comments in org" ON task_comments;
DROP POLICY IF EXISTS "Create task comments" ON task_comments;

-- Now create the new policies with unique names
CREATE POLICY "tasks_view_org_v2" ON tasks
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM employees 
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "tasks_admin_manage_v2" ON tasks
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM employees 
            WHERE id = auth.uid() 
            AND organization_id = tasks.organization_id
            AND role IN ('admin', 'manager')
        )
    );

CREATE POLICY "tasks_employee_update_v2" ON tasks
    FOR UPDATE USING (
        assigned_to = auth.uid() OR
        id IN (
            SELECT task_id FROM task_assignments 
            WHERE employee_id = auth.uid()
        )
    );

-- Task sessions policies
CREATE POLICY "task_sessions_view_v2" ON task_sessions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM time_sessions ts
            WHERE ts.id = task_sessions.time_session_id
            AND ts.employee_id = auth.uid()
        )
    );

CREATE POLICY "task_sessions_create_v2" ON task_sessions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM time_sessions ts
            WHERE ts.id = task_sessions.time_session_id
            AND ts.employee_id = auth.uid()
        )
    );

-- Task comments policies
CREATE POLICY "task_comments_view_v2" ON task_comments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM tasks t 
            JOIN employees e ON e.organization_id = t.organization_id
            WHERE t.id = task_comments.task_id 
            AND e.id = auth.uid()
        )
    );

CREATE POLICY "task_comments_create_v2" ON task_comments
    FOR INSERT WITH CHECK (
        employee_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM tasks t 
            WHERE t.id = task_comments.task_id 
            AND (
                t.assigned_to = auth.uid() OR 
                t.id IN (
                    SELECT task_id FROM task_assignments 
                    WHERE employee_id = auth.uid()
                ) OR
                EXISTS (
                    SELECT 1 FROM employees e 
                    WHERE e.id = auth.uid() 
                    AND e.organization_id = t.organization_id
                    AND e.role IN ('admin', 'manager')
                )
            )
        )
    );