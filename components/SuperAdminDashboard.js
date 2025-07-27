import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import CompanySetupWizard from './CompanySetupWizard'

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
        <div className="relative px-6 py-8">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <span className="text-2xl">👑</span>
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-white mb-1">Super Admin</h1>
                  <p className="text-white/80 text-lg">Multi-Company Management</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  {employee.first_name[0]}{employee.last_name[0]}
                </div>
                <span className="text-white/90 font-medium">{employee.first_name} {employee.last_name}</span>
                <span className="px-2 py-1 bg-white/10 rounded-full text-xs text-white/80 font-medium">Super Admin</span>
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowAdminManager(true)}
                className="bg-gradient-to-r from-purple-500 to-pink-600 text-white px-6 py-3 rounded-xl font-medium hover:from-purple-600 hover:to-pink-700 transition-all duration-300 hover:scale-105 shadow-lg"
              >
                👑 Manage Admins
              </button>
              <button
                onClick={() => setShowSetupWizard(true)}
                className="bg-gradient-to-r from-green-500 to-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:from-green-600 hover:to-blue-700 transition-all duration-300 hover:scale-105 shadow-lg"
              >
                🏢 Add New Company
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="px-6 pb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="group relative overflow-hidden bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400/20 to-purple-500/20 rounded-full -translate-y-16 translate-x-16"></div>
            <div className="relative flex items-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-500 rounded-2xl flex items-center justify-center text-white text-2xl mr-4 shadow-lg">
                🏢
              </div>
              <div>
                <p className="text-white/60 text-sm font-medium uppercase tracking-wide">Total Companies</p>
                <p className="text-4xl font-bold text-white">{stats.totalCompanies}</p>
              </div>
            </div>
          </div>
          
          <div className="group relative overflow-hidden bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-400/20 to-blue-500/20 rounded-full -translate-y-16 translate-x-16"></div>
            <div className="relative flex items-center">
              <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-blue-500 rounded-2xl flex items-center justify-center text-white text-2xl mr-4 shadow-lg">
                👥
              </div>
              <div>
                <p className="text-white/60 text-sm font-medium uppercase tracking-wide">Total Employees</p>
                <p className="text-4xl font-bold text-white">{stats.totalEmployees}</p>
              </div>
            </div>
          </div>
          
          <div className="group relative overflow-hidden bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-400/20 to-red-500/20 rounded-full -translate-y-16 translate-x-16"></div>
            <div className="relative flex items-center">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-red-500 rounded-2xl flex items-center justify-center text-white text-2xl mr-4 shadow-lg">
                ⏰
              </div>
              <div>
                <p className="text-white/60 text-sm font-medium uppercase tracking-wide">Active Today</p>
                <p className="text-4xl font-bold text-white">{stats.activeToday}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Companies List */}
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20">
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-500 rounded-2xl flex items-center justify-center text-white text-xl shadow-lg">
              📊
            </div>
            <h3 className="text-2xl font-bold text-white">Company Overview</h3>
          </div>
          
          {companies.length > 0 ? (
            <div className="space-y-4">
              {companies.map((company, index) => (
                <div 
                  key={company.id} 
                  className="group bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-[1.02]"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
                        {company.name[0]}
                      </div>
                      <div>
                        <p className="font-bold text-xl text-white">{company.name}</p>
                        <p className="text-white/70 text-sm">
                          Created {new Date(company.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right mr-4">
                        <p className="font-mono text-2xl font-bold text-green-400">
                          {company.employees?.[0]?.count || 0} employees
                        </p>
                        <p className="text-white/60 text-sm">
                          {company.active_employees?.[0]?.count || 0} active
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => viewCompanyDetails(company)}
                          className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                          title="View Details"
                        >
                          👁️ View
                        </button>
                        <button
                          onClick={() => {
                            setSelectedCompany(company)
                            setShowEditCompany(true)
                          }}
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
              <p className="text-white/60">Click "Add New Company" to get started!</p>
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