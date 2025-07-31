-- Fix employee permissions to update task progress
-- Run this in Supabase Dashboard SQL Editor

-- Drop any existing conflicting update policies
DROP POLICY IF EXISTS "Employees can update their own task progress" ON tasks;
DROP POLICY IF EXISTS "Employees can update their assigned task progress" ON tasks;
DROP POLICY IF EXISTS "Employees can update assigned task progress" ON tasks;

-- Create a comprehensive policy that allows employees to update their assigned tasks
CREATE POLICY "Employees can update assigned task progress" ON tasks
    FOR UPDATE USING (
        assigned_to = auth.uid()::uuid OR
        EXISTS (
            SELECT 1 FROM task_assignments ta 
            WHERE ta.task_id = tasks.id 
            AND ta.employee_id = auth.uid()::uuid
        )
    )
    WITH CHECK (
        assigned_to = auth.uid()::uuid OR
        EXISTS (
            SELECT 1 FROM task_assignments ta 
            WHERE ta.task_id = tasks.id 
            AND ta.employee_id = auth.uid()::uuid
        )
    );

-- Also make sure employees can insert task comments when they update progress
-- First drop existing policy if it exists
DROP POLICY IF EXISTS "Employees can add comments to assigned tasks" ON task_comments;
DROP POLICY IF EXISTS "Users can create comments on their assigned tasks" ON task_comments;

-- Create new policy for employee comments
CREATE POLICY "Employees can add comments to assigned tasks" ON task_comments
    FOR INSERT WITH CHECK (
        employee_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM tasks t 
            WHERE t.id = task_comments.task_id 
            AND (
                t.assigned_to = auth.uid() OR 
                EXISTS (
                    SELECT 1 FROM task_assignments ta 
                    WHERE ta.task_id = t.id AND ta.employee_id = auth.uid()
                )
            )
        )
    );