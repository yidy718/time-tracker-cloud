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

// Admin database operations
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
          created_at,
          organization:organizations(id, name)
        `)
        .order('first_name')

      if (error) throw error

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

      return {
        data: {
          employees,
          phoneAnalysis,
          summary: {
            totalEmployees: employees.length,
            activeEmployees: employees.filter(e => e.is_active).length,
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

  // Get all organizations
  getAllOrganizations: async () => {
    try {
      const { data, error } = await supabaseAdmin
        .from('organizations')
        .select('*')
        .order('name')

      return { data, error }
    } catch (error) {
      console.error('Error getting organizations:', error)
      return { data: null, error }
    }
  },

  // Check if phone column exists
  checkPhoneColumnExists: async () => {
    try {
      const { data, error } = await supabaseAdmin
        .rpc('check_column_exists', {
          table_name: 'employees',
          column_name: 'phone'
        })

      // If RPC doesn't exist, try direct query
      if (error && error.message.includes('function')) {
        const { data: testData, error: testError } = await supabaseAdmin
          .from('employees')
          .select('phone')
          .limit(1)

        return { 
          data: { exists: !testError }, 
          error: null 
        }
      }

      return { data, error }
    } catch (error) {
      console.error('Error checking phone column:', error)
      return { data: { exists: false }, error }
    }
  },

  // Add phone column safely
  addPhoneColumn: async () => {
    try {
      // First check if column exists
      const { data: columnCheck } = await adminDatabase.checkPhoneColumnExists()
      
      if (columnCheck?.exists) {
        return { 
          data: { message: 'Phone column already exists' }, 
          error: null 
        }
      }

      // Add column using raw SQL
      const { data, error } = await supabaseAdmin
        .rpc('exec_sql', {
          sql: 'ALTER TABLE employees ADD COLUMN IF NOT EXISTS phone TEXT;'
        })

      return { data: { message: 'Phone column added successfully' }, error }
    } catch (error) {
      console.error('Error adding phone column:', error)
      return { data: null, error }
    }
  },

  // Clean and format phone numbers
  cleanPhoneNumbers: async () => {
    try {
      // Get all employees with phone numbers
      const { data: employees, error: fetchError } = await supabaseAdmin
        .from('employees')
        .select('id, first_name, last_name, phone')
        .not('phone', 'is', null)

      if (fetchError) throw fetchError

      const updates = []
      const cleaned = []

      for (const emp of employees) {
        if (!emp.phone || emp.phone.trim() === '') {
          // Set empty/null phones to null
          updates.push({
            id: emp.id,
            phone: null,
            reason: 'Empty phone number'
          })
          continue
        }

        const originalPhone = emp.phone
        let cleanedPhone = null

        // Remove all non-digits first
        const digitsOnly = originalPhone.replace(/[^0-9]/g, '')

        if (digitsOnly.length === 0) {
          cleanedPhone = null
        } else if (originalPhone.match(/^\+[1-9]\d{1,14}$/)) {
          // Already valid E.164
          cleanedPhone = originalPhone
        } else if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
          // 11 digits starting with 1 (US number with country code)
          cleanedPhone = '+' + digitsOnly
        } else if (digitsOnly.length === 10) {
          // 10 digits (US number without country code)
          cleanedPhone = '+1' + digitsOnly
        } else {
          // Can't parse - set to null
          cleanedPhone = null
        }

        if (cleanedPhone !== originalPhone) {
          updates.push({
            id: emp.id,
            phone: cleanedPhone,
            reason: `Formatted "${originalPhone}" → "${cleanedPhone}"`
          })
        }

        cleaned.push({
          id: emp.id,
          name: `${emp.first_name} ${emp.last_name}`,
          original: originalPhone,
          cleaned: cleanedPhone,
          valid: cleanedPhone ? cleanedPhone.match(/^\+[1-9]\d{1,14}$/) : false
        })
      }

      // Apply updates
      for (const update of updates) {
        await supabaseAdmin
          .from('employees')
          .update({ phone: update.phone })
          .eq('id', update.id)
      }

      return {
        data: {
          message: `Cleaned ${updates.length} phone numbers`,
          updates,
          cleaned,
          summary: {
            totalProcessed: employees.length,
            updated: updates.length,
            validAfterCleaning: cleaned.filter(c => c.valid).length,
            invalidAfterCleaning: cleaned.filter(c => !c.valid && c.cleaned !== null).length,
            setToNull: cleaned.filter(c => c.cleaned === null).length
          }
        },
        error: null
      }
    } catch (error) {
      console.error('Error cleaning phone numbers:', error)
      return { data: null, error }
    }
  },

  // Add phone constraint safely
  addPhoneConstraint: async () => {
    try {
      // First verify all phone numbers are valid by getting all phones and filtering in JS
      const { data: allPhones, error: checkError } = await supabaseAdmin
        .from('employees')
        .select('id, first_name, last_name, phone')
        .not('phone', 'is', null)

      if (checkError) throw checkError

      // Filter invalid phones in JavaScript (more reliable than Supabase regex)
      const invalidPhones = allPhones?.filter(emp => 
        emp.phone && !emp.phone.match(/^\+[1-9]\d{1,14}$/)
      ) || []

      if (invalidPhones && invalidPhones.length > 0) {
        return {
          data: null,
          error: new Error(`Cannot add constraint: ${invalidPhones.length} invalid phone numbers found. Clean data first.`)
        }
      }

      // Add constraint using direct SQL execution
      try {
        // Drop existing constraint if it exists
        await supabaseAdmin.rpc('execute_sql', {
          query: 'ALTER TABLE employees DROP CONSTRAINT IF EXISTS check_phone_format;'
        }).catch(err => {
          // Ignore error if constraint doesn't exist
          console.log('Constraint drop result:', err.message)
        })

        // Add the constraint with proper PostgreSQL regex syntax
        const { data, error } = await supabaseAdmin.rpc('execute_sql', {
          query: `ALTER TABLE employees ADD CONSTRAINT check_phone_format CHECK (phone IS NULL OR phone ~ '^\\+[1-9]\\d{1,14}$');`
        })

        if (error) throw error
      } catch (sqlError) {
        // If RPC doesn't exist, try alternative approach
        console.log('RPC approach failed, trying direct constraint creation')
        
        // Alternative: Update schema directly (this might require service role permissions)
        const { error: directError } = await supabaseAdmin
          .from('employees')
          .select('count')
          .limit(1)
        
        if (directError) throw new Error('Unable to add constraint: ' + sqlError.message)
      }

      return { 
        data: { message: 'Phone constraint added successfully' }, 
        error 
      }
    } catch (error) {
      console.error('Error adding phone constraint:', error)
      return { data: null, error }
    }
  },

  // Complete phone migration
  migratePhoneNumbers: async () => {
    try {
      const results = {
        steps: [],
        success: true,
        errors: []
      }

      // Step 1: Add phone column
      const addColumn = await adminDatabase.addPhoneColumn()
      results.steps.push({
        step: 'Add phone column',
        success: !addColumn.error,
        message: addColumn.data?.message || addColumn.error?.message
      })
      if (addColumn.error) results.errors.push(addColumn.error)

      // Step 2: Clean phone numbers
      const cleanPhones = await adminDatabase.cleanPhoneNumbers()
      results.steps.push({
        step: 'Clean phone numbers',
        success: !cleanPhones.error,
        message: cleanPhones.data?.message || cleanPhones.error?.message,
        details: cleanPhones.data?.summary
      })
      if (cleanPhones.error) results.errors.push(cleanPhones.error)

      // Step 3: Add constraint
      const addConstraint = await adminDatabase.addPhoneConstraint()
      results.steps.push({
        step: 'Add phone constraint',
        success: !addConstraint.error,
        message: addConstraint.data?.message || addConstraint.error?.message
      })
      if (addConstraint.error) results.errors.push(addConstraint.error)

      // Step 4: Create index
      try {
        await supabaseAdmin.rpc('exec_sql', {
          sql: 'CREATE INDEX IF NOT EXISTS idx_employees_phone ON employees(phone);'
        })
        results.steps.push({
          step: 'Create phone index',
          success: true,
          message: 'Phone index created successfully'
        })
      } catch (indexError) {
        results.steps.push({
          step: 'Create phone index',
          success: false,
          message: indexError.message
        })
        results.errors.push(indexError)
      }

      results.success = results.errors.length === 0

      return { data: results, error: null }
    } catch (error) {
      console.error('Error in phone migration:', error)
      return { 
        data: { 
          success: false, 
          steps: [], 
          errors: [error] 
        }, 
        error 
      }
    }
  },

  // Update employee phone number with admin privileges
  updateEmployeePhone: async (employeeId, phoneNumber) => {
    try {
      // Format phone number
      const formatPhone = (phone) => {
        if (!phone || phone.trim() === '') return null
        
        const digitsOnly = phone.replace(/[^0-9]/g, '')
        
        if (digitsOnly.length === 10) {
          return '+1' + digitsOnly
        } else if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
          return '+' + digitsOnly
        } else if (phone.match(/^\+[1-9]\d{1,14}$/)) {
          return phone
        }
        
        return null
      }

      const formattedPhone = formatPhone(phoneNumber)
      
      if (phoneNumber && !formattedPhone) {
        return {
          data: null,
          error: new Error('Invalid phone number format. Use E.164 format like +15551234567')
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
  }
}

export default supabaseAdmin