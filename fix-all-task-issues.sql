-- Comprehensive fix for all task management issues
-- Run this in Supabase Dashboard SQL Editor

-- 1. First, drop ALL existing task-related policies to prevent conflicts
DROP POLICY IF EXISTS "Users can view tasks in their organization" ON tasks;
DROP POLICY IF EXISTS "Users can view their assigned tasks" ON tasks;
DROP POLICY IF EXISTS "Admins can manage tasks in their organization" ON tasks;
DROP POLICY IF EXISTS "Employees can update their assigned task progress" ON tasks;
DROP POLICY IF EXISTS "Employees can update assigned task progress" ON tasks;
DROP POLICY IF EXISTS "Employees can update their own task progress" ON tasks;

-- 2. Drop existing task_sessions policies
DROP POLICY IF EXISTS "Users can view task sessions for their tasks" ON task_sessions;
DROP POLICY IF EXISTS "Users can create task sessions for their time sessions" ON task_sessions;

-- 3. Drop existing task_comments policies
DROP POLICY IF EXISTS "Users can view comments on tasks in their organization" ON task_comments;
DROP POLICY IF EXISTS "Users can create comments on their assigned tasks" ON task_comments;
DROP POLICY IF EXISTS "Employees can add comments to assigned tasks" ON task_comments;

-- 4. Create NEW, NON-RECURSIVE policies for tasks
CREATE POLICY "View tasks in organization" ON tasks
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM employees 
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "Admin manage tasks" ON tasks
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM employees 
            WHERE id = auth.uid() 
            AND organization_id = tasks.organization_id
            AND role IN ('admin', 'manager')
        )
    );

CREATE POLICY "Employee update task progress" ON tasks
    FOR UPDATE USING (
        assigned_to = auth.uid() OR
        id IN (
            SELECT task_id FROM task_assignments 
            WHERE employee_id = auth.uid()
        )
    );

-- 5. Create simple task_sessions policies
CREATE POLICY "View own task sessions" ON task_sessions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM time_sessions ts
            WHERE ts.id = task_sessions.time_session_id
            AND ts.employee_id = auth.uid()
        )
    );

CREATE POLICY "Create own task sessions" ON task_sessions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM time_sessions ts
            WHERE ts.id = task_sessions.time_session_id
            AND ts.employee_id = auth.uid()
        )
    );

-- 6. Create simple task_comments policies
CREATE POLICY "View task comments in org" ON task_comments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM tasks t 
            JOIN employees e ON e.organization_id = t.organization_id
            WHERE t.id = task_comments.task_id 
            AND e.id = auth.uid()
        )
    );

CREATE POLICY "Create task comments" ON task_comments
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