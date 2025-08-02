import { useState, useEffect, useCallback } from 'react'
import { database } from '../lib/supabase'

export default function EmployeeTaskDashboard({ employee, onClose }) {
  const [employeeTasks, setEmployeeTasks] = useState([])
  const [availableTasks, setAvailableTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all, assigned, available
  const [selectedTask, setSelectedTask] = useState(null)
  const [showProgressModal, setShowProgressModal] = useState(false)
  const [progressTask, setProgressTask] = useState(null)
  const [showCommentsModal, setShowCommentsModal] = useState(false)
  const [selectedTaskComments, setSelectedTaskComments] = useState([])
  const [commentsTask, setCommentsTask] = useState(null)
  const [loadingComments, setLoadingComments] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [addingComment, setAddingComment] = useState(false)

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

  const handleUpdateTaskProgress = async (taskId, updates) => {
    try {
      console.log('🔄 Attempting to update task:', { taskId, updates, employeeId: employee.id })
      const result = await database.updateTask(taskId, updates)
      if (result.error) {
        console.error('❌ Task update failed:', result.error)
        alert(`Error updating task: ${result.error.message || 'Permission denied'}`)
        return
      }
      
      console.log('✅ Task updated successfully:', result.data)
      await loadTasks()
      setShowProgressModal(false)
      setProgressTask(null)
      alert('Task progress updated successfully!')
    } catch (error) {
      console.error('❌ Task update exception:', error)
      alert(`Error updating task: ${error.message || 'Unknown error'}`)
    }
  }

  const handleQuickStatusChange = async (taskId, newStatus) => {
    try {
      console.log('🔄 Updating task status:', { taskId, newStatus, employeeId: employee.id })
      
      // When marking as completed, automatically set progress to 100%
      const updates = { status: newStatus }
      if (newStatus === 'completed') {
        updates.progress_percentage = 100
        console.log('🎯 Setting progress to 100% since task is being marked as completed')
      }
      
      const result = await database.updateTask(taskId, updates)
      if (result.error) {
        console.error('❌ Status update failed:', result.error)
        alert(`Error updating task status: ${result.error.message || 'Permission denied'}`)
        return
      }
      
      console.log('✅ Task status updated successfully')
      await loadTasks()
    } catch (error) {
      console.error('❌ Status update exception:', error)
      alert(`Error updating task status: ${error.message || 'Unknown error'}`)
    }
  }

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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50">
      <div className="bg-white/95 backdrop-blur-xl rounded-3xl max-w-6xl w-full h-[95vh] sm:h-[90vh] shadow-2xl border border-white/20 flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 sm:p-8 border-b border-gray-200 flex-shrink-0">
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
            className="w-12 h-12 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-600 hover:text-gray-800 transition-colors text-2xl font-bold touch-manipulation"
            style={{ WebkitTapHighlightColor: 'transparent' }}
            type="button"
          >
            ×
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6 flex-shrink-0">
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
        <div className="flex space-x-1 mb-4 sm:mb-6 bg-gray-100 p-1 rounded-lg flex-shrink-0">
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
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 scrollbar-hide">
          {filteredTasks.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 pb-4">
              {filteredTasks.map(task => {
                const isAssigned = employeeTasks.find(t => t.id === task.id)
                const isAvailable = !isAssigned && availableTasks.find(t => t.id === task.id)
                
                return (
                  <button 
                    key={task.id} 
                    className="w-full bg-white p-4 rounded-lg border border-gray-200 hover:border-gray-300 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all duration-200 text-left touch-manipulation"
                    onClick={() => setSelectedTask(task)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setSelectedTask(task)
                      }
                    }}
                    aria-label={`View details for task: ${task.title}, Status: ${task.status}, Progress: ${task.progress_percentage || 0}%`}
                    style={{ WebkitTapHighlightColor: 'rgba(20, 184, 166, 0.1)' }}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 mb-1">{task.title}</h4>
                        {task.description && (
                          <p className="text-gray-600 text-sm mb-2 line-clamp-2">{task.description}</p>
                        )}
                        {(task.po_number || task.invoice_number) && (
                          <div className="text-xs text-gray-500 space-y-1">
                            {task.po_number && (
                              <div>🧾 PO: {task.po_number}</div>
                            )}
                            {task.invoice_number && (
                              <div>📄 Invoice: {task.invoice_number}</div>
                            )}
                          </div>
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
                      <div className="text-teal-600 text-sm font-medium">
                        {isAssigned ? 'Tap to update progress' : 'Tap to view details'}
                      </div>
                      
                      <div className="flex space-x-2">
                        {isAssigned && task.status !== 'completed' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setProgressTask(task)
                              setShowProgressModal(true)
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-medium transition-colors touch-manipulation"
                            style={{ WebkitTapHighlightColor: 'transparent' }}
                          >
                            Update Progress
                          </button>
                        )}
                        
                        {isAssigned && task.status === 'not_started' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleQuickStatusChange(task.id, 'in_progress')
                            }}
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs font-medium transition-colors touch-manipulation"
                            style={{ WebkitTapHighlightColor: 'transparent' }}
                          >
                            Start Task
                          </button>
                        )}
                        
                        {isAssigned && task.status === 'in_progress' && task.progress_percentage >= 100 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleQuickStatusChange(task.id, 'completed')
                            }}
                            className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-xs font-medium transition-colors touch-manipulation"
                            style={{ WebkitTapHighlightColor: 'transparent' }}
                          >
                            Complete Task
                          </button>
                        )}
                        
                        {isAvailable && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handlePickUpTask(task.id)
                            }}
                            className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors touch-manipulation"
                            style={{ WebkitTapHighlightColor: 'transparent' }}
                          >
                            Pick Up Task
                          </button>
                        )}
                      </div>
                    </div>
                  </button>
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
          onViewComments={handleViewComments}
        />
      )}

      {/* Progress Update Modal */}
      {showProgressModal && progressTask && (
        <TaskProgressModal
          task={progressTask}
          onUpdate={handleUpdateTaskProgress}
          onClose={() => {
            setShowProgressModal(false)
            setProgressTask(null)
          }}
        />
      )}

      {/* Comments Modal */}
      {showCommentsModal && commentsTask && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-8 max-w-2xl w-full max-h-[80vh] shadow-2xl border border-white/20 overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-6 flex-shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl flex items-center justify-center text-white text-xl shadow-lg">
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
                  setNewComment('')
                }}
                className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-600 hover:text-gray-800 transition-colors"
              >
                ×
              </button>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto mb-6">
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
                  <p className="text-gray-500 text-sm mt-2">Comments and notes will appear here</p>
                </div>
              )}
            </div>

            {/* Add Comment Form */}
            <div className="pt-6 border-t border-gray-200 flex-shrink-0">
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
          </div>
        </div>
      )}
    </div>
  )
}

