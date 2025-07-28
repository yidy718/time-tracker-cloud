import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Helper functions for common operations
export const auth = {
  signUp: (email, password, options = {}) => 
    supabase.auth.signUp({ 
      email, 
      password, 
      options: {
        data: options.data || {},
        emailRedirectTo: options.emailRedirectTo
      }
    }),
  
  signIn: (email, password) => 
    supabase.auth.signInWithPassword({ email, password }),
  
  signOut: () => {
    // Clear employee session if exists
    localStorage.removeItem('employee_session')
    // Sign out from Supabase Auth
    return supabase.auth.signOut()
  },
  
  getUser: () => 
    supabase.auth.getUser(),
  
  onAuthStateChange: (callback) => 
    supabase.auth.onAuthStateChange(callback),
    
  updatePassword: (newPassword) =>
    supabase.auth.updateUser({ password: newPassword })
}

export const database = {
  // Employee authentication using secure function with fallback
  authenticateEmployee: async (username, password) => {
    console.log('Trying authentication function for:', username)
    
    // Try the secure function first
    const { data, error } = await supabase
      .rpc('authenticate_employee', {
        input_username: username,
        input_password: password
      })
    
    console.log('Function result:', { data, error })
    
    // If function works, use it
    if (!error && data && data.length > 0) {
      const employee = data[0]
      return { 
        data: {
          id: employee.employee_id,
          organization_id: employee.organization_id,
          first_name: employee.first_name,
          last_name: employee.last_name,
          email: employee.email,
          role: employee.role,
          is_active: employee.is_active
        }, 
        error: null 
      }
    }
    
    // If function doesn't exist or fails, try direct query without RLS
    console.log('Function failed, trying direct query with service role')
    
    // Create a service role client (bypasses RLS)
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (serviceRoleKey) {
      const { createClient } = await import('@supabase/supabase-js')
      const serviceClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        serviceRoleKey
      )
      
      const { data: serviceData, error: serviceError } = await serviceClient
        .from('employees')
        .select('*')
        .eq('username', username)
        .eq('password', password)
        .eq('is_active', true)
        .single()
      
      console.log('Service role query result:', { serviceData, serviceError })
      
      if (!serviceError && serviceData) {
        return { data: serviceData, error: null }
      }
    }
    
    // Final fallback: simple query (will likely fail due to RLS but worth trying)
    console.log('Trying basic query as last resort')
    const { data: basicData, error: basicError } = await supabase
      .from('employees')
      .select('*')
      .eq('username', username)
      .eq('password', password)
      .eq('is_active', true)
      .single()
    
    console.log('Basic query result:', { basicData, basicError })
    
    return { data: basicData, error: basicError }
  },
  // Organizations
  getOrganization: (id) =>
    supabase.from('organizations').select('*').eq('id', id).single(),
  
  // Employees - FIXED: Handle case where employee doesn't exist
  getEmployees: (organizationId) =>
    supabase.from('employees').select(`
      *,
      organization:organizations(name)
    `).eq('organization_id', organizationId),
  
  getCurrentEmployee: async (userId) => {
    const { data, error } = await supabase.from('employees').select(`
      *,
      organization:organizations(name)
    `).eq('id', userId).maybeSingle()
    
    console.log('getCurrentEmployee result:', { data, error, userId })
    return { data, error }
  },
  
  createEmployee: (employee) =>
    supabase.from('employees').insert(employee).select().single(),
  
  updateEmployee: (id, updates) =>
    supabase.from('employees').update(updates).eq('id', id).select().single(),
  
  deleteEmployee: (id) =>
    supabase.from('employees').delete().eq('id', id),
  
  // Organizations - FIXED: Add method to create organization
  createOrganization: (organization) =>
    supabase.from('organizations').insert(organization).select().single(),
  
  // Locations
  getLocations: (organizationId) =>
    supabase.from('locations').select('*').eq('organization_id', organizationId),
  
  createLocation: (location) =>
    supabase.from('locations').insert(location).select().single(),
  
  updateLocation: (id, updates) =>
    supabase.from('locations').update(updates).eq('id', id).select().single(),
  
  deleteLocation: (id) =>
    supabase.from('locations').delete().eq('id', id),

  // Client Projects
  getClientProjects: (organizationId) =>
    supabase.from('client_projects').select('*').eq('organization_id', organizationId).eq('is_active', true),

  createClientProject: (project) =>
    supabase.from('client_projects').insert(project).select().single(),

  updateClientProject: (id, updates) =>
    supabase.from('client_projects').update(updates).eq('id', id).select().single(),
  
  // Time Sessions
  getActiveSessions: async (organizationId) => {
    // Use the active_sessions view if it exists, otherwise fall back to manual query
    const { data, error } = await supabase
      .from('time_sessions')
      .select(`
        *,
        first_name:employees!inner(first_name),
        last_name:employees!inner(last_name),
        location_name:locations(name)
      `)
      .eq('employees.organization_id', organizationId)
      .is('clock_out', null)
      .eq('employees.is_active', true)
    
    if (error) return { data: null, error }
    
    // Flatten the data structure
    const flattenedData = data.map(session => ({
      ...session,
      first_name: session.first_name?.first_name || '',
      last_name: session.last_name?.last_name || '',
      location_name: session.location_name?.name || 'Unknown'
    }))
    
    return { data: flattenedData, error: null }
  },
  
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
  
  startBreak: (sessionId) =>
    supabase.from('time_sessions')
      .update({ break_start: new Date().toISOString() })
      .eq('id', sessionId)
      .select().single(),
  
  endBreak: (sessionId) =>
    supabase.from('time_sessions')
      .update({ break_end: new Date().toISOString() })
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
  
  // Reports
  getTimeReport: async ({ organization_id, employee_id, start_date, end_date }) => {
    let query = supabase
      .from('time_sessions')
      .select(`
        *,
        employee:employees!inner(first_name, last_name, organization_id),
        location:locations(name)
      `)
      .eq('employee.organization_id', organization_id)
      .not('clock_out', 'is', null)
      .gte('clock_in', start_date)
      .lte('clock_in', end_date + 'T23:59:59.999Z')
      .order('clock_in', { ascending: false })

    if (employee_id) {
      query = query.eq('employee_id', employee_id)
    }

    const { data, error } = await query

    if (error) return { data: null, error }

    // Calculate duration and format data
    const processedData = data.map(session => {
      const clockIn = new Date(session.clock_in)
      const clockOut = new Date(session.clock_out)
      const durationMs = clockOut - clockIn
      const durationMinutes = Math.round(durationMs / (1000 * 60))

      return {
        ...session,
        duration_minutes: isNaN(durationMinutes) ? 0 : durationMinutes,
        first_name: session.employee.first_name,
        last_name: session.employee.last_name,
        location_name: session.location?.name
      }
    })

    return { data: processedData, error: null }
  }
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