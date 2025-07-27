import { useState, useEffect } from 'react'
import { database } from '../lib/supabase'

export default function ReportsTab({ employees, organizationId }) {
  const [loading, setLoading] = useState(false)
  const [selectedWeek, setSelectedWeek] = useState('')
  const [selectedEmployee, setSelectedEmployee] = useState('all')

  useEffect(() => {
    // Set current week as default
    const now = new Date()
    const monday = new Date(now)
    monday.setDate(now.getDate() - now.getDay() + 1) // Get Monday
    setSelectedWeek(monday.toISOString().split('T')[0])
  }, [])

  const exportWeeklyHours = async () => {
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

      // Process and export data
      const csvData = generateWeeklyCSV(sessions, weekStart, weekEnd)
      downloadCSV(csvData, `weekly-hours-${weekStart.toISOString().split('T')[0]}.csv`)
      
    } catch (error) {
      console.error('Export error:', error)
      alert('Error exporting data. Please try again.')
    }
    setLoading(false)
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

  const downloadCSV = (content, filename) => {
    const blob = new Blob([content], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Weekly Hours Report</h3>
      
      <div className="card">
        <h4 className="text-lg font-semibold mb-4">Export Weekly Hours</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Week Starting (Monday)
            </label>
            <input
              type="date"
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(e.target.value)}
              className="input"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Employee
            </label>
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="input"
            >
              <option value="all">All Employees</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.first_name} {emp.last_name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex items-end">
            <button
              onClick={exportWeeklyHours}
              disabled={loading || !selectedWeek}
              className="btn-primary w-full"
            >
              {loading ? 'Exporting...' : '📊 Export CSV'}
            </button>
          </div>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded p-4 text-sm text-blue-800">
          <h5 className="font-medium mb-2">📋 Export includes:</h5>
          <ul className="list-disc ml-5 space-y-1">
            <li>Employee name and location for each session</li>
            <li>Clock in/out times with break duration</li>
            <li>Calculated work time (excluding breaks)</li>
            <li>Weekly totals at the bottom</li>
          </ul>
        </div>
      </div>
    </div>
  )
}