import { useState, useEffect } from 'react'
import { database } from '../lib/supabase'

export default function ReportsTab({ employees, organizationId, organization, isManagerView = false }) {
  const [selectedEmployee, setSelectedEmployee] = useState('all')
  const [selectedLocation, setSelectedLocation] = useState('all')
  const [selectedProject, setSelectedProject] = useState('all')
  const [locations, setLocations] = useState([])
  const [projects, setProjects] = useState([])
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reportData, setReportData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showShareOptions, setShowShareOptions] = useState(false)
  const [reportType, setReportType] = useState('combined') // 'time', 'tasks', 'combined'

  // Check if this is V.A.S Tri State organization
  const isVAS = organization?.name?.toLowerCase().includes('v.a.s') || organization?.name?.toLowerCase().includes('vas')
  const companyName = isVAS ? 'V.A.S Tri State' : 'VasHours'
  const companyTeam = isVAS ? 'V.A.S Tri State Team' : 'VasHours Team'

  // Set default dates (current week) and load locations
  useEffect(() => {
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
    
    setStartDate(startOfWeek.toISOString().split('T')[0])
    setEndDate(endOfWeek.toISOString().split('T')[0])

    // Load locations and projects - move functions inside useEffect
    const loadLocations = async () => {
      try {
        const { data, error } = await database.getLocations(organizationId)
        if (error) throw error
        setLocations(data || [])
      } catch (error) {
        console.error('Error loading locations:', error)
      }
    }

    const loadProjects = async () => {
      try {
        const { data, error } = await database.getClientProjects(organizationId)
        if (error) throw error
        setProjects(data || [])
      } catch (error) {
        console.error('Error loading projects:', error)
      }
    }

    loadLocations()
    loadProjects()
  }, [organizationId])

  const generateReport = async () => {
    setLoading(true)
    try {
      let reportData = { timeData: [], taskSummary: [], completedTasks: [], expenses: [] }

      // Get time report data if needed
      if (reportType === 'time' || reportType === 'combined') {
        const { data, error } = await database.getTimeReport({
          organization_id: organizationId,
          employee_id: selectedEmployee === 'all' ? null : selectedEmployee,
          project_id: selectedProject === 'all' ? null : selectedProject,
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
        
        reportData.timeData = filteredData
      }

      // Get task data if needed
      if (reportType === 'tasks' || reportType === 'combined') {
        try {
          const taskSummaryResult = await database.getTaskSummary(
            organizationId,
            selectedEmployee === 'all' ? null : selectedEmployee
          )
          reportData.taskSummary = taskSummaryResult.data || []

          // Get completed tasks for the same date range
          const completedTasksResult = await database.getCompletedTasks(
            organizationId,
            startDate,
            endDate,
            selectedEmployee === 'all' ? null : selectedEmployee
          )
          reportData.completedTasks = completedTasksResult.data || []
        } catch (taskError) {
          console.warn('Task analytics not available:', taskError)
        }
      }

      // Get expense data if organization has expenses enabled
      if (organization?.enable_expenses) {
        try {
          const expensesResult = await database.getOrganizationExpenses(
            organizationId,
            startDate,
            endDate
          )
          let expenseData = expensesResult.data || []
          
          // Filter by employee if selected
          if (selectedEmployee !== 'all') {
            expenseData = expenseData.filter(expense => expense.employee_id === selectedEmployee)
          }
          
          reportData.expenses = expenseData
        } catch (expenseError) {
          console.warn('Expense data not available:', expenseError)
        }
      }
      
      setReportData(reportData)
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

    let csvSections = []

    // Time tracking data
    if (reportData.timeData && reportData.timeData.length > 0) {
      const timeHeaders = ['Employee', 'Date', 'Hours Worked', 'Clock In', 'Clock Out', 'Location', 'Project', 'Duration (Minutes)', 'Hourly Rate', 'Total Pay', 'Notes']
      const timeRows = reportData.timeData.map(entry => {
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
          entry.project_name || 'No Project',
          entry.duration_minutes || 0,
          hourlyRate ? `$${hourlyRate.toFixed(2)}` : 'N/A',
          hourlyRate ? `$${totalPay.toFixed(2)}` : 'N/A',
          entry.notes || 'No notes'
        ]
      })
      
      const timeSection = ['TIME TRACKING DATA', '', ...([timeHeaders, ...timeRows]
        .map(row => row.map(cell => `"${cell}"`).join(',')))]
      csvSections.push(timeSection.join('\n'))
    }

    // Expense data
    if (reportData.expenses && reportData.expenses.length > 0) {
      const expenseHeaders = ['Employee', 'Date', 'Amount', 'Description']
      const expenseRows = reportData.expenses.map(expense => [
        `${expense.employees.first_name} ${expense.employees.last_name}`,
        new Date(expense.date).toLocaleDateString(),
        `$${expense.amount.toFixed(2)}`,
        expense.description
      ])
      
      const expenseSection = ['', '', 'EXPENSE DATA', '', ...([expenseHeaders, ...expenseRows]
        .map(row => row.map(cell => `"${cell}"`).join(',')))]
      csvSections.push(expenseSection.join('\n'))
    }

    // Task completion data
    if (reportData.completedTasks && reportData.completedTasks.length > 0) {
      const taskHeaders = ['Task Title', 'Completed By', 'Completion Date', 'Status', 'Hours', 'Hourly Rate', 'Labor Cost']
      const taskRows = reportData.completedTasks.map(task => {
        const actualHours = parseFloat(task.actual_hours) || 0
        const hourlyRate = task.assigned_employee?.hourly_rate || 0
        const laborCost = actualHours * hourlyRate
        
        return [
          task.title,
          `${task.assigned_first_name} ${task.assigned_last_name}`,
          new Date(task.completed_at).toLocaleDateString(),
          task.status,
          actualHours ? `${actualHours}h` : 'No time logged',
          hourlyRate ? `$${hourlyRate.toFixed(2)}` : 'No rate set',
          laborCost ? `$${laborCost.toFixed(2)}` : '$0.00'
        ]
      })
      
      const taskSection = ['', '', 'COMPLETED TASKS', '', ...([taskHeaders, ...taskRows]
        .map(row => row.map(cell => `"${cell}"`).join(',')))]
      csvSections.push(taskSection.join('\n'))
    }

    return csvSections.join('\n')
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
    const subject = `${companyName} Time Tracking Report`
    
    // Create a formatted email body with the data
    const totalHours = reportData.timeData.reduce((sum, entry) => sum + (entry.duration_minutes || 0), 0)
    const totalPayroll = reportData.timeData.reduce((sum, entry) => {
      const durationHours = (entry.duration_minutes || 0) / 60
      const rate = entry.hourly_rate || 0
      return sum + (durationHours * rate)
    }, 0)
    
    // Create readable table format instead of CSV
    const tableRows = reportData.timeData.map(entry => {
      const durationHours = (entry.duration_minutes || 0) / 60
      const rate = entry.hourly_rate || 0
      const totalPay = durationHours * rate
      
      return `${entry.first_name} ${entry.last_name}
   Date: ${new Date(entry.clock_in).toLocaleDateString()}
   Hours: ${formatDuration(entry.duration_minutes || 0)}
   Time: ${new Date(entry.clock_in).toLocaleTimeString()} - ${entry.clock_out ? new Date(entry.clock_out).toLocaleTimeString() : 'Active'}
   Location: ${entry.location_name || 'N/A'}
   Project: ${entry.project_name || 'No Project'}
   Pay: ${rate ? `$${rate.toFixed(2)}/hr = $${totalPay.toFixed(2)} total` : 'No rate set'}${entry.notes ? `
   Notes: ${entry.notes}` : ''}
   ────────────────────────────────────────────`
    }).join('\n\n')

    const body = `Hi there!

Here's the ${companyName} time tracking report for ${startDate} to ${endDate}:

SUMMARY:
• Total Entries: ${reportData.length}
• Total Hours: ${formatDuration(totalHours)}
• Total Payroll: $${totalPayroll.toFixed(2)}
• Report Period: ${startDate} to ${endDate}

DETAILED TIME ENTRIES:
────────────────────────────────────────────
${tableRows}

Generated by ${companyName} Time Tracking System${isVAS ? '\nPowered by VasHours' : ''}

Best regards,
${companyTeam}`
    
    const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    window.open(mailtoLink)
  }

  const shareViaWhatsApp = () => {
    if (!reportData || reportData.length === 0) {
      alert('No data to share')
      return
    }

    const companyName = reportData.timeData[0]?.organization_name || 'Company'
    const totalHours = (reportData.timeData.reduce((sum, entry) => sum + (entry.duration_minutes || 0), 0) / 60).toFixed(2)
    const dateRange = `${startDate} to ${endDate}`
    
    // Create shorter message for WhatsApp
    const message = `📊 *Time Report - ${companyName}*

📅 Period: ${dateRange}
⏰ Total Hours: ${totalHours}
📋 Entries: ${reportData.timeData.length}

${selectedEmployee !== 'all' ? `👤 Employee: ${reportData.timeData[0]?.first_name} ${reportData.timeData[0]?.last_name}` : ''}
${selectedProject !== 'all' ? `🎯 Project: ${reportData[0]?.project_name || 'No Project'}` : ''}

💼 Generated by ${companyName} Time Tracking`

    const whatsappLink = `https://wa.me/?text=${encodeURIComponent(message)}`
    window.open(whatsappLink, '_blank')
  }

  const shareViaSMS = () => {
    if (!reportData || reportData.length === 0) {
      alert('No data to share')
      return
    }

    const companyName = reportData.timeData[0]?.organization_name || 'Company'
    const totalHours = (reportData.timeData.reduce((sum, entry) => sum + (entry.duration_minutes || 0), 0) / 60).toFixed(2)
    const dateRange = `${startDate} to ${endDate}`

    // Create short SMS message
    const message = `${companyName} Time Report (${dateRange}): ${totalHours} hours, ${reportData.timeData.length} entries. ${selectedEmployee !== 'all' ? `Employee: ${reportData.timeData[0]?.first_name} ${reportData.timeData[0]?.last_name}` : ''}`

    const smsLink = `sms:?body=${encodeURIComponent(message)}`
    window.open(smsLink)
  }

  const generatePDF = async () => {
    const hasTimeData = reportData?.timeData && reportData.timeData.length > 0
    const hasTaskData = reportData?.completedTasks && reportData.completedTasks.length > 0
    
    if (!reportData || (!hasTimeData && !hasTaskData)) {
      alert('No data to generate PDF report')
      return
    }

    try {
      console.log('📄 Starting PDF generation...')
      
      // Dynamic import of jsPDF
      const jsPDF = (await import('jspdf')).default
      const pdf = new jsPDF()
    
    // Header with branding
    pdf.setFillColor(88, 28, 135) // Purple gradient color
    pdf.rect(0, 0, 210, 40, 'F')
    
    // Company logo section
    pdf.setTextColor(255, 255, 255)
    pdf.setFontSize(24)
    pdf.setFont('helvetica', 'bold')
    pdf.text(companyName, 20, 18)
    
    pdf.setFontSize(16)
    pdf.setFont('helvetica', 'normal') 
    const reportTitle = reportType === 'time' ? 'Time Tracking Report' : 
                        reportType === 'tasks' ? 'Task Completion Report' : 
                        'Time & Task Report'
    pdf.text(reportTitle, 20, 25)
    
    if (isVAS) {
      pdf.setFontSize(12)
      pdf.text('Powered by VasHours', 20, 32)
    }
    
    // Report date in top right
    pdf.setFontSize(10)
    pdf.text(`Generated: ${new Date().toLocaleDateString()}`, 150, 25)
    pdf.text(`Period: ${startDate} to ${endDate}`, 150, 32)
    
    // Reset text color
    pdf.setTextColor(0, 0, 0)
    
    // Report Summary Section
    pdf.setFontSize(16)
    pdf.setFont('helvetica', 'bold')
    pdf.text('REPORT SUMMARY', 20, 55)
    
    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'normal')
    
    let yOffset = 65
    
    // Time tracking summary (if included)
    if (hasTimeData) {
      const totalHours = reportData.timeData.reduce((sum, entry) => sum + (entry.duration_minutes || 0), 0)
      const totalPayroll = reportData.timeData.reduce((sum, entry) => {
        const durationHours = (entry.duration_minutes || 0) / 60
        const rate = entry.hourly_rate || 0
        return sum + (durationHours * rate)
      }, 0)
      
      pdf.text(`Time Entries: ${reportData.timeData.length}`, 20, yOffset)
      pdf.text(`Total Hours: ${formatDuration(totalHours)}`, 20, yOffset + 7)
      pdf.text(`Total Payroll: $${totalPayroll.toFixed(2)}`, 20, yOffset + 14)
      yOffset += 21
    }
    
    // Task summary (if included)
    if (hasTaskData) {
      pdf.text(`Completed Tasks: ${reportData.completedTasks.length}`, 20, yOffset)
      const totalTaskHours = reportData.completedTasks.reduce((sum, task) => sum + (parseFloat(task.actual_hours) || 0), 0)
      const totalTaskCost = reportData.completedTasks.reduce((sum, task) => {
        const hours = parseFloat(task.actual_hours) || 0
        const rate = task.assigned_employee?.hourly_rate || 0
        return sum + (hours * rate)
      }, 0)
      
      if (totalTaskHours > 0) {
        pdf.text(`Task Hours: ${totalTaskHours.toFixed(1)}h`, 20, yOffset + 7)
        if (totalTaskCost > 0) {
          pdf.text(`Task Labor Cost: $${totalTaskCost.toFixed(2)}`, 20, yOffset + 14)
          yOffset += 21
        } else {
          yOffset += 14
        }
      } else {
        yOffset += 7
      }
    }
    
    // Filter info
    const selectedEmp = employees.find(emp => emp.id === selectedEmployee)
    const selectedLoc = locations.find(loc => loc.id === selectedLocation)
    const selectedProj = projects.find(proj => proj.id === selectedProject)
    
    if (selectedEmployee !== 'all') {
      pdf.text(`Employee: ${selectedEmp?.first_name} ${selectedEmp?.last_name}`, 120, 65)
    }
    if (selectedLocation !== 'all') {
      pdf.text(`Location: ${selectedLoc?.name}`, 120, 72)
    }
    if (selectedProject !== 'all') {
      pdf.text(`Project: ${selectedProj?.name}`, 120, 79)
    }
    
    let currentY = yOffset + 20
    
    // Detailed Time Entries - Manual Table Creation (if included)
    if (hasTimeData) {
      pdf.setFontSize(16)
      pdf.setFont('helvetica', 'bold')
      pdf.text('DETAILED TIME ENTRIES', 20, currentY)
    
      // Table headers
      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'bold')
      let yPos = currentY + 15
    
      // Header background
      pdf.setFillColor(88, 28, 135)
      pdf.rect(20, yPos - 5, 170, 8, 'F')
      
      // Header text
      pdf.setTextColor(255, 255, 255)
      pdf.text('Employee', 22, yPos)
      pdf.text('Date', 48, yPos)
      pdf.text('Hours', 65, yPos)
      pdf.text('In/Out', 82, yPos)
      pdf.text('Location', 105, yPos)
      pdf.text('Project', 125, yPos)
      pdf.text('Pay', 145, yPos)
      pdf.text('Notes', 160, yPos)
      
      // Reset text color for data
      pdf.setTextColor(0, 0, 0)
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(8)
      
      yPos += 10
      
      // Table data
      reportData.timeData.forEach((entry, index) => {
        // Alternate row background
        if (index % 2 === 0) {
          pdf.setFillColor(245, 245, 245)
          pdf.rect(20, yPos - 4, 170, 7, 'F')
        }
        
        const durationHours = (entry.duration_minutes || 0) / 60
        const rate = entry.hourly_rate || 0
        const totalPay = durationHours * rate
        
        // Row data
        pdf.text(`${entry.first_name} ${entry.last_name}`.substring(0, 10), 22, yPos)
        pdf.text(new Date(entry.clock_in).toLocaleDateString().substring(0, 6), 48, yPos)
        pdf.text(formatDuration(entry.duration_minutes || 0), 65, yPos)
        const timeRange = `${new Date(entry.clock_in).toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit' 
        })}-${entry.clock_out ? new Date(entry.clock_out).toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }) : 'Active'}`
        pdf.text(timeRange.substring(0, 11), 82, yPos)
        pdf.text((entry.location_name || 'N/A').substring(0, 7), 105, yPos)
        pdf.text((entry.project_name || 'None').substring(0, 7), 125, yPos)
        pdf.text(rate ? `$${totalPay.toFixed(0)}` : 'N/A', 145, yPos)
        pdf.text((entry.notes || '').substring(0, 12), 160, yPos)
        
        yPos += 7
        
        // Add new page if needed
        if (yPos > 270) {
          pdf.addPage()
          yPos = 30
        }
      })
      
      currentY = yPos
    }
    
    // Add completed tasks section if we have completed tasks data
    if (hasTaskData) {
      // Add some space or new page if needed
      if (currentY > 220) {
        pdf.addPage()
        currentY = 30
      } else {
        currentY += 20
      }
      
      // Completed Tasks Section Header
      pdf.setFontSize(16)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(0, 0, 0)
      pdf.text(`COMPLETED TASKS (${reportData.completedTasks.length})`, 20, currentY)
      
      currentY += 15
      
      // Completed tasks data
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(10)
      
      reportData.completedTasks.forEach((task, index) => {
        // Check if we need a new page
        if (currentY > 250) {
          pdf.addPage()
          currentY = 30
        }
        
        // Task title
        pdf.setFont('helvetica', 'bold')
        pdf.text(`${index + 1}. ${task.title.substring(0, 60)}`, 20, currentY)
        currentY += 7
        
        // Task details
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(9)
        
        // Completed by and date
        pdf.text(`Completed by: ${task.assigned_first_name} ${task.assigned_last_name}`, 25, currentY)
        pdf.text(`Date: ${new Date(task.completed_at).toLocaleDateString()}`, 120, currentY)
        currentY += 5
        
        // Project and priority
        if (task.project_name) {
          pdf.text(`Project: ${task.project_name.substring(0, 30)}`, 25, currentY)
        }
        pdf.text(`Priority: ${task.priority}`, 120, currentY)
        currentY += 5
        
        // Hours and cost if available
        if (task.actual_hours || task.estimated_hours) {
          const actualHours = parseFloat(task.actual_hours) || 0
          const estimatedHours = parseFloat(task.estimated_hours) || 0
          const hourlyRate = task.assigned_employee?.hourly_rate || 0
          
          let hoursText = actualHours ? 
            `${actualHours}h actual${estimatedHours ? ` / ${estimatedHours}h est` : ''}` :
            `${estimatedHours}h estimated`
          
          // Add cost calculation if we have actual hours and hourly rate
          if (actualHours > 0 && hourlyRate > 0) {
            const taskCost = actualHours * hourlyRate
            hoursText += ` • Cost: $${taskCost.toFixed(2)} (@$${hourlyRate}/hr)`
          }
          
          pdf.text(`Time: ${hoursText}`, 25, currentY)
          currentY += 5
        }
        
        // Description if available and short enough
        if (task.description && task.description.length < 80) {
          pdf.text(`Description: ${task.description}`, 25, currentY)
          currentY += 5
        }
        
        currentY += 3 // Space between tasks
      })
    }
    
    // Footer
    const pageCount = pdf.internal.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i)
      pdf.setFontSize(8)
      pdf.setTextColor(128, 128, 128)
      pdf.text(`Page ${i} of ${pageCount}`, 105, 290, { align: 'center' })
      pdf.text(`Generated by ${companyName}${isVAS ? ' - Powered by VasHours' : ''}`, 105, 285, { align: 'center' })
    }
    
      // Download the PDF
      const reportTypeLabel = reportType === 'time' ? 'Time-Report' : 
                              reportType === 'tasks' ? 'Task-Report' : 
                              'Combined-Report'
      const fileName = `${companyName.replace(/\s+/g, '-')}-${reportTypeLabel}-${startDate}-to-${endDate}.pdf`
      console.log('💾 Saving PDF:', fileName)
      pdf.save(fileName)
      console.log('✅ PDF generated successfully!')
      
    } catch (error) {
      console.error('❌ PDF Generation Error:', error)
      alert(`Error generating PDF: ${error.message}. Please check the browser console for details.`)
    }
  }

  return (
    <div className="space-y-6">
      {/* Report Configuration */}
      <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20">
        <div className="flex items-center space-x-3 mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center text-white text-xl shadow-lg">
            📈
          </div>
          <h3 className="text-2xl font-bold text-white">
            {reportType === 'time' ? 'Time Tracking Report' : 
             reportType === 'tasks' ? 'Task Completion Report' : 
             'Time & Task Report'}
          </h3>
        </div>

        {/* Report Type Selector */}
        <div className="mb-6">
          <label className="block text-white/80 font-medium mb-3">
            Report Type
          </label>
          <div className="flex space-x-4">
            <button
              onClick={() => setReportType('combined')}
              className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 hover:scale-105 ${
                reportType === 'combined'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              📊 Time & Tasks
            </button>
            <button
              onClick={() => setReportType('time')}
              className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 hover:scale-105 ${
                reportType === 'time'
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              ⏰ Time Only
            </button>
            <button
              onClick={() => setReportType('tasks')}
              className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 hover:scale-105 ${
                reportType === 'tasks'
                  ? 'bg-gradient-to-r from-green-500 to-teal-600 text-white shadow-lg'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              ✅ Tasks Only
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div>
            <label className="block text-white/80 font-medium mb-3">
              Employee
            </label>
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
            >
              <option value="all" className="text-gray-900 bg-white">👥 All Employees</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id} className="text-gray-900 bg-white">
                  👤 {emp.first_name} {emp.last_name}
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
              <option value="all" className="text-gray-900 bg-white">📍 All Locations</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id} className="text-gray-900 bg-white">
                  🏢 {loc.name}
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

          <div>
            <label className="block text-white/80 font-medium mb-3">
              Project
            </label>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
            >
              <option value="all" className="text-gray-900 bg-white">🔸 All Projects</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id} className="text-gray-900 bg-white">
                  🎯 {project.project_name}
                </option>
              ))}
            </select>
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
                onClick={async () => {
                  console.log('🔍 PDF button clicked, reportData:', reportData?.length || 0, 'entries')
                  await generatePDF()
                }}
                className="bg-gradient-to-r from-red-500 to-pink-600 text-white px-6 py-2 rounded-xl font-medium hover:from-red-600 hover:to-pink-700 transition-all duration-300 hover:scale-105 shadow-lg"
              >
                📄 Download PDF
              </button>
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

          {/* Time Tracking Section */}
          {(reportType === 'time' || reportType === 'combined') && reportData.timeData && reportData.timeData.length > 0 && (
            <div className="space-y-4">
              <h5 className="text-lg font-bold text-white mb-4">⏰ Time Tracking Entries</h5>
              {reportData.timeData.map((entry, index) => (
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
                        {entry.project_name && ` • ${entry.project_name}`}
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
                    {entry.notes && (
                      <p className="text-blue-300 text-xs mt-2 bg-white/5 rounded-lg p-2 border border-white/10">
                        📝 {entry.notes}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              ))}
            </div>
          )}

          {/* Summary */}
          {(reportType === 'time' || reportType === 'combined') && reportData.timeData && reportData.timeData.length > 0 && (
            <div className="mt-8 p-6 bg-white/5 rounded-2xl border border-white/10">
            <h5 className="text-lg font-bold text-white mb-4">📋 Summary</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-white/60 text-sm">Total Entries</p>
                <p className="text-2xl font-bold text-white">{reportData.timeData.length}</p>
              </div>
              <div className="text-center">
                <p className="text-white/60 text-sm">Total Hours</p>
                <p className="text-2xl font-bold text-green-400">
                  {formatDuration(reportData.timeData.reduce((sum, entry) => sum + (entry.duration_minutes || 0), 0))}
                </p>
              </div>
              <div className="text-center">
                <p className="text-white/60 text-sm">Avg per Entry</p>
                <p className="text-2xl font-bold text-blue-400">
                  {formatDuration(reportData.timeData.length > 0 ? Math.round(reportData.timeData.reduce((sum, entry) => sum + (entry.duration_minutes || 0), 0) / reportData.timeData.length) : 0)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-white/60 text-sm">Total Payroll</p>
                <p className="text-2xl font-bold text-yellow-400">
                  ${reportData.timeData.reduce((sum, entry) => {
                    const durationHours = (entry.duration_minutes || 0) / 60
                    const rate = entry.hourly_rate || 0
                    return sum + (durationHours * rate)
                  }, 0).toFixed(2)}
                </p>
              </div>
            </div>
            </div>
          )}

          {/* Completed Tasks Section */}
          {(reportType === 'tasks' || reportType === 'combined') && reportData.completedTasks && reportData.completedTasks.length > 0 && (
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 mt-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center text-white text-lg shadow-lg">
                  ✅
                </div>
                <h3 className="text-xl font-bold text-white">Completed Tasks ({reportData.completedTasks.length})</h3>
              </div>

              <div className="space-y-3">
                {reportData.completedTasks.map((task, index) => (
                  <div key={task.id} className="bg-white/5 p-4 rounded-lg border border-white/10">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-semibold text-white mb-1">{task.title}</h4>
                        <p className="text-sm text-white/70">
                          {task.project_name && `${task.project_name} • `}
                          {task.client_name || 'No Client'}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-green-400 font-medium">
                          Completed by: {task.assigned_first_name} {task.assigned_last_name}
                        </div>
                        <div className="text-xs text-white/60">
                          {new Date(task.completed_at).toLocaleDateString()} at {new Date(task.completed_at).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                    
                    {task.description && (
                      <p className="text-sm text-white/80 mb-2">{task.description}</p>
                    )}
                    
                    {(task.po_number || task.invoice_number) && (
                      <div className="text-xs text-white/60 mb-2 space-y-1">
                        {task.po_number && (
                          <div>🧾 PO: {task.po_number}</div>
                        )}
                        {task.invoice_number && (
                          <div>📄 Invoice: {task.invoice_number}</div>
                        )}
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center text-xs">
                      <div className="flex space-x-4">
                        <span className={`px-2 py-1 rounded-full ${
                          task.priority === 'urgent' ? 'bg-red-500/20 text-red-300' :
                          task.priority === 'high' ? 'bg-orange-500/20 text-orange-300' :
                          task.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-300' :
                          'bg-green-500/20 text-green-300'
                        }`}>
                          {task.priority}
                        </span>
                        <span className="text-white/60">
                          Progress: {task.progress_percentage}%
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 text-white/60">
                        <span>
                          {task.actual_hours ? `${task.actual_hours}h actual` : 'No time logged'}
                          {task.estimated_hours ? ` / ${task.estimated_hours}h estimated` : ''}
                          {task.actual_hours && task.assigned_employee?.hourly_rate && (
                            <span className="text-green-400 ml-2">
                              • $${(parseFloat(task.actual_hours) * task.assigned_employee.hourly_rate).toFixed(2)} cost
                            </span>
                          )}
                        </span>
                        <button
                          onClick={async () => {
                            // Load and show task comments for this task
                            try {
                              const { data } = await database.getTaskComments(task.id)
                              if (data && data.length > 0) {
                                const commentsList = data.map(c => 
                                  `${c.employee?.first_name} ${c.employee?.last_name} (${new Date(c.created_at).toLocaleString()}): ${c.comment_text}`
                                ).join('\n\n')
                                alert(`Task Comments for "${task.title}":\n\n${commentsList}`)
                              } else {
                                alert(`No comments found for "${task.title}"`)
                              }
                            } catch (error) {
                              console.error('Error loading task comments:', error)
                              alert('Error loading task comments')
                            }
                          }}
                          className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded hover:bg-blue-500/30 transition-colors"
                        >
                          💬 Comments
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Expenses Section */}
          {organization?.enable_expenses && reportData.expenses && reportData.expenses.length > 0 && (
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 mt-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center text-white text-lg shadow-lg">
                    💰
                  </div>
                  <h3 className="text-xl font-bold text-white">Expenses ({reportData.expenses.length})</h3>
                </div>
                <div className="text-right">
                  <p className="text-sm text-white/60">Total Amount</p>
                  <p className="text-2xl font-bold text-green-400">
                    ${reportData.expenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0).toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {reportData.expenses.map((expense, index) => (
                  <div key={expense.id} className="bg-white/5 p-4 rounded-lg border border-white/10">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-semibold text-white mb-1">{expense.description}</p>
                        <p className="text-sm text-white/70">
                          {expense.employees.first_name} {expense.employees.last_name}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-green-400">
                          ${parseFloat(expense.amount).toFixed(2)}
                        </p>
                        <p className="text-xs text-white/60">
                          {new Date(expense.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Task Analytics Section */}
          {(reportType === 'tasks' || reportType === 'combined') && reportData.taskSummary && reportData.taskSummary.length > 0 && (
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 mt-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-green-600 rounded-xl flex items-center justify-center text-white text-lg shadow-lg">
                  📋
                </div>
                <h3 className="text-xl font-bold text-white">Task Analytics</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {selectedEmployee === 'all' ? (
                  // Organization-wide stats
                  <>
                    <div className="text-center">
                      <p className="text-white/60 text-sm">Active Projects</p>
                      <p className="text-2xl font-bold text-teal-400">
                        {reportData.taskSummary.filter(s => s.total_tasks > 0).length}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-white/60 text-sm">Total Tasks</p>
                      <p className="text-2xl font-bold text-blue-400">
                        {reportData.taskSummary.reduce((sum, s) => sum + (s.total_tasks || 0), 0)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-white/60 text-sm">Completed</p>
                      <p className="text-2xl font-bold text-green-400">
                        {reportData.taskSummary.reduce((sum, s) => sum + (s.completed_tasks || 0), 0)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-white/60 text-sm">In Progress</p>
                      <p className="text-2xl font-bold text-yellow-400">
                        {reportData.taskSummary.reduce((sum, s) => sum + (s.in_progress_tasks || 0), 0)}
                      </p>
                    </div>
                  </>
                ) : (
                  // Employee-specific stats
                  reportData.taskSummary.length > 0 && (
                    <>
                      <div className="text-center">
                        <p className="text-white/60 text-sm">Total Tasks</p>
                        <p className="text-2xl font-bold text-blue-400">
                          {reportData.taskSummary[0].total_tasks || 0}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-white/60 text-sm">Completed</p>
                        <p className="text-2xl font-bold text-green-400">
                          {reportData.taskSummary[0].completed_tasks || 0}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-white/60 text-sm">In Progress</p>
                        <p className="text-2xl font-bold text-yellow-400">
                          {reportData.taskSummary[0].in_progress_tasks || 0}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-white/60 text-sm">Task Hours</p>
                        <p className="text-2xl font-bold text-purple-400">
                          {parseFloat(reportData.taskSummary[0].total_task_hours || 0).toFixed(1)}h
                        </p>
                      </div>
                    </>
                  )
                )}
              </div>

              {selectedEmployee === 'all' && reportData.taskSummary.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-lg font-semibold text-white mb-3">Project Task Summary</h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {reportData.taskSummary.map((project, index) => (
                      <div key={index} className="bg-white/5 p-3 rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <h5 className="font-medium text-white">{project.project_name}</h5>
                          <span className="text-xs text-white/60">{project.client_name}</span>
                        </div>
                        <div className="grid grid-cols-4 gap-2 text-xs">
                          <div className="text-center">
                            <span className="text-white/60">Total</span>
                            <p className="font-bold text-white">{project.total_tasks || 0}</p>
                          </div>
                          <div className="text-center">
                            <span className="text-green-400">Done</span>
                            <p className="font-bold text-green-400">{project.completed_tasks || 0}</p>
                          </div>
                          <div className="text-center">
                            <span className="text-yellow-400">Progress</span>
                            <p className="font-bold text-yellow-400">{project.in_progress_tasks || 0}</p>
                          </div>
                          <div className="text-center">
                            <span className="text-blue-400">Hours</span>
                            <p className="font-bold text-blue-400">{parseFloat(project.total_actual_hours || 0).toFixed(1)}h</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
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
              <button
                onClick={shareViaWhatsApp}
                className="w-full flex items-center space-x-3 p-4 rounded-xl hover:bg-gray-50 transition-colors text-left"
              >
                <span className="text-lg">💬</span>
                <span className="font-medium text-gray-700">Share via WhatsApp</span>
              </button>
              <button
                onClick={shareViaSMS}
                className="w-full flex items-center space-x-3 p-4 rounded-xl hover:bg-gray-50 transition-colors text-left"
              >
                <span className="text-lg">📱</span>
                <span className="font-medium text-gray-700">Share via SMS</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 