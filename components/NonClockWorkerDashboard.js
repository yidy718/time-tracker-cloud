import { useState, useEffect, useCallback } from 'react'
import { database } from '../lib/supabase'
import EmployeeTaskDashboard from './EmployeeTaskDashboard'
import ExpenseEntry from './ExpenseEntry'
import ActivityLogger from './ActivityLogger'

export default function NonClockWorkerDashboard({ session, employee, organization }) {
  const [activeTab, setActiveTab] = useState('overview')
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [expensesEnabled, setExpensesEnabled] = useState(false)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      
      // Check if expenses are enabled for this employee
      setExpensesEnabled(employee.can_expense || false)
      
      // Load employee tasks
      const tasksResult = await database.getEmployeeTasks(employee.id, employee.organization_id)
      setTasks(tasksResult.data || [])
      
    } catch (error) {
      console.error('Error loading non-clock worker data:', error)
    } finally {
      setLoading(false)
    }
  }, [employee.organization_id, employee.id, employee.can_expense])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleSignOut = async () => {
    localStorage.removeItem('employee_session')
    localStorage.removeItem('selected_company')
    window.location.href = '/'
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
      <div className="bg-white/10 backdrop-blur-xl border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-white">
                Task Dashboard
              </h1>
              <div className="ml-4 px-3 py-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-sm rounded-full font-medium">
                {organization?.name}
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-sm text-white/80">
                Welcome, {employee.first_name} {employee.last_name}
              </div>
              
              <div className="relative">
                <button
                  onClick={switchCompany}
                  className="px-3 py-2 text-sm bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors backdrop-blur-sm border border-white/20"
                  title="Switch Company"
                >
                  🏢 Switch
                </button>
              </div>
              
              <button
                onClick={handleSignOut}
                className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white text-sm rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-lg"
              >
                Sign Out
              </button>
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

      {/* Info Box for Non-Clock Workers */}
      <div className="fixed bottom-4 right-4">
        <div className="bg-blue-500/20 backdrop-blur-xl border border-blue-400/30 rounded-lg p-4 max-w-sm shadow-lg">
          <div className="flex items-start">
            <div className="text-blue-300 text-lg mr-2">ℹ️</div>
            <div>
              <h4 className="text-sm font-medium text-white">Task-Only Mode</h4>
              <p className="text-xs text-white/80 mt-1">
                You&apos;re in task-only mode. Focus on completing your assigned tasks without time tracking.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}