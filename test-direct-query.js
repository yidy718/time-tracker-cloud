// Test query you can run directly in browser console
// This bypasses any cached code and tests the Supabase connection directly

// Open browser console and run this code:
/*

// Test 1: Direct client_projects query
const testProjects = async () => {
  console.log('Testing direct client_projects query...');
  
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  
  try {
    const { data, error } = await supabase
      .from('client_projects')
      .select('id, client_name, project_name, project_code, billing_rate')
      .eq('is_active', true);
    
    if (error) {
      console.error('Direct query error:', error);
    } else {
      console.log('Direct query success:', data);
    }
  } catch (err) {
    console.error('Direct query failed:', err);
  }
};

testProjects();

// Test 2: Check what environment variables are set
console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('Supabase Key exists:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

*/