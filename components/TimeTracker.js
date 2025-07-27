import { useState, useEffect } from 'react'
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

  useEffect(() => {
    // Update current time every second
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    // Load initial data
    loadData()

    return () => clearInterval(timer)
  }, [])

  const loadData = async () => {
    try {
      // Load current session
      const { data: sessionData } = await database.getCurrentSession(employee.id)
      setCurrentSession(sessionData)

      // Load locations
      const { data: locationsData } = await database.getLocations(employee.organization_id)
      setLocations(locationsData || [])
    } catch (error) {
      console.error('Error loading data:', error)
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
      const { data, error } = await database.clockOut(currentSession.id)
      if (error) throw error
      
      setCurrentSession(null)
      setIsOnBreak(false)
      setBreakStartTime(null)
      alert('Clocked out successfully!')
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
        <div className="relative px-6 py-8">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <span className="text-2xl">⏰</span>
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-white mb-1">Time Tracker</h1>
                  <p className="text-white/80 text-lg">{formatDate(currentTime)}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  {employee.first_name[0]}{employee.last_name[0]}
                </div>
                <span className="text-white/90 font-medium">{employee.first_name} {employee.last_name}</span>
                <span className="px-2 py-1 bg-white/10 rounded-full text-xs text-white/80 font-medium">{employee.organization?.name}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-mono text-white mb-2">{formatTime(currentTime)}</div>
              <button
                onClick={() => auth.signOut()}
                className="text-sm text-white/80 hover:text-white transition-colors"
              >
                Sign Out
              </button>
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
    </div>
  )
}