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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-400 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-white/80">Loading manager dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-blue-600/20"></div>
        <div className="relative bg-white/10 backdrop-blur-xl border-b border-white/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <h1 className="text-xl font-semibold text-white">
                  Manager Dashboard
                </h1>
                <div className="ml-4 px-3 py-1 bg-blue-500/20 text-blue-300 text-sm rounded-full border border-blue-500/30">
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
                    className="px-3 py-2 text-sm bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all duration-300 hover:scale-105 backdrop-blur-sm border border-white/20"
                    title="Switch Company"
                  >
                    🏢 Switch
                  </button>
                </div>
                
                <button
                  onClick={handleSignOut}
                  className="px-4 py-2 bg-gradient-to-r from-red-500 to-pink-600 text-white text-sm rounded-lg hover:from-red-600 hover:to-pink-700 transition-all duration-300 hover:scale-105 shadow-lg"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white/5 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('projects')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-all duration-300 ${
                activeTab === 'projects'
                  ? 'border-blue-400 text-blue-300 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-t-lg'
                  : 'border-transparent text-white/70 hover:text-white hover:border-white/30'
              }`}
            >
              📋 Projects & Tasks
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-all duration-300 ${
                activeTab === 'reports'
                  ? 'border-blue-400 text-blue-300 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-t-lg'
                  : 'border-transparent text-white/70 hover:text-white hover:border-white/30'
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
              <h2 className="text-2xl font-bold text-white">Projects & Task Management</h2>
              <p className="text-white/70 mt-1">
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
              <h2 className="text-2xl font-bold text-white">Reports</h2>
              <p className="text-white/70 mt-1">
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