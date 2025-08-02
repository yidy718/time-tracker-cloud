const { createClient } = require('@supabase/supabase-js')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createQRAuthTable() {
  try {
    console.log('🔧 Creating QR authentication sessions table...')
    
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS qr_auth_sessions (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          session_id TEXT UNIQUE NOT NULL,
          status TEXT NOT NULL DEFAULT 'waiting',
          employee_id INTEGER,
          employee_data JSONB,
          expires_at TIMESTAMPTZ NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          authenticated_at TIMESTAMPTZ
        );
        
        CREATE INDEX IF NOT EXISTS idx_qr_sessions_session_id ON qr_auth_sessions(session_id);
        CREATE INDEX IF NOT EXISTS idx_qr_sessions_status ON qr_auth_sessions(status);
        
        ALTER TABLE qr_auth_sessions ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY IF NOT EXISTS "Allow all operations on QR sessions" ON qr_auth_sessions
          FOR ALL USING (true) WITH CHECK (true);
      `
    })

    if (error) {
      throw error
    }

    console.log('✅ QR authentication table created successfully!')
    console.log('🎉 QR code login should now work properly across devices')
    
  } catch (error) {
    console.error('❌ Error creating table:', error.message)
    console.log('\n📝 Manual Setup Instructions:')
    console.log('1. Go to https://supabase.com/dashboard')
    console.log('2. Select your project')
    console.log('3. Go to SQL Editor')
    console.log('4. Copy and paste the contents of create-qr-auth-table.sql')
    console.log('5. Click "Run"')
  }
}

createQRAuthTable()