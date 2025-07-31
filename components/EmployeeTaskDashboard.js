import { useState, useEffect, useCallback } from 'react'
import { database } from '../lib/supabase'

export default function EmployeeTaskDashboard({ employee, onClose }) {
  const [employeeTasks, setEmployeeTasks] = useState([])
  const [availableTasks, setAvailableTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all, assigned, available
  const [selectedTask, setSelectedTask] = useState(null)

  const loadTasks = useCallback(async () => {
    try {
      setLoading(true)
      const [employeeTasksResult, availableTasksResult] = await Promise.all([
        database.getEmployeeTasks(employee.id, null),
        database.getAvailableTasks(employee.organization_id)
      ])

      setEmployeeTasks(employeeTasksResult.data || [])
      setAvailableTasks(availableTasksResult.data || [])
    } catch (error) {
      console.error('Error loading tasks:', error)
    } finally {
      setLoading(false)
    }
  }, [employee.id, employee.organization_id])

  useEffect(() => {
    loadTasks()
  }, [loadTasks])

  const handlePickUpTask = async (taskId) => {
    try {
      const result = await database.assignTask(taskId, employee.id, employee.id)
      if (result.error) {
        console.error('Error picking up task:', result.error)
        alert('Error picking up task')
        return
      }
      
      // Task picked up - no need for popup
      await loadTasks()
    } catch (error) {
      console.error('Error picking up task:', error)
      alert('Error picking up task')
    }
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'  
      case 'low': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200'
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'not_started': return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'on_hold': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getFilteredTasks = () => {
    switch (filter) {
      case 'assigned':
        return employeeTasks
      case 'available':
        return availableTasks
      default:
        return [...employeeTasks, ...availableTasks.filter(t => !employeeTasks.find(et => et.id === t.id))]
    }
  }

  const getTaskStats = () => {
    const total = employeeTasks.length
    const completed = employeeTasks.filter(t => t.status === 'completed').length
    const inProgress = employeeTasks.filter(t => t.status === 'in_progress').length
    const overdue = employeeTasks.filter(t => t.is_overdue && t.status !== 'completed').length
    
    return { total, completed, inProgress, overdue }
  }

  const stats = getTaskStats()
  const filteredTasks = getFilteredTasks()

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-8 max-w-4xl w-full max-h-[90vh] shadow-2xl border border-white/20">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-8 max-w-6xl w-full max-h-[90vh] shadow-2xl border border-white/20 overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-green-600 rounded-2xl flex items-center justify-center text-white text-xl shadow-lg">
              📋
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-800">My Tasks Dashboard</h3>
              <p className="text-gray-600">Manage your assigned tasks and pick up new ones</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-600 hover:text-gray-800 transition-colors"
          >
            ×
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="text-2xl font-bold text-blue-700">{stats.total}</div>
            <div className="text-sm text-blue-600">Total Tasks</div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <div className="text-2xl font-bold text-yellow-700">{stats.inProgress}</div>
            <div className="text-sm text-yellow-600">In Progress</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="text-2xl font-bold text-green-700">{stats.completed}</div>
            <div className="text-sm text-green-600">Completed</div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
            <div className="text-2xl font-bold text-red-700">{stats.overdue}</div>
            <div className="text-sm text-red-600">Overdue</div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setFilter('all')}
            className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors ${
              filter === 'all' 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            All Tasks ({filteredTasks.length})
          </button>
          <button
            onClick={() => setFilter('assigned')}
            className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors ${
              filter === 'assigned' 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            My Tasks ({employeeTasks.length})
          </button>
          <button
            onClick={() => setFilter('available')}
            className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors ${
              filter === 'available' 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Available Tasks ({availableTasks.length})
          </button>
        </div>

        {/* Tasks List */}
        <div className="overflow-y-auto max-h-96">
          {filteredTasks.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredTasks.map(task => {
                const isAssigned = employeeTasks.find(t => t.id === task.id)
                const isAvailable = !isAssigned && availableTasks.find(t => t.id === task.id)
                
                return (
                  <div key={task.id} className="bg-white p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 mb-1">{task.title}</h4>
                        {task.description && (
                          <p className="text-gray-600 text-sm mb-2 line-clamp-2">{task.description}</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end space-y-2 ml-4">
                        {isAssigned && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                            ASSIGNED
                          </span>
                        )}
                        {isAvailable && (
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                            AVAILABLE
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between mb-3">
                      <div className="flex space-x-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(task.status)}`}>
                          {task.status.replace('_', ' ').toUpperCase()}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(task.priority)}`}>
                          {task.priority.toUpperCase()}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {task.progress_percentage}% complete
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-3">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-teal-500 h-2 rounded-full transition-all"
                          style={{ width: `${task.progress_percentage}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Task Details */}
                    <div className="space-y-1 text-xs text-gray-500 mb-3">
                      {task.project_name && (
                        <div>📂 {task.project_name} - {task.client_name}</div>
                      )}
                      {task.due_date && (
                        <div className={task.is_overdue ? 'text-red-500 font-medium' : ''}>
                          📅 Due: {new Date(task.due_date).toLocaleDateString()}
                          {task.is_overdue && ' (OVERDUE)'}
                        </div>
                      )}
                      {task.estimated_hours && (
                        <div>⏱️ Est: {task.estimated_hours}h</div>
                      )}
                      {task.actual_hours > 0 && (
                        <div>✅ Actual: {parseFloat(task.actual_hours).toFixed(1)}h</div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex justify-between items-center">
                      <button
                        onClick={() => setSelectedTask(task)}
                        className="text-teal-600 hover:text-teal-700 text-sm font-medium"
                      >
                        View Details
                      </button>
                      
                      {isAvailable && (
                        <button
                          onClick={() => handlePickUpTask(task.id)}
                          className="bg-teal-600 hover:bg-teal-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                        >
                          Pick Up Task
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-400 text-4xl mb-4">📭</div>
              <p className="text-gray-600">
                {filter === 'assigned' && 'No tasks assigned to you yet.'}
                {filter === 'available' && 'No tasks available in the task pool.'}
                {filter === 'all' && 'No tasks available.'}
              </p>
              <p className="text-gray-500 text-sm mt-2">
                {filter === 'available' && 'Check back later or contact your manager.'}
                {filter === 'assigned' && 'Pick up tasks from the available pool or wait for assignments.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </div>
  )
}

// Task Detail Modal Component
function TaskDetailModal({ task, onClose }) {
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'  
      case 'low': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200'
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'not_started': return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'on_hold': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
      <div className="bg-white rounded-2xl p-6 max-w-2xl w-full shadow-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-6">
          <h3 className="text-xl font-bold text-gray-900">Task Details</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-600 hover:text-gray-800 transition-colors"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">{task.title}</h4>
            {task.description && (
              <p className="text-gray-700">{task.description}</p>
            )}
          </div>

          <div className="flex space-x-2">
            <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(task.status)}`}>
              {task.status.replace('_', ' ').toUpperCase()}
            </span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getPriorityColor(task.priority)}`}>
              {task.priority.toUpperCase()} PRIORITY
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Progress</label>
              <div className="flex items-center space-x-2">
                <div className="flex-1 bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-teal-500 h-3 rounded-full transition-all"
                    style={{ width: `${task.progress_percentage}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium text-gray-900">{task.progress_percentage}%</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Time Tracking</label>
              <div className="text-sm text-gray-600">
                {task.estimated_hours && <div>Estimated: {task.estimated_hours}h</div>}
                {task.actual_hours > 0 && <div>Actual: {parseFloat(task.actual_hours).toFixed(1)}h</div>}
                {task.estimated_hours && task.actual_hours > 0 && (
                  <div className={task.actual_hours > task.estimated_hours ? 'text-red-600' : 'text-green-600'}>
                    {task.actual_hours <= task.estimated_hours ? 'On track' : 'Over estimate'}
                  </div>
                )}
              </div>
            </div>
          </div>

          {task.project_name && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
              <div className="text-gray-900">{task.project_name} - {task.client_name}</div>
              {task.project_code && (
                <div className="text-sm text-gray-500">Code: {task.project_code}</div>
              )}
            </div>
          )}

          {task.due_date && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
              <div className={`font-medium ${task.is_overdue ? 'text-red-600' : 'text-gray-900'}`}>
                {new Date(task.due_date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
                {task.is_overdue && <span className="ml-2 text-red-600 font-bold">(OVERDUE)</span>}
              </div>
            </div>
          )}

          {task.assigned_first_name && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
              <div className="text-gray-900">{task.assigned_first_name} {task.assigned_last_name}</div>
              {task.assigned_employee_id && (
                <div className="text-sm text-gray-500">ID: {task.assigned_employee_id}</div>
              )}
            </div>
          )}

          <div className="text-xs text-gray-500 pt-4 border-t">
            Created: {new Date(task.created_at).toLocaleDateString()}
            {task.updated_at !== task.created_at && (
              <span className="ml-4">
                Updated: {new Date(task.updated_at).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}