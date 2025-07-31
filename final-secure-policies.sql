-- Final secure policies that work properly
-- Run this in Supabase Dashboard SQL Editor

-- First drop the temporary permissive policies
DROP POLICY IF EXISTS "tasks_allow_all" ON tasks;
DROP POLICY IF EXISTS "task_sessions_allow_all" ON task_sessions;
DROP POLICY IF EXISTS "task_comments_allow_all" ON task_comments;

-- TASKS policies
CREATE POLICY "tasks_view_in_org" ON tasks
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM employees 
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "tasks_admin_full_access" ON tasks
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM employees 
            WHERE id = auth.uid() 
            AND organization_id = tasks.organization_id
            AND role IN ('admin', 'manager')
        )
    );

CREATE POLICY "tasks_employee_update_progress" ON tasks
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id FROM employees 
            WHERE id = auth.uid()
        )
        AND (
            assigned_to = auth.uid() OR
            is_available_to_all = true OR
            EXISTS (
                SELECT 1 FROM task_assignments 
                WHERE task_id = tasks.id AND employee_id = auth.uid()
            )
        )
    );

-- TASK_SESSIONS policies 
CREATE POLICY "task_sessions_view_own" ON task_sessions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM time_sessions ts
            WHERE ts.id = task_sessions.time_session_id
            AND ts.employee_id = auth.uid()
        )
    );

CREATE POLICY "task_sessions_create_own" ON task_sessions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM time_sessions ts
            WHERE ts.id = task_sessions.time_session_id
            AND ts.employee_id = auth.uid()
        )
    );

CREATE POLICY "task_sessions_update_own" ON task_sessions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM time_sessions ts
            WHERE ts.id = task_sessions.time_session_id
            AND ts.employee_id = auth.uid()
        )
    );

-- TASK_COMMENTS policies
CREATE POLICY "task_comments_view_in_org" ON task_comments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM tasks t 
            JOIN employees e ON e.organization_id = t.organization_id
            WHERE t.id = task_comments.task_id 
            AND e.id = auth.uid()
        )
    );

CREATE POLICY "task_comments_create_own" ON task_comments
    FOR INSERT WITH CHECK (
        employee_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM tasks t 
            WHERE t.id = task_comments.task_id 
            AND t.organization_id IN (
                SELECT organization_id FROM employees 
                WHERE id = auth.uid()
            )
        )
    );