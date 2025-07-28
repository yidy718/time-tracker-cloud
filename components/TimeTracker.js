import { useState, useEffect, useCallback } from 'react'
import { database, auth } from '../lib/supabase'

export default function TimeTracker({ session, employee }) {
  const [currentSession, setCurrentSession] = useState(null)
  const [locations, setLocations] = useState([])
  const [selectedLocation, setSelectedLocation] = useState('')
  const [currentTime, setCurrentTime] = useState(new Date())
  const [loading, setLoading] = useState(false)
  const [showBreakModal, setShowBreakModal] = useState(false)
  const [breakReason, setBreakReason] = useState('')
  const [isOnBreak, setIsOnBreak] = useState(false)
  const [breakStartTime, setBreakStartTime] = useState(null)
  const [showMenu, setShowMenu] = useState(false)
  const [showPasswordChange, setShowPasswordChange] = useState(false)
  const [totalHours, setTotalHours] = useState(0)
  const [showWeeklyActivities, setShowWeeklyActivities] = useState(false)
  const [weeklyActivities, setWeeklyActivities] = useState([])
  const [showClockOutModal, setShowClockOutModal] = useState(false)
  const [clockOutMemo, setClockOutMemo] = useState('')

  const loadTotalHours = useCallback(async () => {
    try {
      const now = new Date()
      const startOfWeek = new Date(now)
      // Get Monday as start of week (getDay() returns 0=Sunday, 1=Monday, etc.)
      const dayOfWeek = now.getDay()
      const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // Sunday becomes 6, others become dayOfWeek-1
      startOfWeek.setDate(now.getDate() - daysFromMonday)
      startOfWeek.setHours(0, 0, 0, 0)
      
      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(startOfWeek.getDate() + 6)
      endOfWeek.setHours(23, 59, 59, 999)
      
      const { data } = await database.getTimeReport({
        organization_id: employee.organization_id,
        employee_id: employee.id,
        start_date: startOfWeek.toISOString().split('T')[0],
        end_date: endOfWeek.toISOString().split('T')[0]
      })
      
      if (data) {
        const totalMinutes = data.reduce((sum, entry) => sum + (entry.duration_minutes || 0), 0)
        const hours = (totalMinutes / 60).toFixed(1)
        setTotalHours(hours)
        setWeeklyActivities(data)
      }
    } catch (error) {
      console.error('Error loading total hours:', error)
    }
  }, [employee.organization_id, employee.id])

  const loadData = useCallback(async () => {
    try {
      // Load current session
      const { data: sessionData } = await database.getCurrentSession(employee.id)
      setCurrentSession(sessionData)

      // Load locations
      console.log('Loading locations for organization:', employee.organization_id)
      const { data: locationsData, error: locationsError } = await database.getLocations(employee.organization_id)
      console.log('Locations result:', { locationsData, locationsError })
      setLocations(locationsData || [])

      // Load total hours for current week
      await loadTotalHours()
    } catch (error) {
      console.error('Error loading data:', error)
    }
  }, [employee.id, employee.organization_id, loadTotalHours])

  useEffect(() => {
    // Update current time every second
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    // Load initial data
    loadData()

    return () => clearInterval(timer)
  }, [loadData])

  const handleClockIn = async () => {
    if (!selectedLocation) {
      alert('Please select a location')
      return
    }

    setLoading(true)
    try {
      const { data, error } = await database.clockIn(employee.id, selectedLocation)
      if (error) throw error
      
      setCurrentSession(data)
      alert('Clocked in successfully!')
    } catch (error) {
      console.error('Clock in error:', error)
      alert('Error clocking in. Please try again.')
    }
    setLoading(false)
  }

  const handleClockOut = () => {
    if (!currentSession) return
    setShowClockOutModal(true)
  }

  const confirmClockOut = async () => {
    if (!currentSession) return

    setLoading(true)
    try {
      const { data, error } = await database.clockOut(currentSession.id, clockOutMemo.trim() || null)
      if (error) throw error
      
      setCurrentSession(null)
      setIsOnBreak(false)
      setBreakStartTime(null)
      setShowClockOutModal(false)
      setClockOutMemo('')
      alert('Clocked out successfully!')
      await loadTotalHours()
    } catch (error) {
      console.error('Clock out error:', error)
      alert('Error clocking out. Please try again.')
    }
    setLoading(false)
  }

  const handleStartBreak = () => {
    setShowBreakModal(true)
  }

  const handleEndBreak = () => {
    setIsOnBreak(false)
    setBreakStartTime(null)
    setBreakReason('')
    alert('Break ended!')
  }

  const confirmBreak = () => {
    if (!breakReason.trim()) {
      alert('Please enter a break reason')
      return
    }
    setIsOnBreak(true)
    setBreakStartTime(new Date())
    setShowBreakModal(false)
    alert('Break started!')
  }

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    })
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

  const getBreakDuration = () => {
    if (!breakStartTime) return '00:00:00'
    
    const start = breakStartTime
    const now = new Date()
    const diff = now - start
    
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((diff % (1000 * 60)) / 1000)
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-blue-600/20"></div>
        <div className="relative px-4 sm:px-6 py-6 sm:py-8">
          <div className="flex justify-between items-start">
            <div className="flex-1 min-w-0 pr-4">
              <div className="mb-4">
                <p className="text-white text-xl sm:text-2xl font-bold mb-1">{formatDate(currentTime)}</p>
                <p className="text-white/70 text-base sm:text-lg">{formatTime(currentTime)}</p>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xs sm:text-sm shadow-lg">
                  {employee.first_name[0]}{employee.last_name[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-white/90 font-semibold text-base sm:text-lg block truncate">{employee.first_name} {employee.last_name}</span>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="px-2 sm:px-3 py-1 bg-white/10 rounded-full text-xs text-white/80 font-medium truncate max-w-[150px]">{employee.organization?.name}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="text-right space-y-3 sm:space-y-4 flex-shrink-0">
              <div className="flex justify-end">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="group relative w-10 h-10 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center transition-all duration-300 hover:bg-white/20 hover:scale-105"
                >
                  <span className="text-lg transition-transform group-hover:rotate-90 duration-300">⚙️</span>
                </button>
              </div>
              
              <div>
                <div className="text-white/80 text-sm mb-1">This Week</div>
                <div className="text-2xl font-bold text-green-400">{totalHours}h</div>
              </div>
              
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
                          setShowWeeklyActivities(true)
                          setShowMenu(false)
                        }}
                        className="w-full flex items-center space-x-3 p-3 rounded-xl hover:bg-gray-50 transition-colors text-left"
                      >
                        <span className="text-lg">📊</span>
                        <span className="font-medium text-gray-700">Weekly Activities</span>
                      </button>
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

      <div className="px-6 pb-8 space-y-6">
        {/* Current Status */}
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20 text-center">
          <div className="mb-6">
            <span className={`px-6 py-3 rounded-full text-lg font-medium ${
              currentSession 
                ? isOnBreak 
                  ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30' 
                  : 'bg-green-500/20 text-green-300 border border-green-500/30'
                : 'bg-gray-500/20 text-gray-300 border border-gray-500/30'
            }`}>
              {currentSession 
                ? isOnBreak 
                  ? '🛌 On Break' 
                  : '✅ Clocked In'
                : '⏳ Ready to Clock In'
              }
            </span>
          </div>
          <div className="text-6xl font-mono font-bold text-white mb-4">
            {currentSession 
              ? isOnBreak 
                ? getBreakDuration() 
                : getSessionDuration() 
              : '00:00:00'
            }
          </div>
          {currentSession && !isOnBreak && (
            <div className="text-white/60 text-sm">
              Started: {new Date(currentSession.clock_in).toLocaleString()}
            </div>
          )}
          {isOnBreak && (
            <div className="text-white/60 text-sm">
              Break: {breakReason} • Started: {breakStartTime?.toLocaleTimeString()}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-4">
          {!currentSession ? (
            // Clock In Section
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-blue-600 rounded-2xl flex items-center justify-center text-white text-xl shadow-lg">
                  🚀
                </div>
                <h3 className="text-2xl font-bold text-white">Clock In</h3>
              </div>
              <div className="space-y-6">
                <div>
                  <label className="block text-white/80 font-medium mb-3">
                    Select Location
                  </label>
                  <select
                    value={selectedLocation}
                    onChange={(e) => setSelectedLocation(e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300"
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
                  disabled={loading || !selectedLocation}
                  className="bg-gradient-to-r from-green-500 to-blue-600 text-white py-4 px-8 rounded-xl font-medium hover:from-green-600 hover:to-blue-700 transition-all duration-300 hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed w-full"
                >
                  {loading ? 'Clocking In...' : '🚀 Clock In'}
                </button>
              </div>
            </div>
          ) : (
            // Working Section
            <div className="space-y-4">
              <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center text-white text-xl shadow-lg">
                    💼
                  </div>
                  <h3 className="text-2xl font-bold text-white">Currently Working</h3>
                </div>
                <div className="space-y-4">
                  {!isOnBreak ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <button
                        onClick={handleStartBreak}
                        className="bg-gradient-to-r from-orange-500 to-red-600 text-white py-4 px-6 rounded-xl font-medium hover:from-orange-600 hover:to-red-700 transition-all duration-300 hover:scale-105 shadow-lg"
                      >
                        🛌 Start Break
                      </button>
                      <button
                        onClick={handleClockOut}
                        disabled={loading}
                        className="bg-gradient-to-r from-red-500 to-pink-600 text-white py-4 px-6 rounded-xl font-medium hover:from-red-600 hover:to-pink-700 transition-all duration-300 hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading ? 'Clocking Out...' : '🚪 Clock Out'}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleEndBreak}
                      className="bg-gradient-to-r from-green-500 to-blue-600 text-white py-4 px-8 rounded-xl font-medium hover:from-green-600 hover:to-blue-700 transition-all duration-300 hover:scale-105 shadow-lg w-full"
                    >
                      ✅ End Break
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-white/60 text-sm pb-6">
          Made with ❤️ by yidy
        </div>
      </div>

      {/* Break Modal */}
      {showBreakModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-8 max-w-md w-full shadow-2xl border border-white/20">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center text-white text-xl shadow-lg">
                  🛌
                </div>
                <h3 className="text-2xl font-bold text-gray-800">Start Break</h3>
              </div>
              <button
                onClick={() => setShowBreakModal(false)}
                className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-600 hover:text-gray-800 transition-colors"
              >
                ×
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-gray-700 font-medium mb-3">
                  Break Reason
                </label>
                <select
                  value={breakReason}
                  onChange={(e) => setBreakReason(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300"
                >
                  <option value="">Select a reason</option>
                  <option value="Lunch Break">🍽️ Lunch Break</option>
                  <option value="Coffee Break">☕ Coffee Break</option>
                  <option value="Restroom">🚻 Restroom</option>
                  <option value="Personal">👤 Personal</option>
                  <option value="Meeting">📋 Meeting</option>
                  <option value="Other">📝 Other</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={confirmBreak}
                  disabled={!breakReason}
                  className="bg-gradient-to-r from-orange-500 to-red-600 text-white py-3 rounded-xl font-medium hover:from-orange-600 hover:to-red-700 transition-all duration-300 hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  🛌 Start Break
                </button>
                <button
                  onClick={() => setShowBreakModal(false)}
                  className="bg-gray-100 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-200 transition-all duration-300"
                >
                  ❌ Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Password Change Modal */}
      {showPasswordChange && (
        <PasswordChangeModal 
          onClose={() => setShowPasswordChange(false)}
        />
      )}

      {/* Weekly Activities Modal */}
      {showWeeklyActivities && (
        <WeeklyActivitiesModal 
          activities={weeklyActivities}
          employee={employee}
          onClose={() => setShowWeeklyActivities(false)}
        />
      )}

      {/* Clock Out Modal */}
      {showClockOutModal && (
        <ClockOutModal 
          memo={clockOutMemo}
          onMemoChange={setClockOutMemo}
          onConfirm={confirmClockOut}
          onCancel={() => {
            setShowClockOutModal(false)
            setClockOutMemo('')
          }}
          loading={loading}
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

function WeeklyActivitiesModal({ activities, employee, onClose }) {
  const formatDuration = (minutes) => {
    if (isNaN(minutes) || minutes < 0) {
      return '0h 0m'
    }
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m`
  }

  const getTotalHours = () => {
    const totalMinutes = activities.reduce((sum, entry) => sum + (entry.duration_minutes || 0), 0)
    return formatDuration(totalMinutes)
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-8 max-w-4xl w-full max-h-[80vh] overflow-hidden shadow-2xl border border-white/20">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center text-white text-xl shadow-lg">
              📊
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-800">Weekly Activities</h3>
              <p className="text-gray-600">{employee.first_name} {employee.last_name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-600 hover:text-gray-800 transition-colors"
          >
            ×
          </button>
        </div>

        {/* Summary */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-gray-600 text-sm">Total Entries</p>
              <p className="text-2xl font-bold text-gray-800">{activities.length}</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">Total Hours</p>
              <p className="text-2xl font-bold text-blue-600">{getTotalHours()}</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">Average per Day</p>
              <p className="text-2xl font-bold text-purple-600">
                {activities.length > 0 ? formatDuration(Math.round(activities.reduce((sum, entry) => sum + (entry.duration_minutes || 0), 0) / Math.max(activities.length, 1))) : '0h 0m'}
              </p>
            </div>
          </div>
        </div>

        {/* Activities List */}
        <div className="overflow-y-auto max-h-96">
          {activities.length > 0 ? (
            <div className="space-y-3">
              {activities.map((activity, index) => (
                <div 
                  key={activity.id || index} 
                  className="bg-white rounded-xl p-4 border border-gray-200 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-blue-500 rounded-xl flex items-center justify-center text-white font-bold text-sm">
                        {new Date(activity.clock_in).getDate()}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">
                          {new Date(activity.clock_in).toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </p>
                        <p className="text-sm text-gray-600">
                          📍 {activity.location_name || 'N/A'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-xl font-bold text-blue-600">
                        {formatDuration(activity.duration_minutes || 0)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {new Date(activity.clock_in).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {activity.clock_out ? new Date(activity.clock_out).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'In Progress'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📭</div>
              <p className="text-gray-500 text-lg">No activities recorded this week</p>
              <p className="text-gray-400 text-sm mt-2">Clock in to start tracking your time!</p>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-6 rounded-xl font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-300 hover:scale-105 shadow-lg"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

function ClockOutModal({ memo, onMemoChange, onConfirm, onCancel, loading }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-8 max-w-md w-full shadow-2xl border border-white/20">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-pink-600 rounded-2xl flex items-center justify-center text-white text-xl shadow-lg">
              🚪
            </div>
            <h3 className="text-2xl font-bold text-gray-800">Clock Out</h3>
          </div>
          <button
            onClick={onCancel}
            className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-600 hover:text-gray-800 transition-colors"
          >
            ×
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-gray-700 font-medium mb-3">
              📝 Add a memo about what you accomplished today (optional)
            </label>
            <textarea
              value={memo}
              onChange={(e) => onMemoChange(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-300 resize-none"
              rows="4"
              placeholder="What did you work on today? Any notes for your manager..."
            />
          </div>

          <div className="text-sm text-gray-500 bg-blue-50 p-3 rounded-lg">
            💡 <strong>Tip:</strong> Adding work notes helps your manager understand your daily contributions and can be useful for performance reviews.
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={onConfirm}
              disabled={loading}
              className="bg-gradient-to-r from-red-500 to-pink-600 text-white py-3 rounded-xl font-medium hover:from-red-600 hover:to-pink-700 transition-all duration-300 hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Clocking Out...</span>
                </span>
              ) : (
                '🚪 Clock Out'
              )}
            </button>
            <button
              onClick={onCancel}
              disabled={loading}
              className="bg-gray-100 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-200 transition-all duration-300 disabled:opacity-50"
            >
              ❌ Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}