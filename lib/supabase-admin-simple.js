import { createClient } from '@supabase/supabase-js'

// Admin client using service role key (bypasses RLS)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing Supabase admin environment variables')
}

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Simple admin database operations
export const adminDatabase = {
  // Get all employees with phone analysis
  getAllEmployeesWithPhoneAnalysis: async () => {
    try {
      const { data: employees, error } = await supabaseAdmin
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
          created_at
        `)
        .order('first_name')

      if (error) throw error

      // Get organizations separately to avoid join issues
      const { data: organizations, error: orgError } = await supabaseAdmin
        .from('organizations')
        .select('id, name')

      if (orgError) throw orgError

      // Map organization names to employees
      const orgMap = {}
      organizations.forEach(org => {
        orgMap[org.id] = org
      })

      const enrichedEmployees = employees.map(emp => ({
        ...emp,
        organization: orgMap[emp.organization_id] || { id: emp.organization_id, name: 'Unknown' }
      }))

      // Analyze phone data
      const phoneAnalysis = enrichedEmployees.reduce((acc, emp) => {
        if (!emp.phone) {
          acc.noPhone.push(emp)
        } else if (emp.phone.match(/^\+[1-9]\d{1,14}$/)) {
          acc.validPhone.push(emp)
        } else {
          acc.invalidPhone.push(emp)
        }
        return acc
      }, { noPhone: [], validPhone: [], invalidPhone: [] })

      return {
        data: {
          employees: enrichedEmployees,
          organizations,
          phoneAnalysis,
          summary: {
            totalEmployees: enrichedEmployees.length,
            activeEmployees: enrichedEmployees.filter(e => e.is_active).length,
            employeesWithPhone: phoneAnalysis.validPhone.length,
            employeesWithoutPhone: phoneAnalysis.noPhone.length,
            employeesWithInvalidPhone: phoneAnalysis.invalidPhone.length
          }
        },
        error: null
      }
    } catch (error) {
      console.error('Error getting employees with phone analysis:', error)
      return { data: null, error }
    }
  },

  // Clean and format phone numbers using simple updates
  cleanPhoneNumbers: async () => {
    try {
      // Get all employees with phone numbers
      const { data: employees, error: fetchError } = await supabaseAdmin
        .from('employees')
        .select('id, first_name, last_name, phone')
        .not('phone', 'is', null)

      if (fetchError) throw fetchError

      const updates = []
      const results = []

      for (const emp of employees) {
        if (!emp.phone || emp.phone.trim() === '') {
          // Skip empty phones
          continue
        }

        const originalPhone = emp.phone
        let cleanedPhone = null

        // Clean and format phone number
        if (originalPhone.match(/^\+[1-9]\d{1,14}$/)) {
          // Already valid E.164
          cleanedPhone = originalPhone
        } else {
          // Remove all non-digits
          const digitsOnly = originalPhone.replace(/[^0-9]/g, '')

          if (digitsOnly.length === 10) {
            // 10 digits - add US country code
            cleanedPhone = '+1' + digitsOnly
          } else if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
            // 11 digits starting with 1 - add plus
            cleanedPhone = '+' + digitsOnly
          } else {
            // Can't parse - set to null
            cleanedPhone = null
          }
        }

        if (cleanedPhone !== originalPhone) {
          updates.push({ id: emp.id, phone: cleanedPhone })
          results.push({
            id: emp.id,
            name: `${emp.first_name} ${emp.last_name}`,
            original: originalPhone,
            cleaned: cleanedPhone,
            action: cleanedPhone ? 'formatted' : 'set_to_null'
          })
        }
      }

      // Apply updates one by one (more reliable than bulk)
      let successCount = 0
      let errorCount = 0
      const errors = []

      for (const update of updates) {
        try {
          const { error } = await supabaseAdmin
            .from('employees')
            .update({ phone: update.phone })
            .eq('id', update.id)

          if (error) {
            errorCount++
            errors.push(`${update.id}: ${error.message}`)
          } else {
            successCount++
          }
        } catch (err) {
          errorCount++
          errors.push(`${update.id}: ${err.message}`)
        }
      }

      return {
        data: {
          message: `Processed ${updates.length} phone numbers: ${successCount} updated, ${errorCount} errors`,
          updates: results,
          summary: {
            totalProcessed: employees.length,
            updated: successCount,
            errors: errorCount,
            validAfterCleaning: results.filter(r => r.cleaned && r.cleaned.match(/^\+[1-9]\d{1,14}$/)).length,
            setToNull: results.filter(r => !r.cleaned).length
          },
          errors
        },
        error: null
      }
    } catch (error) {
      console.error('Error cleaning phone numbers:', error)
      return { data: null, error }
    }
  },

  // Update employee phone number
  updateEmployeePhone: async (employeeId, phoneNumber) => {
    try {
      // Format phone number
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

      const formattedPhone = formatPhone(phoneNumber)
      
      if (phoneNumber && !formattedPhone) {
        return {
          data: null,
          error: new Error('Invalid phone number format. Use 10-digit US number or E.164 format like +15551234567')
        }
      }

      const { data, error } = await supabaseAdmin
        .from('employees')
        .update({ phone: formattedPhone })
        .eq('id', employeeId)
        .select('id, first_name, last_name, phone')
        .single()

      return { data, error }
    } catch (error) {
      console.error('Error updating employee phone:', error)
      return { data: null, error }
    }
  },

  // Simple migration that just cleans data
  migratePhoneNumbers: async () => {
    try {
      const results = {
        steps: [],
        success: true,
        errors: []
      }

      // Step 1: Clean phone numbers
      const cleanResult = await adminDatabase.cleanPhoneNumbers()
      results.steps.push({
        step: 'Clean and format phone numbers',
        success: !cleanResult.error,
        message: cleanResult.data?.message || cleanResult.error?.message,
        details: cleanResult.data?.summary
      })

      if (cleanResult.error) {
        results.errors.push(cleanResult.error)
        results.success = false
      }

      return { data: results, error: null }
    } catch (error) {
      console.error('Error in phone migration:', error)
      return { 
        data: { 
          success: false, 
          steps: [{ 
            step: 'Migration failed', 
            success: false, 
            message: error.message 
          }], 
          errors: [error] 
        }, 
        error 
      }
    }
  }
}

export default supabaseAdmin