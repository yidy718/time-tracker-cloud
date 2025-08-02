-- Create QR authentication sessions table for cross-device login
CREATE TABLE IF NOT EXISTS qr_auth_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting', -- 'waiting', 'authenticated', 'expired'
  employee_id INTEGER,
  employee_data JSONB,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  authenticated_at TIMESTAMPTZ
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_qr_sessions_session_id ON qr_auth_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_qr_sessions_status ON qr_auth_sessions(status);
CREATE INDEX IF NOT EXISTS idx_qr_sessions_expires_at ON qr_auth_sessions(expires_at);

-- Enable Row Level Security
ALTER TABLE qr_auth_sessions ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (since this is temporary session data)
CREATE POLICY "Allow all operations on QR sessions" ON qr_auth_sessions
  FOR ALL USING (true) WITH CHECK (true);

-- Clean up expired sessions (optional - can be run periodically)
-- DELETE FROM qr_auth_sessions WHERE expires_at < NOW();

COMMENT ON TABLE qr_auth_sessions IS 'Temporary sessions for QR code cross-device authentication';