-- Add employee update permission to the existing policy
-- Run this in Supabase Dashboard SQL Editor

-- Add a separate policy for employees to update their assigned tasks
CREATE POLICY "tasks_employee_can_update" ON tasks
    FOR UPDATE USING (
        -- Employee must be in the same organization
        organization_id IN (
            SELECT organization_id FROM employees 
            WHERE id = auth.uid()
        )
        AND
        -- Employee must be assigned to the task OR task is available to all
        (
            assigned_to = auth.uid() OR
            is_available_to_all = true OR
            EXISTS (
                SELECT 1 FROM task_assignments 
                WHERE task_id = tasks.id AND employee_id = auth.uid()
            )
        )
    );