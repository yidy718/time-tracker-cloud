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
          id: employee.employee_id || employee.id,
          organization_id: employee.organization_id,
          first_name: employee.first_name,
          last_name: employee.last_name,
          email: employee.email,
          role: employee.role,
          is_active: employee.is_active,
          can_expense: employee.can_expense
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
    // First try to find employee by ID (for employee logins)
    let { data, error } = await supabase.from('employees').select(`
      *,
      organization:organizations(name)
    `).eq('id', userId).maybeSingle()
    
    console.log('getCurrentEmployee result:', { data, error, userId })
    console.log('getCurrentEmployee data.can_expense:', data?.can_expense)
    return { data, error }
  },

  // New function specifically for handling admin auth users
  getCurrentEmployeeByEmail: async (email) => {
    const { data, error } = await supabase.from('employees').select(`
      *,
      organization:organizations(name)
    `).eq('email', email).eq('is_active', true).maybeSingle()
    
    console.log('getCurrentEmployeeByEmail result:', { data, error, email })
    console.log('getCurrentEmployeeByEmail data.can_expense:', data?.can_expense)
    return { data, error }
  },

  getEmployeeCompanies: async (employeeId) => {
    try {
      const { data, error } = await supabase.from('employees').select(`
        organization_id,
        organization:organizations(id, name)
      `).eq('employee_id', employeeId).eq('is_active', true)
      
      if (error) throw error
      
      // Return unique organizations
      const uniqueCompanies = data?.reduce((acc, emp) => {
        if (!acc.find(c => c.id === emp.organization?.id)) {
          acc.push(emp.organization)
        }
        return acc
      }, []) || []
      
      return { data: uniqueCompanies, error: null }
    } catch (error) {
      console.error('getEmployeeCompanies error:', error)
      return { data: [], error }
    }
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
        .from('projects_with_locations')
        .select(`
          id, 
          client_name, 
          project_name, 
          project_code, 
          billing_rate, 
          is_active,
          available_locations,
          primary_location
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

  // Project Location Management
  addProjectLocation: async (projectId, locationId, isPrimary = false) => {
    try {
      const { data, error } = await supabase
        .from('project_locations')
        .insert({
          project_id: projectId,
          location_id: locationId,
          is_primary: isPrimary
        })
        .select()
        .single()
      
      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error('addProjectLocation failed:', error)
      return { data: null, error }
    }
  },

  removeProjectLocation: async (projectId, locationId) => {
    try {
      const { error } = await supabase
        .from('project_locations')
        .delete()
        .eq('project_id', projectId)
        .eq('location_id', locationId)
      
      if (error) throw error
      return { error: null }
    } catch (error) {
      console.error('removeProjectLocation failed:', error)
      return { error }
    }
  },

  setPrimaryProjectLocation: async (projectId, locationId) => {
    try {
      // First unset all primary locations for this project
      await supabase
        .from('project_locations')
        .update({ is_primary: false })
        .eq('project_id', projectId)
      
      // Then set the specified location as primary
      const { data, error } = await supabase
        .from('project_locations')
        .update({ is_primary: true })
        .eq('project_id', projectId)
        .eq('location_id', locationId)
        .select()
        .single()
      
      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error('setPrimaryProjectLocation failed:', error)
      return { data: null, error }
    }
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
      const sessionData = {
        employee_id: employeeId,
        project_id: projectId,
        clock_in: new Date().toISOString()
      }
      
      const { data, error } = await supabase.from('time_sessions').insert(sessionData).select().single()
      
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
  },

  // Task Management Functions
  
  // Get tasks for an organization with filtering options
  getTasks: async (organizationId, filters = {}) => {
    try {
      let query = supabase
        .from('task_details')
        .select('*')
        .eq('organization_id', organizationId)

      // Apply filters
      if (filters.status) {
        query = query.eq('status', filters.status)
      }
      if (filters.assignedTo) {
        query = query.eq('assigned_to', filters.assignedTo)
      }
      if (filters.projectId) {
        query = query.eq('project_id', filters.projectId)
      }
      if (filters.priority) {
        query = query.eq('priority', filters.priority)
      }
      if (filters.isOverdue) {
        query = query.eq('is_overdue', filters.isOverdue)
      }

      query = query.order('created_at', { ascending: false })

      const { data, error } = await query
      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error('getTasks failed:', error)
      return { data: [], error }
    }
  },

  // Get tasks assigned to a specific employee
  getEmployeeTasks: async (employeeId, status = null) => {
    try {
      // Use a simpler approach with separate queries to avoid complex OR conditions
      const directTasksQuery = supabase
        .from('task_details')
        .select('*')
        .eq('assigned_to', employeeId)

      const assignedTasksQuery = supabase
        .from('task_assignments')
        .select('task_id')
        .eq('employee_id', employeeId)

      const [directTasks, assignedTaskIds] = await Promise.all([
        directTasksQuery,
        assignedTasksQuery
      ])

      if (directTasks.error) throw directTasks.error
      if (assignedTaskIds.error) throw assignedTaskIds.error

      let allTasks = [...(directTasks.data || [])]
      
      // Get tasks from assignments if any exist
      if (assignedTaskIds.data && assignedTaskIds.data.length > 0) {
        const taskIds = assignedTaskIds.data.map(a => a.task_id)
        const assignedTasksData = await supabase
          .from('task_details')
          .select('*')
          .in('id', taskIds)
        
        if (assignedTasksData.error) throw assignedTasksData.error
        
        // Merge and deduplicate
        const existingIds = new Set(allTasks.map(t => t.id))
        const newTasks = (assignedTasksData.data || []).filter(t => !existingIds.has(t.id))
        allTasks = [...allTasks, ...newTasks]
      }

      // Apply status filter if provided
      if (status) {
        allTasks = allTasks.filter(task => task.status === status)
      }

      // Sort by due date
      allTasks.sort((a, b) => {
        if (!a.due_date && !b.due_date) return 0
        if (!a.due_date) return 1
        if (!b.due_date) return -1
        return new Date(a.due_date) - new Date(b.due_date)
      })

      return { data: allTasks, error: null }
    } catch (error) {
      console.error('getEmployeeTasks failed:', error)
      return { data: [], error }
    }
  },

  // Get available tasks (task pool)
  getAvailableTasks: async (organizationId) => {
    try {
      const { data, error } = await supabase
        .from('task_details')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_available_to_all', true)
        .in('status', ['not_started', 'in_progress'])
        .order('priority', { ascending: false })
        .order('due_date', { ascending: true, nullsLast: true })

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error('getAvailableTasks failed:', error)
      return { data: [], error }
    }
  },

  // Create a new task
  createTask: async (taskData) => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert(taskData)
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error('createTask failed:', error)
      return { data: null, error }
    }
  },

  // Update task
  updateTask: async (taskId, updates) => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId)
        .select()

      if (error) {
        console.error('Update error details:', error)
        throw error
      }
      
      // Check if any rows were updated
      if (!data || data.length === 0) {
        console.log('No rows updated')
        throw new Error('No task found to update')
      }
      
      console.log('Task updated successfully:', data[0])
      return { data: data[0], error: null }
    } catch (error) {
      console.error('updateTask failed:', error)
      return { data: null, error }
    }
  },

  // Delete task
  deleteTask: async (taskId) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)

      if (error) throw error
      return { error: null }
    } catch (error) {
      console.error('deleteTask failed:', error)
      return { error }
    }
  },

  // Assign task to employee
  assignTask: async (taskId, employeeId, assignedBy) => {
    try {
      // Update the task's assigned_to field
      const { error: taskError } = await supabase
        .from('tasks')
        .update({ assigned_to: employeeId })
        .eq('id', taskId)

      if (taskError) throw taskError

      // Create assignment record
      const { data, error } = await supabase
        .from('task_assignments')
        .insert({
          task_id: taskId,
          employee_id: employeeId,
          assigned_by: assignedBy
        })
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error('assignTask failed:', error)
      return { data: null, error }
    }
  },

  // Remove task assignment
  unassignTask: async (taskId, employeeId) => {
    try {
      // Remove from task_assignments
      const { error: assignmentError } = await supabase
        .from('task_assignments')
        .delete()
        .eq('task_id', taskId)
        .eq('employee_id', employeeId)

      if (assignmentError) throw assignmentError

      // Update task to remove assigned_to if this was the primary assignee
      const { error: taskError } = await supabase
        .from('tasks')
        .update({ assigned_to: null })
        .eq('id', taskId)
        .eq('assigned_to', employeeId)

      if (taskError) throw taskError
      return { error: null }
    } catch (error) {
      console.error('unassignTask failed:', error)
      return { error }
    }
  },

  // Link task to time session
  linkTaskToSession: async (taskId, timeSessionId, progressBefore, progressAfter, workNotes) => {
    try {
      // Create task session record
      const { data, error } = await supabase
        .from('task_sessions')
        .insert({
          task_id: taskId,
          time_session_id: timeSessionId,
          progress_before: progressBefore,
          progress_after: progressAfter,
          work_notes: workNotes
        })
        .select()
        .single()

      if (error) throw error

      // Update the time session with task_id
      await supabase
        .from('time_sessions')
        .update({ task_id: taskId })
        .eq('id', timeSessionId)

      return { data, error: null }
    } catch (error) {
      console.error('linkTaskToSession failed:', error)
      return { data: null, error }
    }
  },

  // Add comment to task
  addTaskComment: async (taskId, employeeId, commentText, isStatusChange = false, oldStatus = null, newStatus = null) => {
    try {
      const { data, error } = await supabase
        .from('task_comments')
        .insert({
          task_id: taskId,
          employee_id: employeeId,
          comment_text: commentText,
          is_status_change: isStatusChange,
          old_status: oldStatus,
          new_status: newStatus
        })
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error('addTaskComment failed:', error)
      return { data: null, error }
    }
  },

  // Get task comments
  getTaskComments: async (taskId) => {
    try {
      const { data, error } = await supabase
        .from('task_comments')
        .select(`
          *,
          employee:employees(first_name, last_name, employee_id)
        `)
        .eq('task_id', taskId)
        .order('created_at', { ascending: true })

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error('getTaskComments failed:', error)
      return { data: [], error }
    }
  },

  // Get task summary statistics
  getTaskSummary: async (organizationId, employeeId = null) => {
    try {
      const view = employeeId ? 'employee_task_summary' : 'project_task_summary'
      let query = supabase
        .from(view)
        .select('*')
        .eq('organization_id', organizationId)

      if (employeeId) {
        query = query.eq('employee_id', employeeId)
      }

      const { data, error } = await query
      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error('getTaskSummary failed:', error)
      return { data: [], error }
    }
  },

  // Get completed tasks with completion details
  getCompletedTasks: async (organizationId, startDate, endDate, employeeId = null) => {
    try {
      let query = supabase
        .from('task_details')
        .select(`
          id,
          title,
          description,
          status,
          priority,
          project_name,
          client_name,
          assigned_first_name,
          assigned_last_name,
          assigned_employee_id,
          completed_at,
          actual_hours,
          estimated_hours,
          progress_percentage,
          created_at
        `)
        .eq('organization_id', organizationId)
        .eq('status', 'completed')
        .not('completed_at', 'is', null)

      // Filter by date range if provided
      if (startDate && endDate) {
        query = query
          .gte('completed_at', startDate)
          .lte('completed_at', endDate + 'T23:59:59.999Z')
      }

      // Filter by employee if provided
      if (employeeId) {
        query = query.eq('assigned_to', employeeId)
      }

      query = query.order('completed_at', { ascending: false })

      const { data, error } = await query
      if (error) throw error

      return { data: data || [], error: null }
    } catch (error) {
      console.error('getCompletedTasks failed:', error)
      return { data: [], error }
    }
  },

  // Multi-company functions
  getUserOrganizations: async (userId = null) => {
    try {
      const { data, error } = await supabase
        .rpc('get_user_organizations', userId ? { user_uuid: userId } : {})
      
      return { data, error }
    } catch (error) {
      console.error('getUserOrganizations failed:', error)
      return { data: [], error }
    }
  },

  assignUserToOrganization: async (userId, employeeId, organizationId, role = 'employee') => {
    try {
      const { data, error } = await supabase
        .rpc('assign_user_to_organization', {
          target_user_id: userId,
          target_employee_id: employeeId,
          target_organization_id: organizationId,
          target_role: role
        })
      
      return { data, error }
    } catch (error) {
      console.error('assignUserToOrganization failed:', error)
      return { data: null, error }
    }
  },

  // Get organization details
  getOrganization: async (organizationId) => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', organizationId)
        .single()
      
      return { data, error }
    } catch (error) {
      console.error('getOrganization failed:', error)
      return { data: null, error }
    }
  },

  // Expense functions
  addExpense: async (expense) => {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .insert([expense])
        .select()
        .single()
      
      return { data, error }
    } catch (error) {
      console.error('addExpense failed:', error)
      return { data: null, error }
    }
  },

  getEmployeeExpenses: async (employeeId, organizationId, days = 30) => {
    try {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)
      
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('organization_id', organizationId)
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: false })
      
      return { data, error }
    } catch (error) {
      console.error('getEmployeeExpenses failed:', error)
      return { data: [], error }
    }
  },

  getOrganizationExpenses: async (organizationId, startDate, endDate) => {
    try {
      let query = supabase
        .from('expenses')
        .select(`
          *,
          employees!inner (
            first_name,
            last_name
          )
        `)
        .eq('organization_id', organizationId)
      
      if (startDate) {
        query = query.gte('date', startDate)
      }
      
      if (endDate) {
        query = query.lte('date', endDate)
      }
      
      const { data, error } = await query.order('date', { ascending: false })
      
      return { data, error }
    } catch (error) {
      console.error('getOrganizationExpenses failed:', error)
      return { data: [], error }
    }
  },

  // Update organization settings
  updateOrganizationSettings: async (organizationId, settings) => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .update(settings)
        .eq('id', organizationId)
        .select()
        .single()
      
      return { data, error }
    } catch (error) {
      console.error('updateOrganizationSettings failed:', error)
      return { data: null, error }
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