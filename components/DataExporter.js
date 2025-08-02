import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function DataExporter() {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  const exportEmployeeData = async () => {
    setLoading(true)
    setError('')
    
    try {
      // Get all employees with their organizations
      const { data: employees, error: empError } = await supabase
        .from('employees')
        .select(`
          id,
          first_name,
          last_name,
          email,
          username,
          phone,
          role,
          is_active,
          organization_id,
          can_expense,
          organization:organizations(name)
        `)
        .order('first_name')

      if (empError) throw empError

      // Get organizations
      const { data: organizations, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .order('name')

      if (orgError) throw orgError

      // Analyze phone data
      const phoneAnalysis = employees.reduce((acc, emp) => {
        if (!emp.phone) {
          acc.noPhone.push(emp)
        } else if (emp.phone.match(/^\+[1-9]\d{1,14}$/)) {
          acc.validPhone.push(emp)
        } else {
          acc.invalidPhone.push(emp)
        }
        return acc
      }, { noPhone: [], validPhone: [], invalidPhone: [] })

      setData({
        employees,
        organizations,
        phoneAnalysis,
        summary: {
          totalEmployees: employees.length,
          activeEmployees: employees.filter(e => e.is_active).length,
          employeesWithPhone: phoneAnalysis.validPhone.length,
          employeesWithoutPhone: phoneAnalysis.noPhone.length,
          employeesWithInvalidPhone: phoneAnalysis.invalidPhone.length
        }
      })

    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const downloadJSON = (dataObj, filename) => {
    const blob = new Blob([JSON.stringify(dataObj, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const generateSQL = () => {
    if (!data) return ''

    let sql = '-- Current employee data from Supabase\n\n'
    
    sql += '-- Summary:\n'
    sql += `-- Total Employees: ${data.summary.totalEmployees}\n`
    sql += `-- Active Employees: ${data.summary.activeEmployees}\n`
    sql += `-- Employees with Phone: ${data.summary.employeesWithPhone}\n`
    sql += `-- Employees without Phone: ${data.summary.employeesWithoutPhone}\n`
    sql += `-- Employees with Invalid Phone: ${data.summary.employeesWithInvalidPhone}\n\n`

    if (data.phoneAnalysis.invalidPhone.length > 0) {
      sql += '-- INVALID PHONE NUMBERS (need fixing):\n'
      data.phoneAnalysis.invalidPhone.forEach(emp => {
        sql += `-- ${emp.first_name} ${emp.last_name}: "${emp.phone}"\n`
      })
      sql += '\n'
    }

    sql += '-- Update phone numbers (replace with actual numbers):\n'
    data.phoneAnalysis.noPhone.slice(0, 10).forEach(emp => {
      sql += `UPDATE employees SET phone = '+15551234567' WHERE id = '${emp.id}'; -- ${emp.first_name} ${emp.last_name}\n`
    })

    return sql
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Database Data Exporter</h2>
        <p className="text-gray-600 mb-4">
          Export current employee data to analyze phone number issues
        </p>
        
        <button
          onClick={exportEmployeeData}
          disabled={loading}
          className="btn-primary"
        >
          {loading ? 'Loading...' : 'Export Employee Data'}
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {data && (
        <div className="space-y-6">
          {/* Summary */}
          <div className="bg-white border rounded-lg p-6">
            <h3 className="text-lg font-bold mb-4">📊 Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div className="bg-blue-50 p-3 rounded">
                <div className="font-medium text-blue-900">Total Employees</div>
                <div className="text-2xl font-bold text-blue-600">{data.summary.totalEmployees}</div>
              </div>
              <div className="bg-green-50 p-3 rounded">
                <div className="font-medium text-green-900">Active Employees</div>
                <div className="text-2xl font-bold text-green-600">{data.summary.activeEmployees}</div>
              </div>
              <div className="bg-purple-50 p-3 rounded">
                <div className="font-medium text-purple-900">With Phone</div>
                <div className="text-2xl font-bold text-purple-600">{data.summary.employeesWithPhone}</div>
              </div>
              <div className="bg-yellow-50 p-3 rounded">
                <div className="font-medium text-yellow-900">Without Phone</div>
                <div className="text-2xl font-bold text-yellow-600">{data.summary.employeesWithoutPhone}</div>
              </div>
              <div className="bg-red-50 p-3 rounded">
                <div className="font-medium text-red-900">Invalid Phone</div>
                <div className="text-2xl font-bold text-red-600">{data.summary.employeesWithInvalidPhone}</div>
              </div>
            </div>
          </div>

          {/* Invalid Phone Numbers */}
          {data.phoneAnalysis.invalidPhone.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <h3 className="text-lg font-bold text-red-900 mb-4">❌ Invalid Phone Numbers</h3>
              <div className="space-y-2">
                {data.phoneAnalysis.invalidPhone.map(emp => (
                  <div key={emp.id} className="flex justify-between items-center text-sm">
                    <span className="font-medium">{emp.first_name} {emp.last_name}</span>
                    <span className="text-red-600 font-mono">"{emp.phone}"</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Employees Without Phone */}
          {data.phoneAnalysis.noPhone.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <h3 className="text-lg font-bold text-yellow-900 mb-4">📱 Employees Without Phone Numbers</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                {data.phoneAnalysis.noPhone.slice(0, 20).map(emp => (
                  <div key={emp.id} className="flex justify-between items-center">
                    <span className="font-medium">{emp.first_name} {emp.last_name}</span>
                    <span className="text-gray-500">{emp.email}</span>
                  </div>
                ))}
              </div>
              {data.phoneAnalysis.noPhone.length > 20 && (
                <p className="text-yellow-700 mt-2">And {data.phoneAnalysis.noPhone.length - 20} more...</p>
              )}
            </div>
          )}

          {/* Download Buttons */}
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => downloadJSON(data.employees, 'employees.json')}
              className="btn-secondary"
            >
              📁 Download Employees JSON
            </button>
            <button
              onClick={() => downloadJSON(data.organizations, 'organizations.json')}
              className="btn-secondary"
            >
              📁 Download Organizations JSON
            </button>
            <button
              onClick={() => {
                const sql = generateSQL()
                const blob = new Blob([sql], { type: 'text/plain' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = 'phone-update-queries.sql'
                document.body.appendChild(a)
                a.click()
                document.body.removeChild(a)
                URL.revokeObjectURL(url)
              }}
              className="btn-primary"
            >
              📝 Download SQL Queries
            </button>
          </div>

          {/* SQL Preview */}
          <div className="bg-gray-50 border rounded-lg p-6">
            <h3 className="text-lg font-bold mb-4">📝 Generated SQL Preview</h3>
            <pre className="text-xs bg-white p-4 rounded border overflow-x-auto whitespace-pre-wrap">
              {generateSQL()}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}