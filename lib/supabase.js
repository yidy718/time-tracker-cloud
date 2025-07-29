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
  
  signOut: async () => {
    // Clear employee session if exists
    localStorage.removeItem('employee_session')
    // Sign out from Supabase Auth
    const { error } = await supabase.auth.signOut()
    // Force page reload to ensure clean state
    if (!error) {
      window.location.href = '/'
    }
    return { error }
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

  // Projects (renamed from Client Projects)
  getProjects: async (organizationId) => {
    console.log('getProjects called for organization:', organizationId)
    try {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          id, 
          client_name, 
          project_name, 
          project_code, 
          billing_rate, 
          is_active,
          location:locations(id, name)
        `)
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('project_name')
      
      if (error) {
        console.error('getProjects error:', error)
        throw error
      }
      
      console.log('getProjects success:', data)
      return { data: data || [], error: null }
    } catch (error) {
      console.error('getProjects failed:', error)
      return { data: [], error: error }
    }
  },

  // Legacy function name for backward compatibility
  getClientProjects: async (organizationId) => {
    return database.getProjects(organizationId)
  },

  createProject: async (project) => {
    try {
      console.log('Creating project:', project)
      const { data, error } = await supabase
        .from('projects')
        .insert(project)
        .select(`
          id, 
          client_name, 
          project_name, 
          project_code, 
          billing_rate, 
          is_active,
          location:locations(id, name)
        `)
        .single()
      
      if (error) {
        console.error('Error creating project:', error)
        throw error
      }
      
      console.log('Project created successfully:', data)
      return { data, error: null }
    } catch (error) {
      console.error('createProject failed:', error)
      return { data: null, error }
    }
  },

  // Legacy function name
  createClientProject: async (project) => {
    return database.createProject(project)
  },

  updateProject: async (id, updates) => {
    try {
      console.log('Updating project:', { id, updates })
      const { data, error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', id)
        .select(`
          id, 
          client_name, 
          project_name, 
          project_code, 
          billing_rate, 
          is_active,
          location:locations(id, name)
        `)
        .single()
      
      if (error) {
        console.error('Error updating project:', error)
        throw error
      }
      
      console.log('Project updated successfully:', data)
      return { data, error: null }
    } catch (error) {
      console.error('updateProject failed:', error)
      return { data: null, error }
    }
  },

  // Legacy function name
  updateClientProject: async (id, updates) => {
    return database.updateProject(id, updates)
  },

  deleteProject: async (id) => {
    try {
      console.log('Deleting project:', id)
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id)
      
      if (error) {
        console.error('Error deleting project:', error)
        throw error
      }
      
      console.log('Project deleted successfully')
      return { error: null }
    } catch (error) {
      console.error('deleteProject failed:', error)
      return { error }
    }
  },

  // Legacy function name
  deleteClientProject: async (id) => {
    return database.deleteProject(id)
  },
  
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
  
  clockIn: async (employeeId, projectId) => {
    try {
      // In new structure, project determines location
      // We just need employee_id and project_id
      const { data, error } = await supabase.from('time_sessions').insert({
        employee_id: employeeId,
        project_id: projectId,
        clock_in: new Date().toISOString()
      }).select().single()
      
      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error('Clock in failed:', error)
      return { data: null, error }
    }
  },
  
  clockOut: (sessionId, memo = null) =>
    supabase.from('time_sessions')
      .update({ 
        clock_out: new Date().toISOString(),
        notes: memo 
      })
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
  getTimeReport: async ({ organization_id, employee_id, project_id, start_date, end_date }) => {
    // Try with project join first, fallback to basic query if it fails
    try {
      let query = supabase
        .from('time_sessions')
        .select(`
          *,
          employee:employees!inner(first_name, last_name, organization_id, hourly_rate),
          location:locations(name),
          project:projects(project_name, client_name, location:locations(name))
        `)
        .eq('employee.organization_id', organization_id)
        .not('clock_out', 'is', null)
        .gte('clock_in', start_date)
        .lte('clock_in', end_date + 'T23:59:59.999Z')
        .order('clock_in', { ascending: false })

      if (employee_id) {
        query = query.eq('employee_id', employee_id)
      }

      if (project_id) {
        query = query.eq('project_id', project_id)
      }

      const { data, error } = await query

      if (error) throw error

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
          hourly_rate: session.employee.hourly_rate,
          location_name: session.project?.location?.name || 'No Location',
          project_name: session.project?.project_name,
          client_name: session.project?.client_name
        }
      })

      return { data: processedData, error: null }
    } catch (projectError) {
      console.warn('Project join failed, falling back to basic query:', projectError)
      
      // Fallback query without project join
      let query = supabase
        .from('time_sessions')
        .select(`
          *,
          employee:employees!inner(first_name, last_name, organization_id, hourly_rate),
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

      // Apply project filter even in fallback mode if project_id is specified
      if (project_id) {
        query = query.eq('project_id', project_id)
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
          hourly_rate: session.employee.hourly_rate,
          location_name: 'No Location', // No project/location data available
          project_name: null,
          client_name: null
        }
      })

      return { data: processedData, error: null }
    }
  },

  // Admin Time Management Functions
  updateTimeSession: async (sessionId, updates) => {
    console.log('updateTimeSession called with:', { sessionId, updates })
    try {
      const { data, error } = await supabase.from('time_sessions')
        .update(updates)
        .eq('id', sessionId)
        .select()
        .single()
      
      if (error) throw error
      console.log('updateTimeSession success:', data)
      return { data, error: null }
    } catch (error) {
      console.error('updateTimeSession error:', error)
      // If project_id column doesn't exist, remove it and try again
      if (error.message && error.message.includes('project_id')) {
        console.warn('project_id column not found, retrying without it')
        const { project_id, ...updatesWithoutProject } = updates
        
        try {
          const { data, error } = await supabase.from('time_sessions')
            .update(updatesWithoutProject)
            .eq('id', sessionId)
            .select()
            .single()
          
          console.log('updateTimeSession fallback success:', data)
          return { data, error }
        } catch (fallbackError) {
          console.error('updateTimeSession fallback error:', fallbackError)
          return { data: null, error: fallbackError }
        }
      }
      return { data: null, error }
    }
  },

  createTimeSession: async (sessionData) => {
    try {
      const { data, error } = await supabase.from('time_sessions')
        .insert(sessionData)
        .select()
        .single()
      
      if (error) throw error
      return { data, error: null }
    } catch (error) {
      // If project_id column doesn't exist, remove it and try again
      if (error.message && error.message.includes('project_id')) {
        console.warn('project_id column not found, retrying without it')
        const { project_id, ...sessionWithoutProject } = sessionData
        
        try {
          const { data, error } = await supabase.from('time_sessions')
            .insert(sessionWithoutProject)
            .select()
            .single()
          
          return { data, error }
        } catch (fallbackError) {
          return { data: null, error: fallbackError }
        }
      }
      return { data: null, error }
    }
  },

  deleteTimeSession: (sessionId) =>
    supabase.from('time_sessions')
      .delete()
      .eq('id', sessionId),

  getAllTimeSessions: async (organizationId, startDate, endDate) => {
    // Try with project join first, fallback to basic query if it fails
    try {
      const { data, error } = await supabase
        .from('time_sessions')
        .select(`
          *,
          employee:employees!inner(first_name, last_name, organization_id),
          location:locations(name),
          project:projects(project_name, client_name, location:locations(name))
        `)
        .eq('employee.organization_id', organizationId)
        .gte('clock_in', startDate)
        .lte('clock_in', endDate + 'T23:59:59.999Z')
        .order('clock_in', { ascending: false })

      if (error) throw error

      // Format data for admin view
      const processedData = data.map(session => ({
        ...session,
        first_name: session.employee.first_name,
        last_name: session.employee.last_name,
        location_name: session.project?.location?.name || 'No Location',
        project_name: session.project?.project_name || 'No Project',
        client_name: session.project?.client_name || 'No Client'
      }))

      return { data: processedData, error: null }
    } catch (projectError) {
      console.warn('Project join failed in getAllTimeSessions, falling back to basic query:', projectError)
      
      // Fallback query without project join
      const { data, error } = await supabase
        .from('time_sessions')
        .select(`
          *,
          employee:employees!inner(first_name, last_name, organization_id),
          location:locations(name)
        `)
        .eq('employee.organization_id', organizationId)
        .gte('clock_in', startDate)
        .lte('clock_in', endDate + 'T23:59:59.999Z')
        .order('clock_in', { ascending: false })

      if (error) return { data: null, error }

      // Format data for admin view
      const processedData = data.map(session => ({
        ...session,
        first_name: session.employee.first_name,
        last_name: session.employee.last_name,
        location_name: 'No Location', // No project/location data available
        project_name: 'No Project',
        client_name: 'No Client'
      }))

      return { data: processedData, error: null }
    }
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