import { useState, useEffect, useCallback } from 'react'
import { database } from '../lib/supabase'
import TaskManagement from './TaskManagement'
import ReportsTab from './ReportsTab'

export default function ManagerDashboard({ session, employee, organization }) {
  const [activeTab, setActiveTab] = useState('projects')
  const [projects, setProjects] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      
      // Load projects (managers can view/edit these)
      const projectsResult = await database.getClientProjects(employee.organization_id)
      setProjects(projectsResult.data || [])
      
      // Load employees for reports (limited view)
      const employeesResult = await database.getEmployees(employee.organization_id)
      setEmployees(employeesResult.data || [])
      
    } catch (error) {
      console.error('Error loading manager data:', error)
    } finally {
      setLoading(false)
    }
  }, [employee.organization_id])

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
          <p className="text-gray-600">Loading manager dashboard...</p>
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
                Manager Dashboard
              </h1>
              <div className="ml-4 px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
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
              onClick={() => setActiveTab('projects')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'projects'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              📋 Projects & Tasks
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'reports'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              📊 Reports
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'projects' && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Projects & Task Management</h2>
              <p className="text-gray-600 mt-1">
                View and manage client projects and tasks for your organization.
              </p>
            </div>
            <TaskManagement
              employee={employee}
              organizationId={employee.organization_id}
              currentUser={employee}
              isManagerView={true}
            />
          </div>
        )}

        {activeTab === 'reports' && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Reports</h2>
              <p className="text-gray-600 mt-1">
                View time tracking and task completion reports.
              </p>
            </div>
            <ReportsTab
              employees={employees}
              organizationId={employee.organization_id}
              organization={organization}
              isManagerView={true}
            />
          </div>
        )}
      </div>
    </div>
  )
}