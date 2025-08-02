-- Fix push notification tables to use UUID foreign keys
-- This corrects the employee_id references to match the employees.id UUID type

-- Drop existing tables if they exist (in case of partial creation)
DROP TABLE IF EXISTS task_notifications CASCADE;
DROP TABLE IF EXISTS push_notification_logs CASCADE;
DROP TABLE IF EXISTS auth_requests CASCADE;
DROP TABLE IF EXISTS employee_push_tokens CASCADE;

-- Create employee push tokens table with UUID foreign key
CREATE TABLE employee_push_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  push_token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  device_info JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, push_token)
);

-- Create authentication requests table with UUID foreign key
CREATE TABLE auth_requests (
  id TEXT PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'expired')),
  device_info JSONB,
  ip_address TEXT,
  user_agent TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  denied_at TIMESTAMPTZ
);

-- Create push notification logs table with UUID foreign key
CREATE TABLE push_notification_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT NOT NULL,
  data JSONB,
  tokens_sent INTEGER DEFAULT 0,
  expo_response JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create task notifications table with UUID foreign keys
CREATE TABLE task_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('assigned', 'comment', 'due_soon', 'overdue', 'completed', 'status_changed')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB,
  sent_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_employee_push_tokens_employee_id ON employee_push_tokens(employee_id);
CREATE INDEX idx_employee_push_tokens_active ON employee_push_tokens(is_active) WHERE is_active = true;
CREATE INDEX idx_auth_requests_employee_id ON auth_requests(employee_id);
CREATE INDEX idx_auth_requests_status ON auth_requests(status);
CREATE INDEX idx_auth_requests_expires_at ON auth_requests(expires_at);
CREATE INDEX idx_push_notification_logs_employee_id ON push_notification_logs(employee_id);
CREATE INDEX idx_push_notification_logs_type ON push_notification_logs(type);
CREATE INDEX idx_task_notifications_task_id ON task_notifications(task_id);
CREATE INDEX idx_task_notifications_employee_id ON task_notifications(employee_id);
CREATE INDEX idx_task_notifications_type ON task_notifications(notification_type);

-- Enable Row Level Security
ALTER TABLE employee_push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Employees can manage their own push tokens" ON employee_push_tokens
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on auth requests" ON auth_requests
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on push logs" ON push_notification_logs
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on task notifications" ON task_notifications
  FOR ALL USING (true) WITH CHECK (true);

-- Create function to clean up expired auth requests
CREATE OR REPLACE FUNCTION cleanup_expired_auth_requests()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE auth_requests 
  SET status = 'expired' 
  WHERE status = 'pending' 
    AND expires_at < NOW();
END;
$$;

-- Create function to automatically send task notifications
CREATE OR REPLACE FUNCTION notify_task_assigned()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Insert notification for newly assigned task
  IF NEW.assigned_to IS NOT NULL AND (OLD.assigned_to IS NULL OR OLD.assigned_to != NEW.assigned_to) THEN
    INSERT INTO task_notifications (
      task_id,
      employee_id,
      notification_type,
      title,
      body,
      data,
      created_at
    ) VALUES (
      NEW.id,
      NEW.assigned_to,
      'assigned',
      'New Task Assigned',
      'You have been assigned to: ' || NEW.title,
      jsonb_build_object(
        'task_id', NEW.id,
        'task_title', NEW.title,
        'priority', NEW.priority,
        'due_date', NEW.due_date
      ),
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for task assignments
DROP TRIGGER IF EXISTS trigger_task_assigned ON tasks;
CREATE TRIGGER trigger_task_assigned
  AFTER INSERT OR UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION notify_task_assigned();

-- Create function to notify on task comments
CREATE OR REPLACE FUNCTION notify_task_comment()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  task_record tasks%ROWTYPE;
  notification_employee_id UUID;
BEGIN
  -- Get task details
  SELECT * INTO task_record FROM tasks WHERE id = NEW.task_id;
  
  -- Determine who to notify (assigned employee, unless they made the comment)
  notification_employee_id := task_record.assigned_to;
  
  -- Don't notify if the commenter is the same as the assigned employee
  IF notification_employee_id IS NOT NULL AND notification_employee_id != NEW.employee_id THEN
    INSERT INTO task_notifications (
      task_id,
      employee_id,
      notification_type,
      title,
      body,
      data,
      created_at
    ) VALUES (
      NEW.task_id,
      notification_employee_id,
      'comment',
      'New Task Comment',
      'New comment on: ' || task_record.title,
      jsonb_build_object(
        'task_id', NEW.task_id,
        'task_title', task_record.title,
        'comment_id', NEW.id,
        'commenter_name', (SELECT first_name || ' ' || last_name FROM employees WHERE id = NEW.employee_id)
      ),
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for task comments
DROP TRIGGER IF EXISTS trigger_task_comment ON task_comments;
CREATE TRIGGER trigger_task_comment
  AFTER INSERT ON task_comments
  FOR EACH ROW
  EXECUTE FUNCTION notify_task_comment();

COMMENT ON TABLE employee_push_tokens IS 'Store push notification tokens for mobile devices';
COMMENT ON TABLE auth_requests IS 'Track push notification authentication requests';
COMMENT ON TABLE push_notification_logs IS 'Log all sent push notifications';
COMMENT ON TABLE task_notifications IS 'Queue and track task-related notifications';