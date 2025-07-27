import { useState, useEffect } from 'react'
import { database, auth } from '../lib/supabase'

export default function TimeTracker({ session, employee }) {
  const [currentSession, setCurrentSession] = useState(null)
  const [locations, setLocations] = useState([])
  const [selectedLocation, setSelectedLocation] = useState('')
  const [currentTime, setCurrentTime] = useState(new Date())
  const [loading, setLoading] = useState(false)
  const [showPasswordChange, setShowPasswordChange] = useState(false)
  const [isOnBreak, setIsOnBreak] = useState(false)
  const [breakStartTime, setBreakStartTime] = useState(null)
  const [showMenu, setShowMenu] = useState(false)
  const [weeklyHours, setWeeklyHours] = useState('0:00')

  useEffect(() => {
    // Update current time every second
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    // Load initial data
    loadData()

    // Close menu when clicking outside
    const handleClickOutside = (event) => {
      if (showMenu && !event.target.closest('.relative')) {
        setShowMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      clearInterval(timer)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showMenu])

  const loadData = async () => {
    try {
      // Load current session
      const { data: sessionData } = await database.getCurrentSession(employee.id)
      setCurrentSession(sessionData)

      // Load locations
      const { data: locationsData } = await database.getLocations(employee.organization_id)
      setLocations(locationsData || [])

      // Load weekly hours
      await loadWeeklyHours()
    } catch (error) {
      console.error('Error loading data:', error)
    }
  }

  const loadWeeklyHours = async () => {
    try {
      // Get Monday of current week
      const now = new Date()
      const dayOfWeek = now.getDay()
      const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1) // Adjust for Sunday
      const monday = new Date(now.setDate(diff))
      monday.setHours(0, 0, 0, 0)
      
      const sunday = new Date(monday)
      sunday.setDate(monday.getDate() + 6)
      sunday.setHours(23, 59, 59, 999)

      const { data: weeklyData } = await database.getWeeklyHours(
        employee.organization_id,
        monday.toISOString(),
        sunday.toISOString(),
        [employee.id]
      )

      if (weeklyData && weeklyData.length > 0) {
        // Calculate total work hours for the week
        const totalMinutes = weeklyData.reduce((total, session) => {
          if (session.clock_out) {
            const clockIn = new Date(session.clock_in)
            const clockOut = new Date(session.clock_out)
            const sessionMinutes = (clockOut - clockIn) / (1000 * 60)
            
            // Subtract break time if exists
            let breakMinutes = 0
            if (session.break_start && session.break_end) {
              const breakStart = new Date(session.break_start)
              const breakEnd = new Date(session.break_end)
              breakMinutes = (breakEnd - breakStart) / (1000 * 60)
            }
            
            return total + (sessionMinutes - breakMinutes)
          }
          return total
        }, 0)

        const hours = Math.floor(totalMinutes / 60)
        const minutes = Math.floor(totalMinutes % 60)
        setWeeklyHours(`${hours}:${minutes.toString().padStart(2, '0')}`)
      }
    } catch (error) {
      console.error('Error loading weekly hours:', error)
    }
  }

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
      await loadWeeklyHours() // Refresh weekly hours
    } catch (error) {
      console.error('Clock in error:', error)
      alert('Error clocking in. Please try again.')
    }
    setLoading(false)
  }

  const handleClockOut = async () => {
    if (!currentSession) return

    setLoading(true)
    try {
      // End break if currently on break
      if (isOnBreak && breakStartTime) {
        const breakEnd = new Date()
        await database.addBreakPeriod(
          currentSession.id, 
          breakStartTime.toISOString(), 
          breakEnd.toISOString()
        )
      }

      const { data, error } = await database.clockOut(currentSession.id)
      if (error) throw error
      
      setCurrentSession(null)
      setIsOnBreak(false)
      setBreakStartTime(null)
      alert('Clocked out successfully!')
      await loadWeeklyHours() // Refresh weekly hours
    } catch (error) {
      console.error('Clock out error:', error)
      alert('Error clocking out. Please try again.')
    }
    setLoading(false)
  }

  const handleStartBreak = () => {
    if (!currentSession || isOnBreak) return

    // Just track break state locally, no database call needed
    setIsOnBreak(true)
    setBreakStartTime(new Date())
    alert('Break started!')
  }

  const handleEndBreak = async () => {
    if (!currentSession || !isOnBreak || !breakStartTime) {
      console.log('End break validation failed:', { currentSession, isOnBreak, breakStartTime })
      return
    }

    setLoading(true)
    try {
      // Now save the completed break period to database
      const breakEnd = new Date()
      console.log('Ending break:', {
        sessionId: currentSession.id,
        breakStart: breakStartTime.toISOString(),
        breakEnd: breakEnd.toISOString()
      })
      
      const { data, error } = await database.addBreakPeriod(
        currentSession.id, 
        breakStartTime.toISOString(), 
        breakEnd.toISOString()
      )
      
      if (error) {
        console.error('Database error:', error)
        throw error
      }
      
      console.log('Break ended successfully:', data)
      setIsOnBreak(false)
      setBreakStartTime(null)
      alert('Break ended!')
    } catch (error) {
      console.error('End break error:', error)
      alert(`Error ending break: ${error.message || 'Please try again.'}`)
    }
    setLoading(false)
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

  return (
    <div className="container-app">
      {/* Header */}
      <div className="app-header fade-in">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2">⏰ Time Tracker</h1>
            <p className="text-white/80 text-lg mb-2">{formatDate(currentTime)}</p>
            <div className="text-2xl font-mono font-bold">{formatTime(currentTime)}</div>
          </div>
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="text-white/80 hover:text-white transition-colors p-3 rounded-full hover:bg-white/10 flex items-center justify-center"
              style={{ minWidth: '48px', minHeight: '48px' }}
            >
              ⚙️
            </button>
            
            {showMenu && (
              <>
                <div 
                  className="fixed inset-0 z-[9999]" 
                  onClick={() => setShowMenu(false)}
                />
                <div className="menu-dropdown">
                  <button
                    onClick={() => {
                      setShowPasswordChange(true)
                      setShowMenu(false)
                    }}
                    className="menu-item"
                  >
                    🔑 Change Password
                  </button>
                  <button
                    onClick={() => auth.signOut()}
                    className="menu-item border-t border-gray-100"
                  >
                    🚪 Sign Out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center max-w-md mx-auto space-y-6">
        {/* Employee Info */}
        <div className="card slide-in employee-info">
          <div className="employee-avatar">👤</div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-1">
              {employee.first_name} {employee.last_name}
            </h2>
            <p className="text-white/80 text-lg">{employee.organization?.name}</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-white/80 mb-1">This Week</div>
            <div className="text-2xl font-bold font-mono">{weeklyHours}</div>
          </div>
        </div>

        {/* Current Status */}
        <div className="card text-center fade-in">
          <div className="mb-6">
            <span className={`status-badge ${
              isOnBreak ? 'status-on-break' : 
              currentSession ? 'status-clocked-in' : 'status-clocked-out'
            }`}>
              {isOnBreak ? '☕ On Break' : currentSession ? '✅ Clocked In' : '⏳ Ready to Clock In'}
            </span>
          </div>
          <div className="time-display">
            {currentSession ? getSessionDuration() : '00:00:00'}
          </div>
          {currentSession && !isOnBreak && (
            <div className="text-white/80 text-lg mt-4">
              Started: {new Date(currentSession.clock_in).toLocaleTimeString()}
            </div>
          )}
          {isOnBreak && breakStartTime && (
            <div className="text-white/80 text-lg mt-4">
              Break started: {breakStartTime.toLocaleTimeString()}
            </div>
          )}
        </div>

        {/* Clock In/Out Actions */}
        {!currentSession ? (
          // Clock In Section
          <div className="card slide-in">
            <h3 className="text-2xl font-bold mb-6 text-center">🚀 Ready to Start</h3>
            <div className="space-y-6">
              <div>
                <label className="form-label">
                  📍 Select Location
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
                disabled={loading || !selectedLocation}
                className="btn-success w-full text-xl py-4"
              >
                {loading ? (
                  <>
                    <span className="spinner"></span>
                    Clocking In...
                  </>
                ) : (
                  <>
                    ⏰ Clock In
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          // Clock Out Section
          <div className="card slide-in">
            <h3 className="text-2xl font-bold mb-6 text-center">
              {isOnBreak ? '☕ Break Time' : '💼 Currently Working'}
            </h3>
            <div className="action-buttons two-col">
              <button
                onClick={isOnBreak ? handleEndBreak : handleStartBreak}
                disabled={loading}
                className={`${isOnBreak ? 'btn-success' : 'btn-warning'} text-lg py-4`}
              >
                {loading ? (
                  <>
                    <span className="spinner"></span>
                    Loading...
                  </>
                ) : isOnBreak ? (
                  <>
                    ✅ End Break
                  </>
                ) : (
                  <>
                    ☕ Start Break
                  </>
                )}
              </button>
              <button
                onClick={handleClockOut}
                disabled={loading || isOnBreak}
                className="btn-danger text-lg py-4"
              >
                {loading ? (
                  <>
                    <span className="spinner"></span>
                    Clocking Out...
                  </>
                ) : (
                  <>
                    🏁 Clock Out
                  </>
                )}
              </button>
            </div>
            {isOnBreak && (
              <div className="text-center text-white/80 mt-4 p-4 bg-amber-500/20 rounded-2xl border border-amber-400/30">
                <p className="font-medium">⚠️ Finish your break before clocking out</p>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-white/60 mt-8 mb-4">
          <p className="text-lg">Made with ❤️ by yidy</p>
        </div>
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
      <div className="card-glass max-w-md w-full fade-in">
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-2xl font-bold">🔑 Change Password</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
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
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-800 text-sm font-medium">
                ❌ {error}
              </div>
            )}

            <div>
              <label className="form-label-admin">
                🔒 Current Password
              </label>
              <input
                type="password"
                required
                className="input-admin"
                value={formData.currentPassword}
                onChange={(e) => setFormData({...formData, currentPassword: e.target.value})}
                placeholder="Enter current password"
              />
            </div>

            <div>
              <label className="form-label-admin">
                🆕 New Password
              </label>
              <input
                type="password"
                required
                className="input-admin"
                value={formData.newPassword}
                onChange={(e) => setFormData({...formData, newPassword: e.target.value})}
                placeholder="Enter new password (min 6 characters)"
                minLength="6"
              />
            </div>

            <div>
              <label className="form-label-admin">
                ✅ Confirm New Password
              </label>
              <input
                type="password"
                required
                className="input-admin"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                placeholder="Confirm new password"
                minLength="6"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
              >
                {loading ? (
                  <>
                    <span className="spinner"></span>
                    Updating...
                  </>
                ) : (
                  '🔐 Update Password'
                )}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
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