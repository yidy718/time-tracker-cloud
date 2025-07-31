-- Fix task_sessions policy to allow proper task linking
-- Run this in Supabase Dashboard SQL Editor

-- Drop existing task_sessions policies
DROP POLICY IF EXISTS "task_sessions_view_v2" ON task_sessions;
DROP POLICY IF EXISTS "task_sessions_create_v2" ON task_sessions;

-- Create new policies that work properly
CREATE POLICY "task_sessions_view_v3" ON task_sessions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM time_sessions ts
            WHERE ts.id = task_sessions.time_session_id
            AND ts.employee_id = auth.uid()
        )
    );

CREATE POLICY "task_sessions_create_v3" ON task_sessions
    FOR INSERT WITH CHECK (
        -- User must own the time session
        EXISTS (
            SELECT 1 FROM time_sessions ts
            WHERE ts.id = task_sessions.time_session_id
            AND ts.employee_id = auth.uid()
        )
        AND
        -- User must be able to work on the task (assigned or available)
        EXISTS (
            SELECT 1 FROM tasks t
            WHERE t.id = task_sessions.task_id
            AND (
                t.assigned_to = auth.uid() OR
                t.is_available_to_all = true OR
                EXISTS (
                    SELECT 1 FROM task_assignments ta
                    WHERE ta.task_id = t.id AND ta.employee_id = auth.uid()
                )
            )
        )
    );