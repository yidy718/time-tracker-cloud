import { useState, useEffect } from 'react'
import { database, auth } from '../lib/supabase'

export default function TimeTracker({ session, employee }) {
  const [currentSession, setCurrentSession] = useState(null)
  const [locations, setLocations] = useState([])
  const [selectedLocation, setSelectedLocation] = useState('')
  const [currentTime, setCurrentTime] = useState(new Date())
  const [loading, setLoading] = useState(false)

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
      alert('Clocked out successfully!')
    } catch (error) {
      console.error('Clock out error:', error)
      alert('Error clocking out. Please try again.')
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
      <div className="bg-gradient-primary text-white p-6 rounded-b-3xl shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold">Time Tracker</h1>
            <p className="text-white/80">{formatDate(currentTime)}</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-mono">{formatTime(currentTime)}</div>
            <button
              onClick={() => auth.signOut()}
              className="text-sm text-white/80 hover:text-white mt-1"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Employee Info */}
        <div className="card">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center text-white text-xl">
              👤
            </div>
            <div>
              <h2 className="text-lg font-semibold">
                {employee.first_name} {employee.last_name}
              </h2>
              <p className="text-gray-600">{employee.organization?.name}</p>
            </div>
          </div>
        </div>

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
        </div>

        {/* Clock In/Out Actions */}
        <div className="space-y-4">
          {!currentSession ? (
            // Clock In Section
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Clock In</h3>
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
                  disabled={loading || !selectedLocation}
                  className="btn-success w-full"
                >
                  {loading ? 'Clocking In...' : 'Clock In'}
                </button>
              </div>
            </div>
          ) : (
            // Clock Out Section
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Currently Working</h3>
              <div className="space-y-4">
                <div className="text-sm text-gray-600">
                  Started: {new Date(currentSession.clock_in).toLocaleString()}
                </div>
                <button
                  onClick={handleClockOut}
                  disabled={loading}
                  className="btn-danger w-full"
                >
                  {loading ? 'Clocking Out...' : 'Clock Out'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500 mt-8">
          Made with ❤️ by yidy
        </div>
      </div>
    </div>
  )
}