import { useState } from 'react'

export default function AdminDataManager() {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState(null)
  const [migrationResult, setMigrationResult] = useState(null)
  const [error, setError] = useState('')

  const fetchCurrentData = async () => {
    setLoading(true)
    setError('')
    
    try {
      const response = await fetch('/api/admin/phone-migration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'analyze' })
      })
      
      const result = await response.json()
      
      if (!response.ok) throw new Error(result.error || 'Failed to fetch data')
      if (result.error) throw new Error(result.error)
      
      setData(result.data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const runPhoneMigration = async () => {
    setLoading(true)
    setError('')
    setMigrationResult(null)
    
    try {
      const response = await fetch('/api/admin/phone-migration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'migrate' })
      })
      
      const result = await response.json()
      
      if (!response.ok) throw new Error(result.error || 'Migration failed')
      if (result.error) throw new Error(result.error)
      
      setMigrationResult(result.data)
      
      // Refresh data after migration
      await fetchCurrentData()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const cleanPhoneNumbers = async () => {
    setLoading(true)
    setError('')
    
    try {
      const response = await fetch('/api/admin/phone-migration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clean' })
      })
      
      const result = await response.json()
      
      if (!response.ok) throw new Error(result.error || 'Cleaning failed')
      if (result.error) throw new Error(result.error)
      
      setMigrationResult({
        success: true,
        steps: [{
          step: 'Clean phone numbers',
          success: true,
          message: result.data.message,
          details: result.data.summary
        }]
      })
      
      // Refresh data after cleaning
      await fetchCurrentData()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const updateEmployeePhone = async (employeeId, phone) => {
    try {
      const response = await fetch('/api/admin/phone-migration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update-phone', employeeId, phone })
      })
      
      const result = await response.json()
      
      if (!response.ok) throw new Error(result.error || 'Update failed')
      if (result.error) throw new Error(result.error)
      
      // Refresh data
      await fetchCurrentData()
      
      return { success: true, data: result.data }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  const generateMigrationSQL = () => {
    if (!data) return ''

    let sql = '-- Phone number migration SQL\n'
    sql += '-- Generated from current Supabase data\n\n'
    
    sql += '-- Step 1: Add phone column if not exists\n'
    sql += 'ALTER TABLE employees ADD COLUMN IF NOT EXISTS phone TEXT;\n\n'
    
    if (data.phoneAnalysis.invalidPhone.length > 0) {
      sql += '-- Step 2: Fix invalid phone numbers\n'
      data.phoneAnalysis.invalidPhone.forEach(emp => {
        const digitsOnly = emp.phone.replace(/[^0-9]/g, '')
        let suggestedPhone = 'NULL'
        
        if (digitsOnly.length === 10) {
          suggestedPhone = `'+1${digitsOnly}'`
        } else if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
          suggestedPhone = `'+${digitsOnly}'`
        }
        
        sql += `UPDATE employees SET phone = ${suggestedPhone} WHERE id = '${emp.id}'; -- ${emp.first_name} ${emp.last_name}: "${emp.phone}"\n`
      })
      sql += '\n'
    }
    
    sql += '-- Step 3: Add phone numbers for employees without them\n'
    data.phoneAnalysis.noPhone.slice(0, 10).forEach((emp, index) => {
      const phoneNumber = `+155512345${String(index).padStart(2, '0')}`
      sql += `UPDATE employees SET phone = '${phoneNumber}' WHERE id = '${emp.id}'; -- ${emp.first_name} ${emp.last_name}\n`
    })
    
    sql += '\n-- Step 4: Add constraint after data is clean\n'
    sql += 'ALTER TABLE employees ADD CONSTRAINT check_phone_format CHECK (phone IS NULL OR phone ~ \'^\\\\+[1-9]\\\\d{1,14}$\');\n\n'
    sql += '-- Step 5: Create index\n'
    sql += 'CREATE INDEX IF NOT EXISTS idx_employees_phone ON employees(phone);\n'
    
    return sql
  }

  const downloadFile = (content, filename, type = 'text/plain') => {
    const blob = new Blob([content], { type })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">🔧 Admin Data Manager</h1>
        <p className="text-gray-600 mb-6">
          Manage employee phone numbers and database migrations using Supabase service role.
        </p>
        
        <div className="flex flex-wrap gap-4">
          <button
            onClick={fetchCurrentData}
            disabled={loading}
            className="btn-primary"
          >
            {loading ? 'Loading...' : '📊 Analyze Current Data'}
          </button>
          
          <button
            onClick={runPhoneMigration}
            disabled={loading}
            className="btn-success"
          >
            {loading ? 'Migrating...' : '🚀 Run Full Migration'}
          </button>
          
          <button
            onClick={cleanPhoneNumbers}
            disabled={loading}
            className="btn-warning"
          >
            {loading ? 'Cleaning...' : '🧹 Clean Phone Numbers Only'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <h3 className="font-bold text-red-900 mb-2">❌ Error</h3>
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {migrationResult && (
        <div className={`mb-6 p-4 border rounded-lg ${
          migrationResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
        }`}>
          <h3 className={`font-bold mb-4 ${
            migrationResult.success ? 'text-green-900' : 'text-red-900'
          }`}>
            {migrationResult.success ? '✅ Migration Results' : '❌ Migration Failed'}
          </h3>
          
          <div className="space-y-3">
            {migrationResult.steps.map((step, index) => (
              <div key={index} className={`p-3 rounded border ${
                step.success ? 'bg-white border-green-200' : 'bg-red-50 border-red-300'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {step.success ? '✅' : '❌'} {step.step}
                  </span>
                  <span className={`text-sm ${step.success ? 'text-green-600' : 'text-red-600'}`}>
                    {step.message}
                  </span>
                </div>
                
                {step.details && (
                  <div className="mt-2 text-sm text-gray-600">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      <div>Processed: {step.details.totalProcessed}</div>
                      <div>Updated: {step.details.updated}</div>
                      <div>Valid: {step.details.validAfterCleaning}</div>
                      <div>Set to NULL: {step.details.setToNull}</div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {migrationResult.errors && migrationResult.errors.length > 0 && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
              <h4 className="font-medium text-red-900 mb-2">Errors:</h4>
              <ul className="text-sm text-red-800 space-y-1">
                {migrationResult.errors.map((err, index) => (
                  <li key={index}>• {err.message}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {data && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{data.summary.totalEmployees}</div>
              <div className="text-sm text-blue-800">Total Employees</div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{data.summary.activeEmployees}</div>
              <div className="text-sm text-green-800">Active</div>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">{data.summary.employeesWithPhone}</div>
              <div className="text-sm text-purple-800">With Phone</div>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-yellow-600">{data.summary.employeesWithoutPhone}</div>
              <div className="text-sm text-yellow-800">Without Phone</div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{data.summary.employeesWithInvalidPhone}</div>
              <div className="text-sm text-red-800">Invalid Phone</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-4 p-4 bg-gray-50 rounded-lg">
            <button
              onClick={() => downloadFile(JSON.stringify(data, null, 2), 'employees-data.json', 'application/json')}
              className="btn-secondary"
            >
              📁 Download JSON
            </button>
            <button
              onClick={() => downloadFile(generateMigrationSQL(), 'phone-migration.sql')}
              className="btn-primary"
            >
              📝 Download Migration SQL
            </button>
          </div>

          {/* Invalid Phone Numbers */}
          {data.phoneAnalysis.invalidPhone.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <h3 className="text-lg font-bold text-red-900 mb-4">❌ Invalid Phone Numbers ({data.phoneAnalysis.invalidPhone.length})</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {data.phoneAnalysis.invalidPhone.map(emp => (
                  <div key={emp.id} className="flex items-center justify-between bg-white p-3 rounded border">
                    <div className="flex-1">
                      <span className="font-medium">{emp.first_name} {emp.last_name}</span>
                      <span className="text-gray-500 ml-2">({emp.email})</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-red-600 font-mono text-sm">"{emp.phone}"</span>
                      <QuickPhoneUpdate 
                        employee={emp} 
                        onUpdate={updateEmployeePhone}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Employees Without Phone */}
          {data.phoneAnalysis.noPhone.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <h3 className="text-lg font-bold text-yellow-900 mb-4">📱 Employees Without Phone Numbers ({data.phoneAnalysis.noPhone.length})</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                {data.phoneAnalysis.noPhone.map(emp => (
                  <div key={emp.id} className="flex items-center justify-between bg-white p-3 rounded border">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{emp.first_name} {emp.last_name}</div>
                      <div className="text-sm text-gray-500 truncate">{emp.email}</div>
                    </div>
                    <QuickPhoneUpdate 
                      employee={emp} 
                      onUpdate={updateEmployeePhone}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Valid Phone Numbers */}
          {data.phoneAnalysis.validPhone.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h3 className="text-lg font-bold text-green-900 mb-4">✅ Valid Phone Numbers ({data.phoneAnalysis.validPhone.length})</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-40 overflow-y-auto">
                {data.phoneAnalysis.validPhone.slice(0, 10).map(emp => (
                  <div key={emp.id} className="flex items-center justify-between bg-white p-3 rounded border">
                    <div className="flex-1">
                      <span className="font-medium">{emp.first_name} {emp.last_name}</span>
                    </div>
                    <span className="text-green-600 font-mono text-sm">{emp.phone}</span>
                  </div>
                ))}
              </div>
              {data.phoneAnalysis.validPhone.length > 10 && (
                <p className="text-green-700 mt-2 text-center">
                  And {data.phoneAnalysis.validPhone.length - 10} more with valid phone numbers
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Quick phone update component
function QuickPhoneUpdate({ employee, onUpdate }) {
  const [phone, setPhone] = useState('')
  const [updating, setUpdating] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const handleUpdate = async (e) => {
    e.preventDefault()
    setUpdating(true)
    
    const result = await onUpdate(employee.id, phone)
    
    if (result.success) {
      setShowForm(false)
      setPhone('')
    } else {
      alert(result.error)
    }
    
    setUpdating(false)
  }

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
      >
        Add Phone
      </button>
    )
  }

  return (
    <form onSubmit={handleUpdate} className="flex items-center space-x-2">
      <input
        type="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="+15551234567"
        className="px-2 py-1 text-sm border rounded w-32"
        required
      />
      <button
        type="submit"
        disabled={updating}
        className="px-2 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
      >
        {updating ? '...' : '✓'}
      </button>
      <button
        type="button"
        onClick={() => setShowForm(false)}
        className="px-2 py-1 bg-gray-400 text-white text-sm rounded hover:bg-gray-500"
      >
        ✕
      </button>
    </form>
  )
}