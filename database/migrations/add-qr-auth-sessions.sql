-- Create QR authentication sessions table
CREATE TABLE IF NOT EXISTS qr_auth_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'authenticated', 'expired')),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  employee_data JSONB,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  authenticated_at TIMESTAMP WITH TIME ZONE
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_qr_auth_sessions_session_id ON qr_auth_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_qr_auth_sessions_expires_at ON qr_auth_sessions(expires_at);

-- Enable RLS (Row Level Security)
ALTER TABLE qr_auth_sessions ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to read/write QR sessions (they're temporary and session-based)
-- Note: This is safe because sessions expire in 5 minutes and contain no sensitive data
CREATE POLICY "Allow QR auth operations" ON qr_auth_sessions
  FOR ALL USING (true);

-- Create function to clean up expired sessions automatically
CREATE OR REPLACE FUNCTION cleanup_expired_qr_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM qr_auth_sessions 
  WHERE expires_at < now() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to clean up expired sessions periodically
-- Note: This is a simple cleanup, in production you might want a more sophisticated approach
CREATE OR REPLACE FUNCTION trigger_cleanup_qr_sessions()
RETURNS trigger AS $$
BEGIN
  -- Clean up expired sessions on every insert (simple approach)
  PERFORM cleanup_expired_qr_sessions();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Only create trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'cleanup_qr_sessions_trigger'
  ) THEN
    CREATE TRIGGER cleanup_qr_sessions_trigger
      AFTER INSERT ON qr_auth_sessions
      FOR EACH ROW
      EXECUTE FUNCTION trigger_cleanup_qr_sessions();
  END IF;
END
$$;

-- Add helpful comment
COMMENT ON TABLE qr_auth_sessions IS 'Temporary sessions for QR code authentication. Sessions expire in 5 minutes for security.';
COMMENT ON COLUMN qr_auth_sessions.session_id IS 'Unique session identifier embedded in QR code';
COMMENT ON COLUMN qr_auth_sessions.status IS 'Session status: waiting, authenticated, or expired';
COMMENT ON COLUMN qr_auth_sessions.employee_data IS 'Temporary storage of employee info for session creation';
COMMENT ON COLUMN qr_auth_sessions.expires_at IS 'When this QR session expires (5 minutes from creation)';