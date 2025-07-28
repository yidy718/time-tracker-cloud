import { useState, useEffect } from 'react'
import { database, auth } from '../lib/supabase'
import ReportsTab from './ReportsTab'

export default function AdminDashboard({ session, employee }) {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [employees, setEmployees] = useState([])
  const [locations, setLocations] = useState([])
  const [activeSessions, setActiveSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showPasswordChange, setShowPasswordChange] = useState(false)
  const [showMenu, setShowMenu] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [employeesData, locationsData, activeSessionsData] = await Promise.all([
        database.getEmployees(employee.organization_id),
        database.getLocations(employee.organization_id),
        database.getActiveSessions(employee.organization_id)
      ])

      setEmployees(employeesData.data || [])
      setLocations(locationsData.data || [])
      setActiveSessions(activeSessionsData.data || [])
    } catch (error) {
      console.error('Error loading admin data:', error)
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-6"></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-purple-400 rounded-full animate-spin mx-auto" style={{ animationDelay: '0.5s' }}></div>
          </div>
          <p className="text-white/80 text-lg font-medium">Loading your dashboard...</p>
          <p className="text-white/60 text-sm mt-2">Preparing everything for you</p>
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
                  <span className="text-2xl">⚙️</span>
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-white mb-1">Admin Dashboard</h1>
                  <p className="text-white/80 text-lg">{employee.organization?.name}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  {employee.first_name[0]}{employee.last_name[0]}
                </div>
                <span className="text-white/90 font-medium">{employee.first_name} {employee.last_name}</span>
                <span className="px-2 py-1 bg-white/10 rounded-full text-xs text-white/80 font-medium">Admin</span>
              </div>
            </div>
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="group relative w-12 h-12 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center transition-all duration-300 hover:bg-white/20 hover:scale-105"
              >
                <span className="text-xl transition-transform group-hover:rotate-90 duration-300">⚙️</span>
              </button>
              
              {showMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-[9999]" 
                    onClick={() => setShowMenu(false)}
                  />
                  <div className="absolute right-0 top-16 w-64 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 z-[10000] transform transition-all duration-300 scale-100 opacity-100">
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
                        onClick={() => auth.signOut()}
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

      {/* Navigation */}
      <div className="px-6 pb-6">
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-2 border border-white/20">
          <div className="flex space-x-2 overflow-x-auto">
            {[
              { id: 'dashboard', name: 'Dashboard', emoji: '📊', color: 'from-blue-500 to-purple-600' },
              { id: 'reports', name: 'Reports', emoji: '📈', color: 'from-purple-500 to-pink-600' },
              { id: 'employees', name: 'Employees', emoji: '👥', color: 'from-orange-500 to-red-600' },
              { id: 'locations', name: 'Locations', emoji: '📍', color: 'from-green-500 to-blue-600' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-medium transition-all duration-300 whitespace-nowrap ${
                  activeTab === tab.id
                    ? `bg-gradient-to-r ${tab.color} text-white shadow-lg transform scale-105`
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                <span className="text-lg">{tab.emoji}</span>
                <span>{tab.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-6 pb-8">
        {activeTab === 'dashboard' && (
          <DashboardTab 
            activeSessions={activeSessions}
            employees={employees}
            locations={locations}
          />
        )}
        
        {activeTab === 'reports' && (
          <ReportsTab 
            employees={employees}
            organizationId={employee.organization_id}
          />
        )}
        
        {activeTab === 'employees' && (
          <EmployeesTab 
            employees={employees}
            onEmployeesChange={loadData}
            organizationId={employee.organization_id}
          />
        )}
        
        {activeTab === 'locations' && (
          <LocationsTab 
            locations={locations}
            onLocationsChange={loadData}
            organizationId={employee.organization_id}
          />
        )}
      </div>

      {/* Footer */}
      <div className="text-center text-white/60 text-sm pb-6">
        Made with ❤️ by yidy
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

function DashboardTab({ activeSessions, employees, locations }) {
  const formatDuration = (startTime) => {
    const start = new Date(startTime)
    const now = new Date()
    const diff = now - start
    
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    
    return `${hours}h ${minutes}m`
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="group relative overflow-hidden bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-400/20 to-blue-500/20 rounded-full -translate-y-16 translate-x-16"></div>
          <div className="relative flex items-center">
            <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-blue-500 rounded-2xl flex items-center justify-center text-white text-2xl mr-4 shadow-lg">
              👥
            </div>
            <div>
              <p className="text-white/60 text-sm font-medium uppercase tracking-wide">Active Now</p>
              <p className="text-4xl font-bold text-white">{activeSessions.length}</p>
            </div>
          </div>
        </div>
        
        <div className="group relative overflow-hidden bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400/20 to-purple-500/20 rounded-full -translate-y-16 translate-x-16"></div>
          <div className="relative flex items-center">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-500 rounded-2xl flex items-center justify-center text-white text-2xl mr-4 shadow-lg">
              👤
            </div>
            <div>
              <p className="text-white/60 text-sm font-medium uppercase tracking-wide">Total Employees</p>
              <p className="text-4xl font-bold text-white">{employees.length}</p>
            </div>
          </div>
        </div>
        
        <div className="group relative overflow-hidden bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-400/20 to-pink-500/20 rounded-full -translate-y-16 translate-x-16"></div>
          <div className="relative flex items-center">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-500 rounded-2xl flex items-center justify-center text-white text-2xl mr-4 shadow-lg">
              🏢
            </div>
            <div>
              <p className="text-white/60 text-sm font-medium uppercase tracking-wide">Locations</p>
              <p className="text-4xl font-bold text-white">{locations.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Active Sessions */}
      <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20">
        <div className="flex items-center space-x-3 mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-red-500 rounded-2xl flex items-center justify-center text-white text-xl shadow-lg">
            ⏰
          </div>
          <h3 className="text-2xl font-bold text-white">Currently Clocked In</h3>
        </div>
        
        {activeSessions.length > 0 ? (
          <div className="space-y-4">
            {activeSessions.map((session, index) => (
              <div 
                key={session.id} 
                className="group bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-[1.02]"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-blue-500 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
                      {session.first_name[0]}{session.last_name[0]}
                    </div>
                    <div>
                      <p className="font-bold text-xl text-white">{session.first_name} {session.last_name}</p>
                      <p className="text-white/70 text-sm">📍 {session.location_name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-2xl font-bold text-green-400">{formatDuration(session.clock_in)}</p>
                    <p className="text-white/60 text-sm">
                      Since {new Date(session.clock_in).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="text-8xl mb-6 animate-pulse">😴</div>
            <p className="text-white/80 text-xl font-medium mb-2">No one is currently clocked in</p>
            <p className="text-white/60">Everyone is taking a break!</p>
          </div>
        )}
      </div>
    </div>
  )
}

function EmployeesTab({ employees, onEmployeesChange, organizationId }) {
  const [showAddForm, setShowAddForm] = useState(false)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-white">Employees</h3>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-gradient-to-r from-orange-500 to-red-600 text-white px-6 py-3 rounded-xl font-medium hover:from-orange-600 hover:to-red-700 transition-all duration-300 hover:scale-105 shadow-lg"
        >
          Add Employee
        </button>
      </div>

      <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
        {employees.length > 0 ? (
          <div className="space-y-4">
            {employees.map((emp) => (
              <div key={emp.id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                <div>
                  <p className="font-medium text-white">{emp.first_name} {emp.last_name}</p>
                  <p className="text-sm text-white/70">{emp.email}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  emp.role === 'admin' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                }`}>
                  {emp.role}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-white/60 text-center py-8">No employees added yet</p>
        )}
      </div>

      {showAddForm && (
        <AddEmployeeForm
          organizationId={organizationId}
          onSuccess={() => {
            setShowAddForm(false)
            onEmployeesChange()
          }}
          onCancel={() => setShowAddForm(false)}
        />
      )}
    </div>
  )
}

function LocationsTab({ locations, onLocationsChange, organizationId }) {
  const [showAddForm, setShowAddForm] = useState(false)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-white">Work Locations</h3>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-gradient-to-r from-green-500 to-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:from-green-600 hover:to-blue-700 transition-all duration-300 hover:scale-105 shadow-lg"
        >
          Add Location
        </button>
      </div>

      <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
        {locations.length > 0 ? (
          <div className="space-y-4">
            {locations.map((location) => (
              <div key={location.id} className="p-4 bg-white/5 rounded-xl border border-white/10">
                <p className="font-medium text-white">{location.name}</p>
                {location.address && (
                  <p className="text-sm text-white/70">{location.address}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-white/60 text-center py-8">No locations added yet</p>
        )}
      </div>

      {showAddForm && (
        <AddLocationForm
          organizationId={organizationId}
          onSuccess={() => {
            setShowAddForm(false)
            onLocationsChange()
          }}
          onCancel={() => setShowAddForm(false)}
        />
      )}
    </div>
  )
}

function AddLocationForm({ organizationId, onSuccess, onCancel }) {
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await database.createLocation({
        organization_id: organizationId,
        name,
        address
      })

      if (error) throw error
      onSuccess()
    } catch (error) {
      console.error('Error adding location:', error)
      alert('Error adding location. Please try again.')
    }
    setLoading(false)
  }

  return (
    <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20">
      <h4 className="text-xl font-bold text-white mb-6">Add New Location</h4>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-white/80 font-medium mb-3">
            Location Name *
          </label>
          <input
            type="text"
            required
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Main Office, Warehouse, Remote"
          />
        </div>
        
        <div>
          <label className="block text-white/80 font-medium mb-3">
            Address (Optional)
          </label>
          <input
            type="text"
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="e.g., 123 Main St, City, State"
          />
        </div>

        <div className="flex space-x-4">
          <button
            type="submit"
            disabled={loading}
            className="bg-gradient-to-r from-green-500 to-blue-600 text-white py-3 px-6 rounded-xl font-medium hover:from-green-600 hover:to-blue-700 transition-all duration-300 hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex-1"
          >
            {loading ? 'Adding...' : 'Add Location'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="bg-white/10 text-white py-3 px-6 rounded-xl font-medium hover:bg-white/20 transition-all duration-300 flex-1"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

function AddEmployeeForm({ organizationId, onSuccess, onCancel }) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: 'employee'
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Create auth user first - we'll handle email confirmation through Supabase settings
      const { data: authData, error: authError } = await auth.signUp(
        formData.email, 
        'TempPass123!', // Temporary password - employee should change
        {
          data: {
            full_name: `${formData.firstName} ${formData.lastName}`
          }
        }
      )

      if (authError) throw authError

      // Create employee record
      const { error: empError } = await database.createEmployee({
        id: authData.user.id,
        organization_id: organizationId,
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        role: formData.role
      })

      if (empError) throw empError

      alert(`Employee added successfully!\n\nLogin Details:\nEmail: ${formData.email}\nTemporary password: TempPass123!\n\nNote: Employee can log in immediately and should change password on first login.`)
      onSuccess()
    } catch (error) {
      console.error('Error adding employee:', error)
      setError(error.message || 'Error adding employee')
    }
    setLoading(false)
  }

  return (
    <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20">
      <h4 className="text-xl font-bold text-white mb-6">Add New Employee</h4>
      
      {error && (
        <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-red-300 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-white/80 font-medium mb-3">
            First Name *
          </label>
          <input
            type="text"
            required
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300"
            value={formData.firstName}
            onChange={(e) => setFormData({...formData, firstName: e.target.value})}
            placeholder="John"
          />
        </div>

        <div>
          <label className="block text-white/80 font-medium mb-3">
            Last Name *
          </label>
          <input
            type="text"
            required
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300"
            value={formData.lastName}
            onChange={(e) => setFormData({...formData, lastName: e.target.value})}
            placeholder="Doe"
          />
        </div>

        <div>
          <label className="block text-white/80 font-medium mb-3">
            Email *
          </label>
          <input
            type="email"
            required
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            placeholder="john@company.com"
          />
        </div>

        <div>
          <label className="block text-white/80 font-medium mb-3">
            Role
          </label>
          <select
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300"
            value={formData.role}
            onChange={(e) => setFormData({...formData, role: e.target.value})}
          >
            <option value="employee">Employee</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <div className="flex space-x-4">
          <button
            type="submit"
            disabled={loading}
            className="bg-gradient-to-r from-orange-500 to-red-600 text-white py-3 px-6 rounded-xl font-medium hover:from-orange-600 hover:to-red-700 transition-all duration-300 hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex-1"
          >
            {loading ? 'Adding Employee...' : 'Add Employee'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="bg-white/10 text-white py-3 px-6 rounded-xl font-medium hover:bg-white/20 transition-all duration-300 flex-1"
          >
            Cancel
          </button>
        </div>
      </form>

      <div className="mt-6 p-4 bg-blue-500/20 border border-blue-500/30 rounded-xl text-blue-300 text-sm">
        💡 Employee will be created with temporary password: <strong>TempPass123!</strong><br/>
        Make sure to tell them to change it after first login.
      </div>
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
      const { error } = await auth.updatePassword(formData.newPassword)
      if (error) throw error

      setSuccess(true)
      setTimeout(() => {
        onClose()
      }, 2000)
    } catch (error) {
      console.error('Password update error:', error)
      setError(error.message || 'Error updating password')
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-8 max-w-md w-full shadow-2xl border border-white/20 transform transition-all duration-300 scale-100 opacity-100">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl flex items-center justify-center text-white text-xl shadow-lg">
              🔑
            </div>
            <h3 className="text-2xl font-bold text-gray-800">Change Password</h3>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-600 hover:text-gray-800 transition-colors"
          >
            ×
          </button>
        </div>

        {success ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white text-2xl mx-auto mb-4 shadow-lg">
              ✓
            </div>
            <p className="text-green-600 font-medium text-lg">Password updated successfully!</p>
            <p className="text-gray-500 mt-2">This dialog will close automatically.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-800 text-sm font-medium">
                ❌ {error}
              </div>
            )}

            <div>
              <label className="block text-gray-700 font-medium mb-3">
                🔒 Current Password
              </label>
              <input
                type="password"
                required
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                value={formData.currentPassword}
                onChange={(e) => setFormData({...formData, currentPassword: e.target.value})}
                placeholder="Enter current password"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-3">
                🆕 New Password
              </label>
              <input
                type="password"
                required
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                value={formData.newPassword}
                onChange={(e) => setFormData({...formData, newPassword: e.target.value})}
                placeholder="Enter new password (min 6 characters)"
                minLength="6"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-3">
                ✅ Confirm New Password
              </label>
              <input
                type="password"
                required
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                placeholder="Confirm new password"
                minLength="6"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 pt-6">
              <button
                type="submit"
                disabled={loading}
                className="bg-gradient-to-r from-purple-500 to-blue-600 text-white py-3 rounded-xl font-medium hover:from-purple-600 hover:to-blue-700 transition-all duration-300 hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Updating...</span>
                  </span>
                ) : (
                  '🔐 Update Password'
                )}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="bg-gray-100 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-200 transition-all duration-300"
              >
                ❌ Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}