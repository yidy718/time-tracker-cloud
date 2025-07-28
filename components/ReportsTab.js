import { useState, useEffect } from 'react'
import { database } from '../lib/supabase'

export default function ReportsTab({ employees, organizationId }) {
  const [selectedEmployee, setSelectedEmployee] = useState('all')
  const [selectedLocation, setSelectedLocation] = useState('all')
  const [locations, setLocations] = useState([])
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reportData, setReportData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showShareOptions, setShowShareOptions] = useState(false)

  // Set default dates (current week) and load locations
  useEffect(() => {
    const now = new Date()
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay())
    startOfWeek.setHours(0, 0, 0, 0)
    
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)
    endOfWeek.setHours(23, 59, 59, 999)
    
    setStartDate(startOfWeek.toISOString().split('T')[0])
    setEndDate(endOfWeek.toISOString().split('T')[0])

    // Load locations
    loadLocations()
  }, [organizationId])

  const loadLocations = async () => {
    try {
      const { data, error } = await database.getLocations(organizationId)
      if (error) throw error
      setLocations(data || [])
    } catch (error) {
      console.error('Error loading locations:', error)
    }
  }

  const generateReport = async () => {
    setLoading(true)
    try {
      const { data, error } = await database.getTimeReport({
        organization_id: organizationId,
        employee_id: selectedEmployee === 'all' ? null : selectedEmployee,
        start_date: startDate,
        end_date: endDate
      })

      if (error) throw error
      
      // Filter by location if selected
      let filteredData = data || []
      if (selectedLocation !== 'all') {
        const selectedLocationName = locations.find(loc => loc.id === selectedLocation)?.name
        filteredData = filteredData.filter(entry => entry.location_name === selectedLocationName)
      }
      
      setReportData(filteredData)
    } catch (error) {
      console.error('Error generating report:', error)
      alert('Error generating report. Please try again.')
    }
    setLoading(false)
  }

  const formatDuration = (minutes) => {
    if (isNaN(minutes) || minutes < 0) {
      return '0h 0m'
    }
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m`
  }

  const generateCSV = () => {
    if (!reportData) return ''

    const headers = ['Employee', 'Date', 'Hours Worked', 'Clock In', 'Clock Out', 'Location', 'Duration (Minutes)', 'Hourly Rate', 'Total Pay']
    const rows = reportData.map(entry => {
      const durationHours = (entry.duration_minutes || 0) / 60
      const hourlyRate = entry.hourly_rate || 0
      const totalPay = durationHours * hourlyRate
      
      return [
        `${entry.first_name} ${entry.last_name}`,
        new Date(entry.clock_in).toLocaleDateString(),
        formatDuration(entry.duration_minutes || 0),
        new Date(entry.clock_in).toLocaleTimeString(),
        entry.clock_out ? new Date(entry.clock_out).toLocaleTimeString() : 'In Progress',
        entry.location_name || 'N/A',
        entry.duration_minutes || 0,
        hourlyRate ? `$${hourlyRate.toFixed(2)}` : 'N/A',
        hourlyRate ? `$${totalPay.toFixed(2)}` : 'N/A'
      ]
    })

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n')

    return csvContent
  }

  const downloadCSV = () => {
    const csvContent = generateCSV()
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `time-report-${startDate}-to-${endDate}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const copyToClipboard = async () => {
    try {
      const csvContent = generateCSV()
      await navigator.clipboard.writeText(csvContent)
      alert('Report copied to clipboard!')
    } catch (error) {
      console.error('Error copying to clipboard:', error)
      alert('Error copying to clipboard')
    }
  }

  const shareViaEmail = () => {
    const csvContent = generateCSV()
    const subject = 'Time Tracking Report'
    const body = `Please find the attached time tracking report for ${startDate} to ${endDate}.`
    
    const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    window.open(mailtoLink)
  }

  return (
    <div className="space-y-6">
      {/* Report Configuration */}
      <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20">
        <div className="flex items-center space-x-3 mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center text-white text-xl shadow-lg">
            📈
          </div>
          <h3 className="text-2xl font-bold text-white">Weekly Hours Report</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="block text-white/80 font-medium mb-3">
              Employee
            </label>
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
            >
              <option value="all">All Employees</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.first_name} {emp.last_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-white/80 font-medium mb-3">
              Location
            </label>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
            >
              <option value="all">All Locations</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-white/80 font-medium mb-3">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
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
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
            />
          </div>
        </div>

        <button
          onClick={generateReport}
          disabled={loading}
          className="bg-gradient-to-r from-purple-500 to-pink-600 text-white px-8 py-3 rounded-xl font-medium hover:from-purple-600 hover:to-pink-700 transition-all duration-300 hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center justify-center space-x-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Generating...</span>
            </span>
          ) : (
            '📊 Generate Report'
          )}
        </button>
      </div>

      {/* Report Results */}
      {reportData && (
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 space-y-4 sm:space-y-0">
            <h4 className="text-xl font-bold text-white">Report Results</h4>
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
              <button
                onClick={downloadCSV}
                className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-2 rounded-xl font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-300 hover:scale-105 shadow-lg"
              >
                📊 Download CSV
              </button>
              <button
                onClick={() => setShowShareOptions(true)}
                className="bg-gradient-to-r from-green-500 to-blue-600 text-white px-6 py-2 rounded-xl font-medium hover:from-green-600 hover:to-blue-700 transition-all duration-300 hover:scale-105 shadow-lg"
              >
                📤 Share Report
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {reportData.map((entry, index) => (
              <div 
                key={entry.id} 
                className="group bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-[1.02]"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-500 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
                      {entry.first_name[0]}{entry.last_name[0]}
                    </div>
                    <div>
                      <p className="font-bold text-xl text-white">{entry.first_name} {entry.last_name}</p>
                      <p className="text-white/70 text-sm">
                        {new Date(entry.clock_in).toLocaleDateString()} • {entry.location_name || 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-2xl font-bold text-green-400">{formatDuration(entry.duration_minutes || 0)}</p>
                    <p className="text-white/60 text-sm">
                      {new Date(entry.clock_in).toLocaleTimeString()} - {entry.clock_out ? new Date(entry.clock_out).toLocaleTimeString() : 'In Progress'}
                    </p>
                    {entry.hourly_rate && (
                      <p className="text-yellow-400 text-sm font-mono mt-1">
                        ${entry.hourly_rate}/hr • ${((entry.duration_minutes || 0) / 60 * entry.hourly_rate).toFixed(2)} total
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="mt-8 p-6 bg-white/5 rounded-2xl border border-white/10">
            <h5 className="text-lg font-bold text-white mb-4">📋 Summary</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-white/60 text-sm">Total Entries</p>
                <p className="text-2xl font-bold text-white">{reportData.length}</p>
              </div>
              <div className="text-center">
                <p className="text-white/60 text-sm">Total Hours</p>
                <p className="text-2xl font-bold text-green-400">
                  {formatDuration(reportData.reduce((sum, entry) => sum + (entry.duration_minutes || 0), 0))}
                </p>
              </div>
              <div className="text-center">
                <p className="text-white/60 text-sm">Avg per Entry</p>
                <p className="text-2xl font-bold text-blue-400">
                  {formatDuration(reportData.length > 0 ? Math.round(reportData.reduce((sum, entry) => sum + (entry.duration_minutes || 0), 0) / reportData.length) : 0)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-white/60 text-sm">Total Payroll</p>
                <p className="text-2xl font-bold text-yellow-400">
                  ${reportData.reduce((sum, entry) => {
                    const durationHours = (entry.duration_minutes || 0) / 60
                    const rate = entry.hourly_rate || 0
                    return sum + (durationHours * rate)
                  }, 0).toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Share Options Modal */}
      {showShareOptions && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-8 max-w-md w-full shadow-2xl border border-white/20">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-blue-600 rounded-2xl flex items-center justify-center text-white text-xl shadow-lg">
                  📤
                </div>
                <h3 className="text-2xl font-bold text-gray-800">Share Report</h3>
              </div>
              <button
                onClick={() => setShowShareOptions(false)}
                className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-600 hover:text-gray-800 transition-colors"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <button
                onClick={copyToClipboard}
                className="w-full flex items-center space-x-3 p-4 rounded-xl hover:bg-gray-50 transition-colors text-left"
              >
                <span className="text-lg">📋</span>
                <span className="font-medium text-gray-700">Copy to Clipboard</span>
              </button>
              <button
                onClick={shareViaEmail}
                className="w-full flex items-center space-x-3 p-4 rounded-xl hover:bg-gray-50 transition-colors text-left"
              >
                <span className="text-lg">📧</span>
                <span className="font-medium text-gray-700">Share via Email</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 