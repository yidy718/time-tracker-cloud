import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Helper functions for common operations
export const auth = {
  signUp: (email, password, metadata = {}) => 
    supabase.auth.signUp({ email, password, options: { data: metadata } }),
  
  signIn: (email, password) => 
    supabase.auth.signInWithPassword({ email, password }),
  
  signOut: () => 
    supabase.auth.signOut(),
  
  getUser: () => 
    supabase.auth.getUser(),
  
  updatePassword: (newPassword) =>
    supabase.auth.updateUser({ password: newPassword }),
  
  onAuthStateChange: (callback) => 
    supabase.auth.onAuthStateChange(callback)
}

export const database = {
  // Organizations
  getOrganization: (id) =>
    supabase.from('organizations').select('*').eq('id', id).single(),
  
  // Employees - FIXED: Handle case where employee doesn't exist
  getEmployees: (organizationId) =>
    supabase.from('employees').select(`
      *,
      organization:organizations(name)
    `).eq('organization_id', organizationId),
  
  getCurrentEmployee: (userId) =>
    supabase.from('employees').select(`
      *,
      organization:organizations(name)
    `).eq('id', userId).maybeSingle(), // FIXED: Use maybeSingle() instead of single()
  
  createEmployee: (employee) =>
    supabase.from('employees').insert(employee).select().single(),
  
  updateEmployee: (id, updates) =>
    supabase.from('employees').update(updates).eq('id', id).select().single(),
  
  // Organizations - FIXED: Add method to create organization
  createOrganization: (organization) =>
    supabase.from('organizations').insert(organization).select().single(),
  
  // Locations
  getLocations: (organizationId) =>
    supabase.from('locations').select('*').eq('organization_id', organizationId),
  
  createLocation: (location) =>
    supabase.from('locations').insert(location).select().single(),
  
  // Time Sessions
  getActiveSessions: (organizationId) =>
    supabase.from('active_sessions').select('*').eq('organization_id', organizationId),
  
  getCurrentSession: (employeeId) =>
    supabase.from('time_sessions')
      .select('*')
      .eq('employee_id', employeeId)
      .is('clock_out', null)
      .maybeSingle(), // FIXED: Use maybeSingle() instead of single()
  
  clockIn: (employeeId, locationId) =>
    supabase.from('time_sessions').insert({
      employee_id: employeeId,
      location_id: locationId,
      clock_in: new Date().toISOString()
    }).select().single(),
  
  clockOut: (sessionId) =>
    supabase.from('time_sessions')
      .update({ clock_out: new Date().toISOString() })
      .eq('id', sessionId)
      .select().single(),
  
  // Get current session with break info
  getSessionWithBreak: (sessionId) =>
    supabase.from('time_sessions')
      .select('*')
      .eq('id', sessionId)
      .single(),
  
  // Update session to add completed break period
  addBreakPeriod: (sessionId, breakStart, breakEnd) =>
    supabase.from('time_sessions')
      .update({ 
        break_start: breakStart,
        break_end: breakEnd
      })
      .eq('id', sessionId)
      .select().single(),
  
  getSessionHistory: (employeeId, limit = 10) =>
    supabase.from('time_sessions')
      .select(`
        *,
        location:locations(name),
        employee:employees(first_name, last_name)
      `)
      .eq('employee_id', employeeId)
      .order('clock_in', { ascending: false })
      .limit(limit),
  
  getDailySummary: (employeeId, date) =>
    supabase.from('daily_summaries')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('work_date', date)
      .maybeSingle(), // FIXED: Use maybeSingle() instead of single()
  
  getWeeklyHours: (organizationId, weekStart, weekEnd, employeeIds) =>
    supabase.from('time_sessions')
      .select(`
        *,
        employee:employees!inner(first_name, last_name, organization_id),
        location:locations(name)
      `)
      .eq('employee.organization_id', organizationId)
      .in('employee_id', employeeIds)
      .gte('clock_in', weekStart)
      .lte('clock_in', weekEnd)
      .not('clock_out', 'is', null)
      .order('clock_in', { ascending: true })
}

// Real-time subscriptions
export const subscriptions = {
  onActiveSessionsChange: (organizationId, callback) =>
    supabase
      .channel('active_sessions')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'time_sessions',
          filter: `employee_id=in.(select id from employees where organization_id=eq.${organizationId})`
        }, 
        callback
      )
      .subscribe(),
  
  onEmployeeChange: (organizationId, callback) =>
    supabase
      .channel('employees')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'employees',
          filter: `organization_id=eq.${organizationId}`
        }, 
        callback
      )
      .subscribe()
}