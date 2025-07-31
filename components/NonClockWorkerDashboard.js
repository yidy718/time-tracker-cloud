import { useState, useEffect } from 'react'
import { database } from '../lib/supabase'
import EmployeeTaskDashboard from './EmployeeTaskDashboard'
import ExpenseEntry from './ExpenseEntry'

export default function NonClockWorkerDashboard({ session, employee, organization }) {
  const [activeTab, setActiveTab] = useState('tasks')
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [expensesEnabled, setExpensesEnabled] = useState(false)

  useEffect(() => {
    loadData()
  }, [employee.organization_id])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Check if expenses are enabled for this organization
      const { data: orgData } = await database.getOrganization(employee.organization_id)
      setExpensesEnabled(orgData?.enable_expenses || false)
      
      // Load employee tasks
      const tasksResult = await database.getEmployeeTasks(employee.id, employee.organization_id)
      setTasks(tasksResult.data || [])
      
    } catch (error) {
      console.error('Error loading non-clock worker data:', error)
    } finally {
      setLoading(false)
    }
  }

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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                Task Dashboard
              </h1>
              <div className="ml-4 px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                {organization?.name}
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                Welcome, {employee.first_name} {employee.last_name}
              </div>
              
              <div className="relative">
                <button
                  onClick={switchCompany}
                  className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  title="Switch Company"
                >
                  🏢 Switch
                </button>
              </div>
              
              <button
                onClick={handleSignOut}
                className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('tasks')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'tasks'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              ✅ My Tasks
            </button>
            {expensesEnabled && (
              <button
                onClick={() => setActiveTab('expenses')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'expenses'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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
        {activeTab === 'tasks' && (
          <div>
            <div className="mb-6 text-center">
              <div className="text-4xl mb-3">📝</div>
              <h2 className="text-2xl font-bold text-gray-900">Your Tasks</h2>
              <p className="text-gray-600 mt-1">
                Manage and complete your assigned tasks. No time tracking required.
              </p>
            </div>
            
            <EmployeeTaskDashboard
              employee={employee}
              isNonClockWorker={true}
            />
          </div>
        )}

        {activeTab === 'expenses' && expensesEnabled && (
          <div>
            <div className="mb-6 text-center">
              <div className="text-4xl mb-3">💰</div>
              <h2 className="text-2xl font-bold text-gray-900">Expense Entry</h2>
              <p className="text-gray-600 mt-1">
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
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-sm">
          <div className="flex items-start">
            <div className="text-blue-400 text-lg mr-2">ℹ️</div>
            <div>
              <h4 className="text-sm font-medium text-blue-900">Task-Only Mode</h4>
              <p className="text-xs text-blue-700 mt-1">
                You're in task-only mode. Focus on completing your assigned tasks without time tracking.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}