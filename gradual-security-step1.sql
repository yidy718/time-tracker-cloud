-- Step 1: Add minimal organization-based security to tasks only
-- Run this in Supabase Dashboard SQL Editor

-- Replace the task policy with organization-based security
DROP POLICY IF EXISTS "tasks_allow_all_debug" ON tasks;

CREATE POLICY "tasks_org_only" ON tasks
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM employees 
            WHERE id = auth.uid()
        )
    );

-- Keep the other policies permissive for now
-- task_sessions_allow_all_debug - KEEP AS IS
-- task_comments_allow_all_debug - KEEP AS IS