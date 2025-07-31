import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import CompanySetupWizard from './CompanySetupWizard'
import { sendCredentialsNotification } from '../lib/notifications'

export default function SuperAdminDashboard({ session, employee }) {
  const [companies, setCompanies] = useState([])
  const [showSetupWizard, setShowSetupWizard] = useState(false)
  const [showAdminManager, setShowAdminManager] = useState(false)
  const [selectedCompany, setSelectedCompany] = useState(null)
  const [showEditCompany, setShowEditCompany] = useState(false)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalCompanies: 0,
    totalEmployees: 0,
    activeToday: 0
  })

  useEffect(() => {
    loadCompanies()
  }, [])

  const loadCompanies = async () => {
    try {
      // Get all organizations
      const { data: orgs, error: orgError } = await supabase
        .from('organizations')
        .select(`
          *,
          employees:employees(count),
          active_employees:employees!inner(count)
        `)
        .eq('employees.is_active', true)

      if (orgError) throw orgError

      // Get active sessions today
      const today = new Date().toISOString().split('T')[0]
      const { data: activeSessions, error: sessionError } = await supabase
        .from('time_sessions')
        .select('employee_id')
        .gte('clock_in', today)
        .is('clock_out', null)

      if (sessionError) throw sessionError

      setCompanies(orgs || [])
      setStats({
        totalCompanies: orgs?.length || 0,
        totalEmployees: orgs?.reduce((sum, org) => sum + (org.employees?.[0]?.count || 0), 0) || 0,
        activeToday: activeSessions?.length || 0
      })

    } catch (error) {
      console.error('Error loading companies:', error)
    }
    setLoading(false)
  }

  const deleteCompany = async (companyId, companyName) => {
    if (!confirm(`Are you sure you want to delete "${companyName}"? This will delete ALL data including employees, time records, and cannot be undone!`)) {
      return
    }

    try {
      // Delete the organization - cascade will handle related records
      const { error } = await supabase
        .from('organizations')
        .delete()
        .eq('id', companyId)

      if (error) throw error

      alert(`Company "${companyName}" has been deleted successfully.`)
      loadCompanies() // Refresh the list
    } catch (error) {
      console.error('Error deleting company:', error)
      alert(`Error deleting company: ${error.message}`)
    }
  }

  const viewCompanyDetails = async (company) => {
    try {
      // Get detailed company info
      const { data: employees, error: empError } = await supabase
        .from('employees')
        .select('*')
        .eq('organization_id', company.id)

      if (empError) throw empError

      const { data: locations, error: locError } = await supabase
        .from('locations')
        .select('*')
        .eq('organization_id', company.id)

      if (locError) throw locError

      setSelectedCompany({
        ...company,
        employees: employees || [],
        locations: locations || []
      })
    } catch (error) {
      console.error('Error loading company details:', error)
      alert(`Error loading company details: ${error.message}`)
    }
  }

  const editCompany = async (company) => {
    try {
      // Get detailed company info including manager details
      const { data: employees, error: empError } = await supabase
        .from('employees')
        .select('*')
        .eq('organization_id', company.id)

      if (empError) throw empError

      const { data: locations, error: locError } = await supabase
        .from('locations')
        .select('*')
        .eq('organization_id', company.id)

      if (locError) throw locError

      setSelectedCompany({
        ...company,
        employees: employees || [],
        locations: locations || []
      })
      setShowEditCompany(true)
    } catch (error) {
      console.error('Error loading company for editing:', error)
      alert(`Error loading company: ${error.message}`)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-6"></div>
          <p className="text-white/80 text-lg font-medium">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-blue-600/20"></div>
        <div className="relative px-4 sm:px-6 py-6 sm:py-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start space-y-4 sm:space-y-0">
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <span className="text-xl sm:text-2xl">👑</span>
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-2xl sm:text-4xl font-bold text-white mb-1 truncate">Super Admin</h1>
                  <p className="text-white/80 text-base sm:text-lg truncate">Multi-Company Management</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xs sm:text-sm">
                  {employee.first_name[0]}{employee.last_name[0]}
                </div>
                <span className="text-white/90 font-medium text-sm sm:text-base truncate">{employee.first_name} {employee.last_name}</span>
                <span className="px-2 py-1 bg-white/10 rounded-full text-xs text-white/80 font-medium">Super Admin</span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 w-full sm:w-auto">
              <button
                onClick={() => setShowAdminManager(true)}
                className="bg-gradient-to-r from-purple-500 to-pink-600 text-white px-4 sm:px-6 py-3 rounded-xl font-medium hover:from-purple-600 hover:to-pink-700 transition-all duration-300 hover:scale-105 shadow-lg text-sm sm:text-base"
              >
                <span className="sm:hidden">👑 Admins</span>
                <span className="hidden sm:inline">👑 Manage Admins</span>
              </button>
              <button
                onClick={() => setShowSetupWizard(true)}
                className="bg-gradient-to-r from-green-500 to-blue-600 text-white px-4 sm:px-6 py-3 rounded-xl font-medium hover:from-green-600 hover:to-blue-700 transition-all duration-300 hover:scale-105 shadow-lg text-sm sm:text-base"
              >
                <span className="sm:hidden">🏢 Add Company</span>
                <span className="hidden sm:inline">🏢 Add New Company</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="px-4 sm:px-6 pb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-8">
          <div className="group relative overflow-hidden bg-white/10 backdrop-blur-xl rounded-2xl p-4 sm:p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400/20 to-purple-500/20 rounded-full -translate-y-16 translate-x-16"></div>
            <div className="relative flex items-center">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-blue-400 to-purple-500 rounded-2xl flex items-center justify-center text-white text-xl sm:text-2xl mr-3 sm:mr-4 shadow-lg">
                🏢
              </div>
              <div>
                <p className="text-white/60 text-xs sm:text-sm font-medium uppercase tracking-wide">Total Companies</p>
                <p className="text-2xl sm:text-4xl font-bold text-white">{stats.totalCompanies}</p>
              </div>
            </div>
          </div>
          
          <div className="group relative overflow-hidden bg-white/10 backdrop-blur-xl rounded-2xl p-4 sm:p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-400/20 to-blue-500/20 rounded-full -translate-y-16 translate-x-16"></div>
            <div className="relative flex items-center">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-green-400 to-blue-500 rounded-2xl flex items-center justify-center text-white text-xl sm:text-2xl mr-3 sm:mr-4 shadow-lg">
                👥
              </div>
              <div>
                <p className="text-white/60 text-xs sm:text-sm font-medium uppercase tracking-wide">Total Employees</p>
                <p className="text-2xl sm:text-4xl font-bold text-white">{stats.totalEmployees}</p>
              </div>
            </div>
          </div>
          
          <div className="group relative overflow-hidden bg-white/10 backdrop-blur-xl rounded-2xl p-4 sm:p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-400/20 to-red-500/20 rounded-full -translate-y-16 translate-x-16"></div>
            <div className="relative flex items-center">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-orange-400 to-red-500 rounded-2xl flex items-center justify-center text-white text-xl sm:text-2xl mr-3 sm:mr-4 shadow-lg">
                ⏰
              </div>
              <div>
                <p className="text-white/60 text-xs sm:text-sm font-medium uppercase tracking-wide">Active Today</p>
                <p className="text-2xl sm:text-4xl font-bold text-white">{stats.activeToday}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Companies List */}
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-4 sm:p-8 border border-white/20">
          <div className="flex items-center space-x-3 mb-6 sm:mb-8">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-400 to-pink-500 rounded-2xl flex items-center justify-center text-white text-lg sm:text-xl shadow-lg">
              📊
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-white">Company Overview</h3>
          </div>
          
          {companies.length > 0 ? (
            <div className="space-y-4">
              {companies.map((company, index) => (
                <div 
                  key={company.id} 
                  className="group bg-white/10 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-[1.02]"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                    <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-2xl flex items-center justify-center text-white font-bold text-base sm:text-lg shadow-lg flex-shrink-0">
                        {company.name[0]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-lg sm:text-xl text-white truncate">{company.name}</p>
                        <p className="text-white/70 text-xs sm:text-sm">
                          Created {new Date(company.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                      <div className="text-left sm:text-right">
                        <p className="font-mono text-lg sm:text-2xl font-bold text-green-400">
                          {company.employees?.[0]?.count || 0} employees
                        </p>
                        <p className="text-white/60 text-xs sm:text-sm">
                          {company.active_employees?.[0]?.count || 0} active
                        </p>
                      </div>
                      <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                        <button
                          onClick={() => viewCompanyDetails(company)}
                          className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                          title="View Details"
                        >
                          👁️ View
                        </button>
                        <button
                          onClick={() => editCompany(company)}
                          className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                          title="Edit Company"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => deleteCompany(company.id, company.name)}
                          className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                          title="Delete Company"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="text-8xl mb-6 animate-pulse">🏢</div>
              <p className="text-white/80 text-xl font-medium mb-2">No companies set up yet</p>
              <p className="text-white/60">Click &quot;Add New Company&quot; to get started!</p>
            </div>
          )}
        </div>
      </div>

      {/* Setup Wizard Modal */}
      {showSetupWizard && (
        <CompanySetupWizard 
          onComplete={() => {
            setShowSetupWizard(false)
            loadCompanies()
          }}
        />
      )}

      {/* Company Details Modal */}
      {selectedCompany && !showEditCompany && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-bold text-white">Company Details</h2>
                <button
                  onClick={() => setSelectedCompany(null)}
                  className="text-white/60 hover:text-white text-2xl"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-6">
                {/* Company Info */}
                <div className="bg-white/10 rounded-xl p-6">
                  <h3 className="text-xl font-bold text-white mb-4">📊 Company Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-white/60 text-sm">Company Name</p>
                      <p className="text-white font-medium">{selectedCompany.name}</p>
                    </div>
                    <div>
                      <p className="text-white/60 text-sm">Created</p>
                      <p className="text-white font-medium">{new Date(selectedCompany.created_at).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-white/60 text-sm">Total Employees</p>
                      <p className="text-white font-medium">{selectedCompany.employees?.length || 0}</p>
                    </div>
                    <div>
                      <p className="text-white/60 text-sm">Total Locations</p>
                      <p className="text-white font-medium">{selectedCompany.locations?.length || 0}</p>
                    </div>
                  </div>
                </div>

                {/* Employees */}
                <div className="bg-white/10 rounded-xl p-6">
                  <h3 className="text-xl font-bold text-white mb-4">👥 Employees</h3>
                  {selectedCompany.employees?.length > 0 ? (
                    <div className="space-y-3">
                      {selectedCompany.employees.map((emp) => (
                        <div key={emp.id} className="bg-white/10 rounded-lg p-4 flex items-center justify-between">
                          <div>
                            <p className="text-white font-medium">{emp.first_name} {emp.last_name}</p>
                            <p className="text-white/60 text-sm">{emp.email}</p>
                          </div>
                          <div className="text-right">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              emp.role === 'admin' ? 'bg-red-500/20 text-red-400' :
                              emp.role === 'manager' ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-green-500/20 text-green-400'
                            }`}>
                              {emp.role}
                            </span>
                            <p className="text-white/60 text-xs mt-1">
                              {emp.is_active ? 'Active' : 'Inactive'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-white/60">No employees found</p>
                  )}
                </div>

                {/* Locations */}
                <div className="bg-white/10 rounded-xl p-6">
                  <h3 className="text-xl font-bold text-white mb-4">📍 Locations</h3>
                  {selectedCompany.locations?.length > 0 ? (
                    <div className="space-y-3">
                      {selectedCompany.locations.map((location) => (
                        <div key={location.id} className="bg-white/10 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-white font-medium">{location.name}</p>
                              {location.address && <p className="text-white/60 text-sm">{location.address}</p>}
                              {location.client_name && <p className="text-white/60 text-sm">Client: {location.client_name}</p>}
                            </div>
                            <div className="text-right">
                              {location.billing_rate && (
                                <p className="text-green-400 font-medium">${location.billing_rate}/hr</p>
                              )}
                              <p className="text-white/60 text-xs">
                                {location.is_active ? 'Active' : 'Inactive'}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-white/60">No locations found</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Company Modal */}
      {selectedCompany && showEditCompany && (
        <EditCompanyModal 
          company={selectedCompany}
          onClose={() => {
            setShowEditCompany(false)
            setSelectedCompany(null)
          }}
          onComplete={() => {
            setShowEditCompany(false)
            setSelectedCompany(null)
            loadCompanies()
          }}
        />
      )}

      {/* Admin Manager Modal */}
      {showAdminManager && (
        <AdminManagerModal 
          onClose={() => setShowAdminManager(false)}
          onComplete={() => {
            setShowAdminManager(false)
            loadCompanies()
          }}
        />
      )}
    </div>
  )
}

// Edit Company Modal Component
function EditCompanyModal({ company, onClose, onComplete }) {
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('general')
  const [companyName, setCompanyName] = useState(company.name)
  const [showAddManager, setShowAddManager] = useState(false)
  
  // Find the manager (admin or manager role in this company)
  const manager = company.employees?.find(emp => emp.role === 'admin' || emp.role === 'manager')

  const updateCompanyName = async () => {
    if (!companyName.trim()) {
      alert('Company name cannot be empty')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase
        .from('organizations')
        .update({ name: companyName })
        .eq('id', company.id)

      if (error) throw error
      
      alert('Company name updated successfully!')
      onComplete()
    } catch (error) {
      console.error('Error updating company name:', error)
      alert(`Error updating company name: ${error.message}`)
    }
    setLoading(false)
  }

  const resetManagerPassword = async () => {
    if (!manager) {
      alert('No manager found for this company')
      return
    }

    if (!confirm(`Send password reset email to ${manager.first_name} ${manager.last_name} (${manager.email})?`)) {
      return
    }

    setLoading(true)
    try {
      // Use Supabase's password reset email functionality
      const { error } = await supabase.auth.resetPasswordForEmail(manager.email, {
        redirectTo: `${window.location.origin}/reset-password`
      })

      if (error) throw error

      alert(`✅ Password reset email sent successfully!\n\nA password reset link has been sent to:\n${manager.email}\n\nThe manager can click the link in their email to set a new password.`)
      
    } catch (error) {
      console.error('Error sending reset email:', error)
      
      // If email reset fails, provide manual alternative
      if (error.message.includes('rate limit') || error.message.includes('too many requests')) {
        alert(`⚠️ Rate limit reached. Please wait a few minutes before trying again.\n\nAlternatively, you can manually update the manager's password in your Supabase dashboard:\n1. Go to Authentication > Users\n2. Find ${manager.email}\n3. Click "Reset Password" or "Send Magic Link"`)
      } else {
        alert(`❌ Error sending reset email: ${error.message}\n\nAlternative solution:\n1. Ask the manager to use "Forgot Password" on the login page\n2. Or manually reset in Supabase Dashboard > Authentication > Users`)
      }
    }
    setLoading(false)
  }

  const toggleCompanyStatus = async () => {
    const newStatus = !company.is_active
    const action = newStatus ? 'activate' : 'deactivate'
    
    if (!confirm(`Are you sure you want to ${action} "${company.name}"? This will affect all employees' access.`)) {
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase
        .from('organizations')
        .update({ is_active: newStatus })
        .eq('id', company.id)

      if (error) throw error
      
      alert(`Company ${action}d successfully!`)
      onComplete()
    } catch (error) {
      console.error(`Error ${action}ing company:`, error)
      alert(`Error ${action}ing company: ${error.message}`)
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-white/20">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-2xl flex items-center justify-center text-white text-xl shadow-lg">
              ✏️
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Edit Company</h2>
              <p className="text-gray-600">{company.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-600 hover:text-gray-800 transition-colors"
          >
            ×
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-8 bg-gray-100 rounded-xl p-1">
          {[
            { id: 'general', name: 'General', icon: '🏢' },
            { id: 'manager', name: 'Manager', icon: '👤' },
            { id: 'status', name: 'Status', icon: '⚡' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-300 flex-1 justify-center ${
                activeTab === tab.id
                  ? 'bg-white text-gray-800 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.name}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                <h3 className="text-lg font-bold text-blue-800 mb-4">Company Information</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-blue-700 font-medium mb-2">Company Name</label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-blue-200 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter company name"
                    />
                  </div>
                  <button
                    onClick={updateCompanyName}
                    disabled={loading || companyName === company.name}
                    className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-xl font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-300 hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Updating...' : 'Update Name'}
                  </button>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <h4 className="text-lg font-bold text-gray-800 mb-4">Company Statistics</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-600 text-sm">Created</p>
                    <p className="text-gray-800 font-medium">{new Date(company.created_at).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm">Total Employees</p>
                    <p className="text-gray-800 font-medium">{company.employees?.length || 0}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm">Total Locations</p>
                    <p className="text-gray-800 font-medium">{company.locations?.length || 0}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm">Status</p>
                    <p className={`font-medium ${company.is_active !== false ? 'text-green-600' : 'text-red-600'}`}>
                      {company.is_active !== false ? 'Active' : 'Inactive'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'manager' && (
            <div className="space-y-6">
              {manager ? (
                <div className="bg-green-50 rounded-xl p-6 border border-green-200">
                  <h3 className="text-lg font-bold text-green-800 mb-4">Manager Information</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-green-700 text-sm">Name</p>
                        <p className="text-gray-800 font-medium">{manager.first_name} {manager.last_name}</p>
                      </div>
                      <div>
                        <p className="text-green-700 text-sm">Email</p>
                        <p className="text-gray-800 font-medium">{manager.email}</p>
                      </div>
                      <div>
                        <p className="text-green-700 text-sm">Role</p>
                        <p className="text-gray-800 font-medium capitalize">{manager.role}</p>
                      </div>
                      <div>
                        <p className="text-green-700 text-sm">Status</p>
                        <p className={`font-medium ${manager.is_active ? 'text-green-600' : 'text-red-600'}`}>
                          {manager.is_active ? 'Active' : 'Inactive'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="pt-4 border-t border-green-200">
                      <div className="flex space-x-4">
                        <button
                          onClick={resetManagerPassword}
                          disabled={loading}
                          className="bg-gradient-to-r from-orange-500 to-red-600 text-white px-6 py-3 rounded-xl font-medium hover:from-orange-600 hover:to-red-700 transition-all duration-300 hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {loading ? 'Sending Email...' : '📧 Send Password Reset'}
                        </button>
                        <button
                          onClick={() => setShowAddManager(true)}
                          disabled={loading}
                          className="bg-gradient-to-r from-green-500 to-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:from-green-600 hover:to-blue-700 transition-all duration-300 hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          👥 Add Manager
                        </button>
                      </div>
                      <p className="text-green-600 text-sm mt-2">
                        This will send a password reset email to the manager
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-yellow-50 rounded-xl p-6 border border-yellow-200 text-center">
                  <div className="text-4xl mb-4">⚠️</div>
                  <p className="text-yellow-800 font-medium">No manager found for this company</p>
                  <p className="text-yellow-600 text-sm mt-2">You may need to assign a manager role to an employee</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'status' && (
            <div className="space-y-6">
              <div className="bg-purple-50 rounded-xl p-6 border border-purple-200">
                <h3 className="text-lg font-bold text-purple-800 mb-4">Company Status</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-purple-100">
                    <div>
                      <p className="font-medium text-gray-800">Company Status</p>
                      <p className="text-gray-600 text-sm">
                        {company.is_active !== false ? 'Company is currently active and operational' : 'Company is currently deactivated'}
                      </p>
                    </div>
                    <div className={`px-4 py-2 rounded-full text-sm font-medium ${
                      company.is_active !== false 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {company.is_active !== false ? 'Active' : 'Inactive'}
                    </div>
                  </div>
                  
                  <button
                    onClick={toggleCompanyStatus}
                    disabled={loading}
                    className={`w-full px-6 py-3 rounded-xl font-medium transition-all duration-300 hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                      company.is_active !== false
                        ? 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700'
                        : 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700'
                    }`}
                  >
                    {loading ? 'Processing...' : (company.is_active !== false ? '🚫 Deactivate Company' : '✅ Activate Company')}
                  </button>
                  
                  <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                    <p className="text-yellow-800 text-sm">
                      <strong>Note:</strong> {company.is_active !== false 
                        ? 'Deactivating will prevent all employees from accessing the system' 
                        : 'Activating will restore access for all employees'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-4 mt-8 pt-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* Add Manager Modal */}
      {showAddManager && (
        <AddManagerModal 
          companyId={company.id}
          companyName={company.name}
          onClose={() => setShowAddManager(false)}
          onComplete={() => {
            setShowAddManager(false)
            onComplete()
          }}
        />
      )}
    </div>
  )
}

// Add Manager Modal Component  
function AddManagerModal({ companyId, companyName, onClose, onComplete }) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.firstName || !formData.lastName || !formData.email) {
      alert('Please fill in all fields')
      return
    }

    setLoading(true)
    try {
      // Generate secure random password for new manager
      const tempPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12).toUpperCase() + '!@#'
      
      // Create Supabase auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: tempPassword
      })

      if (authError) throw authError

      // Create employee record as admin (company owner)
      const { error: employeeError } = await supabase
        .from('employees')
        .insert({
          id: authData.user.id,
          organization_id: companyId,
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          role: 'admin',
          is_active: true
        })

      if (employeeError) throw employeeError

      // Prepare credentials for notification
      const credentials = {
        email: formData.email,
        password: tempPassword,
        companyName: selectedCompany.name
      }

      // Try to send notification - but don't fail if it doesn't work
      try {
        const contact = { 
          email: formData.email,
          phone: formData.phone || null
        }
        
        const methods = ['email']
        if (formData.phone) methods.push('sms')
        
        const results = await sendCredentialsNotification(contact, credentials, 'admin', methods)
        const successfulResults = results.filter(r => r.success)
        
        if (successfulResults.length > 0) {
          const sentMethods = successfulResults.map(r => r.method).join(', ')
          alert(`✅ Company Admin created successfully!\n\n📧 Credentials sent via: ${sentMethods}\n\nAdmin Login:\nEmail: ${formData.email}\nPassword: ${tempPassword}\n\n✅ Login credentials delivered automatically!`)
        } else {
          // Notification failed but admin was created successfully
          alert(`✅ Company Admin created successfully!\n\nAdmin Login:\nEmail: ${formData.email}\nPassword: ${tempPassword}\n\n⚠️ Please share these credentials manually.\nIMPORTANT: Tell them to change password after first login.`)
        }
      } catch (notificationError) {
        // Notification failed but admin was created successfully
        console.warn('Notification failed (this is OK):', notificationError)
        alert(`✅ Company Admin created successfully!\n\nAdmin Login:\nEmail: ${formData.email}\nPassword: ${tempPassword}\n\n⚠️ Automated notification not available.\nIMPORTANT: Share these credentials manually and tell them to change password after first login.`)
      }

      onComplete()
    } catch (error) {
      console.error('Error adding company admin:', error)
      alert(`Error adding company admin: ${error.message}`)
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-gray-800">Add Manager</h3>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-600 hover:text-gray-800 transition-colors"
          >
            ×
          </button>
        </div>

        <div className="mb-6">
          <p className="text-gray-600">Adding manager to: <strong>{companyName}</strong></p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-700 font-medium mb-2">First Name *</label>
            <input
              type="text"
              required
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={formData.firstName}
              onChange={(e) => setFormData({...formData, firstName: e.target.value})}
              placeholder="John"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-2">Last Name *</label>
            <input
              type="text"
              required
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={formData.lastName}
              onChange={(e) => setFormData({...formData, lastName: e.target.value})}
              placeholder="Smith"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-2">Email *</label>
            <input
              type="email"
              required
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              placeholder="john@company.com"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-2">Phone Number (Optional)</label>
            <input
              type="tel"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
              placeholder="+1234567890"
            />
            <p className="text-sm text-gray-500 mt-1">📱 SMS credentials if provided</p>
          </div>

          <div className="flex space-x-4 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-green-500 to-blue-600 text-white py-3 px-6 rounded-xl font-medium hover:from-green-600 hover:to-blue-700 transition-all duration-300 hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Adding Manager...' : '👥 Add Manager'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Admin Manager Modal Component
function AdminManagerModal({ onClose, onComplete }) {
  const [superAdmins, setSuperAdmins] = useState([])
  const [loading, setLoading] = useState(true)
  const [newAdminEmail, setNewAdminEmail] = useState('')
  const [newAdminName, setNewAdminName] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    loadSuperAdmins()
  }, [])

  const loadSuperAdmins = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select(`
          *,
          organization:organizations(name)
        `)
        .eq('role', 'admin')
        .ilike('organization.name', '%super admin%')

      if (error) throw error
      setSuperAdmins(data || [])
    } catch (error) {
      console.error('Error loading super admins:', error)
    }
    setLoading(false)
  }

  const createSuperAdmin = async (e) => {
    e.preventDefault()
    if (!newAdminEmail || !newAdminName) return

    setIsCreating(true)
    try {
      // Get the super admin organization
      const { data: superAdminOrg, error: orgError } = await supabase
        .from('organizations')
        .select('id')
        .ilike('name', '%super admin%')
        .single()

      if (orgError) throw orgError

      // Create auth user using regular signup (they'll get a confirmation email)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newAdminEmail,
        password: 'TempPassword123!', // They'll need to reset this
        options: {
          data: {
            full_name: newAdminName
          }
        }
      })

      if (authError) throw authError

      if (!authData.user) {
        throw new Error('User creation failed')
      }

      // Create employee record
      const [firstName, ...lastNameParts] = newAdminName.split(' ')
      const lastName = lastNameParts.join(' ')

      const { error: empError } = await supabase
        .from('employees')
        .insert({
          id: authData.user.id,
          organization_id: superAdminOrg.id,
          first_name: firstName,
          last_name: lastName || '',
          email: newAdminEmail,
          role: 'admin'
        })

      if (empError) throw empError

      alert(`Super admin created successfully! They will receive a confirmation email at ${newAdminEmail} and should reset their password on first login.`)
      setNewAdminEmail('')
      setNewAdminName('')
      loadSuperAdmins()
      onComplete()
    } catch (error) {
      console.error('Error creating super admin:', error)
      alert(`Error creating super admin: ${error.message}`)
    }
    setIsCreating(false)
  }

  const removeSuperAdmin = async (adminId, adminName) => {
    if (!confirm(`Remove ${adminName} as super admin? This will delete their account completely.`)) {
      return
    }

    try {
      // Delete the employee record (will cascade to auth user)
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', adminId)

      if (error) throw error

      alert('Super admin removed successfully!')
      loadSuperAdmins()
    } catch (error) {
      console.error('Error removing super admin:', error)
      alert(`Error removing super admin: ${error.message}`)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold text-white">👑 Super Admin Management</h2>
            <button
              onClick={onClose}
              className="text-white/60 hover:text-white text-2xl"
            >
              ✕
            </button>
          </div>

          {/* Add New Super Admin */}
          <div className="bg-white/10 rounded-xl p-6 mb-6">
            <h3 className="text-xl font-bold text-white mb-4">Add New Super Admin</h3>
            <form onSubmit={createSuperAdmin} className="space-y-4">
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">Full Name</label>
                <input
                  type="text"
                  value={newAdminName}
                  onChange={(e) => setNewAdminName(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Enter full name"
                  required
                />
              </div>
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">Email Address</label>
                <input
                  type="email"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Enter email address"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isCreating}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-600 text-white py-3 px-6 rounded-lg font-medium hover:from-purple-600 hover:to-pink-700 transition-all duration-300 disabled:opacity-50"
              >
                {isCreating ? 'Creating...' : '➕ Add Super Admin'}
              </button>
            </form>
          </div>

          {/* Current Super Admins */}
          <div className="bg-white/10 rounded-xl p-6">
            <h3 className="text-xl font-bold text-white mb-4">Current Super Admins</h3>
            {loading ? (
              <p className="text-white/60">Loading...</p>
            ) : superAdmins.length > 0 ? (
              <div className="space-y-3">
                {superAdmins.map((admin) => (
                  <div key={admin.id} className="bg-white/10 rounded-lg p-4 flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">{admin.first_name} {admin.last_name}</p>
                      <p className="text-white/60 text-sm">{admin.email}</p>
                    </div>
                    <button
                      onClick={() => removeSuperAdmin(admin.id, `${admin.first_name} ${admin.last_name}`)}
                      className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      🗑️ Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-white/60">No super admins found</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}