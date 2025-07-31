import { useState, useEffect } from 'react'
import { database } from '../lib/supabase'

export default function ActivityLogger({ employee, organizationId, onActivityAdded }) {
  const [activityData, setActivityData] = useState({
    description: '',
    hours: '',
    date: new Date().toISOString().split('T')[0],
    expenseAmount: '',
    expenseDescription: '',
    hasExpense: false
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [recentActivities, setRecentActivities] = useState([])

  useEffect(() => {
    loadRecentActivities()
  }, [])

  const loadRecentActivities = async () => {
    try {
      // Load recent activity logs for this employee
      const { data, error } = await database.getEmployeeActivities?.(employee.id, organizationId, 7) || { data: [], error: null }
      if (!error) {
        setRecentActivities(data || [])
      }
    } catch (error) {
      console.log('Recent activities not available yet')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      // Create activity memo as a special task
      const taskData = {
        organization_id: organizationId,
        title: `Activity Log - ${activityData.date}`,
        description: activityData.description,
        assigned_to: employee.id,
        status: 'completed',
        priority: 'low',
        is_activity_log: true,
        estimated_hours: activityData.hours ? parseFloat(activityData.hours) : null,
        actual_hours: activityData.hours ? parseFloat(activityData.hours) : null,
        completed_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      }

      const { data: taskResult, error: taskError } = await database.createTask(taskData)
      
      if (taskError) throw taskError

      // If there's an expense, create it
      if (activityData.hasExpense && activityData.expenseAmount && employee.can_expense) {
        const expenseData = {
          employee_id: employee.id,
          organization_id: organizationId,
          amount: parseFloat(activityData.expenseAmount),
          description: activityData.expenseDescription || `Expense for: ${activityData.description}`,
          date: activityData.date,
          category: 'Activity Related',
          status: 'pending',
          related_task_id: taskResult?.id
        }

        const { error: expenseError } = await database.addExpense(expenseData)
        if (expenseError) {
          console.error('Expense creation failed:', expenseError)
          // Don't fail the whole operation if expense fails
        }
      }

      setSuccess(`Activity logged successfully! ${activityData.hasExpense && employee.can_expense ? 'Expense also recorded.' : ''}`)
      
      // Reset form
      setActivityData({
        description: '',
        hours: '',
        date: new Date().toISOString().split('T')[0],
        expenseAmount: '',
        expenseDescription: '',
        hasExpense: false
      })
      
      // Reload recent activities
      loadRecentActivities()
      
      if (onActivityAdded) {
        onActivityAdded()
      }

    } catch (error) {
      console.error('Error logging activity:', error)
      setError(error.message || 'Error logging activity')
    }
    setLoading(false)
  }

  const convertToTask = async (activity) => {
    try {
      // Convert activity log to a proper task
      const taskData = {
        organization_id: organizationId,
        title: `Task: ${activity.description.substring(0, 50)}...`,
        description: activity.description,
        assigned_to: employee.id,
        status: 'not_started',
        priority: 'medium',
        is_activity_log: false,
        estimated_hours: activity.actual_hours,
        created_at: new Date().toISOString()
      }

      const { error } = await database.createTask(taskData)
      
      if (error) throw error

      alert('Activity converted to task successfully!')
      loadRecentActivities()
      
    } catch (error) {
      console.error('Error converting to task:', error)
      alert('Error converting to task: ' + error.message)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Activity Logging Form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Log Work Activity</h3>
        
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}
        
        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
            {success}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date *
              </label>
              <input
                type="date"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={activityData.date}
                onChange={(e) => setActivityData({...activityData, date: e.target.value})}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hours Worked (Optional)
              </label>
              <input
                type="number"
                step="0.25"
                min="0"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={activityData.hours}
                onChange={(e) => setActivityData({...activityData, hours: e.target.value})}
                placeholder="2.5"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Work Description *
            </label>
            <textarea
              required
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              value={activityData.description}
              onChange={(e) => setActivityData({...activityData, description: e.target.value})}
              placeholder="Describe what you worked on..."
            />
          </div>
          
          {employee.can_expense && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center mb-4">
                <input
                  type="checkbox"
                  id="hasExpense"
                  checked={activityData.hasExpense}
                  onChange={(e) => setActivityData({...activityData, hasExpense: e.target.checked})}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="hasExpense" className="ml-2 text-sm font-medium text-gray-700">
                  Add related expense
                </label>
              </div>
              
              {activityData.hasExpense && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Expense Amount ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={activityData.expenseAmount}
                      onChange={(e) => setActivityData({...activityData, expenseAmount: e.target.value})}
                      placeholder="25.00"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Expense Description
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={activityData.expenseDescription}
                      onChange={(e) => setActivityData({...activityData, expenseDescription: e.target.value})}
                      placeholder="Gas, materials, etc."
                    />
                  </div>
                </div>
              )}
            </div>
          )}
          
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Logging Activity...' : 'Log Activity'}
            </button>
          </div>
        </form>
      </div>
      
      {/* Recent Activities */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity Logs</h3>
        
        {recentActivities.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">📝</div>
            <p>No recent activities logged.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {recentActivities.map((activity, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium text-gray-900">{activity.title || 'Activity Log'}</h4>
                  <div className="flex items-center space-x-2">
                    {activity.actual_hours && (
                      <span className="text-sm text-gray-500">{activity.actual_hours}h</span>
                    )}
                    <button
                      onClick={() => convertToTask(activity)}
                      className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 transition-colors"
                      title="Convert to Task"
                    >
                      →📋
                    </button>
                  </div>
                </div>
                <p className="text-gray-600 text-sm mb-2">{activity.description}</p>
                <div className="text-xs text-gray-500">
                  {activity.completed_at ? new Date(activity.completed_at).toLocaleDateString() : 'Recent'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}