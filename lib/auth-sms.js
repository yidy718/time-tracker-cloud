import { supabase } from './supabase'

// SMS Authentication Functions using Supabase Phone Auth
export const smsAuth = {
  // Send SMS OTP to phone number
  sendSMSOTP: async (phone) => {
    try {
      const { data, error } = await supabase.auth.signInWithOtp({
        phone: phone,
        options: {
          // Optional: specify SMS provider settings
          channel: 'sms'
        }
      })
      
      if (error) throw error
      
      return { data, error: null }
    } catch (error) {
      console.error('sendSMSOTP failed:', error)
      return { data: null, error }
    }
  },

  // Verify SMS OTP
  verifySMSOTP: async (phone, token) => {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone: phone,
        token: token,
        type: 'sms'
      })
      
      if (error) throw error
      
      return { data, error: null }
    } catch (error) {
      console.error('verifySMSOTP failed:', error)
      return { data: null, error }
    }
  },

  // Link phone number to existing user account
  linkPhoneToUser: async (phone) => {
    try {
      const { data, error } = await supabase.auth.updateUser({
        phone: phone
      })
      
      if (error) throw error
      
      return { data, error: null }
    } catch (error) {
      console.error('linkPhoneToUser failed:', error)
      return { data: null, error }
    }
  },

  // Send verification to update phone number
  updatePhone: async (phone) => {
    try {
      const { data, error } = await supabase.auth.updateUser({
        phone: phone
      })
      
      if (error) throw error
      
      return { data, error: null }
    } catch (error) {
      console.error('updatePhone failed:', error)
      return { data: null, error }
    }
  },

  // Enhanced employee SMS authentication that creates custom session without Supabase Auth user
  authenticateEmployeeBySMS: async (phone, token) => {
    try {
      // Verify SMS OTP first (this creates a temporary Supabase user but we'll ignore it)
      const { data: authData, error: authError } = await smsAuth.verifySMSOTP(phone, token)
      
      if (authError) {
        console.error('SMS verification failed:', authError)
        throw new Error('Invalid SMS code. Please try again.')
      }

      console.log('✅ SMS verification successful, looking up employee...')

      // Find employee record by phone number
      const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .select(`
          *,
          organization:organizations(name)
        `)
        .eq('phone', phone)
        .eq('is_active', true)
        .maybeSingle()

      if (employeeError) {
        console.error('Employee lookup error:', employeeError)
        throw new Error('Error finding employee record')
      }

      if (!employee) {
        throw new Error('No active employee found with this phone number')
      }

      console.log('✅ Found employee:', employee.first_name, employee.last_name)

      // Create CUSTOM session (compatible with existing employee authentication)
      // This matches the format used by the existing username/password employee login
      const session = {
        employee: {
          id: employee.id,
          employee_id: employee.employee_id, // Include this for compatibility
          organization_id: employee.organization_id,
          first_name: employee.first_name,
          last_name: employee.last_name,
          email: employee.email,
          phone: employee.phone,
          role: employee.role,
          username: employee.username,
          is_active: employee.is_active,
          can_expense: employee.can_expense,
          organization: employee.organization
        },
        auth_method: 'sms',
        authenticated_at: new Date().toISOString()
      }

      console.log('✅ Created custom session:', session)

      return { data: session, error: null }
    } catch (error) {
      console.error('authenticateEmployeeBySMS failed:', error)
      return { data: null, error }
    }
  },

  // Format phone number to E.164 format (required by Supabase)
  formatPhoneNumber: (phone, countryCode = '+1') => {
    // Remove all non-digits
    const cleaned = phone.replace(/\D/g, '')
    
    // If it already starts with country code, return as is
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+${cleaned}`
    }
    
    // If it's a 10-digit US number, add +1
    if (cleaned.length === 10) {
      return `${countryCode}${cleaned}`
    }
    
    // If it already has +, return as is
    if (phone.startsWith('+')) {
      return phone
    }
    
    // Default: assume it needs country code
    return `${countryCode}${cleaned}`
  },

  // Validate phone number format
  isValidPhoneNumber: (phone) => {
    const phoneRegex = /^\+[1-9]\d{1,14}$/
    return phoneRegex.test(phone)
  }
}

// Magic Link Authentication (enhanced from existing implementation)
export const magicLinkAuth = {
  // Send magic link to email
  sendMagicLink: async (email, redirectTo = null) => {
    try {
      const { data, error } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
          emailRedirectTo: redirectTo || `${window.location.origin}/dashboard`
        }
      })
      
      if (error) throw error
      
      return { data, error: null }
    } catch (error) {
      console.error('sendMagicLink failed:', error)
      return { data: null, error }
    }
  },

  // Verify magic link token
  verifyMagicLink: async (email, token) => {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email,
        token: token,
        type: 'email'
      })
      
      if (error) throw error
      
      return { data, error: null }
    } catch (error) {
      console.error('verifyMagicLink failed:', error)
      return { data: null, error }
    }
  },

  // Enhanced employee magic link authentication
  authenticateEmployeeByMagicLink: async (email, token) => {
    try {
      // Verify magic link first
      const { data: authData, error: authError } = await magicLinkAuth.verifyMagicLink(email, token)
      
      if (authError || !authData.user) {
        throw authError || new Error('Magic link verification failed')
      }

      // Find employee record by email
      const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .select(`
          *,
          organization:organizations(name)
        `)
        .eq('email', email)
        .eq('is_active', true)
        .maybeSingle()

      if (employeeError) {
        console.error('Employee lookup error:', employeeError)
        throw new Error('Error finding employee record')
      }

      if (!employee) {
        throw new Error('No active employee found with this email')
      }

      // Create enhanced session
      const session = {
        user: authData.user,
        employee: {
          id: employee.id,
          organization_id: employee.organization_id,
          first_name: employee.first_name,
          last_name: employee.last_name,
          email: employee.email,
          phone: employee.phone,
          role: employee.role,
          is_active: employee.is_active,
          can_expense: employee.can_expense,
          organization: employee.organization
        },
        access_token: authData.session?.access_token,
        refresh_token: authData.session?.refresh_token
      }

      return { data: session, error: null }
    } catch (error) {
      console.error('authenticateEmployeeByMagicLink failed:', error)
      return { data: null, error }
    }
  }
}

const authModules = { smsAuth, magicLinkAuth }
export default authModules