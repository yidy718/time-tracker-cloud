import { useState, useEffect, useCallback } from 'react'
import { database } from '../lib/supabase'

export default function TaskManagement({ employee }) {
  const [tasks, setTasks] = useState([])
  const [employees, setEmployees] = useState([])
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedTask, setSelectedTask] = useState(null)
  const [showCommentsModal, setShowCommentsModal] = useState(false)
  const [selectedTaskComments, setSelectedTaskComments] = useState([])
  const [commentsTask, setCommentsTask] = useState(null)
  const [loadingComments, setLoadingComments] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [addingComment, setAddingComment] = useState(false)
  const [filters, setFilters] = useState({
    status: '',
    assignedTo: '',
    projectId: '',
    priority: ''
  })

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [tasksResult, employeesResult, projectsResult] = await Promise.all([
        database.getTasks(employee.organization_id, filters),
        database.getEmployees(employee.organization_id),
        database.getClientProjects(employee.organization_id)
      ])

      setTasks(tasksResult.data || [])
      setEmployees(employeesResult.data || [])
      setProjects(projectsResult.data || [])
    } catch (error) {
      console.error('Error loading task data:', error)
    } finally {
      setLoading(false)
    }
  }, [employee.organization_id, filters.status, filters.assignedTo, filters.projectId, filters.priority])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleViewComments = async (task) => {
    setCommentsTask(task)
    setLoadingComments(true)
    setShowCommentsModal(true)
    setNewComment('')
    
    try {
      const { data, error } = await database.getTaskComments(task.id)
      if (error) throw error
      setSelectedTaskComments(data || [])
    } catch (error) {
      console.error('Error loading task comments:', error)
      setSelectedTaskComments([])
    } finally {
      setLoadingComments(false)
    }
  }

  const handleAddComment = async () => {
    if (!newComment.trim() || !commentsTask || addingComment) return
    
    setAddingComment(true)
    try {
      const { data, error } = await database.addTaskComment(
        commentsTask.id,
        employee.id,
        newComment.trim(),
        false, // not a status change
        null,
        null
      )
      
      if (error) throw error
      
      // Reload comments to show the new one
      const { data: updatedComments, error: reloadError } = await database.getTaskComments(commentsTask.id)
      if (reloadError) throw reloadError
      
      setSelectedTaskComments(updatedComments || [])
      setNewComment('')
      
    } catch (error) {
      console.error('Error adding comment:', error)
      alert('Failed to add comment. Please try again.')
    } finally {
      setAddingComment(false)
    }
  }

  const handleCreateTask = async (taskData) => {
    try {
      console.log('Creating task with data:', {
        ...taskData,
        organization_id: employee.organization_id,
        created_by: employee.id
      })

      const result = await database.createTask({
        ...taskData,
        organization_id: employee.organization_id,
        created_by: employee.id
      })

      if (result.error) {
        console.error('Error creating task:', result.error)
        alert(`Error creating task: ${result.error.message || 'Unknown error'}`)
        return
      }

      console.log('Task created successfully:', result.data)
      await loadData()
      setShowCreateModal(false)
      alert('Task created successfully!')
    } catch (error) {
      console.error('Error creating task:', error)
      alert(`Error creating task: ${error.message || 'Unknown error'}`)
    }
  }

  const handleUpdateTask = async (taskId, updates) => {
    try {
      const result = await database.updateTask(taskId, updates)
      if (result.error) {
        console.error('Error updating task:', result.error)
        return
      }
      await loadData()
    } catch (error) {
      console.error('Error updating task:', error)
    }
  }

  const handleDeleteTask = async (taskId) => {
    if (!confirm('Are you sure you want to delete this task?')) return
    
    try {
      const result = await database.deleteTask(taskId)
      if (result.error) {
        console.error('Error deleting task:', result.error)
        return
      }
      await loadData()
    } catch (error) {
      console.error('Error deleting task:', error)
    }
  }

  const handleAssignTask = async (taskId, employeeId) => {
    try {
      const result = await database.assignTask(taskId, employeeId, employee.id)
      if (result.error) {
        console.error('Error assigning task:', result.error)
        return
      }
      await loadData()
    } catch (error) {
      console.error('Error assigning task:', error)
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Task Management</h2>
          <p className="text-white/70">Create and manage tasks for your team</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          + Create Task
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white/10 backdrop-blur-xl rounded-xl p-4 border border-white/20">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <select
            value={filters.status}
            onChange={(e) => setFilters({...filters, status: e.target.value})}
            className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white [&>option]:text-gray-900 [&>option]:bg-white"
          >
            <option value="">All Status</option>
            <option value="not_started">Not Started</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="on_hold">On Hold</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select
            value={filters.assignedTo}
            onChange={(e) => setFilters({...filters, assignedTo: e.target.value})}
            className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white [&>option]:text-gray-900 [&>option]:bg-white"
          >
            <option value="">All Employees</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>
                {emp.first_name} {emp.last_name}
              </option>
            ))}
          </select>

          <select
            value={filters.projectId}
            onChange={(e) => setFilters({...filters, projectId: e.target.value})}
            className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white [&>option]:text-gray-900 [&>option]:bg-white"
          >
            <option value="">All Projects</option>
            {projects.map(project => (
              <option key={project.id} value={project.id}>
                {project.project_name} - {project.client_name}
              </option>
            ))}
          </select>

          <select
            value={filters.priority}
            onChange={(e) => setFilters({...filters, priority: e.target.value})}
            className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white [&>option]:text-gray-900 [&>option]:bg-white"
          >
            <option value="">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Tasks Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {tasks.map(task => (
          <div key={task.id} className="bg-white/10 backdrop-blur-xl rounded-xl p-6 border border-white/20">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-2">{task.title}</h3>
                {task.description && (
                  <p className="text-white/70 text-sm mb-3 line-clamp-2">{task.description}</p>
                )}
              </div>
              <div className="flex space-x-2 ml-4">
                <button
                  onClick={() => handleViewComments(task)}
                  className="text-white/60 hover:text-blue-400 text-sm"
                  title="View Comments"
                >
                  💬
                </button>
                <button
                  onClick={() => setSelectedTask(task)}
                  className="text-white/60 hover:text-white text-sm"
                  title="Edit Task"
                >
                  ✏️
                </button>
                <button
                  onClick={() => handleDeleteTask(task.id)}
                  className="text-white/60 hover:text-red-400 text-sm"
                  title="Delete Task"
                >
                  🗑️
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {/* Status and Priority */}
              <div className="flex space-x-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(task.status)}`}>
                  {task.status.replace('_', ' ').toUpperCase()}
                </span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(task.priority)}`}>
                  {task.priority.toUpperCase()}
                </span>
              </div>

              {/* Project */}
              {task.project_name && (
                <div className="text-sm text-white/70">
                  📂 {task.project_name} - {task.client_name}
                </div>
              )}

              {/* Assignee */}
              <div className="text-sm text-white/70">
                {task.assigned_first_name ? (
                  <span>👤 {task.assigned_first_name} {task.assigned_last_name}</span>
                ) : (
                  <span className="text-yellow-400">⚠️ Unassigned</span>
                )}
              </div>

              {/* Progress */}
              <div className="space-y-1">
                <div className="flex justify-between text-sm text-white/70">
                  <span>Progress</span>
                  <span>{task.progress_percentage}%</span>
                </div>
                <div className="w-full bg-white/20 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all"
                    style={{ width: `${task.progress_percentage}%` }}
                  ></div>
                </div>
              </div>

              {/* Due Date */}
              {task.due_date && (
                <div className={`text-sm ${task.is_overdue ? 'text-red-400' : 'text-white/70'}`}>
                  📅 Due: {new Date(task.due_date).toLocaleDateString()}
                  {task.is_overdue && <span className="font-semibold"> (OVERDUE)</span>}
                </div>
              )}

              {/* Financial Info */}
              {(task.po_number || task.invoice_number) && (
                <div className="text-xs text-white/60 space-y-1">
                  {task.po_number && (
                    <div>🧾 PO: {task.po_number}</div>
                  )}
                  {task.invoice_number && (
                    <div>📄 Invoice: {task.invoice_number}</div>
                  )}
                </div>
              )}

              {/* Time Info */}
              <div className="text-xs text-white/50 space-y-1">
                {task.estimated_hours && (
                  <div>Est: {task.estimated_hours}h</div>
                )}
                {task.actual_hours > 0 && (
                  <div>Actual: {parseFloat(task.actual_hours).toFixed(1)}h</div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-4 pt-4 border-t border-white/20">
              <div className="flex space-x-2">
                {!task.assigned_to && (
                  <select
                    onChange={(e) => e.target.value && handleAssignTask(task.id, e.target.value)}
                    className="flex-1 bg-white/10 border border-white/20 rounded px-2 py-1 text-sm text-white"
                    defaultValue=""
                  >
                    <option value="">Assign to...</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.first_name} {emp.last_name}
                      </option>
                    ))}
                  </select>
                )}
                
                <select
                  value={task.status}
                  onChange={(e) => handleUpdateTask(task.id, { status: e.target.value })}
                  className="bg-white/10 border border-white/20 rounded px-2 py-1 text-sm text-white"
                >
                  <option value="not_started">Not Started</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="on_hold">On Hold</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          </div>
        ))}

        {tasks.length === 0 && (
          <div className="col-span-full text-center py-12">
            <div className="text-white/60 text-lg mb-4">📋</div>
            <p className="text-white/70">No tasks found. Create your first task to get started!</p>
          </div>
        )}
      </div>

      {/* Create Task Modal */}
      {showCreateModal && (
        <TaskCreateModal
          employees={employees}
          projects={projects}
          onSubmit={handleCreateTask}
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {/* Edit Task Modal */}
      {selectedTask && (
        <TaskEditModal
          task={selectedTask}
          employees={employees}
          projects={projects}
          onSubmit={(updates) => {
            handleUpdateTask(selectedTask.id, updates)
            setSelectedTask(null)
          }}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </div>
  )
}

// Task Create Modal Component
function TaskCreateModal({ employees, projects, onSubmit, onClose }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    due_date: '',
    estimated_hours: '',
    project_id: '',
    assigned_to: '',
    is_available_to_all: false,
    po_number: '',
    invoice_number: ''
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    
    const taskData = {
      ...formData,
      due_date: formData.due_date || null,
      estimated_hours: formData.estimated_hours ? parseFloat(formData.estimated_hours) : null,
      project_id: formData.project_id || null,
      assigned_to: formData.assigned_to || null,
      po_number: formData.po_number || null,
      invoice_number: formData.invoice_number || null
    }

    onSubmit(taskData)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Create New Task</h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 [&>option]:text-gray-900 [&>option]:bg-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 [&>option]:text-gray-900 [&>option]:bg-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({...formData, priority: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 [&>option]:text-gray-900 [&>option]:bg-white"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Hours</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={formData.estimated_hours}
                  onChange={(e) => setFormData({...formData, estimated_hours: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 [&>option]:text-gray-900 [&>option]:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
              <input
                type="datetime-local"
                value={formData.due_date}
                onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 [&>option]:text-gray-900 [&>option]:bg-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
              <select
                value={formData.project_id}
                onChange={(e) => setFormData({...formData, project_id: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 [&>option]:text-gray-900 [&>option]:bg-white"
              >
                <option value="">No Project</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.project_name} - {project.client_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assign To</label>
              <select
                value={formData.assigned_to}
                onChange={(e) => setFormData({...formData, assigned_to: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 [&>option]:text-gray-900 [&>option]:bg-white"
              >
                <option value="">Unassigned</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.first_name} {emp.last_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">PO Number (Optional)</label>
                <input
                  type="text"
                  value={formData.po_number}
                  onChange={(e) => setFormData({...formData, po_number: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="PO-2024-001"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Number (Optional)</label>
                <input
                  type="text"
                  value={formData.invoice_number}
                  onChange={(e) => setFormData({...formData, invoice_number: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="INV-2024-001"
                />
              </div>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="available_to_all"
                checked={formData.is_available_to_all}
                onChange={(e) => setFormData({...formData, is_available_to_all: e.target.checked})}
                className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
              />
              <label htmlFor="available_to_all" className="ml-2 text-sm text-gray-700">
                Make available to all employees (task pool)
              </label>
            </div>

            <div className="flex justify-end space-x-3 pt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Create Task
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// Task Edit Modal (similar to create but with existing data)
function TaskEditModal({ task, employees, projects, onSubmit, onClose }) {
  const [formData, setFormData] = useState({
    title: task.title || '',
    description: task.description || '',
    priority: task.priority || 'medium',
    status: task.status || 'not_started',
    due_date: task.due_date ? new Date(task.due_date).toISOString().slice(0, 16) : '',
    estimated_hours: task.estimated_hours || '',
    project_id: task.project_id || '',
    assigned_to: task.assigned_to || '',
    is_available_to_all: task.is_available_to_all || false,
    progress_percentage: task.progress_percentage || 0,
    po_number: task.po_number || '',
    invoice_number: task.invoice_number || ''
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    
    const updates = {
      ...formData,
      due_date: formData.due_date || null,
      estimated_hours: formData.estimated_hours ? parseFloat(formData.estimated_hours) : null,
      project_id: formData.project_id || null,
      assigned_to: formData.assigned_to || null,
      progress_percentage: parseInt(formData.progress_percentage)
    }

    onSubmit(updates)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Edit Task</h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 [&>option]:text-gray-900 [&>option]:bg-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 [&>option]:text-gray-900 [&>option]:bg-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 [&>option]:text-gray-900 [&>option]:bg-white"
                >
                  <option value="not_started">Not Started</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="on_hold">On Hold</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({...formData, priority: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 [&>option]:text-gray-900 [&>option]:bg-white"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Hours</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={formData.estimated_hours}
                  onChange={(e) => setFormData({...formData, estimated_hours: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 [&>option]:text-gray-900 [&>option]:bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Progress %</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.progress_percentage}
                  onChange={(e) => setFormData({...formData, progress_percentage: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 [&>option]:text-gray-900 [&>option]:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
              <input
                type="datetime-local"
                value={formData.due_date}
                onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 [&>option]:text-gray-900 [&>option]:bg-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
              <select
                value={formData.project_id}
                onChange={(e) => setFormData({...formData, project_id: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 [&>option]:text-gray-900 [&>option]:bg-white"
              >
                <option value="">No Project</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.project_name} - {project.client_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assign To</label>
              <select
                value={formData.assigned_to}
                onChange={(e) => setFormData({...formData, assigned_to: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 [&>option]:text-gray-900 [&>option]:bg-white"
              >
                <option value="">Unassigned</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.first_name} {emp.last_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="available_to_all_edit"
                checked={formData.is_available_to_all}
                onChange={(e) => setFormData({...formData, is_available_to_all: e.target.checked})}
                className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
              />
              <label htmlFor="available_to_all_edit" className="ml-2 text-sm text-gray-700">
                Make available to all employees (task pool)
              </label>
            </div>

            <div className="flex justify-end space-x-3 pt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Update Task
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )

  {/* Task Comments Modal */}
  {showCommentsModal && (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-8 max-w-2xl w-full max-h-[80vh] overflow-hidden shadow-2xl border border-white/20">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center text-white text-xl shadow-lg">
              💬
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-800">Task Comments</h3>
              <p className="text-gray-600">{commentsTask?.title}</p>
            </div>
          </div>
          <button
            onClick={() => {
              setShowCommentsModal(false)
              setSelectedTaskComments([])
              setCommentsTask(null)
            }}
            className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-600 hover:text-gray-800 transition-colors"
          >
            ×
          </button>
        </div>

        <div className="overflow-y-auto max-h-96">
          {loadingComments ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading comments...</p>
            </div>
          ) : selectedTaskComments.length > 0 ? (
            <div className="space-y-4">
              {selectedTaskComments.map((comment, index) => (
                <div key={comment.id || index} className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      {comment.employee?.first_name?.[0] || '?'}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-gray-800">
                          {comment.employee?.first_name} {comment.employee?.last_name}
                        </span>
                        <span className="text-sm text-gray-500">
                          {new Date(comment.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-gray-700 whitespace-pre-wrap">{comment.comment_text}</p>
                      {comment.is_status_change && (
                        <div className="mt-2 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                          Status changed: {comment.old_status} → {comment.new_status}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">💭</div>
              <p className="text-gray-600 text-lg">No comments yet</p>
              <p className="text-gray-500 text-sm mt-2">Employee comments and notes will appear here</p>
            </div>
          )}
        </div>

        {/* Add Comment Form */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="text-lg font-semibold text-gray-800 mb-4">💬 Add Comment</h4>
          <div className="space-y-4">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add your comment or note about this task..."
              rows={3}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 resize-none"
            />
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-500">
                Comments are visible to all team members working on this task
              </p>
              <button
                onClick={handleAddComment}
                disabled={!newComment.trim() || addingComment}
                className="bg-gradient-to-r from-green-500 to-emerald-600 text-white py-2 px-6 rounded-xl font-medium hover:from-green-600 hover:to-emerald-700 transition-all duration-300 hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {addingComment ? (
                  <span className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Adding...</span>
                  </span>
                ) : (
                  '📝 Add Comment'
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={() => {
              setShowCommentsModal(false)
              setSelectedTaskComments([])
              setCommentsTask(null)
              setNewComment('')
            }}
            className="bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-6 rounded-xl font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-300 hover:scale-105 shadow-lg"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )}
}