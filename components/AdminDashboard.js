import { useState, useEffect, useCallback } from 'react'
import { database, auth } from '../lib/supabase'
import ReportsTab from './ReportsTab'

export default function AdminDashboard({ session, employee }) {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [employees, setEmployees] = useState([])
  const [locations, setLocations] = useState([])
  const [clientProjects, setClientProjects] = useState([])
  const [activeSessions, setActiveSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showPasswordChange, setShowPasswordChange] = useState(false)
  const [showMenu, setShowMenu] = useState(false)

  const loadData = useCallback(async () => {
    try {
      const [employeesData, locationsData, clientProjectsData, activeSessionsData] = await Promise.all([
        database.getEmployees(employee.organization_id),
        database.getLocations(employee.organization_id),
        database.getClientProjects(employee.organization_id),
        database.getActiveSessions(employee.organization_id)
      ])

      setEmployees(employeesData.data || [])
      setLocations(locationsData.data || [])
      setClientProjects(clientProjectsData.data || [])
      setActiveSessions(activeSessionsData.data || [])
    } catch (error) {
      console.error('Error loading admin data:', error)
    }
    setLoading(false)
  }, [employee.organization_id])

  useEffect(() => {
    loadData()
  }, [loadData])

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
        <div className="relative px-4 sm:px-6 py-6 sm:py-8">
          <div className="flex justify-between items-start">
            <div className="flex-1 min-w-0 pr-4">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center shadow-lg">
                  {employee.organization?.name?.toLowerCase().includes('v.a.s') || employee.organization?.name?.toLowerCase().includes('vas') ? (
                    <img 
                      src="/vas-logo.jpg" 
                      alt="V.A.S Tri State" 
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <img 
                      src="/logo.jpg" 
                      alt="VasHours" 
                      className="w-full h-full object-contain rounded-xl"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-2xl sm:text-4xl font-bold text-white mb-1 truncate">{employee.organization?.name}</h1>
                  <p className="text-white/80 text-base sm:text-lg truncate">Admin Dashboard</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xs sm:text-sm">
                  {employee.first_name[0]}{employee.last_name[0]}
                </div>
                <span className="text-white/90 font-medium text-sm sm:text-base truncate">{employee.first_name} {employee.last_name}</span>
                <span className="px-2 py-1 bg-white/10 rounded-full text-xs text-white/80 font-medium">Admin</span>
              </div>
            </div>
            <div className="relative flex-shrink-0">
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
                      <button
                        onClick={async () => {
                          if (confirm('Are you sure you want to sign out?')) {
                            await auth.signOut()
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

      {/* Navigation */}
      <div className="px-4 sm:px-6 pb-6">
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-2 border border-white/20">
          <div className="flex space-x-1 sm:space-x-2 overflow-x-auto scrollbar-hide">
            {[
              { id: 'dashboard', name: 'Dashboard', emoji: '📊', color: 'from-blue-500 to-purple-600' },
              { id: 'reports', name: 'Reports', emoji: '📈', color: 'from-purple-500 to-pink-600' },
              { id: 'timemanagement', name: 'Time Mgmt', emoji: '⏰', color: 'from-red-500 to-orange-600' },
              { id: 'employees', name: 'Employees', emoji: '👥', color: 'from-orange-500 to-red-600' },
              { id: 'locations', name: 'Locations', emoji: '📍', color: 'from-green-500 to-blue-600' },
              { id: 'projects', name: 'Projects', emoji: '💼', color: 'from-indigo-500 to-purple-600' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-1 sm:space-x-2 px-3 sm:px-6 py-2 sm:py-3 rounded-xl font-medium transition-all duration-300 whitespace-nowrap text-sm sm:text-base ${
                  activeTab === tab.id
                    ? `bg-gradient-to-r ${tab.color} text-white shadow-lg transform scale-105`
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                <span className="text-base sm:text-lg">{tab.emoji}</span>
                <span className="hidden xs:inline sm:inline">{tab.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 pb-8">
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
            organization={employee.organization}
          />
        )}

        {activeTab === 'timemanagement' && (
          <TimeManagementTab 
            employees={employees}
            locations={locations}
            organizationId={employee.organization_id}
            onDataChange={loadData}
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
        
        {activeTab === 'projects' && (
          <ClientProjectsTab 
            clientProjects={clientProjects}
            onClientProjectsChange={loadData}
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
  const [showEditForm, setShowEditForm] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState(null)

  const editEmployee = (employee) => {
    setSelectedEmployee(employee)
    setShowEditForm(true)
  }

  const deleteEmployee = async (employeeId, employeeName) => {
    if (!confirm(`Are you sure you want to delete "${employeeName}"? This will remove all their time records and cannot be undone!`)) {
      return
    }

    try {
      const { error } = await database.deleteEmployee(employeeId)
      if (error) throw error

      alert(`Employee "${employeeName}" has been deleted successfully.`)
      onEmployeesChange() // Refresh the employee list
    } catch (error) {
      console.error('Error deleting employee:', error)
      alert(`Error deleting employee: ${error.message}`)
    }
  }

  const showCredentials = (employee) => {
    const credentials = `Employee Login Information:

👤 Name: ${employee.first_name} ${employee.last_name}
📧 Email: ${employee.email}
🔑 Username: ${employee.username}
🔐 Password: ${employee.password}

📱 Login Instructions:
1. Go to the login page
2. Click "Employee Login"
3. Enter the username and password above
4. Employees should change their password after first login`

    alert(credentials)
  }

  const resetPassword = async (employee) => {
    const newPassword = prompt(`Enter new password for ${employee.first_name} ${employee.last_name}:`, 'emp123')
    
    if (!newPassword) return
    
    if (newPassword.length < 4) {
      alert('Password must be at least 4 characters long')
      return
    }

    try {
      const { error } = await database.updateEmployee(employee.id, {
        password: newPassword
      })

      if (error) throw error

      alert(`Password updated successfully for ${employee.first_name} ${employee.last_name}!\n\nNew Password: ${newPassword}\n\nMake sure to inform the employee of their new password.`)
      onEmployeesChange() // Refresh the employee list
    } catch (error) {
      console.error('Error updating password:', error)
      alert(`Error updating password: ${error.message}`)
    }
  }

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

      <div className="space-y-4">
        {employees.length > 0 ? (
          employees.map((emp, index) => (
            <div 
              key={emp.id} 
              className="group bg-white/10 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-[1.02]"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-green-400 to-blue-500 rounded-2xl flex items-center justify-center text-white font-bold text-base sm:text-lg shadow-lg flex-shrink-0">
                    {emp.first_name[0]}{emp.last_name[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-lg sm:text-xl text-white truncate">{emp.first_name} {emp.last_name}</p>
                    <p className="text-white/70 text-sm truncate">{emp.email}</p>
                    {emp.username && (
                      <p className="text-white/50 text-xs">Username: {emp.username}</p>
                    )}
                    {emp.hourly_rate && (
                      <p className="text-green-400 text-sm font-mono">${emp.hourly_rate}/hr</p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                  <div className="text-left sm:text-right">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      emp.role === 'admin' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                    }`}>
                      {emp.role}
                    </span>
                    <p className="text-white/60 text-xs mt-1">
                      {emp.is_active ? 'Active' : 'Inactive'}
                    </p>
                    {emp.hourly_rate && (
                      <p className="text-green-400 text-xs font-mono mt-1">
                        ${emp.hourly_rate}/hour
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                    {emp.username && (
                      <>
                        <button
                          onClick={() => showCredentials(emp)}
                          className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors w-full sm:w-auto"
                          title="Show Login Credentials"
                        >
                          👁️ Credentials
                        </button>
                        <button
                          onClick={() => resetPassword(emp)}
                          className="bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors w-full sm:w-auto"
                          title="Reset Password"
                        >
                          🔄 Reset
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => editEmployee(emp)}
                      className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors w-full sm:w-auto"
                      title="Edit Employee"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => deleteEmployee(emp.id, `${emp.first_name} ${emp.last_name}`)}
                      className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors w-full sm:w-auto"
                      title="Delete Employee"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Show edit form right after this employee if it's selected */}
              {showEditForm && selectedEmployee && selectedEmployee.id === emp.id && (
                <div className="mt-4">
                  <EditEmployeeForm
                    employee={selectedEmployee}
                    organizationId={organizationId}
                    onSuccess={() => {
                      setShowEditForm(false)
                      setSelectedEmployee(null)
                      onEmployeesChange()
                    }}
                    onCancel={() => {
                      setShowEditForm(false)
                      setSelectedEmployee(null)
                    }}
                  />
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20 text-center">
            <div className="text-6xl mb-4">👥</div>
            <p className="text-white/60 text-lg">No employees added yet</p>
            <p className="text-white/40 text-sm mt-2">Click &quot;Add Employee&quot; to get started</p>
          </div>
        )}
      </div>
    </div>
  )
}

function LocationsTab({ locations, onLocationsChange, organizationId }) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState(null)

  const editLocation = (location) => {
    setSelectedLocation(location)
    setShowEditForm(true)
  }

  const deleteLocation = async (locationId, locationName) => {
    if (!confirm(`Are you sure you want to delete "${locationName}"? This action cannot be undone.`)) {
      return
    }

    try {
      const { error } = await database.deleteLocation(locationId)
      if (error) throw error
      
      alert(`Location "${locationName}" has been deleted successfully.`)
      onLocationsChange() // Refresh the list
    } catch (error) {
      console.error('Error deleting location:', error)
      alert(`Error deleting location: ${error.message}`)
    }
  }

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

      <div className="space-y-4">
        {locations.length > 0 ? (
          locations.map((location, index) => (
            <div 
              key={location.id} 
              className="group bg-white/10 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-[1.02]"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-400 to-green-500 rounded-2xl flex items-center justify-center text-white font-bold text-base sm:text-lg shadow-lg flex-shrink-0">
                    📍
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-lg sm:text-xl text-white truncate">{location.name}</p>
                    {location.address && (
                      <p className="text-white/70 text-sm truncate">{location.address}</p>
                    )}
                    <p className="text-white/50 text-xs">
                      {location.is_active ? 'Active' : 'Inactive'}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                  <button
                    onClick={() => editLocation(location)}
                    className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors w-full sm:w-auto"
                    title="Edit Location"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => deleteLocation(location.id, location.name)}
                    className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors w-full sm:w-auto"
                    title="Delete Location"
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
              
              {/* Show edit form right after this location if it's selected */}
              {showEditForm && selectedLocation && selectedLocation.id === location.id && (
                <div className="mt-4">
                  <EditLocationForm
                    location={selectedLocation}
                    onSuccess={() => {
                      setShowEditForm(false)
                      setSelectedLocation(null)
                      onLocationsChange()
                    }}
                    onCancel={() => {
                      setShowEditForm(false)
                      setSelectedLocation(null)
                    }}
                  />
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20 text-center">
            <div className="text-6xl mb-4">📍</div>
            <p className="text-white/60 text-lg">No locations added yet</p>
            <p className="text-white/40 text-sm mt-2">Click &quot;Add Location&quot; to get started</p>
          </div>
        )}
      </div>
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

function EditLocationForm({ location, onSuccess, onCancel }) {
  const [name, setName] = useState(location.name || '')
  const [address, setAddress] = useState(location.address || '')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await database.updateLocation(location.id, {
        name,
        address
      })

      if (error) throw error
      onSuccess()
    } catch (error) {
      console.error('Error updating location:', error)
      alert('Error updating location. Please try again.')
    }
    setLoading(false)
  }

  return (
    <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20">
      <h4 className="text-xl font-bold text-white mb-6">Edit Location</h4>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-white/80 font-medium mb-3">
            Location Name *
          </label>
          <input
            type="text"
            required
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-300"
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
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-300"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="e.g., 123 Main St, City, State"
          />
        </div>

        <div className="flex space-x-4">
          <button
            type="submit"
            disabled={loading}
            className="bg-gradient-to-r from-yellow-500 to-orange-600 text-white py-3 px-6 rounded-xl font-medium hover:from-yellow-600 hover:to-orange-700 transition-all duration-300 hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex-1"
          >
            {loading ? 'Updating...' : 'Update Location'}
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
    role: 'employee',
    hourlyRate: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Generate unique username and simple password
      const username = `${formData.firstName.toLowerCase()}.${formData.lastName.toLowerCase()}`
      const defaultPassword = 'emp123' // Simple default password
      
      // Create employee record directly (no Supabase Auth needed)
      // Let Supabase generate the UUID automatically
      const employeeData = {
        organization_id: organizationId,
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        username: username,
        password: defaultPassword,
        role: formData.role,
        hourly_rate: formData.hourlyRate ? parseFloat(formData.hourlyRate) : null
      }
      
      console.log('Creating employee with data:', employeeData)
      
      const { data: createdEmployee, error: empError } = await database.createEmployee(employeeData)
      
      console.log('Employee creation result:', { createdEmployee, empError })

      if (empError) {
        // If username already exists, add a number
        if (empError.message.includes('duplicate key value violates unique constraint')) {
          const uniqueUsername = `${username}${Math.floor(Math.random() * 1000)}`
          console.log('Retrying with unique username:', uniqueUsername)
          
          const retryEmployeeData = {
            organization_id: organizationId,
            first_name: formData.firstName,
            last_name: formData.lastName,
            email: formData.email,
            username: uniqueUsername,
            password: defaultPassword,
            role: formData.role
          }
          
          const { data: retryCreatedEmployee, error: retryError } = await database.createEmployee(retryEmployeeData)
          console.log('Retry creation result:', { retryCreatedEmployee, retryError })
          
          if (retryError) throw retryError
          
          alert(`Employee added successfully!\n\n👤 Username: ${uniqueUsername}\n🔑 Password: ${defaultPassword}\n\nEmployee can log in immediately using the Employee login option.`)
        } else {
          console.error('Employee creation failed with error:', empError)
          throw empError
        }
      } else {
        console.log('Employee created successfully:', createdEmployee)
        alert(`Employee added successfully!\n\n👤 Username: ${username}\n🔑 Password: ${defaultPassword}\n\nEmployee can log in immediately using the Employee login option.`)
      }

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

        <div>
          <label className="block text-white/80 font-medium mb-3">
            Hourly Rate (Optional)
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/60">$</span>
            <input
              type="number"
              step="0.01"
              min="0"
              className="w-full pl-8 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300"
              value={formData.hourlyRate}
              onChange={(e) => setFormData({...formData, hourlyRate: e.target.value})}
              placeholder="25.00"
            />
          </div>
          <p className="text-white/50 text-xs mt-2">Enter the employee&apos;s hourly wage for payroll calculations</p>
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
        💡 Employee will be created with temporary password: <strong>emp123</strong><br/>
        Make sure to tell them to change it after first login.
      </div>
    </div>
  )
}

function EditEmployeeForm({ employee, organizationId, onSuccess, onCancel }) {
  const [formData, setFormData] = useState({
    firstName: employee.first_name || '',
    lastName: employee.last_name || '',
    email: employee.email || '',
    role: employee.role || 'employee',
    isActive: employee.is_active !== false,
    hourlyRate: employee.hourly_rate || ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { error: updateError } = await database.updateEmployee(employee.id, {
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        role: formData.role,
        is_active: formData.isActive,
        hourly_rate: formData.hourlyRate ? parseFloat(formData.hourlyRate) : null
      })

      if (updateError) throw updateError

      alert('Employee updated successfully!')
      onSuccess()
    } catch (error) {
      console.error('Error updating employee:', error)
      setError(error.message || 'Error updating employee')
    }
    setLoading(false)
  }

  return (
    <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20">
      <h4 className="text-xl font-bold text-white mb-6">Edit Employee</h4>
      
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
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-300"
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
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-300"
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
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-300"
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
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-300"
            value={formData.role}
            onChange={(e) => setFormData({...formData, role: e.target.value})}
          >
            <option value="employee">Employee</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <div>
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
              className="w-5 h-5 text-yellow-500 bg-white/10 border-white/20 rounded focus:ring-yellow-500 focus:ring-2"
            />
            <span className="text-white/80 font-medium">Active Employee</span>
          </label>
        </div>

        <div>
          <label className="block text-white/80 font-medium mb-3">
            Hourly Rate (Optional)
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/60">$</span>
            <input
              type="number"
              step="0.01"
              min="0"
              className="w-full pl-8 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-300"
              value={formData.hourlyRate}
              onChange={(e) => setFormData({...formData, hourlyRate: e.target.value})}
              placeholder="25.00"
            />
          </div>
          <p className="text-white/50 text-xs mt-2">Enter the employee&apos;s hourly wage for payroll calculations</p>
        </div>

        <div className="flex space-x-4">
          <button
            type="submit"
            disabled={loading}
            className="bg-gradient-to-r from-yellow-500 to-orange-600 text-white py-3 px-6 rounded-xl font-medium hover:from-yellow-600 hover:to-orange-700 transition-all duration-300 hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex-1"
          >
            {loading ? 'Updating Employee...' : 'Update Employee'}
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

function ClientProjectsTab({ clientProjects, onClientProjectsChange, organizationId }) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)
  const [showLocationModal, setShowLocationModal] = useState(false)
  const [selectedProject, setSelectedProject] = useState(null)

  const editProject = (project) => {
    setSelectedProject(project)
    setShowEditForm(true)
  }

  const manageProjectLocations = (project) => {
    setSelectedProject(project)
    setShowLocationModal(true)
  }

  const deleteProject = async (projectId, projectName) => {
    if (!confirm(`Are you sure you want to delete "${projectName}"? This action cannot be undone.`)) {
      return
    }

    try {
      const { error } = await database.deleteClientProject(projectId)
      if (error) throw error
      
      alert(`Project "${projectName}" has been deleted successfully.`)
      onClientProjectsChange() // Refresh the list
    } catch (error) {
      console.error('Error deleting project:', error)
      alert(`Error deleting project: ${error.message}`)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-white">Client Projects</h3>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-6 py-3 rounded-xl font-medium hover:from-purple-600 hover:to-indigo-700 transition-all duration-300 hover:scale-105 shadow-lg"
        >
          Add Project
        </button>
      </div>

      {showAddForm && (
        <AddClientProjectForm
          organizationId={organizationId}
          onSuccess={() => {
            setShowAddForm(false)
            onClientProjectsChange()
          }}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      <div className="space-y-4">
        {clientProjects.length > 0 ? (
          clientProjects.map((project, index) => (
            <div 
              key={project.id} 
              className="group bg-white/10 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-[1.02]"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-400 to-indigo-500 rounded-2xl flex items-center justify-center text-white font-bold text-base sm:text-lg shadow-lg flex-shrink-0">
                    💼
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-lg sm:text-xl text-white truncate">{project.project_name}</p>
                    <p className="text-white/70 text-sm truncate">{project.client_name}</p>
                    {(() => {
                      const locations = project.available_locations || []
                      const primaryLocation = project.primary_location
                      
                      if (locations.length === 0) {
                        return <p className="text-white/60 text-sm truncate">📍 No locations assigned</p>
                      } else if (locations.length === 1) {
                        return <p className="text-white/60 text-sm truncate">📍 {locations[0].name}</p>
                      } else {
                        return (
                          <p className="text-white/60 text-sm truncate">
                            📍 {locations.length} locations{primaryLocation ? ` (Primary: ${primaryLocation.name})` : ''}
                          </p>
                        )
                      }
                    })()}
                    <div className="flex items-center space-x-3 mt-1">
                      {project.project_code && (
                        <span className="px-2 py-1 bg-white/10 rounded-full text-xs text-white/80 font-medium">
                          {project.project_code}
                        </span>
                      )}
                      {project.billing_rate && (
                        <span className="px-2 py-1 bg-green-500/20 rounded-full text-xs text-green-400 font-medium">
                          ${project.billing_rate}/hr
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                  <button
                    onClick={() => editProject(project)}
                    className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors w-full sm:w-auto"
                    title="Edit Project"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => manageProjectLocations(project)}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors w-full sm:w-auto"
                    title="Manage Locations"
                  >
                    📍 Locations
                  </button>
                  <button
                    onClick={() => deleteProject(project.id, project.project_name)}
                    className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors w-full sm:w-auto"
                    title="Delete Project"
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
              
              {/* Show edit form right after this project if it's selected */}
              {showEditForm && selectedProject && selectedProject.id === project.id && (
                <div className="mt-4">
                  <EditClientProjectForm
                    project={selectedProject}
                    onSuccess={() => {
                      setShowEditForm(false)
                      setSelectedProject(null)
                      onClientProjectsChange()
                    }}
                    onCancel={() => {
                      setShowEditForm(false)
                      setSelectedProject(null)
                    }}
                  />
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20 text-center">
            <div className="text-6xl mb-4">💼</div>
            <p className="text-white/60 text-lg">No client projects added yet</p>
            <p className="text-white/40 text-sm mt-2">Click &quot;Add Project&quot; to get started</p>
          </div>
        )}
      </div>

      {showLocationModal && selectedProject && (
        <ProjectLocationModal
          project={selectedProject}
          organizationId={organizationId}
          onSuccess={() => {
            setShowLocationModal(false)
            setSelectedProject(null)
            onClientProjectsChange()
          }}
          onCancel={() => {
            setShowLocationModal(false)
            setSelectedProject(null)
          }}
        />
      )}
    </div>
  )
}

function AddClientProjectForm({ organizationId, onSuccess, onCancel }) {
  const [formData, setFormData] = useState({
    clientName: '',
    projectName: '',
    projectCode: '',
    billingRate: '',
    locationId: ''
  })
  const [loading, setLoading] = useState(false)
  const [locations, setLocations] = useState([])

  // Load locations when component mounts
  useEffect(() => {
    const loadLocations = async () => {
      try {
        const { data, error } = await database.getLocations(organizationId)
        if (error) throw error
        setLocations(data || [])
      } catch (error) {
        console.error('Error loading locations:', error)
      }
    }
    loadLocations()
  }, [organizationId])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await database.createClientProject({
        organization_id: organizationId,
        client_name: formData.clientName,
        project_name: formData.projectName,
        project_code: formData.projectCode,
        billing_rate: formData.billingRate ? parseFloat(formData.billingRate) : null,
        location_id: formData.locationId || null
      })

      if (error) throw error
      onSuccess()
    } catch (error) {
      console.error('Error adding client project:', error)
      alert('Error adding client project. Please try again.')
    }
    setLoading(false)
  }

  return (
    <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20">
      <h4 className="text-xl font-bold text-white mb-6">Add New Project</h4>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-white/80 font-medium mb-3">
            Client Name *
          </label>
          <input
            type="text"
            required
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
            value={formData.clientName}
            onChange={(e) => setFormData({...formData, clientName: e.target.value})}
            placeholder="e.g., ABC Corporation, XYZ Inc"
          />
        </div>
        
        <div>
          <label className="block text-white/80 font-medium mb-3">
            Project Name *
          </label>
          <input
            type="text"
            required
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
            value={formData.projectName}
            onChange={(e) => setFormData({...formData, projectName: e.target.value})}
            placeholder="e.g., Website Redesign, Mobile App"
          />
        </div>

        <div>
          <label className="block text-white/80 font-medium mb-3">
            Project Code (Optional)
          </label>
          <input
            type="text"
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
            value={formData.projectCode}
            onChange={(e) => setFormData({...formData, projectCode: e.target.value})}
            placeholder="e.g., ABC-001, PROJ-2024-001"
          />
        </div>

        <div>
          <label className="block text-white/80 font-medium mb-3">
            Billing Rate ($/hour) (Optional)
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/60">$</span>
            <input
              type="number"
              step="0.01"
              min="0"
              className="w-full pl-8 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
              value={formData.billingRate}
              onChange={(e) => setFormData({...formData, billingRate: e.target.value})}
              placeholder="75.00"
            />
          </div>
          <p className="text-white/50 text-xs mt-2">Client billing rate for this project</p>
        </div>

        <div>
          <label className="block text-white/80 font-medium mb-3">
            📍 Project Location (Optional)
          </label>
          <select
            value={formData.locationId}
            onChange={(e) => setFormData({...formData, locationId: e.target.value})}
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
          >
            <option value="" className="text-gray-800 bg-white">No specific location</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id} className="text-gray-800 bg-white">
                📍 {location.name}
              </option>
            ))}
          </select>
          <p className="text-white/50 text-xs mt-2">Where this project work will be performed</p>
        </div>

        <div className="flex space-x-4">
          <button
            type="submit"
            disabled={loading}
            className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white py-3 px-6 rounded-xl font-medium hover:from-purple-600 hover:to-indigo-700 transition-all duration-300 hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex-1"
          >
            {loading ? 'Adding...' : 'Add Project'}
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

function EditClientProjectForm({ project, onSuccess, onCancel }) {
  const [formData, setFormData] = useState({
    clientName: project.client_name || '',
    projectName: project.project_name || '',
    projectCode: project.project_code || '',
    billingRate: project.billing_rate ? project.billing_rate.toString() : ''
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await database.updateClientProject(project.id, {
        client_name: formData.clientName,
        project_name: formData.projectName,
        project_code: formData.projectCode,
        billing_rate: formData.billingRate ? parseFloat(formData.billingRate) : null
      })

      if (error) throw error
      
      alert('Project updated successfully!')
      onSuccess()
    } catch (error) {
      console.error('Error updating project:', error)
      alert('Error updating project. Please try again.')
    }
    setLoading(false)
  }

  return (
    <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20">
      <h4 className="text-xl font-bold text-white mb-6">Edit Client Project</h4>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-white/80 font-medium mb-3">
            Client Name *
          </label>
          <input
            type="text"
            required
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-300"
            value={formData.clientName}
            onChange={(e) => setFormData({...formData, clientName: e.target.value})}
            placeholder="e.g., ABC Corporation, XYZ Inc"
          />
        </div>
        
        <div>
          <label className="block text-white/80 font-medium mb-3">
            Project Name *
          </label>
          <input
            type="text"
            required
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-300"
            value={formData.projectName}
            onChange={(e) => setFormData({...formData, projectName: e.target.value})}
            placeholder="e.g., Website Redesign, Mobile App"
          />
        </div>

        <div>
          <label className="block text-white/80 font-medium mb-3">
            Project Code (Optional)
          </label>
          <input
            type="text"
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-300"
            value={formData.projectCode}
            onChange={(e) => setFormData({...formData, projectCode: e.target.value})}
            placeholder="e.g., ABC-001, PROJ-2024-001"
          />
        </div>

        <div>
          <label className="block text-white/80 font-medium mb-3">
            Billing Rate ($/hour) (Optional)
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/60">$</span>
            <input
              type="number"
              step="0.01"
              min="0"
              className="w-full pl-8 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-300"
              value={formData.billingRate}
              onChange={(e) => setFormData({...formData, billingRate: e.target.value})}
              placeholder="75.00"
            />
          </div>
          <p className="text-white/50 text-xs mt-2">Client billing rate for this project</p>
        </div>

        <div className="flex space-x-4">
          <button
            type="submit"
            disabled={loading}
            className="bg-gradient-to-r from-yellow-500 to-orange-600 text-white py-3 px-6 rounded-xl font-medium hover:from-yellow-600 hover:to-orange-700 transition-all duration-300 hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex-1"
          >
            {loading ? 'Updating...' : 'Update Project'}
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

function TimeManagementTab({ employees, locations, organizationId, onDataChange }) {
  const [timeSessions, setTimeSessions] = useState([])
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [showEditModal, setShowEditModal] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedSession, setSelectedSession] = useState(null)

  // Set default dates (current week)
  useEffect(() => {
    const now = new Date()
    const startOfWeek = new Date(now)
    // Get Monday as start of week
    const dayOfWeek = now.getDay()
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    startOfWeek.setDate(now.getDate() - daysFromMonday)
    startOfWeek.setHours(0, 0, 0, 0)
    
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)
    endOfWeek.setHours(23, 59, 59, 999)
    
    setStartDate(startOfWeek.toISOString().split('T')[0])
    setEndDate(endOfWeek.toISOString().split('T')[0])
  }, [])

  const loadTimeSessions = async () => {
    if (!startDate || !endDate) return
    
    setLoading(true)
    try {
      const { data, error } = await database.getAllTimeSessions(organizationId, startDate, endDate)
      if (error) throw error
      setTimeSessions(data || [])
    } catch (error) {
      console.error('Error loading time sessions:', error)
      alert('Error loading time sessions. Please try again.')
    }
    setLoading(false)
  }

  useEffect(() => {
    loadTimeSessions()
  }, [startDate, endDate, organizationId])

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const { data, error } = await database.getClientProjects(organizationId)
        if (error) throw error
        setProjects(data || [])
      } catch (error) {
        console.error('Error loading projects:', error)
      }
    }
    loadProjects()
  }, [organizationId])

  const formatDuration = (clockIn, clockOut) => {
    if (!clockIn || !clockOut) return '0h 0m'
    const start = new Date(clockIn)
    const end = new Date(clockOut)
    const diff = end - start
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}h ${minutes}m`
  }

  const handleEdit = (session) => {
    setSelectedSession(session)
    setShowEditModal(true)
  }

  const handleDelete = (session) => {
    setSelectedSession(session)
    setShowDeleteModal(true)
  }

  const confirmDelete = async () => {
    if (!selectedSession) return
    
    try {
      const { error } = await database.deleteTimeSession(selectedSession.id)
      if (error) throw error
      
      setShowDeleteModal(false)
      setSelectedSession(null)
      await loadTimeSessions()
      onDataChange()
      alert('Time entry deleted successfully!')
    } catch (error) {
      console.error('Error deleting time session:', error)
      alert('Error deleting time entry. Please try again.')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20">
        <div className="flex items-center space-x-3 mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-600 rounded-2xl flex items-center justify-center text-white text-xl shadow-lg">
            ⏰
          </div>
          <h3 className="text-2xl font-bold text-white">Time Management</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-white/80 font-medium mb-3">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-300"
            />
          </div>

          <div>
            <label className="block text-white/80 font-medium mb-3">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-300"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                setShowEditModal(false)
                setSelectedSession(null)
                setShowAddModal(true)
              }}
              className="bg-gradient-to-r from-green-500 to-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:from-green-600 hover:to-blue-700 transition-all duration-300 hover:scale-105 shadow-lg w-full"
            >
              ➕ Add Entry
            </button>
          </div>
        </div>
      </div>

      {/* Time Sessions List */}
      <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20">
        <h4 className="text-xl font-bold text-white mb-6">Time Entries ({timeSessions.length})</h4>
        
        {loading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-white/70">Loading time sessions...</p>
          </div>
        ) : timeSessions.length > 0 ? (
          <div className="space-y-4">
            {timeSessions.map((session) => (
              <div 
                key={session.id} 
                className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
                      {session.first_name[0]}{session.last_name[0]}
                    </div>
                    <div>
                      <p className="font-bold text-xl text-white">{session.first_name} {session.last_name}</p>
                      <p className="text-white/70 text-sm">
                        {new Date(session.clock_in).toLocaleDateString()} • {session.location_name}
                      </p>
                      {session.project_name && session.project_name !== 'No Project' && (
                        <p className="text-green-300 text-xs font-medium">
                          🎯 Project: {session.project_name}
                        </p>
                      )}
                      <p className="text-white/60 text-xs">
                        {new Date(session.clock_in).toLocaleTimeString()} - {session.clock_out ? new Date(session.clock_out).toLocaleTimeString() : 'In Progress'}
                      </p>
                      {session.notes && (
                        <p className="text-blue-300 text-xs mt-1 bg-white/5 rounded p-2 border border-white/10">
                          📝 {session.notes}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <p className="font-mono text-2xl font-bold text-green-400">
                        {formatDuration(session.clock_in, session.clock_out)}
                      </p>
                      <p className="text-white/60 text-sm">
                        {session.clock_out ? 'Completed' : 'Active'}
                      </p>
                    </div>
                    <div className="flex flex-col space-y-2">
                      <button
                        onClick={() => handleEdit(session)}
                        className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-300 hover:scale-105 shadow-lg text-sm"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => handleDelete(session)}
                        className="bg-gradient-to-r from-red-500 to-pink-600 text-white px-4 py-2 rounded-lg font-medium hover:from-red-600 hover:to-pink-700 transition-all duration-300 hover:scale-105 shadow-lg text-sm"
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
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📭</div>
            <p className="text-white/70 text-lg">No time entries found for selected period</p>
            <p className="text-white/50 text-sm mt-2">Try adjusting the date range or add a new entry</p>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {showEditModal && selectedSession && (
        <EditTimeModal
          session={selectedSession}
          employees={employees}
          locations={locations}
          projects={projects}
          onSave={async (updatedSession) => {
            try {
              const { error } = await database.updateTimeSession(selectedSession.id, updatedSession)
              if (error) throw error
              setShowEditModal(false)
              setSelectedSession(null)
              await loadTimeSessions()
              onDataChange()
              alert('Time entry updated successfully!')
            } catch (error) {
              console.error('Error updating time session:', error)
              alert('Error updating time entry. Please try again.')
            }
          }}
          onCancel={() => {
            setShowEditModal(false)
            setSelectedSession(null)
          }}
        />
      )}

      {/* Add Modal */}
      {showAddModal && (
        <AddTimeModal
          employees={employees}
          locations={locations}
          projects={projects}
          onSave={async (newSession) => {
            try {
              const { error } = await database.createTimeSession(newSession)
              if (error) throw error
              setShowAddModal(false)
              await loadTimeSessions()
              onDataChange()
              alert('Time entry added successfully!')
            } catch (error) {
              console.error('Error creating time session:', error)
              alert('Error adding time entry. Please try again.')
            }
          }}
          onCancel={() => setShowAddModal(false)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedSession && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-8 max-w-md w-full shadow-2xl border border-white/20">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-pink-600 rounded-2xl flex items-center justify-center text-white text-xl shadow-lg">
                  🗑️
                </div>
                <h3 className="text-2xl font-bold text-gray-800">Delete Time Entry</h3>
              </div>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-600 hover:text-gray-800 transition-colors"
              >
                ×
              </button>
            </div>

            <div className="space-y-6">
              <p className="text-gray-700">
                Are you sure you want to delete this time entry for <strong>{selectedSession.first_name} {selectedSession.last_name}</strong>?
              </p>
              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <p className="text-red-800 text-sm">
                  <strong>Warning:</strong> This action cannot be undone. The time entry will be permanently removed.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={confirmDelete}
                  className="bg-gradient-to-r from-red-500 to-pink-600 text-white py-3 rounded-xl font-medium hover:from-red-600 hover:to-pink-700 transition-all duration-300 hover:scale-105 shadow-lg"
                >
                  🗑️ Delete
                </button>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="bg-gray-100 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-200 transition-all duration-300"
                >
                  ❌ Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function EditTimeModal({ session, employees, locations, projects, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    employee_id: session.employee_id,
    location_id: session.location_id || '',
    project_id: session.project_id || '',
    clock_in: new Date(session.clock_in).toISOString().slice(0, 16),
    clock_out: session.clock_out ? new Date(session.clock_out).toISOString().slice(0, 16) : '',
    notes: session.notes || ''
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    const updatedSession = {
      employee_id: formData.employee_id,
      location_id: formData.location_id || null,
      project_id: formData.project_id || null,
      clock_in: new Date(formData.clock_in).toISOString(),
      clock_out: formData.clock_out ? new Date(formData.clock_out).toISOString() : null,
      notes: formData.notes || null
    }

    console.log('EditTimeModal - Saving session with data:', updatedSession)
    await onSave(updatedSession)
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-8 max-w-md w-full shadow-2xl border border-white/20 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center text-white text-xl shadow-lg">
              ✏️
            </div>
            <h3 className="text-2xl font-bold text-gray-800">Edit Time Entry</h3>
          </div>
          <button
            onClick={onCancel}
            className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-600 hover:text-gray-800 transition-colors"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-gray-700 font-medium mb-3">
              👤 Employee
            </label>
            <select
              value={formData.employee_id}
              onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
              required
            >
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.first_name} {emp.last_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-3">
              📍 Location
            </label>
            <select
              value={formData.location_id}
              onChange={(e) => setFormData({ ...formData, location_id: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
            >
              <option value="">Select location</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-3">
              🎯 Project (Optional)
            </label>
            <select
              value={formData.project_id}
              onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
            >
              <option value="">No project assigned</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.project_name}
                </option>
              ))}
            </select>
            {projects.length === 0 && (
              <p className="text-gray-500 text-sm mt-2">
                💡 No projects available. Create projects in the Client Projects tab.
              </p>
            )}
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-3">
              🕘 Clock In
            </label>
            <input
              type="datetime-local"
              value={formData.clock_in}
              onChange={(e) => setFormData({ ...formData, clock_in: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-3">
              🕘 Clock Out (optional)
            </label>
            <input
              type="datetime-local"
              value={formData.clock_out}
              onChange={(e) => setFormData({ ...formData, clock_out: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-3">
              📝 Notes (optional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 resize-none"
              rows="3"
              placeholder="Work notes or memo..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              type="submit"
              disabled={loading}
              className="bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 rounded-xl font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-300 hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Saving...</span>
                </span>
              ) : (
                '💾 Save Changes'
              )}
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="bg-gray-100 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-200 transition-all duration-300 disabled:opacity-50"
            >
              ❌ Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function AddTimeModal({ employees, locations, projects, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    employee_id: '',
    location_id: '',
    project_id: '',
    clock_in: '',
    clock_out: '',
    notes: ''
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    const newSession = {
      employee_id: formData.employee_id,
      location_id: formData.location_id || null,
      project_id: formData.project_id || null,
      clock_in: new Date(formData.clock_in).toISOString(),
      clock_out: formData.clock_out ? new Date(formData.clock_out).toISOString() : null,
      notes: formData.notes || null
    }

    console.log('AddTimeModal - Creating session with data:', newSession)
    await onSave(newSession)
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-8 max-w-md w-full shadow-2xl border border-white/20 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-blue-600 rounded-2xl flex items-center justify-center text-white text-xl shadow-lg">
              ➕
            </div>
            <h3 className="text-2xl font-bold text-gray-800">Add Time Entry</h3>
          </div>
          <button
            onClick={onCancel}
            className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-600 hover:text-gray-800 transition-colors"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-gray-700 font-medium mb-3">
              👤 Employee
            </label>
            <select
              value={formData.employee_id}
              onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300"
              required
            >
              <option value="">Select employee</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.first_name} {emp.last_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-3">
              📍 Location
            </label>
            <select
              value={formData.location_id}
              onChange={(e) => setFormData({ ...formData, location_id: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300"
            >
              <option value="">Select location</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-3">
              🎯 Project (Optional)
            </label>
            <select
              value={formData.project_id}
              onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300"
            >
              <option value="">No project assigned</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.project_name}
                </option>
              ))}
            </select>
            {projects.length === 0 && (
              <p className="text-gray-500 text-sm mt-2">
                💡 No projects available. Create projects in the Client Projects tab.
              </p>
            )}
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-3">
              🕘 Clock In
            </label>
            <input
              type="datetime-local"
              value={formData.clock_in}
              onChange={(e) => setFormData({ ...formData, clock_in: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300"
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-3">
              🕘 Clock Out (optional)
            </label>
            <input
              type="datetime-local"
              value={formData.clock_out}
              onChange={(e) => setFormData({ ...formData, clock_out: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-3">
              📝 Notes (optional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300 resize-none"
              rows="3"
              placeholder="Work notes or memo..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              type="submit"
              disabled={loading || !formData.employee_id || !formData.clock_in}
              className="bg-gradient-to-r from-green-500 to-blue-600 text-white py-3 rounded-xl font-medium hover:from-green-600 hover:to-blue-700 transition-all duration-300 hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Adding...</span>
                </span>
              ) : (
                '➕ Add Entry'
              )}
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="bg-gray-100 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-200 transition-all duration-300 disabled:opacity-50"
            >
              ❌ Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ProjectLocationModal({ project, organizationId, onSuccess, onCancel }) {
  const [locations, setLocations] = useState([])
  const [projectLocations, setProjectLocations] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadLocations()
    loadProjectLocations()
  }, [])

  const loadLocations = async () => {
    try {
      const { data, error } = await database.getLocations(organizationId)
      if (error) throw error
      setLocations(data || [])
    } catch (error) {
      console.error('Error loading locations:', error)
    }
  }

  const loadProjectLocations = async () => {
    try {
      const { data, error } = await database.getProjectLocations(project.id)
      if (error) throw error
      setProjectLocations(data || [])
    } catch (error) {
      console.error('Error loading project locations:', error)
    }
  }

  const handleAddLocation = async (locationId) => {
    setLoading(true)
    try {
      const isFirst = projectLocations.length === 0
      const { error } = await database.addProjectLocation(project.id, locationId, isFirst)
      if (error) throw error
      
      await loadProjectLocations()
      alert('Location added successfully!')
    } catch (error) {
      console.error('Error adding location:', error)
      alert('Error adding location. Please try again.')
    }
    setLoading(false)
  }

  const handleRemoveLocation = async (locationId) => {
    if (!confirm('Are you sure you want to remove this location from the project?')) return
    
    setLoading(true)
    try {
      const { error } = await database.removeProjectLocation(project.id, locationId)
      if (error) throw error
      
      await loadProjectLocations()
      alert('Location removed successfully!')
    } catch (error) {
      console.error('Error removing location:', error)
      alert('Error removing location. Please try again.')
    }
    setLoading(false)
  }

  const handleSetPrimary = async (locationId) => {
    setLoading(true)
    try {
      const { error } = await database.setPrimaryProjectLocation(project.id, locationId)
      if (error) throw error
      
      await loadProjectLocations()
      alert('Primary location updated successfully!')
    } catch (error) {
      console.error('Error setting primary location:', error)
      alert('Error setting primary location. Please try again.')
    }
    setLoading(false)
  }

  const assignedLocationIds = projectLocations.map(pl => pl.location_id)
  const availableLocations = locations.filter(loc => !assignedLocationIds.includes(loc.id))

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-8 max-w-2xl w-full max-h-[80vh] overflow-hidden shadow-2xl border border-white/20">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center text-white text-xl shadow-lg">
              📍
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-800">Manage Locations</h3>
              <p className="text-gray-600">{project.project_name}</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-600 hover:text-gray-800 transition-colors"
          >
            ×
          </button>
        </div>

        <div className="overflow-y-auto max-h-96 space-y-6">
          {/* Current Locations */}
          <div>
            <h4 className="text-lg font-semibold text-gray-800 mb-4">Assigned Locations</h4>
            {projectLocations.length > 0 ? (
              <div className="space-y-3">
                {projectLocations.map((pl) => (
                  <div 
                    key={pl.id} 
                    className="bg-white rounded-xl p-4 border border-gray-200 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-blue-500 rounded-xl flex items-center justify-center text-white font-bold text-sm">
                          📍
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">
                            {pl.location.name}
                            {pl.is_primary && <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">Primary</span>}
                          </p>
                          {pl.location.address && (
                            <p className="text-sm text-gray-600">{pl.location.address}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        {!pl.is_primary && (
                          <button
                            onClick={() => handleSetPrimary(pl.location_id)}
                            disabled={loading}
                            className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                          >
                            Set Primary
                          </button>
                        )}
                        <button
                          onClick={() => handleRemoveLocation(pl.location_id)}
                          disabled={loading}
                          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">📍</div>
                <p>No locations assigned to this project</p>
              </div>
            )}
          </div>

          {/* Available Locations */}
          {availableLocations.length > 0 && (
            <div>
              <h4 className="text-lg font-semibold text-gray-800 mb-4">Add Locations</h4>
              <div className="space-y-3">
                {availableLocations.map((location) => (
                  <div 
                    key={location.id} 
                    className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-gray-400 to-gray-500 rounded-xl flex items-center justify-center text-white font-bold text-sm">
                          📍
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">{location.name}</p>
                          {location.address && (
                            <p className="text-sm text-gray-600">{location.address}</p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleAddLocation(location.id)}
                        disabled={loading}
                        className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end space-x-4">
          <button
            onClick={onSuccess}
            className="bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-6 rounded-xl font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-300 hover:scale-105 shadow-lg"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
