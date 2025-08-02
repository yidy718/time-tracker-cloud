import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function DatabaseExplorer() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchAllData = async () => {
    setLoading(true)
    setError('')
    
    try {
      // Get all employees
      const { data: employees, error: empError } = await supabase
        .from('employees')
        .select('*')
        .order('email')

      if (empError) throw empError

      // Get all organizations  
      const { data: organizations, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .order('name')

      if (orgError) throw orgError

      // Get current auth user
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      setData({
        employees,
        organizations,
        currentUser: user,
        authEmails: employees.map(e => e.email),
        totalEmployees: employees.length,
        totalOrganizations: organizations.length
      })

    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const downloadData = () => {
    if (!data) return
    
    const exportData = {
      timestamp: new Date().toISOString(),
      currentUser: data.currentUser,
      employees: data.employees,
      organizations: data.organizations,
      summary: {
        totalEmployees: data.totalEmployees,
        totalOrganizations: data.totalOrganizations,
        employeeEmails: data.authEmails
      }
    }
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'supabase-real-data.json'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">🔍 Database Explorer</h1>
        <p className="text-gray-600 mb-4">
          Pull real data from Supabase to understand the actual structure
        </p>
        
        <div className="flex gap-4">
          <button
            onClick={fetchAllData}
            disabled={loading}
            className="btn-primary"
          >
            {loading ? 'Loading...' : '📊 Get All Real Data'}
          </button>
          
          {data && (
            <button
              onClick={downloadData}
              className="btn-secondary"
            >
              💾 Download JSON
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <h3 className="font-bold text-red-900 mb-2">❌ Error</h3>
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {data && (
        <div className="space-y-6">
          {/* Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h2 className="text-xl font-bold text-blue-900 mb-4">📋 Database Summary</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{data.totalEmployees}</div>
                <div className="text-sm text-blue-800">Total Employees</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{data.totalOrganizations}</div>
                <div className="text-sm text-green-800">Organizations</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {data.currentUser ? '✅' : '❌'}
                </div>
                <div className="text-sm text-purple-800">Auth Status</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-orange-600">
                  {data.currentUser?.email || 'Not logged in'}
                </div>
                <div className="text-sm text-orange-800">Current User</div>
              </div>
            </div>
          </div>

          {/* Current User Details */}
          {data.currentUser && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h2 className="text-xl font-bold text-green-900 mb-4">👤 Current Auth User</h2>
              <div className="bg-white p-4 rounded border font-mono text-sm">
                <div><strong>ID:</strong> {data.currentUser.id}</div>
                <div><strong>Email:</strong> {data.currentUser.email}</div>
                <div><strong>Created:</strong> {data.currentUser.created_at}</div>
                <div><strong>Last Sign In:</strong> {data.currentUser.last_sign_in_at}</div>
              </div>
            </div>
          )}

          {/* All Employees */}
          <div className="bg-white border rounded-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">👥 All Employees ({data.totalEmployees})</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left">Email</th>
                    <th className="px-3 py-2 text-left">Name</th>
                    <th className="px-3 py-2 text-left">Role</th>
                    <th className="px-3 py-2 text-left">Active</th>
                    <th className="px-3 py-2 text-left">Org ID</th>
                    <th className="px-3 py-2 text-left">Username</th>
                  </tr>
                </thead>
                <tbody>
                  {data.employees.map(emp => (
                    <tr key={emp.id} className={`border-t ${
                      emp.email === data.currentUser?.email ? 'bg-yellow-50' : ''
                    }`}>
                      <td className="px-3 py-2 font-mono text-xs">{emp.email}</td>
                      <td className="px-3 py-2">{emp.first_name} {emp.last_name}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          emp.role === 'admin' ? 'bg-red-100 text-red-800' :
                          emp.role === 'manager' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {emp.role}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {emp.is_active ? '✅' : '❌'}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">{emp.organization_id}</td>
                      <td className="px-3 py-2">{emp.username}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* All Organizations */}
          <div className="bg-white border rounded-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">🏢 All Organizations ({data.totalOrganizations})</h2>
            <div className="space-y-2">
              {data.organizations.map(org => (
                <div key={org.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <div>
                    <div className="font-medium">{org.name}</div>
                    <div className="text-sm text-gray-500 font-mono">{org.id}</div>
                  </div>
                  <div className="text-sm text-gray-500">
                    {data.employees.filter(e => e.organization_id === org.id).length} employees
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}