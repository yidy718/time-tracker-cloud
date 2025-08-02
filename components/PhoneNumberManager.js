import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function PhoneNumberManager({ organizationId }) {
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState({})
  const [deleting, setDeleting] = useState({})
  const [message, setMessage] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    loadEmployees()
  }, [organizationId])

  const loadEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('id, first_name, last_name, email, phone, role, is_active, organization_id')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('first_name')

      if (error) {
        console.error('Error loading employees:', error)
        // Try with less restrictive query if RLS blocks
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('employees')
          .select('id, first_name, last_name, email, phone, role, is_active, organization_id')
          .eq('is_active', true)
          .order('first_name')
        
        if (fallbackError) throw fallbackError
        
        // Filter client-side for the organization
        const filteredData = fallbackData.filter(emp => emp.organization_id === organizationId)
        setEmployees(filteredData || [])
      } else {
        setEmployees(data || [])
      }
    } catch (error) {
      console.error('Error loading employees:', error)
      setMessage(`Error loading employees: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const updateEmployeePhone = async (employeeId, phone) => {
    setUpdating(prev => ({ ...prev, [employeeId]: true }))
    setMessage('')

    try {
      // Format phone number client-side
      const formatPhone = (phone) => {
        if (!phone || phone.trim() === '') return null
        
        // If already valid E.164, return as-is
        if (phone.match(/^\+[1-9]\d{1,14}$/)) return phone
        
        const digitsOnly = phone.replace(/[^0-9]/g, '')
        
        if (digitsOnly.length === 10) {
          return '+1' + digitsOnly
        } else if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
          return '+' + digitsOnly
        }
        
        return null
      }

      const formattedPhone = formatPhone(phone)
      
      if (phone && !formattedPhone) {
        throw new Error('Invalid phone number format. Use 10-digit US number or E.164 format like +15551234567')
      }

      // Try RPC function first, fallback to direct update
      let data, error

      try {
        const rpcResult = await supabase.rpc('admin_update_employee_phone', {
          employee_id_input: employeeId,
          phone_input: phone
        })
        
        data = rpcResult.data
        error = rpcResult.error
        
        if (!error && data && data.success) {
          setMessage(`✅ ${data.message}`)
          // Update local state
          setEmployees(prev => prev.map(emp => 
            emp.id === employeeId 
              ? { ...emp, phone: data.phone }
              : emp
          ))
        } else if (data && !data.success) {
          throw new Error(data.error)
        }
      } catch (rpcError) {
        // Fallback to direct update
        console.log('RPC failed, trying direct update:', rpcError.message)
        
        const { data: updateData, error: updateError } = await supabase
          .from('employees')
          .update({ phone: formattedPhone })
          .eq('id', employeeId)
          .select('id, first_name, last_name, phone')
          .single()

        if (updateError) throw updateError

        setMessage(`✅ Phone number updated successfully`)
        // Update local state
        setEmployees(prev => prev.map(emp => 
          emp.id === employeeId 
            ? { ...emp, phone: formattedPhone }
            : emp
        ))
      }
    } catch (error) {
      console.error('Error updating phone:', error)
      setMessage(`❌ ${error.message}`)
    } finally {
      setUpdating(prev => ({ ...prev, [employeeId]: false }))
    }
  }

  const deletePhoneNumber = async (employeeId, employeeName) => {
    if (!confirm(`Remove phone number from ${employeeName}? They will no longer be able to use SMS authentication.`)) {
      return
    }

    setDeleting(prev => ({ ...prev, [employeeId]: true }))
    setMessage('')

    try {
      const { error } = await supabase
        .from('employees')
        .update({ phone: null })
        .eq('id', employeeId)

      if (error) throw error

      setMessage(`✅ Phone number removed from ${employeeName}`)
      // Update local state
      setEmployees(prev => prev.map(emp => 
        emp.id === employeeId 
          ? { ...emp, phone: null }
          : emp
      ))
    } catch (error) {
      console.error('Error deleting phone:', error)
      setMessage(`❌ Error removing phone number: ${error.message}`)
    } finally {
      setDeleting(prev => ({ ...prev, [employeeId]: false }))
    }
  }

  const createEmployeeWithPhone = async (formData) => {
    setCreating(true)
    setMessage('')

    try {
      const firstName = formData.get('first_name')
      const lastName = formData.get('last_name')
      const phone = formData.get('phone')
      const role = formData.get('role') || 'employee'

      if (!firstName || !lastName || !phone) {
        throw new Error('First name, last name, and phone number are required')
      }

      // Format phone number
      const formatPhone = (phone) => {
        const digitsOnly = phone.replace(/[^0-9]/g, '')
        if (digitsOnly.length === 10) {
          return '+1' + digitsOnly
        } else if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
          return '+' + digitsOnly
        }
        return phone.startsWith('+') ? phone : `+1${digitsOnly}`
      }

      const formattedPhone = formatPhone(phone)

      // Create employee with phone number
      const { data, error } = await supabase
        .from('employees')
        .insert([{
          organization_id: organizationId,
          first_name: firstName,
          last_name: lastName,
          phone: formattedPhone,
          role: role,
          is_active: true,
          username: `${firstName.toLowerCase()}.${lastName.toLowerCase()}`,
          password: 'TempPass123!' // Default password for phone-only employees
        }])
        .select()
        .single()

      if (error) throw error

      setMessage(`✅ Employee ${firstName} ${lastName} created with phone ${formattedPhone}`)
      setShowCreateForm(false)
      loadEmployees() // Refresh the list
    } catch (error) {
      console.error('Error creating employee:', error)
      setMessage(`❌ Error creating employee: ${error.message}`)
    } finally {
      setCreating(false)
    }
  }

  const handlePhoneSubmit = (e, employeeId) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    const phone = formData.get('phone')
    if (phone) {
      updateEmployeePhone(employeeId, phone)
    }
  }

  const handleCreateSubmit = (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    createEmployeeWithPhone(formData)
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              📱 Employee Phone Numbers
            </h2>
            <p className="text-gray-600">
              Manage phone numbers for SMS authentication
            </p>
          </div>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            {showCreateForm ? 'Cancel' : '+ Create Employee with Phone'}
          </button>
        </div>

        {/* Create Employee Form */}
        {showCreateForm && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-medium text-green-900 mb-4">Create New Employee with Phone</h3>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    name="first_name"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="John"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    name="last_name"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role
                  </label>
                  <select
                    name="role"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="employee">Employee</option>
                    <option value="manager">Manager</option>
                    <option value="non_clock_worker">Non-Clock Worker</option>
                  </select>
                </div>
              </div>
              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={creating}
                  className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating ? (
                    <div className="flex items-center">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Creating...
                    </div>
                  ) : (
                    'Create Employee'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-6 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {message && (
        <div className={`p-4 rounded-lg mb-6 ${
          message.includes('✅') 
            ? 'bg-green-50 text-green-800 border border-green-200'
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message}
        </div>
      )}

      <div className="space-y-4">
        {employees.map(employee => (
          <div key={employee.id} className="bg-white rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">
                  {employee.first_name} {employee.last_name}
                </h3>
                <p className="text-sm text-gray-500">{employee.email}</p>
                <p className="text-xs text-gray-400 capitalize">{employee.role}</p>
              </div>
              
              <div className="flex-1 max-w-sm">
                <form onSubmit={(e) => handlePhoneSubmit(e, employee.id)}>
                  <div className="flex space-x-2">
                    <input
                      type="tel"
                      name="phone"
                      defaultValue={employee.phone || ''}
                      placeholder="+1 (555) 000-0000"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      type="submit"
                      disabled={updating[employee.id]}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {updating[employee.id] ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        'Save'
                      )}
                    </button>
                    {employee.phone && (
                      <button
                        type="button"
                        onClick={() => deletePhoneNumber(employee.id, `${employee.first_name} ${employee.last_name}`)}
                        disabled={deleting[employee.id]}
                        className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Remove phone number"
                      >
                        {deleting[employee.id] ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          '×'
                        )}
                      </button>
                    )}
                  </div>
                </form>
              </div>

              <div className="ml-4">
                {employee.phone ? (
                  <div className="flex items-center text-green-600">
                    <svg className="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm">SMS Ready</span>
                  </div>
                ) : (
                  <div className="flex items-center text-yellow-600">
                    <svg className="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm">No Phone</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {employees.length === 0 && (
        <div className="text-center py-8">
          <div className="text-gray-400 text-4xl mb-4">📱</div>
          <p className="text-gray-500">No employees found</p>
        </div>
      )}

      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-medium text-blue-900 mb-2">SMS Authentication Setup</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Phone numbers must be in E.164 format (e.g., +15551234567)</li>
          <li>• Ensure Supabase Phone Auth is configured in your project</li>
          <li>• SMS authentication requires Twilio or another SMS provider</li>
          <li>• Employees will receive a 6-digit code via SMS to login</li>
        </ul>
      </div>
    </div>
  )
}