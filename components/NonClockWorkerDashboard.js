import { useState, useEffect, useCallback } from 'react'
import { database, auth } from '../lib/supabase'
import EmployeeTaskDashboard from './EmployeeTaskDashboard'
import ExpenseEntry from './ExpenseEntry'
import ActivityLogger from './ActivityLogger'

export default function NonClockWorkerDashboard({ session, employee, organization }) {
  const [activeTab, setActiveTab] = useState('overview')
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [expensesEnabled, setExpensesEnabled] = useState(false)
  const [hasMultipleCompanies, setHasMultipleCompanies] = useState(false)
  const [showTaskCompleteModal, setShowTaskCompleteModal] = useState(false)
  const [completedTask, setCompletedTask] = useState(null)
  const [showExpenseEntry, setShowExpenseEntry] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [showPasswordChange, setShowPasswordChange] = useState(false)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      
      // Check if expenses are enabled for this employee
      setExpensesEnabled(employee.can_expense || false)
      
      // Check if employee belongs to multiple companies
      try {
        const companiesResult = await database.getEmployeeCompanies(employee.employee_id || employee.id)
        setHasMultipleCompanies((companiesResult.data?.length || 0) > 1)
      } catch (error) {
        console.log('Could not check multiple companies, defaulting to single company')
        setHasMultipleCompanies(false)
      }
      
      // Load employee tasks
      const tasksResult = await database.getEmployeeTasks(employee.id, employee.organization_id)
      setTasks(tasksResult.data || [])
      
    } catch (error) {
      console.error('Error loading non-clock worker data:', error)
    } finally {
      setLoading(false)
    }
  }, [employee.organization_id, employee.id, employee.employee_id, employee.can_expense])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleSignOut = async () => {
    localStorage.removeItem('employee_session')
    localStorage.removeItem('selected_company')
    window.location.href = '/'
  }

  const handleTaskComplete = (task) => {
    setCompletedTask(task)
    setShowTaskCompleteModal(true)
  }

  const handleTaskCompleteConfirm = () => {
    setShowTaskCompleteModal(false)
    
    // If expenses are enabled, offer to add expense
    if (expensesEnabled) {
      setShowExpenseEntry(true)
    } else {
      // Show success animation
      showTaskCompletionSuccess()
    }
  }

  const showTaskCompletionSuccess = () => {
    // Create a success toast/animation
    const successToast = document.createElement('div')
    successToast.className = 'fixed top-4 right-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 transform translate-x-full transition-transform duration-300'
    successToast.innerHTML = `
      <div class="flex items-center space-x-2">
        <span class="text-lg">🎉</span>
        <span class="font-medium">Task "${completedTask?.title || 'Unknown'}" completed!</span>
      </div>
    `
    document.body.appendChild(successToast)
    
    // Animate in
    setTimeout(() => {
      successToast.style.transform = 'translateX(0)'
    }, 100)
    
    // Animate out and remove
    setTimeout(() => {
      successToast.style.transform = 'translateX(100%)'
      setTimeout(() => document.body.removeChild(successToast), 300)
    }, 3000)
  }

  const handleExpenseComplete = () => {
    setShowExpenseEntry(false)
    showTaskCompletionSuccess()
  }

  const switchCompany = () => {
    localStorage.removeItem('selected_company')
    window.location.reload()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-xl border-b border-white/20 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <div className="flex items-center min-w-0 flex-1">
              <h1 className="text-lg sm:text-xl font-semibold text-white truncate">
                Task Dashboard
              </h1>
              <div className="hidden sm:block ml-3 px-3 py-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs sm:text-sm rounded-full font-medium">
                {organization?.name}
              </div>
            </div>
            
            <div className="flex items-center space-x-2 sm:space-x-4">
              <div className="hidden md:block text-xs sm:text-sm text-white/80 truncate max-w-32 sm:max-w-none">
                Welcome, {employee.first_name}
              </div>
              
              <div className="flex justify-end">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="group relative w-10 h-10 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center transition-all duration-300 hover:bg-white/20 hover:scale-105"
                >
                  <span className="text-lg transition-transform group-hover:rotate-90 duration-300">⚙️</span>
                </button>
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
                          setShowPasswordChange(true)
                          setShowMenu(false)
                        }}
                        className="w-full flex items-center space-x-3 p-3 rounded-xl hover:bg-gray-50 transition-colors text-left"
                      >
                        <span className="text-lg">🔑</span>
                        <span className="font-medium text-gray-700">Change Password</span>
                      </button>
                      {hasMultipleCompanies && (
                        <button
                          onClick={() => {
                            switchCompany()
                            setShowMenu(false)
                          }}
                          className="w-full flex items-center space-x-3 p-3 rounded-xl hover:bg-gray-50 transition-colors text-left"
                        >
                          <span className="text-lg">🏢</span>
                          <span className="font-medium text-gray-700">Switch Company</span>
                        </button>
                      )}
                      <button
                        onClick={async () => {
                          if (confirm('Are you sure you want to sign out?')) {
                            await handleSignOut()
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
          
          {/* Mobile Company Name */}
          <div className="sm:hidden pb-2 -mt-1">
            <div className="px-2 py-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs rounded-full font-medium inline-block">
              {organization?.name}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white/5 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-6 py-4 font-medium text-sm transition-all duration-200 rounded-t-lg ${
                activeTab === 'overview'
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              🏠 Overview
            </button>
            <button
              onClick={() => setActiveTab('tasks')}
              className={`px-6 py-4 font-medium text-sm transition-all duration-200 rounded-t-lg ${
                activeTab === 'tasks'
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              ✅ My Tasks
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={`px-6 py-4 font-medium text-sm transition-all duration-200 rounded-t-lg ${
                activeTab === 'activity'
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              📝 Log Activity
            </button>
            {expensesEnabled && (
              <button
                onClick={() => setActiveTab('expenses')}
                className={`px-6 py-4 font-medium text-sm transition-all duration-200 rounded-t-lg ${
                  activeTab === 'expenses'
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                💰 Expenses
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <div>
            <div className="mb-6 text-center">
              <div className="text-4xl mb-3">👋</div>
              <h2 className="text-2xl font-bold text-white">Welcome Back, {employee.first_name}!</h2>
              <p className="text-white/70 mt-1">
                Manage your tasks and activities. No time tracking required.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white/10 backdrop-blur-xl rounded-xl p-6 shadow-lg border border-white/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white/70">Assigned Tasks</p>
                    <p className="text-2xl font-bold text-white">{tasks.length}</p>
                  </div>
                  <div className="text-blue-400 text-2xl">✅</div>
                </div>
              </div>
              
              <div className="bg-white/10 backdrop-blur-xl rounded-xl p-6 shadow-lg border border-white/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white/70">This Week</p>
                    <p className="text-2xl font-bold text-white">Ready</p>
                  </div>
                  <div className="text-green-400 text-2xl">📅</div>
                </div>
              </div>
              
              {employee.can_expense && (
                <div className="bg-white/10 backdrop-blur-xl rounded-xl p-6 shadow-lg border border-white/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-white/70">Expenses</p>
                      <p className="text-2xl font-bold text-white">Enabled</p>
                    </div>
                    <div className="text-orange-400 text-2xl">💳</div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-xl rounded-xl p-6 border border-white/30 shadow-lg">
              <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <button
                  onClick={() => setActiveTab('tasks')}
                  className="bg-white/10 hover:bg-white/20 backdrop-blur-sm p-4 rounded-lg border border-white/20 text-left transition-all duration-200 hover:scale-105 hover:shadow-lg"
                >
                  <div className="text-xl mb-2">✅</div>
                  <h4 className="font-medium text-white">View My Tasks</h4>
                  <p className="text-sm text-white/70">See assigned tasks and pick up new ones</p>
                </button>
                
                <button
                  onClick={() => setActiveTab('activity')}
                  className="bg-white/10 hover:bg-white/20 backdrop-blur-sm p-4 rounded-lg border border-white/20 text-left transition-all duration-200 hover:scale-105 hover:shadow-lg"
                >
                  <div className="text-xl mb-2">📝</div>
                  <h4 className="font-medium text-white">Log Activity</h4>
                  <p className="text-sm text-white/70">Record work that&apos;s not task-based</p>
                </button>
                
                {employee.can_expense && (
                  <button
                    onClick={() => setActiveTab('expenses')}
                    className="bg-white/10 hover:bg-white/20 backdrop-blur-sm p-4 rounded-lg border border-white/20 text-left transition-all duration-200 hover:scale-105 hover:shadow-lg"
                  >
                    <div className="text-xl mb-2">💰</div>
                    <h4 className="font-medium text-white">Submit Expenses</h4>
                    <p className="text-sm text-white/70">Record business expenses</p>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'tasks' && (
          <div>
            <div className="mb-6 text-center">
              <div className="text-4xl mb-3">📝</div>
              <h2 className="text-2xl font-bold text-white">Your Tasks</h2>
              <p className="text-white/70 mt-1">
                Manage and complete your assigned tasks. No time tracking required.
              </p>
            </div>
            
            <EmployeeTaskDashboard
              employee={employee}
              isNonClockWorker={true}
              onClose={() => setActiveTab('overview')}
              onTaskComplete={handleTaskComplete}
            />
          </div>
        )}

        {activeTab === 'activity' && (
          <div>
            <div className="mb-6 text-center">
              <div className="text-4xl mb-3">📝</div>
              <h2 className="text-2xl font-bold text-white">Log Work Activity</h2>
              <p className="text-white/70 mt-1">
                Record work that doesn&apos;t fit into specific tasks.
              </p>
            </div>
            
            <ActivityLogger
              employee={employee}
              organizationId={employee.organization_id}
              onActivityAdded={loadData}
            />
          </div>
        )}
        
        {activeTab === 'expenses' && employee.can_expense && (
          <div>
            <div className="mb-6 text-center">
              <div className="text-4xl mb-3">💰</div>
              <h2 className="text-2xl font-bold text-white">Expense Entry</h2>
              <p className="text-white/70 mt-1">
                Record your business expenses for reimbursement.
              </p>
            </div>
            
            <ExpenseEntry
              employee={employee}
              organizationId={employee.organization_id}
              onExpenseAdded={loadData}
            />
          </div>
        )}
      </div>

      {/* Task Completion Modal */}
      {showTaskCompleteModal && completedTask && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-8 max-w-md w-full shadow-2xl border border-white/20 transform transition-all duration-300 scale-100 opacity-100">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-white text-2xl mx-auto mb-4 shadow-lg">
                🎉
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">Task Completed!</h3>
              <p className="text-gray-600 mb-6">
                Great job completing <strong>&ldquo;{completedTask.title}&rdquo;</strong>!
              </p>
              
              {expensesEnabled && (
                <div className="bg-gradient-to-r from-blue-50 to-green-50 p-4 rounded-xl border border-blue-200 mb-6">
                  <p className="text-sm text-gray-700 mb-3">
                    💡 Did this task involve any business expenses?
                  </p>
                  <p className="text-xs text-gray-500">
                    You can add expenses related to this task completion.
                  </p>
                </div>
              )}
              
              <div className="flex space-x-3">
                {expensesEnabled && (
                  <button
                    onClick={() => {
                      setShowTaskCompleteModal(false)
                      setShowExpenseEntry(true)
                    }}
                    className="flex-1 bg-gradient-to-r from-blue-500 to-green-600 text-white py-3 rounded-xl font-medium hover:from-blue-600 hover:to-green-700 transition-all duration-300 hover:scale-105 shadow-lg"
                  >
                    💰 Add Expense
                  </button>
                )}
                <button
                  onClick={handleTaskCompleteConfirm}
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 rounded-xl font-medium hover:from-green-600 hover:to-emerald-700 transition-all duration-300 hover:scale-105 shadow-lg"
                >
                  ✅ Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Expense Entry Modal */}
      {showExpenseEntry && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-8 max-w-lg w-full shadow-2xl border border-white/20 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center text-white text-xl shadow-lg">
                  💰
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">Add Task Expense</h3>
                  <p className="text-sm text-gray-600">Related to: {completedTask?.title}</p>
                </div>
              </div>
              <button
                onClick={() => setShowExpenseEntry(false)}
                className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-600 hover:text-gray-800 transition-colors"
              >
                ×
              </button>
            </div>

            <ExpenseEntry
              employee={employee}
              organizationId={employee.organization_id}
              relatedTaskId={completedTask?.id}
              onExpenseAdded={handleExpenseComplete}
              isModal={true}
            />
          </div>
        </div>
      )}

      {/* Password Change Modal */}
      {showPasswordChange && (
        <PasswordChangeModal 
          onClose={() => setShowPasswordChange(false)}
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
      const response = await auth.updatePassword({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword
      })

      if (response.error) {
        throw new Error(response.error.message)
      }

      setSuccess(true)
      setTimeout(() => {
        onClose()
      }, 2000)
    } catch (error) {
      setError(error.message || 'Failed to change password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-8 max-w-md w-full shadow-2xl border border-white/20">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold text-gray-800">Change Password</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-600 hover:text-gray-800 transition-colors"
          >
            ×
          </button>
        </div>

        {success ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center text-white text-2xl mx-auto mb-4">
              ✓
            </div>
            <h4 className="text-xl font-semibold text-gray-800 mb-2">Password Changed!</h4>
            <p className="text-gray-600">Your password has been updated successfully.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current Password
              </label>
              <input
                type="password"
                value={formData.currentPassword}
                onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New Password
              </label>
              <input
                type="password"
                value={formData.newPassword}
                onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
                minLength={6}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
                minLength={6}
              />
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-2 rounded-lg hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {loading ? 'Changing...' : 'Change Password'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}