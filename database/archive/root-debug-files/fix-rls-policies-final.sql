-- Final fix for RLS policies - more permissive but secure
-- Run this in Supabase Dashboard SQL Editor

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "tasks_view_in_org" ON tasks;
DROP POLICY IF EXISTS "tasks_admin_full_access" ON tasks;
DROP POLICY IF EXISTS "tasks_employee_update_progress" ON tasks;
DROP POLICY IF EXISTS "task_sessions_view_own" ON task_sessions;
DROP POLICY IF EXISTS "task_sessions_create_own" ON task_sessions;
DROP POLICY IF EXISTS "task_sessions_update_own" ON task_sessions;
DROP POLICY IF EXISTS "task_comments_view_in_org" ON task_comments;
DROP POLICY IF EXISTS "task_comments_create_own" ON task_comments;

-- TASKS - Simple organization-based access
CREATE POLICY "tasks_org_members" ON tasks
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM employees 
            WHERE id = auth.uid() 
            AND organization_id = tasks.organization_id
        )
    );

-- TASK_SESSIONS - Simple ownership-based access
CREATE POLICY "task_sessions_owner" ON task_sessions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM time_sessions ts
            WHERE ts.id = task_sessions.time_session_id
            AND ts.employee_id = auth.uid()
        )
    );

-- TASK_COMMENTS - Simple organization access
CREATE POLICY "task_comments_org" ON task_comments
    FOR ALL USING (
        employee_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM tasks t 
            JOIN employees e ON e.organization_id = t.organization_id
            WHERE t.id = task_comments.task_id 
            AND e.id = auth.uid()
        )
    );