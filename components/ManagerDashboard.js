import { useState, useEffect, useCallback } from 'react'
import { database, auth } from '../lib/supabase'
import TaskManagement from './TaskManagement'
import ReportsTab from './ReportsTab'

export default function ManagerDashboard({ session, employee, organization }) {
  const [activeTab, setActiveTab] = useState('projects')
  const [projects, setProjects] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [showMenu, setShowMenu] = useState(false)
  const [showPasswordChange, setShowPasswordChange] = useState(false)

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
                
                <div className="relative flex justify-end">
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
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowMenu(false)}
                    />
                    <div className="absolute top-12 right-0 w-64 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 z-50 transform transition-all duration-300 scale-100 opacity-100">
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
        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white text-xl shadow-lg">
                👥
              </div>
              <div className="ml-4">
                <p className="text-white/60 text-sm">Team Members</p>
                <p className="text-2xl font-bold text-white">{employees.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center text-white text-xl shadow-lg">
                🎯
              </div>
              <div className="ml-4">
                <p className="text-white/60 text-sm">Active Projects</p>
                <p className="text-2xl font-bold text-white">{projects.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center text-white text-xl shadow-lg">
                📊
              </div>
              <div className="ml-4">
                <p className="text-white/60 text-sm">This Month</p>
                <p className="text-2xl font-bold text-white">Overview</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center text-white text-xl shadow-lg">
                ⚡
              </div>
              <div className="ml-4">
                <p className="text-white/60 text-sm">Status</p>
                <p className="text-lg font-bold text-green-400">Active</p>
              </div>
            </div>
          </div>
        </div>

        {activeTab === 'projects' && (
          <div>
            <div className="flex items-center mb-8">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center text-white text-xl shadow-lg mr-4">
                📋
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Projects & Task Management</h2>
                <p className="text-white/70">
                  Manage your team's projects, assign tasks, and track progress
                </p>
              </div>
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
            <div className="flex items-center mb-8">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-teal-600 rounded-2xl flex items-center justify-center text-white text-xl shadow-lg mr-4">
                📊
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Team Reports & Analytics</h2>
                <p className="text-white/70">
                  Track team performance, time usage, and project progress
                </p>
              </div>
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