// Task Detail Modal Component
function TaskDetailModal({ task, onClose, onViewComments }) {
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
            {(task.po_number || task.invoice_number) && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600 space-y-1">
                  {task.po_number && (
                    <div>🧾 <strong>PO Number:</strong> {task.po_number}</div>
                  )}
                  {task.invoice_number && (
                    <div>📄 <strong>Invoice Number:</strong> {task.invoice_number}</div>
                  )}
                </div>
              </div>
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

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              onClick={() => {
                onClose()
                onViewComments(task)
              }}
              className="bg-gradient-to-r from-purple-500 to-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:from-purple-600 hover:to-blue-700 transition-all duration-300 hover:scale-105 shadow-lg"
            >
              💬 View Comments
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Task Progress Update Modal Component
function TaskProgressModal({ task, onUpdate, onClose }) {
  const [formData, setFormData] = useState({
    status: task.status || 'not_started',
    progress_percentage: task.progress_percentage || 0,
    progress_notes: ''
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    
    const updates = {
      status: formData.status,
      progress_percentage: parseInt(formData.progress_percentage),
      progress_notes: formData.progress_notes.trim() || null
    }

    onUpdate(task.id, updates)
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200'
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'not_started': return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'on_hold': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[70]">
      <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Update Task Progress</h3>
            <p className="text-gray-600 text-sm mt-1">{task.title}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-600 hover:text-gray-800 transition-colors"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Status Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Task Status
            </label>
            <div className="grid grid-cols-2 gap-2">
              {['not_started', 'in_progress', 'on_hold', 'completed'].map(status => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setFormData({
                    ...formData, 
                    status,
                    // Auto-set progress to 100% when marking as completed
                    progress_percentage: status === 'completed' ? 100 : formData.progress_percentage
                  })}
                  className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                    formData.status === status 
                      ? getStatusColor(status)
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {status.replace('_', ' ').toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Progress Percentage */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Progress Percentage: {formData.progress_percentage}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={formData.progress_percentage}
              onChange={(e) => setFormData({...formData, progress_percentage: e.target.value})}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>0%</span>
              <span>25%</span>
              <span>50%</span>
              <span>75%</span>
              <span>100%</span>
            </div>
            <div className="mt-2">
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all"
                  style={{ width: `${formData.progress_percentage}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Progress Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Progress Notes (Optional)
            </label>
            <textarea
              rows={3}
              value={formData.progress_notes}
              onChange={(e) => setFormData({...formData, progress_notes: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="What progress have you made? Any blockers or updates to share..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all font-medium shadow-lg"
            >
              Update Progress
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}