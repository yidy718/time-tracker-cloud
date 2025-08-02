const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function createQRTable() {
  console.log('🔧 Creating QR authentication sessions table...')
  
  try {
    // Create the table directly
    const { data, error } = await supabase
      .from('qr_auth_sessions')
      .select('count')
      .limit(1)
    
    if (!error) {
      console.log('✅ QR table already exists!')
      return
    }
    
    console.log('Table does not exist, you need to create it manually.')
    console.log('\n📝 Go to Supabase Dashboard → SQL Editor and run:')
    console.log(`
CREATE TABLE qr_auth_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting',
  employee_id INTEGER,
  employee_data JSONB,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  authenticated_at TIMESTAMPTZ
);

CREATE INDEX idx_qr_sessions_session_id ON qr_auth_sessions(session_id);
ALTER TABLE qr_auth_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations on QR sessions" ON qr_auth_sessions FOR ALL USING (true) WITH CHECK (true);
    `)
    
  } catch (error) {
    console.error('Error:', error.message)
  }
}

createQRTable()