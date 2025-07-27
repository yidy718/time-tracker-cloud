import { useState, useEffect } from 'react'
import { database } from '../lib/supabase'

export default function ReportsTab({ employees, organizationId }) {
  const [loading, setLoading] = useState(false)
  const [selectedWeek, setSelectedWeek] = useState('')
  const [selectedEmployee, setSelectedEmployee] = useState('all')
  const [reportData, setReportData] = useState(null)
  const [showShareOptions, setShowShareOptions] = useState(false)

  useEffect(() => {
    // Set current week as default
    const now = new Date()
    const monday = new Date(now)
    monday.setDate(now.getDate() - now.getDay() + 1) // Get Monday
    setSelectedWeek(monday.toISOString().split('T')[0])
  }, [])

  const generateReport = async () => {
    if (!selectedWeek) {
      alert('Please select a week')
      return
    }

    setLoading(true)
    try {
      // Get week start and end dates
      const weekStart = new Date(selectedWeek)
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)
      weekEnd.setHours(23, 59, 59, 999)

      // Filter employees if specific employee selected
      const employeeIds = selectedEmployee === 'all' 
        ? employees.map(emp => emp.id)
        : [selectedEmployee]

      // Get time sessions for the week
      const { data: sessions, error } = await database.getWeeklyHours(
        organizationId, 
        weekStart.toISOString(), 
        weekEnd.toISOString(),
        employeeIds
      )

      if (error) throw error

      // Store report data for sharing
      const processedData = {
        sessions,
        weekStart,
        weekEnd,
        employeeFilter: selectedEmployee === 'all' ? 'All Employees' : 
          employees.find(emp => emp.id === selectedEmployee)?.first_name + ' ' + 
          employees.find(emp => emp.id === selectedEmployee)?.last_name
      }
      
      setReportData(processedData)
      setShowShareOptions(true)
      
    } catch (error) {
      console.error('Export error:', error)
      alert('Error generating report. Please try again.')
    }
    setLoading(false)
  }

  const downloadCSV = () => {
    if (!reportData) return
    const csvData = generateWeeklyCSV(reportData.sessions, reportData.weekStart, reportData.weekEnd)
    const blob = new Blob([csvData], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `weekly-hours-${reportData.weekStart.toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const shareViaEmail = () => {
    if (!reportData) return
    
    const subject = `Weekly Hours Report - ${reportData.weekStart.toLocaleDateString()} to ${reportData.weekEnd.toLocaleDateString()}`
    const body = generateEmailBody(reportData)
    const csvData = generateWeeklyCSV(reportData.sessions, reportData.weekStart, reportData.weekEnd)
    
    // Create a data URI for the CSV
    const csvBlob = new Blob([csvData], { type: 'text/csv' })
    const csvUrl = URL.createObjectURL(csvBlob)
    
    // On mobile, we'll use mailto with the text summary
    const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    
    if (window.navigator && window.navigator.share) {
      // Use Web Share API if available (iOS Safari, Android Chrome)
      const file = new File([csvData], `weekly-hours-${reportData.weekStart.toISOString().split('T')[0]}.csv`, {
        type: 'text/csv'
      })
      
      navigator.share({
        title: subject,
        text: body,
        files: [file]
      }).catch(err => {
        console.log('Share failed:', err)
        window.open(mailtoUrl)
      })
    } else {
      // Fallback to mailto
      window.open(mailtoUrl)
    }
  }

  const copyToClipboard = async () => {
    if (!reportData) return
    
    const textReport = generateTextReport(reportData)
    
    try {
      await navigator.clipboard.writeText(textReport)
      alert('📋 Report copied to clipboard!')
    } catch (err) {
      console.error('Failed to copy:', err)
      alert('Unable to copy to clipboard')
    }
  }

  const shareNative = async () => {
    if (!reportData) return
    
    const subject = `Weekly Hours Report - ${reportData.weekStart.toLocaleDateString()} to ${reportData.weekEnd.toLocaleDateString()}`
    const text = generateTextReport(reportData)
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: subject,
          text: text
        })
      } catch (err) {
        console.log('Share cancelled or failed:', err)
      }
    } else {
      alert('Native sharing not supported on this device')
    }
  }

  const generateWeeklyCSV = (sessions, weekStart, weekEnd) => {
    const headers = ['Employee', 'Date', 'Clock In', 'Clock Out', 'Break Time', 'Work Time', 'Location']
    
    const rows = sessions.map(session => {
      const clockIn = new Date(session.clock_in)
      const clockOut = new Date(session.clock_out)
      const totalTime = clockOut - clockIn
      const breakTime = session.break_duration ? 
        Math.floor(session.break_duration / (1000 * 60)) : 0 // minutes
      const workTime = Math.floor((totalTime - (breakTime * 60 * 1000)) / (1000 * 60)) // minutes
      
      return [
        `"${session.employee?.first_name} ${session.employee?.last_name}"`,
        `"${clockIn.toLocaleDateString()}"`,
        `"${clockIn.toLocaleTimeString()}"`,
        `"${clockOut.toLocaleTimeString()}"`,
        `"${Math.floor(breakTime / 60)}:${(breakTime % 60).toString().padStart(2, '0')}"`,
        `"${Math.floor(workTime / 60)}:${(workTime % 60).toString().padStart(2, '0')}"`,
        `"${session.location?.name || 'Unknown'}"`
      ].join(',')
    })

    // Add summary row
    const totalWorkMinutes = sessions.reduce((sum, session) => {
      const clockIn = new Date(session.clock_in)
      const clockOut = new Date(session.clock_out)
      const totalTime = clockOut - clockIn
      const breakTime = session.break_duration ? 
        Math.floor(session.break_duration / (1000 * 60)) : 0
      return sum + Math.floor((totalTime - (breakTime * 60 * 1000)) / (1000 * 60))
    }, 0)

    rows.push('')
    rows.push(`"TOTAL",,,,,"${Math.floor(totalWorkMinutes / 60)}:${(totalWorkMinutes % 60).toString().padStart(2, '0')}",`)

    return [headers.join(','), ...rows].join('\n')
  }

  const generateEmailBody = (data) => {
    const { sessions, weekStart, weekEnd, employeeFilter } = data
    
    let body = `📊 WEEKLY HOURS REPORT\n\n`
    body += `📅 Week: ${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}\n`
    body += `👥 Employees: ${employeeFilter}\n\n`
    
    if (sessions.length === 0) {
      body += `No time sessions found for this period.\n\n`
    } else {
      body += `📈 SUMMARY:\n`
      body += `• Total Sessions: ${sessions.length}\n`
      
      const totalWorkMinutes = sessions.reduce((sum, session) => {
        const clockIn = new Date(session.clock_in)
        const clockOut = new Date(session.clock_out)
        const totalTime = clockOut - clockIn
        const breakTime = session.break_duration ? 
          Math.floor(session.break_duration / (1000 * 60)) : 0
        return sum + Math.floor((totalTime - (breakTime * 60 * 1000)) / (1000 * 60))
      }, 0)
      
      body += `• Total Work Hours: ${Math.floor(totalWorkMinutes / 60)}h ${totalWorkMinutes % 60}m\n\n`
      
      body += `💼 DAILY BREAKDOWN:\n`
      const dailyData = {}
      sessions.forEach(session => {
        const date = new Date(session.clock_in).toLocaleDateString()
        if (!dailyData[date]) dailyData[date] = []
        dailyData[date].push(session)
      })
      
      Object.entries(dailyData).forEach(([date, daySessions]) => {
        const dayTotal = daySessions.reduce((sum, session) => {
          const clockIn = new Date(session.clock_in)
          const clockOut = new Date(session.clock_out)
          const totalTime = clockOut - clockIn
          const breakTime = session.break_duration ? 
            Math.floor(session.break_duration / (1000 * 60)) : 0
          return sum + Math.floor((totalTime - (breakTime * 60 * 1000)) / (1000 * 60))
        }, 0)
        
        body += `${date}: ${Math.floor(dayTotal / 60)}h ${dayTotal % 60}m (${daySessions.length} sessions)\n`
      })
    }
    
    body += `\n🤖 Generated by Time Tracker Cloud\n`
    body += `📱 For detailed CSV data, please use the CSV download option.`
    
    return body
  }

  const generateTextReport = (data) => {
    return generateEmailBody(data)
  }

  return (
    <div className="space-y-6">
      <div className="admin-card">
        <h3 className="text-2xl font-bold mb-6 text-gray-900">📈 Weekly Hours Report</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div>
            <label className="form-label-admin">
              📅 Week Starting (Monday)
            </label>
            <input
              type="date"
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(e.target.value)}
              className="input-admin"
            />
          </div>
          
          <div>
            <label className="form-label-admin">
              👥 Employee Filter
            </label>
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="input-admin"
            >
              <option value="all">👥 All Employees</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  👤 {emp.first_name} {emp.last_name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex items-end">
            <button
              onClick={generateReport}
              disabled={loading || !selectedWeek}
              className="btn-primary w-full text-lg py-4"
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Generating...
                </>
              ) : (
                '📊 Generate Report'
              )}
            </button>
          </div>
        </div>

        {/* Share Options Modal */}
        {showShareOptions && reportData && (
          <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-2xl">
            <div className="flex justify-between items-center mb-6">
              <h4 className="text-xl font-bold text-gray-900">📤 Share Report</h4>
              <button
                onClick={() => setShowShareOptions(false)}
                className="text-gray-500 hover:text-gray-700 text-xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <button
                onClick={downloadCSV}
                className="btn-primary text-sm py-3"
              >
                📊 Download CSV
              </button>
              
              <button
                onClick={shareViaEmail}
                className="btn-secondary text-sm py-3"
              >
                📧 Email Report
              </button>
              
              <button
                onClick={copyToClipboard}
                className="btn-secondary text-sm py-3"
              >
                📋 Copy Text
              </button>
              
              <button
                onClick={shareNative}
                className="btn-secondary text-sm py-3"
              >
                📱 Share
              </button>
            </div>

            <div className="bg-white/70 p-4 rounded-xl border border-gray-200">
              <h5 className="font-bold text-gray-900 mb-3">📊 Report Preview:</h5>
              <div className="text-sm text-gray-700 space-y-1">
                <p><strong>📅 Period:</strong> {reportData.weekStart.toLocaleDateString()} - {reportData.weekEnd.toLocaleDateString()}</p>
                <p><strong>👥 Filter:</strong> {reportData.employeeFilter}</p>
                <p><strong>📈 Sessions:</strong> {reportData.sessions.length} total</p>
                <p><strong>⏱️ Total Hours:</strong> {
                  (() => {
                    const totalMinutes = reportData.sessions.reduce((sum, session) => {
                      const clockIn = new Date(session.clock_in)
                      const clockOut = new Date(session.clock_out)
                      const totalTime = clockOut - clockIn
                      const breakTime = session.break_duration ? 
                        Math.floor(session.break_duration / (1000 * 60)) : 0
                      return sum + Math.floor((totalTime - (breakTime * 60 * 1000)) / (1000 * 60))
                    }, 0)
                    return `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`
                  })()
                }</p>
              </div>
            </div>
          </div>
        )}
        
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-sm text-blue-800">
          <h5 className="font-bold mb-3">📋 Report Features:</h5>
          <div className="grid md:grid-cols-2 gap-4">
            <ul className="space-y-2">
              <li>• 📊 CSV download for spreadsheets</li>
              <li>• 📧 Email sharing with summary</li>
              <li>• 📋 Copy text for messaging apps</li>
            </ul>
            <ul className="space-y-2">
              <li>• 📱 Native iOS/Android sharing</li>
              <li>• ⏱️ Break time calculations</li>
              <li>• 📍 Location data included</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}