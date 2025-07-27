import { useState, useEffect } from 'react'
import { database, auth } from '../lib/supabase'

export default function AdminDashboard({ session, employee }) {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [employees, setEmployees] = useState([])
  const [locations, setLocations] = useState([])
  const [activeSessions, setActiveSessions] = useState([])
  const [currentSession, setCurrentSession] = useState(null)
  const [selectedLocation, setSelectedLocation] = useState('')
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [showPasswordChange, setShowPasswordChange] = useState(false)

  useEffect(() => {
    loadData()
    // Check if admin has an active session
    loadCurrentSession()
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

  const loadCurrentSession = async () => {
    try {
      const { data } = await database.getCurrentSession(employee.id)
      setCurrentSession(data)
    } catch (error) {
      console.error('Error loading current session:', error)
    }
  }

  const handleClockIn = async () => {
    if (!selectedLocation) {
      alert('Please select a location')
      return
    }

    setActionLoading(true)
    try {
      const { data, error } = await database.clockIn(employee.id, selectedLocation)
      if (error) throw error
      
      setCurrentSession(data)
      loadData() // Refresh active sessions
      alert('Clocked in successfully!')
    } catch (error) {
      console.error('Clock in error:', error)
      alert('Error clocking in. Please try again.')
    }
    setActionLoading(false)
  }

  const handleClockOut = async () => {
    if (!currentSession) return

    setActionLoading(true)
    try {
      const { data, error } = await database.clockOut(currentSession.id)
      if (error) throw error
      
      setCurrentSession(null)
      loadData() // Refresh active sessions
      alert('Clocked out successfully!')
    } catch (error) {
      console.error('Clock out error:', error)
      alert('Error clocking out. Please try again.')
    }
    setActionLoading(false)
  }

  const getSessionDuration = () => {
    if (!currentSession) return '00:00:00'
    
    const start = new Date(currentSession.clock_in)
    const now = new Date()
    const diff = now - start
    
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((diff % (1000 * 60)) / 1000)
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  // Update timer every second
  useEffect(() => {
    if (currentSession) {
      const timer = setInterval(() => {
        // This will trigger re-render to update the timer
        setCurrentSession(prev => ({ ...prev }))
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [currentSession])

  if (loading) {
    return (
      <div className="container-app flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container-app">
      {/* Header */}
      <div className="bg-gradient-primary text-white p-6 rounded-b-3xl shadow-xl">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-white/80">{employee.organization?.name}</p>
          </div>
          <div className="space-x-3">
            <button
              onClick={() => setShowPasswordChange(true)}
              className="text-sm text-white/80 hover:text-white"
            >
              Change Password
            </button>
            <button
              onClick={() => auth.signOut()}
              className="text-sm text-white/80 hover:text-white"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 px-6">
        <div className="flex space-x-8">
          {[
            { id: 'dashboard', name: 'Dashboard' },
            { id: 'mytime', name: 'My Time' },
            { id: 'employees', name: 'Employees' },
            { id: 'locations', name: 'Locations' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-2 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.name}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        {activeTab === 'dashboard' && (
          <DashboardTab 
            activeSessions={activeSessions}
            employees={employees}
            locations={locations}
          />
        )}

        {activeTab === 'mytime' && (
          <MyTimeTab 
            currentSession={currentSession}
            locations={locations}
            selectedLocation={selectedLocation}
            setSelectedLocation={setSelectedLocation}
            handleClockIn={handleClockIn}
            handleClockOut={handleClockOut}
            actionLoading={actionLoading}
            getSessionDuration={getSessionDuration}
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
      <div className="text-center text-sm text-gray-500 mt-8 pb-6">
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

// NEW: My Time Tab for Admin Time Tracking
function MyTimeTab({ 
  currentSession, 
  locations, 
  selectedLocation, 
  setSelectedLocation, 
  handleClockIn, 
  handleClockOut, 
  actionLoading, 
  getSessionDuration 
}) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">My Time Tracking</h3>
      
      {/* Current Status */}
      <div className="card text-center">
        <div className="mb-4">
          <span className={`status-badge ${
            currentSession ? 'status-clocked-in' : 'status-clocked-out'
          }`}>
            {currentSession ? 'Clocked In' : 'Ready to Clock In'}
          </span>
        </div>
        <div className="time-display mb-4">
          {currentSession ? getSessionDuration() : '00:00:00'}
        </div>
        {currentSession && (
          <div className="text-sm text-gray-600">
            Started: {new Date(currentSession.clock_in).toLocaleString()}
          </div>
        )}
      </div>

      {/* Clock In/Out Actions */}
      {!currentSession ? (
        <div className="card">
          <h4 className="text-lg font-semibold mb-4">Clock In</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Location
              </label>
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="input"
                required
              >
                <option value="">Choose a location</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleClockIn}
              disabled={actionLoading || !selectedLocation}
              className="btn-success w-full"
            >
              {actionLoading ? 'Clocking In...' : 'Clock In'}
            </button>
          </div>
        </div>
      ) : (
        <div className="card">
          <h4 className="text-lg font-semibold mb-4">Currently Working</h4>
          <div className="space-y-4">
            <button
              onClick={handleClockOut}
              disabled={actionLoading}
              className="btn-danger w-full"
            >
              {actionLoading ? 'Clocking Out...' : 'Clock Out'}
            </button>
          </div>
        </div>
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 text-green-600 mr-4">
              👥
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Active Now</p>
              <p className="text-2xl font-bold">{activeSessions.length}</p>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 text-blue-600 mr-4">
              👤
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total Employees</p>
              <p className="text-2xl font-bold">{employees.length}</p>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100 text-purple-600 mr-4">
              🏢
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Locations</p>
              <p className="text-2xl font-bold">{locations.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Active Sessions */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Currently Clocked In</h3>
        {activeSessions.length > 0 ? (
          <div className="space-y-3">
            {activeSessions.map((session) => (
              <div key={session.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">{session.first_name} {session.last_name}</p>
                  <p className="text-sm text-gray-600">{session.location_name}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm">{formatDuration(session.clock_in)}</p>
                  <p className="text-xs text-gray-500">
                    Since {new Date(session.clock_in).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">No one is currently clocked in</p>
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
        <h3 className="text-lg font-semibold">Employees</h3>
        <button
          onClick={() => setShowAddForm(true)}
          className="btn-primary"
        >
          Add Employee
        </button>
      </div>

      <div className="card">
        {employees.length > 0 ? (
          <div className="space-y-3">
            {employees.map((emp) => (
              <div key={emp.id} className="flex items-center justify-between p-3 border-b border-gray-100 last:border-b-0">
                <div>
                  <p className="font-medium">{emp.first_name} {emp.last_name}</p>
                  <p className="text-sm text-gray-600">{emp.email}</p>
                </div>
                <span className={`status-badge ${
                  emp.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                }`}>
                  {emp.role}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">No employees added yet</p>
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
        <h3 className="text-lg font-semibold">Work Locations</h3>
        <button
          onClick={() => setShowAddForm(true)}
          className="btn-primary"
        >
          Add Location
        </button>
      </div>

      <div className="card">
        {locations.length > 0 ? (
          <div className="space-y-3">
            {locations.map((location) => (
              <div key={location.id} className="p-3 border-b border-gray-100 last:border-b-0">
                <p className="font-medium">{location.name}</p>
                {location.address && (
                  <p className="text-sm text-gray-600">{location.address}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">No locations added yet</p>
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
    <div className="card">
      <h4 className="text-lg font-semibold mb-4">Add New Location</h4>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Location Name *
          </label>
          <input
            type="text"
            required
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Main Office, Warehouse, Remote"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Address (Optional)
          </label>
          <input
            type="text"
            className="input"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="e.g., 123 Main St, City, State"
          />
        </div>

        <div className="flex space-x-3">
          <button
            type="submit"
            disabled={loading}
            className="btn-primary flex-1"
          >
            {loading ? 'Adding...' : 'Add Location'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary flex-1"
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
      // Create auth user first
      const { data: authData, error: authError } = await auth.signUp(
        formData.email, 
        'TempPass123!' // Temporary password - employee should change
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

      alert(`Employee added! Temporary password: TempPass123!\nTell them to change it after first login.`)
      onSuccess()
    } catch (error) {
      console.error('Error adding employee:', error)
      setError(error.message || 'Error adding employee')
    }
    setLoading(false)
  }

  return (
    <div className="card">
      <h4 className="text-lg font-semibold mb-4">Add New Employee</h4>
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            First Name *
          </label>
          <input
            type="text"
            required
            className="input"
            value={formData.firstName}
            onChange={(e) => setFormData({...formData, firstName: e.target.value})}
            placeholder="John"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Last Name *
          </label>
          <input
            type="text"
            required
            className="input"
            value={formData.lastName}
            onChange={(e) => setFormData({...formData, lastName: e.target.value})}
            placeholder="Doe"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email *
          </label>
          <input
            type="email"
            required
            className="input"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            placeholder="john@company.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Role
          </label>
          <select
            className="input"
            value={formData.role}
            onChange={(e) => setFormData({...formData, role: e.target.value})}
          >
            <option value="employee">Employee</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <div className="flex space-x-3">
          <button
            type="submit"
            disabled={loading}
            className="btn-primary flex-1"
          >
            {loading ? 'Adding Employee...' : 'Add Employee'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary flex-1"
          >
            Cancel
          </button>
        </div>
      </form>

      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-blue-800 text-sm">
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="card-glass max-w-md w-full">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold">Change Password</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl"
          >
            ×
          </button>
        </div>

        {success ? (
          <div className="text-center py-8">
            <div className="text-green-600 text-4xl mb-4">✓</div>
            <p className="text-green-600 font-medium">Password updated successfully!</p>
            <p className="text-sm text-gray-500 mt-2">This dialog will close automatically.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Password
              </label>
              <input
                type="password"
                required
                className="input"
                value={formData.currentPassword}
                onChange={(e) => setFormData({...formData, currentPassword: e.target.value})}
                placeholder="Enter current password"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Password
              </label>
              <input
                type="password"
                required
                className="input"
                value={formData.newPassword}
                onChange={(e) => setFormData({...formData, newPassword: e.target.value})}
                placeholder="Enter new password"
                minLength="6"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm New Password
              </label>
              <input
                type="password"
                required
                className="input"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                placeholder="Confirm new password"
                minLength="6"
              />
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="btn-primary flex-1"
              >
                {loading ? 'Updating...' : 'Update Password'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}