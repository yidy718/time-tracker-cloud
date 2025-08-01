import { useState, useEffect, useCallback } from 'react'
import { database, auth } from '../lib/supabase'
import EmployeeTaskDashboard from './EmployeeTaskDashboard'
import ExpenseModal from './ExpenseModal'

export default function TimeTracker({ session, employee, organization }) {
  // Core state
  const [currentSession, setCurrentSession] = useState(null)
  const [projects, setProjects] = useState([])
  const [selectedProject, setSelectedProject] = useState('')
  const [currentTime, setCurrentTime] = useState(new Date())
  const [loading, setLoading] = useState(false)
  
  // UI state
  const [showBreakModal, setShowBreakModal] = useState(false)
  const [breakReason, setBreakReason] = useState('')
  const [isOnBreak, setIsOnBreak] = useState(false)
  const [breakStartTime, setBreakStartTime] = useState(null)
  const [showMenu, setShowMenu] = useState(false)
  const [showPasswordChange, setShowPasswordChange] = useState(false)
  const [showWeeklyActivities, setShowWeeklyActivities] = useState(false)
  const [showClockOutModal, setShowClockOutModal] = useState(false)
  const [showTaskSelection, setShowTaskSelection] = useState(false)
  const [showTaskDashboard, setShowTaskDashboard] = useState(false)
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  
  // Location selection state
  const [showLocationSelection, setShowLocationSelection] = useState(false)
  const [projectLocations, setProjectLocations] = useState([])
  const [selectedLocation, setSelectedLocation] = useState('')
  
  // Data state
  const [totalHours, setTotalHours] = useState(0)
  const [weeklyActivities, setWeeklyActivities] = useState([])
  const [clockOutMemo, setClockOutMemo] = useState('')
  const [availableTasks, setAvailableTasks] = useState([])
  const [employeeTasks, setEmployeeTasks] = useState([])
  const [selectedTask, setSelectedTask] = useState('')
  const [taskProgress, setTaskProgress] = useState(0)
  const [taskNotes, setTaskNotes] = useState('')
  const [expensesEnabled, setExpensesEnabled] = useState(false)

  const loadTotalHours = useCallback(async () => {
    try {
      // Check if employee object is available
      if (!employee?.id || !employee?.organization_id) {
        console.warn('loadTotalHours: Employee object missing required fields:', employee)
        setTotalHours(0)
        setWeeklyActivities([])
        return
      }

      const now = new Date()
      const startOfWeek = new Date(now)
      // Get Monday as start of week (getDay() returns 0=Sunday, 1=Monday, etc.)
      const dayOfWeek = now.getDay()
      const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // Sunday becomes 6, others become dayOfWeek-1
      startOfWeek.setDate(now.getDate() - daysFromMonday)
      startOfWeek.setHours(0, 0, 0, 0)
      
      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(startOfWeek.getDate() + 6)
      endOfWeek.setHours(23, 59, 59, 999)
      
      const { data } = await database.getTimeReport({
        organization_id: employee.organization_id,
        employee_id: employee.id,
        start_date: startOfWeek.toISOString().split('T')[0],
        end_date: endOfWeek.toISOString().split('T')[0]
      })
      
      if (data) {
        const totalMinutes = data.reduce((sum, entry) => sum + (entry.duration_minutes || 0), 0)
        const hours = (totalMinutes / 60).toFixed(1)
        setTotalHours(hours)
        setWeeklyActivities(data)
      }
    } catch (error) {
      console.error('Error loading total hours:', error)
    }
  }, [employee?.organization_id, employee?.id])

  const loadTasks = useCallback(async (projectId = null) => {
    try {
      // Check if employee object is available
      if (!employee?.id || !employee?.organization_id) {
        console.warn('loadTasks: Employee object missing required fields:', employee)
        setEmployeeTasks([])
        setAvailableTasks([])
        return
      }

      // Load employee's assigned tasks
      const employeeTasksResult = await database.getEmployeeTasks(employee.id, null)
      let employeeTasks = employeeTasksResult.data || []

      // Load available tasks from task pool
      const availableTasksResult = await database.getAvailableTasks(employee.organization_id)
      let availableTasks = availableTasksResult.data || []

      // Filter tasks by project if clocked into a specific project
      if (projectId) {
        employeeTasks = employeeTasks.filter(task => 
          task.project_id === projectId || task.project_id === null // Include unassigned tasks
        )
        availableTasks = availableTasks.filter(task => 
          task.project_id === projectId || task.project_id === null // Include unassigned tasks
        )
      }

      setEmployeeTasks(employeeTasks)
      setAvailableTasks(availableTasks)
    } catch (error) {
      console.error('Error loading tasks:', error)
    }
  }, [employee?.id, employee?.organization_id])

  const loadData = useCallback(async () => {
    try {
      // Check if employee object is available
      if (!employee?.id || !employee?.organization_id) {
        console.warn('loadData: Employee object missing required fields:', employee)
        setCurrentSession(null)
        setProjects([])
        setExpensesEnabled(false)
        return
      }

      // Load current session
      const { data: sessionData } = await database.getCurrentSession(employee.id)
      setCurrentSession(sessionData)

      // Check if expenses are enabled for this employee
      setExpensesEnabled(employee.can_expense || false)

      // Load projects (locations come from projects now)
      console.log('Loading projects for organization:', employee.organization_id)
      const projectsResult = await database.getClientProjects(employee.organization_id)
      
      console.log('Projects result:', projectsResult)
      console.log('Projects data:', projectsResult.data)
      console.log('Projects length:', projectsResult.data?.length || 0)
      setProjects(projectsResult.data || [])
      
      // Additional debugging
      if (projectsResult.error) {
        console.error('Error loading projects:', projectsResult.error)
        console.error('Employee data:', employee)
        console.error('Session data:', session)
      }
      if (!projectsResult.data || projectsResult.data.length === 0) {
        console.warn('No projects found for organization:', employee.organization_id)
        console.warn('Employee role:', employee.role)
        console.warn('Employee ID:', employee.id)
        console.warn('Projects query error:', projectsResult.error)
        
        // Enhanced debugging for RLS/auth issues
        console.log('Testing Supabase auth state and RLS policies...')
        import('../lib/supabase').then(({ supabase }) => {
          // Check current auth user
          supabase.auth.getUser().then(({ data: { user }, error }) => {
            console.log('Current Supabase user:', user)
            console.log('Auth error:', error)
            
            // Test direct query to see exact error
            supabase
              .from('client_projects')
              .select('*')
              .eq('organization_id', employee?.organization_id)
              .then(({ data, error }) => {
                console.log('Direct client_projects query result:', { data, error })
              })
            
            // Test with count to see if it's a permissions vs data issue
            supabase
              .from('client_projects')
              .select('*', { count: 'exact', head: true })
              .eq('organization_id', employee?.organization_id)
              .then(({ count, error }) => {
                console.log('Projects count test:', { count, error })
              })
          })
        })
      }

      // Load total hours for current week
      await loadTotalHours()
      
      // Load tasks
      await loadTasks()
    } catch (error) {
      console.error('Error loading data:', error)
    }
  }, [employee, organization, session, loadTotalHours, loadTasks])

  useEffect(() => {
    // Update current time every second
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    // Load initial data
    loadData()

    return () => clearInterval(timer)
  }, [loadData])

  const handleClockIn = async () => {
    if (!selectedProject) {
      alert('Please select a project')
      return
    }

    setLoading(true)
    try {
      // First, check if the project has multiple locations
      const { data: locations, error: locError } = await database.getProjectLocations(selectedProject)
      if (locError) {
        console.error('Error getting project locations:', locError)
        // Continue with clock-in without location if we can't fetch locations
      }
      
      // If project has multiple locations, show location selection modal
      if (locations && locations.length > 1) {
        setProjectLocations(locations)
        setShowLocationSelection(true)
        setLoading(false)
        return
      }
      
      // If project has only one location or no specific locations, clock in directly
      const locationId = locations && locations.length === 1 ? locations[0].location_id : null
      
      const { data, error } = await database.clockIn(
        employee.id, 
        selectedProject,
        locationId
      )
      if (error) throw error
      
      setCurrentSession(data)
      
      // Load tasks filtered by the selected project
      await loadTasks(selectedProject)
      
      // Show task selection modal after successful clock-in
      setShowTaskSelection(true)
      
    } catch (error) {
      console.error('Clock in error:', error)
      alert('Error clocking in. Please try again.')
    }
    setLoading(false)
  }

  const handleLocationSelection = async (locationId) => {
    if (!selectedProject) {
      alert('Please select a project')
      return
    }

    setLoading(true)
    try {
      const { data, error } = await database.clockIn(
        employee.id, 
        selectedProject,
        locationId
      )
      if (error) throw error
      
      setCurrentSession(data)
      setShowLocationSelection(false)
      setSelectedLocation('')
      setProjectLocations([])
      
      // Load tasks filtered by the selected project
      await loadTasks(selectedProject)
      
      // Show task selection modal after successful clock-in
      setShowTaskSelection(true)
      
    } catch (error) {
      console.error('Clock in error:', error)
      alert('Error clocking in. Please try again.')
    }
    setLoading(false)
  }

  const handleTaskSelection = async (taskId = null) => {
    try {
      if (taskId && currentSession) {
        // Link task to current session
        await database.linkTaskToSession(taskId, currentSession.id, 0, 0, '')
        
        // Update current session to include task
        const updatedSession = { ...currentSession, task_id: taskId }
        setCurrentSession(updatedSession)
      }
      
      setShowTaskSelection(false)
      setSelectedTask('')
      // Task selection completed - no need for popup
      
    } catch (error) {
      console.error('Error linking task:', error)
      alert('Error selecting task, but you are clocked in.')
      setShowTaskSelection(false)
    }
  }

  const handleClockOut = () => {
    if (!currentSession) return
    setShowClockOutModal(true)
  }

  const handleAddExpenseFromClockOut = async (expenseData) => {
    try {
      if (!employee?.id || !employee?.organization_id) {
        console.error('Cannot add expense - employee object missing required fields:', employee)
        throw new Error('Employee information is not available')
      }

      const expense = {
        employee_id: employee.id,
        organization_id: employee.organization_id,
        amount: parseFloat(expenseData.amount),
        description: expenseData.description,
        location: expenseData.location || '',
        category: expenseData.category || 'Work Related',
        date: new Date().toISOString().split('T')[0],
        status: 'pending',
        created_at: new Date().toISOString()
      }

      const result = await database.addExpense(expense)
      if (result.error) {
        throw result.error
      }

      console.log('Expense added successfully:', result.data)
      alert('Expense added successfully!')
      
    } catch (error) {
      console.error('Error adding expense:', error)
      throw error // Re-throw to be handled by the modal
    }
  }

  const confirmClockOut = async () => {
    if (!currentSession) return

    setLoading(true)
    try {
      console.log('Clock out starting:', { 
        sessionId: currentSession.id, 
        employeeId: employee?.id,
        employeeObject: employee,
        taskId: currentSession.task_id 
      })

      // Clock out from time session
      const { data, error } = await database.clockOut(currentSession.id, clockOutMemo.trim() || null)
      if (error) throw error
      
      // If working on a task, update task progress
      if (currentSession.task_id && taskProgress > 0 && employee?.id) {
        try {
          await database.updateTask(currentSession.task_id, {
            progress_percentage: taskProgress
          })
          
          // Add comment about work done
          if (taskNotes.trim()) {
            await database.addTaskComment(
              currentSession.task_id,
              employee.id,
              taskNotes.trim()
            )
          }
        } catch (taskError) {
          console.error('Error updating task:', taskError)
          // Don't fail clock out if task update fails
        }
      } else if (currentSession.task_id && !employee?.id) {
        console.warn('Cannot update task - employee.id is missing:', employee)
      }
      
      setCurrentSession(null)
      setIsOnBreak(false)
      setBreakStartTime(null)
      setShowClockOutModal(false)
      setClockOutMemo('')
      setTaskProgress(0)
      setTaskNotes('')
      
      // Show expense modal if expenses are enabled
      if (expensesEnabled) {
        setShowExpenseModal(true)
      }
      
      await loadTotalHours()
      await loadTasks() // Refresh tasks to show updated progress
    } catch (error) {
      console.error('Clock out error:', error)
      alert('Error clocking out. Please try again.')
    }
    setLoading(false)
  }

  const handleStartBreak = () => {
    setShowBreakModal(true)
  }

  const handleEndBreak = () => {
    setIsOnBreak(false)
    setBreakStartTime(null)
    setBreakReason('')
    alert('Break ended!')
  }

  const confirmBreak = () => {
    if (!breakReason.trim()) {
      alert('Please enter a break reason')
      return
    }
    setIsOnBreak(true)
    setBreakStartTime(new Date())
    setShowBreakModal(false)
    alert('Break started!')
  }

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    })
  }

  const getSessionDuration = () => {
    if (!currentSession) return '00:00:00'
    
    const start = new Date(currentSession.clock_in)
    const now = new Date()
    const diff = now - start
    
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((diff % (1000 * 60)) / 1000)
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  const getBreakDuration = () => {
    if (!breakStartTime) return '00:00:00'
    
    const start = breakStartTime
    const now = new Date()
    const diff = now - start
    
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((diff % (1000 * 60)) / 1000)
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-blue-600/20"></div>
        <div className="relative px-4 sm:px-6 py-6 sm:py-8">
          <div className="flex justify-between items-start">
            <div className="flex-1 min-w-0 pr-4">
              <div className="mb-4">
                <p className="text-white text-xl sm:text-2xl font-bold mb-1">{formatDate(currentTime)}</p>
                <p className="text-white/70 text-base sm:text-lg">{formatTime(currentTime)}</p>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xs sm:text-sm shadow-lg">
                  {employee?.first_name?.[0] || '?'}{employee?.last_name?.[0] || '?'}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-white/90 font-semibold text-base sm:text-lg block truncate">{employee?.first_name || 'Unknown'} {employee?.last_name || 'Employee'}</span>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="px-2 sm:px-3 py-1 bg-white/10 rounded-full text-xs text-white/80 font-medium truncate max-w-[150px]">{employee?.organization?.name || 'Unknown Organization'}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="text-right space-y-3 sm:space-y-4 flex-shrink-0">
              <div className="flex justify-end">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="group relative w-10 h-10 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center transition-all duration-300 hover:bg-white/20 hover:scale-105"
                >
                  <span className="text-lg transition-transform group-hover:rotate-90 duration-300">⚙️</span>
                </button>
              </div>
              
              <div>
                <div className="text-white/80 text-sm mb-1">This Week</div>
                <div className="text-2xl font-bold text-green-400">{totalHours}h</div>
              </div>
              
              {showMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-[9999]" 
                    onClick={() => setShowMenu(false)}
                  />
                  <div className="fixed top-20 right-4 left-4 sm:left-auto sm:right-4 w-auto sm:w-64 max-w-[calc(100vw-2rem)] bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 z-[10000] transform transition-all duration-300 scale-100 opacity-100">
                    <div className="p-4">
                      <button
                        onClick={() => {
                          setShowTaskDashboard(true)
                          setShowMenu(false)
                        }}
                        className="w-full flex items-center space-x-3 p-3 rounded-xl hover:bg-gray-50 transition-colors text-left"
                      >
                        <span className="text-lg">📋</span>
                        <span className="font-medium text-gray-700">My Tasks</span>
                      </button>
                      <button
                        onClick={() => {
                          setShowWeeklyActivities(true)
                          setShowMenu(false)
                        }}
                        className="w-full flex items-center space-x-3 p-3 rounded-xl hover:bg-gray-50 transition-colors text-left"
                      >
                        <span className="text-lg">📊</span>
                        <span className="font-medium text-gray-700">Weekly Activities</span>
                      </button>
                      <button
                        onClick={() => {
                          setShowPasswordChange(true)
                          setShowMenu(false)
                        }}
                        className="w-full flex items-center space-x-3 p-3 rounded-xl hover:bg-gray-50 transition-colors text-left"
                      >
                        <span className="text-lg">🔑</span>
                        <span className="font-medium text-gray-700">Change Password</span>
                      </button>
                      <button
                        onClick={async () => {
                          if (confirm('Are you sure you want to sign out?')) {
                            await auth.signOut()
                          }
                        }}
                        className="w-full flex items-center space-x-3 p-3 rounded-xl hover:bg-red-50 transition-colors text-left mt-2"
                      >
                        <span className="text-lg">🚪</span>
                        <span className="font-medium text-red-600">Sign Out</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 pb-8 space-y-6">
        {/* Current Status */}
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20 text-center">
          <div className="mb-6">
            <span className={`px-6 py-3 rounded-full text-lg font-medium ${
              currentSession 
                ? isOnBreak 
                  ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30' 
                  : 'bg-green-500/20 text-green-300 border border-green-500/30'
                : 'bg-gray-500/20 text-gray-300 border border-gray-500/30'
            }`}>
              {currentSession 
                ? isOnBreak 
                  ? '🛌 On Break' 
                  : '✅ Clocked In'
                : '⏳ Ready to Clock In'
              }
            </span>
          </div>
          <div className="text-4xl sm:text-5xl md:text-6xl font-mono font-bold text-white mb-4 text-center overflow-hidden">
            {currentSession 
              ? isOnBreak 
                ? getBreakDuration() 
                : getSessionDuration() 
              : '00:00:00'
            }
          </div>
          {currentSession && !isOnBreak && (
            <div className="text-white/60 text-sm">
              Started: {new Date(currentSession.clock_in).toLocaleString()}
            </div>
          )}
          {isOnBreak && (
            <div className="text-white/60 text-sm">
              Break: {breakReason} • Started: {breakStartTime?.toLocaleTimeString()}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-4">
          {!currentSession ? (
            // Clock In Section
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-blue-600 rounded-2xl flex items-center justify-center text-white text-xl shadow-lg">
                  🚀
                </div>
                <h3 className="text-2xl font-bold text-white">Clock In</h3>
              </div>
              <div className="space-y-6">
                <div>
                  <label className="block text-white/80 font-medium mb-3">
                    🎯 Select Project
                  </label>
                  <select
                    value={selectedProject}
                    onChange={(e) => setSelectedProject(e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300"
                    required
                  >
                    <option value="" className="text-gray-800 bg-white">🔹 No project selected</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id} className="text-gray-800 bg-white">
                        🎯 {project.project_name}
                      </option>
                    ))}
                  </select>
                  {projects.length === 0 && (
                    <p className="text-white/60 text-sm mt-2">
                      💡 No projects available. Contact your admin to create projects.
                    </p>
                  )}
                </div>
                {/* Show selected project locations */}
                {selectedProject && (
                  <div className="text-white/70 text-sm">
                    {(() => {
                      const project = projects.find(p => p.id === selectedProject)
                      const locations = project?.available_locations || []
                      const primaryLocation = project?.primary_location
                      
                      if (locations.length === 0) {
                        return '📍 Location: No location assigned'
                      } else if (locations.length === 1) {
                        return `📍 Location: ${locations[0].name}`
                      } else {
                        return `📍 Locations: ${locations.length} available${primaryLocation ? ` (Primary: ${primaryLocation.name})` : ''}`
                      }
                    })()}
                  </div>
                )}
                
                <button
                  onClick={handleClockIn}
                  disabled={loading || !selectedProject}
                  className="bg-gradient-to-r from-green-500 to-blue-600 text-white py-4 px-8 rounded-xl font-medium hover:from-green-600 hover:to-blue-700 transition-all duration-300 hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed w-full"
                >
                  {loading ? 'Clocking In...' : '🚀 Clock In'}
                </button>
              </div>
            </div>
          ) : (
            // Working Section
            <div className="space-y-4">
              <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center text-white text-xl shadow-lg">
                    💼
                  </div>
                  <h3 className="text-2xl font-bold text-white">Currently Working</h3>
                </div>
                <div className="space-y-4">
                  {!isOnBreak ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <button
                        onClick={handleStartBreak}
                        className="bg-gradient-to-r from-orange-500 to-red-600 text-white py-4 px-6 rounded-xl font-medium hover:from-orange-600 hover:to-red-700 transition-all duration-300 hover:scale-105 shadow-lg"
                      >
                        🛌 Start Break
                      </button>
                      <button
                        onClick={handleClockOut}
                        disabled={loading}
                        className="bg-gradient-to-r from-red-500 to-pink-600 text-white py-4 px-6 rounded-xl font-medium hover:from-red-600 hover:to-pink-700 transition-all duration-300 hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading ? 'Clocking Out...' : '🚪 Clock Out'}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleEndBreak}
                      className="bg-gradient-to-r from-green-500 to-blue-600 text-white py-4 px-8 rounded-xl font-medium hover:from-green-600 hover:to-blue-700 transition-all duration-300 hover:scale-105 shadow-lg w-full"
                    >
                      ✅ End Break
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-white/60 text-sm pb-6">
          Made with ❤️ by yidy
        </div>
      </div>

      {/* Break Modal */}
      {showBreakModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-8 max-w-md w-full shadow-2xl border border-white/20">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center text-white text-xl shadow-lg">
                  🛌
                </div>
                <h3 className="text-2xl font-bold text-gray-800">Start Break</h3>
              </div>
              <button
                onClick={() => setShowBreakModal(false)}
                className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-600 hover:text-gray-800 transition-colors"
              >
                ×
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-gray-700 font-medium mb-3">
                  Break Reason
                </label>
                <select
                  value={breakReason}
                  onChange={(e) => setBreakReason(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300"
                >
                  <option value="">Select a reason</option>
                  <option value="Lunch Break">🍽️ Lunch Break</option>
                  <option value="Coffee Break">☕ Coffee Break</option>
                  <option value="Restroom">🚻 Restroom</option>
                  <option value="Personal">👤 Personal</option>
                  <option value="Meeting">📋 Meeting</option>
                  <option value="Other">📝 Other</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={confirmBreak}
                  disabled={!breakReason}
                  className="bg-gradient-to-r from-orange-500 to-red-600 text-white py-3 rounded-xl font-medium hover:from-orange-600 hover:to-red-700 transition-all duration-300 hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  🛌 Start Break
                </button>
                <button
                  onClick={() => setShowBreakModal(false)}
                  className="bg-gray-100 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-200 transition-all duration-300"
                >
                  ❌ Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Password Change Modal */}
      {showPasswordChange && (
        <PasswordChangeModal 
          onClose={() => setShowPasswordChange(false)}
        />
      )}

      {/* Weekly Activities Modal */}
      {showWeeklyActivities && (
        <WeeklyActivitiesModal 
          activities={weeklyActivities}
          employee={employee}
          onClose={() => setShowWeeklyActivities(false)}
        />
      )}

      {/* Employee Task Dashboard */}
      {showTaskDashboard && (
        <EmployeeTaskDashboard
          employee={employee}
          onClose={() => setShowTaskDashboard(false)}
        />
      )}

      {/* Task Selection Modal */}
      {showTaskSelection && (
        <TaskSelectionModal
          employeeTasks={employeeTasks}
          availableTasks={availableTasks}
          selectedTask={selectedTask}
          onTaskChange={setSelectedTask}
          onConfirm={() => handleTaskSelection(selectedTask)}
          onSkip={() => handleTaskSelection(null)}
        />
      )}

      {/* Clock Out Modal */}
      {showClockOutModal && (
        <ClockOutModal 
          memo={clockOutMemo}
          onMemoChange={setClockOutMemo}
          taskProgress={taskProgress}
          onTaskProgressChange={setTaskProgress}
          taskNotes={taskNotes}
          onTaskNotesChange={setTaskNotes}
          currentTask={currentSession?.task_id ? employeeTasks.find(t => t.id === currentSession.task_id) || availableTasks.find(t => t.id === currentSession.task_id) : null}
          onConfirm={confirmClockOut}
          onCancel={() => {
            setShowClockOutModal(false)
            setClockOutMemo('')
            setTaskProgress(0)
            setTaskNotes('')
          }}
          loading={loading}
          employee={employee}
          onAddExpense={handleAddExpenseFromClockOut}
        />
      )}

      {/* Expense Modal */}
      {showExpenseModal && (
        <ExpenseModal
          employee={employee}
          organizationId={employee?.organization_id}
          timeSessionId={null}
          onClose={() => setShowExpenseModal(false)}
          onExpenseAdded={() => {
            console.log('Expense added successfully')
            setShowExpenseModal(false)
          }}
        />
      )}
    </div>
  )
}

function PasswordChangeModal({ onClose }) {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (formData.newPassword !== formData.confirmPassword) {
      setError('New passwords do not match')
      setLoading(false)
      return
    }

    if (formData.newPassword.length < 6) {
      setError('New password must be at least 6 characters')
      setLoading(false)
      return
    }

    try {
      const { error } = await auth.updatePassword(formData.newPassword)
      if (error) throw error

      setSuccess(true)
      setTimeout(() => {
        onClose()
      }, 2000)
    } catch (error) {
      console.error('Password update error:', error)
      setError(error.message || 'Error updating password')
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-8 max-w-md w-full shadow-2xl border border-white/20 transform transition-all duration-300 scale-100 opacity-100">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl flex items-center justify-center text-white text-xl shadow-lg">
              🔑
            </div>
            <h3 className="text-2xl font-bold text-gray-800">Change Password</h3>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-600 hover:text-gray-800 transition-colors"
          >
            ×
          </button>
        </div>

        {success ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white text-2xl mx-auto mb-4 shadow-lg">
              ✓
            </div>
            <p className="text-green-600 font-medium text-lg">Password updated successfully!</p>
            <p className="text-gray-500 mt-2">This dialog will close automatically.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-800 text-sm font-medium">
                ❌ {error}
              </div>
            )}

            <div>
              <label className="block text-gray-700 font-medium mb-3">
                🔒 Current Password
              </label>
              <input
                type="password"
                required
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                value={formData.currentPassword}
                onChange={(e) => setFormData({...formData, currentPassword: e.target.value})}
                placeholder="Enter current password"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-3">
                🆕 New Password
              </label>
              <input
                type="password"
                required
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                value={formData.newPassword}
                onChange={(e) => setFormData({...formData, newPassword: e.target.value})}
                placeholder="Enter new password (min 6 characters)"
                minLength="6"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-3">
                ✅ Confirm New Password
              </label>
              <input
                type="password"
                required
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                placeholder="Confirm new password"
                minLength="6"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 pt-6">
              <button
                type="submit"
                disabled={loading}
                className="bg-gradient-to-r from-purple-500 to-blue-600 text-white py-3 rounded-xl font-medium hover:from-purple-600 hover:to-blue-700 transition-all duration-300 hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Updating...</span>
                  </span>
                ) : (
                  '🔐 Update Password'
                )}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="bg-gray-100 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-200 transition-all duration-300"
              >
                ❌ Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

function WeeklyActivitiesModal({ activities, employee, onClose }) {
  const formatDuration = (minutes) => {
    if (isNaN(minutes) || minutes < 0) {
      return '0h 0m'
    }
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m`
  }

  const getTotalHours = () => {
    const totalMinutes = activities.reduce((sum, entry) => sum + (entry.duration_minutes || 0), 0)
    return formatDuration(totalMinutes)
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-8 max-w-4xl w-full max-h-[80vh] overflow-hidden shadow-2xl border border-white/20">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center text-white text-xl shadow-lg">
              📊
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-800">Weekly Activities</h3>
              <p className="text-gray-600">{employee?.first_name || 'Unknown'} {employee?.last_name || 'Employee'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-600 hover:text-gray-800 transition-colors"
          >
            ×
          </button>
        </div>

        {/* Summary */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-gray-600 text-sm">Total Entries</p>
              <p className="text-2xl font-bold text-gray-800">{activities.length}</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">Total Hours</p>
              <p className="text-2xl font-bold text-blue-600">{getTotalHours()}</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">Average per Day</p>
              <p className="text-2xl font-bold text-purple-600">
                {activities.length > 0 ? formatDuration(Math.round(activities.reduce((sum, entry) => sum + (entry.duration_minutes || 0), 0) / Math.max(activities.length, 1))) : '0h 0m'}
              </p>
            </div>
          </div>
        </div>

        {/* Activities List */}
        <div className="overflow-y-auto max-h-96">
          {activities.length > 0 ? (
            <div className="space-y-3">
              {activities.map((activity, index) => (
                <div 
                  key={activity.id || index} 
                  className="bg-white rounded-xl p-4 border border-gray-200 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-blue-500 rounded-xl flex items-center justify-center text-white font-bold text-sm">
                        {new Date(activity.clock_in).getDate()}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">
                          {new Date(activity.clock_in).toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </p>
                        <p className="text-sm text-gray-600">
                          📍 {activity.location_name || 'N/A'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-xl font-bold text-blue-600">
                        {formatDuration(activity.duration_minutes || 0)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {new Date(activity.clock_in).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {activity.clock_out ? new Date(activity.clock_out).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'In Progress'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📭</div>
              <p className="text-gray-500 text-lg">No activities recorded this week</p>
              <p className="text-gray-400 text-sm mt-2">Clock in to start tracking your time!</p>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-6 rounded-xl font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-300 hover:scale-105 shadow-lg"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

function TaskSelectionModal({ employeeTasks, availableTasks, selectedTask, onTaskChange, onConfirm, onSkip }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-8 max-w-2xl w-full shadow-2xl border border-white/20 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-green-600 rounded-2xl flex items-center justify-center text-white text-xl shadow-lg">
              📋
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-800">Select a Task</h3>
              <p className="text-gray-600">Choose a task to work on, or skip to work on general project tasks</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Employee's Assigned Tasks */}
          {employeeTasks.length > 0 && (
            <div>
              <h4 className="text-lg font-semibold text-gray-800 mb-3">📌 Your Assigned Tasks</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {employeeTasks.filter(task => task.status !== 'completed').map(task => (
                  <label key={task.id} className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedTask === task.id 
                      ? 'border-teal-500 bg-teal-50' 
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}>
                    <input
                      type="radio"
                      name="task"
                      value={task.id}
                      checked={selectedTask === task.id}
                      onChange={(e) => onTaskChange(e.target.value)}
                      className="sr-only"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h5 className="font-medium text-gray-900">{task.title}</h5>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            task.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                            task.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                            task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {task.priority.toUpperCase()}
                          </span>
                          <span className="text-xs text-gray-500">{task.progress_percentage}%</span>
                        </div>
                      </div>
                      {task.description && (
                        <p className="text-gray-600 text-sm mt-1 line-clamp-2">{task.description}</p>
                      )}
                      {task.due_date && (
                        <p className={`text-xs mt-1 ${task.is_overdue ? 'text-red-500 font-medium' : 'text-gray-500'}`}>
                          Due: {new Date(task.due_date).toLocaleDateString()}
                          {task.is_overdue && ' (OVERDUE)'}
                        </p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Available Tasks from Pool */}
          {availableTasks.length > 0 && (
            <div>
              <h4 className="text-lg font-semibold text-gray-800 mb-3">🏊 Available Task Pool</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {availableTasks.filter(task => task.status !== 'completed').map(task => (
                  <label key={task.id} className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedTask === task.id 
                      ? 'border-teal-500 bg-teal-50' 
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}>
                    <input
                      type="radio"
                      name="task"
                      value={task.id}
                      checked={selectedTask === task.id}
                      onChange={(e) => onTaskChange(e.target.value)}
                      className="sr-only"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h5 className="font-medium text-gray-900">{task.title}</h5>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            task.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                            task.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                            task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {task.priority.toUpperCase()}
                          </span>
                          <span className="text-xs text-gray-500">{task.progress_percentage}%</span>
                        </div>
                      </div>
                      {task.description && (
                        <p className="text-gray-600 text-sm mt-1 line-clamp-2">{task.description}</p>
                      )}
                      {task.due_date && (
                        <p className={`text-xs mt-1 ${task.is_overdue ? 'text-red-500 font-medium' : 'text-gray-500'}`}>
                          Due: {new Date(task.due_date).toLocaleDateString()}
                          {task.is_overdue && ' (OVERDUE)'}
                        </p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {employeeTasks.length === 0 && availableTasks.length === 0 && (
            <div className="text-center py-8">
              <div className="text-gray-400 text-4xl mb-4">📭</div>
              <p className="text-gray-600">No tasks available at the moment.</p>
              <p className="text-gray-500 text-sm mt-2">You can work on general project tasks.</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 pt-6 border-t">
            <button
              onClick={onSkip}
              className="bg-gray-100 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-200 transition-all duration-300"
            >
              ⏭️ Skip - Work on Project
            </button>
            <button
              onClick={onConfirm}
              disabled={!selectedTask}
              className="bg-gradient-to-r from-teal-500 to-green-600 text-white py-3 rounded-xl font-medium hover:from-teal-600 hover:to-green-700 transition-all duration-300 hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ✅ Select Task
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ClockOutModal({ memo, onMemoChange, taskProgress, onTaskProgressChange, taskNotes, onTaskNotesChange, currentTask, onConfirm, onCancel, loading, employee, onAddExpense }) {
  const [showExpenseEntry, setShowExpenseEntry] = useState(false)
  const [expenseData, setExpenseData] = useState({
    amount: '',
    location: '',
    description: '',
    category: 'Work Related'
  })


  const handleExpenseSubmit = async () => {
    if (!expenseData.amount || !expenseData.description) {
      alert('Please fill in amount and description')
      return
    }
    
    try {
      await onAddExpense(expenseData)
      setShowExpenseEntry(false)
      // Reset form
      setExpenseData({
        amount: '',
        location: '',
        description: '',
        category: 'Work Related'
      })
    } catch (error) {
      console.error('Error adding expense:', error)
      alert('Error adding expense. Please try again.')
    }
  }
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-8 max-w-md w-full shadow-2xl border border-white/20">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-pink-600 rounded-2xl flex items-center justify-center text-white text-xl shadow-lg">
              🚪
            </div>
            <h3 className="text-2xl font-bold text-gray-800">Clock Out</h3>
          </div>
          <button
            onClick={onCancel}
            className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-600 hover:text-gray-800 transition-colors"
          >
            ×
          </button>
        </div>

        <div className="space-y-6">
          {/* Task Progress Section */}
          {currentTask && (
            <div className="bg-teal-50 p-4 rounded-lg border border-teal-200">
              <h4 className="font-semibold text-gray-800 mb-2">📋 Task Progress</h4>
              <div className="mb-3">
                <p className="text-sm text-gray-700 font-medium">{currentTask.title}</p>
                <p className="text-xs text-gray-500">Current: {currentTask.progress_percentage}%</p>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Update Progress (%)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={currentTask.progress_percentage}
                      max="100"
                      step="1"
                      value={taskProgress || currentTask.progress_percentage}
                      onChange={(e) => onTaskProgressChange(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-3 text-lg bg-white border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      placeholder={currentTask.progress_percentage.toString()}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      autoComplete="off"
                      onFocus={(e) => e.target.select()}
                    />
                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex flex-col">
                      <button
                        type="button"
                        onClick={() => onTaskProgressChange(Math.min(100, (taskProgress || currentTask.progress_percentage) + 5))}
                        className="w-6 h-6 bg-gray-100 hover:bg-gray-200 rounded text-xs font-bold text-gray-600 flex items-center justify-center"
                      >
                        +
                      </button>
                      <button
                        type="button"
                        onClick={() => onTaskProgressChange(Math.max(currentTask.progress_percentage, (taskProgress || currentTask.progress_percentage) - 5))}
                        className="w-6 h-6 bg-gray-100 hover:bg-gray-200 rounded text-xs font-bold text-gray-600 flex items-center justify-center mt-1"
                      >
                        -
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Work Notes
                  </label>
                  <textarea
                    value={taskNotes}
                    onChange={(e) => onTaskNotesChange(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                    rows="2"
                    placeholder="What did you accomplish on this task?"
                  />
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-gray-700 font-medium mb-3">
              📝 General work memo (optional)
            </label>
            <textarea
              value={memo}
              onChange={(e) => onMemoChange(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-300 resize-none"
              rows="3"
              placeholder="Additional notes about your work session..."
            />
          </div>

          <div className="text-sm text-gray-500 bg-blue-50 p-3 rounded-lg">
            💡 <strong>Tip:</strong> Adding work notes helps your manager understand your daily contributions and can be useful for performance reviews.
          </div>

          {/* Expense Entry Section */}
          {employee?.can_expense && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-xl border border-green-200">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-800 flex items-center space-x-2">
                  <span>💰</span>
                  <span>Business Expenses</span>
                </h4>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                Need to log any business expenses from today? You can add them before clocking out.
              </p>
              <button
                onClick={() => setShowExpenseEntry(true)}
                className="w-full bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-lg transition-colors font-medium"
              >
                ➕ Add Expense
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={onConfirm}
              disabled={loading}
              className="bg-gradient-to-r from-red-500 to-pink-600 text-white py-3 rounded-xl font-medium hover:from-red-600 hover:to-pink-700 transition-all duration-300 hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Clocking Out...</span>
                </span>
              ) : (
                '🚪 Clock Out'
              )}
            </button>
            <button
              onClick={onCancel}
              disabled={loading}
              className="bg-gray-100 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-200 transition-all duration-300 disabled:opacity-50"
            >
              ❌ Cancel
            </button>
          </div>
        </div>
      </div>

      {/* Expense Entry Modal */}
      {showExpenseEntry && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-white/20">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center text-white text-lg shadow-lg">
                  💰
                </div>
                <h3 className="text-xl font-bold text-gray-800">Add Business Expense</h3>
              </div>
              <button
                onClick={() => setShowExpenseEntry(false)}
                className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-600 hover:text-gray-800 transition-colors"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount ($) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={expenseData.amount}
                  onChange={(e) => setExpenseData({...expenseData, amount: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="0.00"
                  inputMode="decimal"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location
                </label>
                <input
                  type="text"
                  value={expenseData.location}
                  onChange={(e) => setExpenseData({...expenseData, location: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Where was this expense?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={expenseData.category}
                  onChange={(e) => setExpenseData({...expenseData, category: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="Work Related">Work Related</option>
                  <option value="Travel">Travel</option>
                  <option value="Meals">Meals</option>
                  <option value="Materials">Materials</option>
                  <option value="Equipment">Equipment</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  value={expenseData.description}
                  onChange={(e) => setExpenseData({...expenseData, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                  rows="3"
                  placeholder="What was this expense for?"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => setShowExpenseEntry(false)}
                  className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExpenseSubmit}
                  disabled={!expenseData.amount || !expenseData.description}
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white py-2 rounded-lg font-medium hover:from-green-600 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Expense
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Location Selection Modal */}
      {showLocationSelection && (
        <LocationSelectionModal
          projectLocations={projectLocations}
          onLocationSelect={handleLocationSelection}
          onCancel={() => {
            try {
              setShowLocationSelection(false)
              setProjectLocations([])
              setSelectedLocation('')
              setLoading(false)
            } catch (error) {
              console.error('Error in location modal cancel:', error)
            }
          }}
          loading={loading}
        />
      )}
    </div>
  )
}

// Location Selection Modal Component
function LocationSelectionModal({ projectLocations, onLocationSelect, onCancel, loading }) {
  const [selectedLocationId, setSelectedLocationId] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!selectedLocationId) {
      alert('Please select a location')
      return
    }
    onLocationSelect(selectedLocationId)
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
      <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-white/20">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center text-white text-lg shadow-lg">
              📍
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-800">Select Work Location</h3>
              <p className="text-gray-600 text-sm">This project has multiple locations</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            disabled={loading}
            className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-600 hover:text-gray-800 transition-colors disabled:opacity-50"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Choose your work location for this session:
            </label>
            <div className="space-y-2">
              {projectLocations.map((projectLocation) => (
                <label
                  key={projectLocation.location_id}
                  className={`flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedLocationId === projectLocation.location_id
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="location"
                    value={projectLocation.location_id}
                    checked={selectedLocationId === projectLocation.location_id}
                    onChange={(e) => setSelectedLocationId(e.target.value)}
                    className="sr-only"
                  />
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div className={`w-4 h-4 rounded-full border-2 ${
                        selectedLocationId === projectLocation.location_id
                          ? 'border-purple-500 bg-purple-500'
                          : 'border-gray-300'
                      }`}>
                        {selectedLocationId === projectLocation.location_id && (
                          <div className="w-full h-full rounded-full bg-white scale-50"></div>
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900 flex items-center space-x-2">
                          <span>{projectLocation.location?.name}</span>
                          {projectLocation.is_primary && (
                            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
                              PRIMARY
                            </span>
                          )}
                        </div>
                        {projectLocation.location?.address && (
                          <div className="text-sm text-gray-500 mt-1">
                            {projectLocation.location.address}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !selectedLocationId}
              className="flex-1 bg-gradient-to-r from-purple-500 to-indigo-600 text-white py-3 rounded-lg font-medium hover:from-purple-600 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Clocking In...</span>
                </span>
              ) : (
                'Clock In at This Location'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}