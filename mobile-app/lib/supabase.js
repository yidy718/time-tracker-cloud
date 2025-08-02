import 'react-native-url-polyfill/auto'
import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'

// Environment variables for secure credential storage
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

export const database = {
  // Employee authentication using secure function with fallback
  authenticateEmployee: async (username, password) => {
    console.log('Mobile: Trying authentication function for:', username)
    
    // Try the secure function first
    const { data, error } = await supabase
      .rpc('authenticate_employee', {
        input_username: username,
        input_password: password
      })
    
    console.log('Mobile: Function result:', { data, error })
    
    // If function works, use it
    if (!error && data && data.length > 0) {
      const employee = data[0]
      return { 
        data: {
          id: employee.employee_id || employee.id,
          organization_id: employee.organization_id,
          first_name: employee.first_name,
          last_name: employee.last_name,
          email: employee.email,
          role: employee.role,
          is_active: employee.is_active,
          can_expense: employee.can_expense
        }, 
        error: null 
      }
    }
    
    // If function doesn't exist or fails, try direct query
    console.log('Mobile: Function failed, trying direct query')
    
    const { data: basicData, error: basicError } = await supabase
      .from('employees')
      .select('*')
      .eq('username', username)
      .eq('password', password)
      .eq('is_active', true)
      .single()
    
    console.log('Mobile: Basic query result:', { basicData, basicError })
    
    return { data: basicData, error: basicError }
  }
}