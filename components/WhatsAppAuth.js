import React, { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function WhatsAppAuth({ onSuccess, onBack }) {
  const [step, setStep] = useState('phone') // 'phone', 'otp', 'sent'
  const [loading, setLoading] = useState(false)
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  // Format phone number for WhatsApp (E.164 format)
  const formatWhatsAppNumber = (phone) => {
    // Remove all non-digits
    const cleaned = phone.replace(/\D/g, '')
    
    // If it already starts with country code, return as is
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+${cleaned}`
    }
    
    // If it's a 10-digit US number, add +1
    if (cleaned.length === 10) {
      return `+1${cleaned}`
    }
    
    // If it already has +, return as is
    if (phone.startsWith('+')) {
      return phone
    }
    
    // Default: assume it needs country code
    return `+1${cleaned}`
  }

  // Validate phone number format
  const isValidWhatsAppNumber = (phone) => {
    const phoneRegex = /^\+[1-9]\d{1,14}$/
    return phoneRegex.test(phone)
  }

  // Send WhatsApp OTP
  const sendWhatsAppOTP = async (phoneNumber) => {
    try {
      // Call our WhatsApp API endpoint
      const response = await fetch('/api/send-whatsapp-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: phoneNumber,
          type: 'authentication'
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send WhatsApp message')
      }

      return { data: result, error: null }
    } catch (error) {
      console.error('WhatsApp OTP send failed:', error)
      return { data: null, error }
    }
  }

  // Verify WhatsApp OTP
  const verifyWhatsAppOTP = async (phoneNumber, code) => {
    try {
      // Call our WhatsApp verification endpoint
      const response = await fetch('/api/verify-whatsapp-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: phoneNumber,
          code: code
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Invalid verification code')
      }

      return { data: result, error: null }
    } catch (error) {
      console.error('WhatsApp OTP verification failed:', error)
      return { data: null, error }
    }
  }

  const handleSendWhatsApp = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      console.log('💚 Starting WhatsApp send process...')
      console.log('📱 Raw phone input:', phone)
      
      // Format phone number
      const formattedPhone = formatWhatsAppNumber(phone)
      console.log('📱 Formatted phone:', formattedPhone)
      
      if (!isValidWhatsAppNumber(formattedPhone)) {
        throw new Error('Please enter a valid phone number')
      }
      console.log('✅ Phone number validation passed')

      // Check if employee exists with this phone number first
      console.log('🔍 Checking for employee with phone:', formattedPhone)
      const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .select('id, first_name, last_name, email, phone, is_active')
        .eq('phone', formattedPhone)
        .eq('is_active', true)
        .maybeSingle()

      console.log('👤 Employee lookup result:', { employee, employeeError })

      if (employeeError) {
        throw new Error('Error checking employee: ' + employeeError.message)
      }

      if (!employee) {
        throw new Error('No active employee found with this phone number. Please contact your administrator.')
      }
      console.log(`✅ Found employee: ${employee.first_name} ${employee.last_name}`)

      // Send WhatsApp OTP
      console.log('💚 Attempting to send WhatsApp OTP to:', formattedPhone)
      const { data, error } = await sendWhatsAppOTP(formattedPhone)
      console.log('💚 WhatsApp result:', { data, error })
      
      if (error) {
        throw error
      }

      setPhone(formattedPhone) // Save formatted version
      setStep('otp')
      setMessage(`WhatsApp code sent to ${formattedPhone}! Check your WhatsApp messages.`)
      
    } catch (err) {
      console.error('WhatsApp Error:', err)
      setError(err.message)
    }

    setLoading(false)
  }

  const handleVerifyWhatsApp = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      console.log('💚 Verifying WhatsApp OTP:', otp)
      
      // Verify the OTP code
      const { data: verifyResult, error: verifyError } = await verifyWhatsAppOTP(phone, otp)
      
      if (verifyError) throw verifyError

      console.log('✅ WhatsApp OTP verified successfully')

      // Get employee data again for session creation
      const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .select(`
          *,
          organization:organizations(name)
        `)
        .eq('phone', phone)
        .eq('is_active', true)
        .maybeSingle()

      if (employeeError || !employee) {
        throw new Error('Error loading employee data')
      }

      // Create CUSTOM session (compatible with existing employee authentication)
      const session = {
        employee: {
          id: employee.id,
          employee_id: employee.employee_id,
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
        auth_method: 'whatsapp',
        authenticated_at: new Date().toISOString()
      }

      console.log('✅ Created WhatsApp session:', session)

      // Store session and trigger success
      localStorage.setItem('employee_session', JSON.stringify(session))
      onSuccess(session)
      
    } catch (err) {
      console.error('WhatsApp verification error:', err)
      setError(err.message)
    }

    setLoading(false)
  }

  if (step === 'otp') {
    return (
      <div className="text-center">
        <div className="text-6xl mb-6 animate-bounce">💚</div>
        <h2 className="text-2xl font-bold text-white mb-2">Check WhatsApp</h2>
        <p className="text-white/70 mb-6">
          We sent a code to <strong>{phone}</strong>
        </p>

        <form onSubmit={handleVerifyWhatsApp} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              6-Digit Code from WhatsApp
            </label>
            <input
              type="text"
              required
              maxLength="6"
              className="input w-full text-center text-2xl tracking-widest"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              autoComplete="one-time-code"
              inputMode="numeric"
              autoFocus
            />
          </div>

          {error && (
            <div className="p-4 rounded-lg text-sm bg-red-50 text-red-800 border border-red-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || otp.length !== 6}
            className="btn-primary w-full touch-feedback"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Verifying...
              </div>
            ) : (
              <>
                <span className="mr-2">💚</span>
                Verify WhatsApp Code
              </>
            )}
          </button>

          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setStep('phone')}
              className="text-white/70 hover:text-white text-sm transition-colors"
            >
              ← Back to phone number
            </button>
            
            <button
              type="button"
              onClick={handleSendWhatsApp}
              disabled={loading}
              className="block w-full text-sm text-white/70 hover:text-white transition-colors"
            >
              Resend WhatsApp code
            </button>
          </div>
        </form>

        {/* WhatsApp Instructions */}
        <div className="mt-8 p-4 bg-green-500/10 rounded-lg border border-green-400/30">
          <h3 className="text-green-300 font-medium mb-2">💡 WhatsApp Tips:</h3>
          <ul className="text-sm text-green-200 space-y-1">
            <li>• Check your WhatsApp messages</li>
            <li>• Code may take up to 30 seconds to arrive</li>
            <li>• Make sure WhatsApp is installed and active</li>
            <li>• Check both individual and business chats</li>
          </ul>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="text-center mb-6">
        <div className="text-6xl mb-4">💚</div>
        <h2 className="text-2xl font-bold text-white mb-2">WhatsApp Login</h2>
        <p className="text-white/70">
          Get a secure code sent to your WhatsApp
        </p>
      </div>

      <form onSubmit={handleSendWhatsApp} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Phone Number (WhatsApp)
          </label>
          <input
            type="tel"
            required
            className="input w-full"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 (555) 000-0000"
            autoComplete="tel"
            inputMode="tel"
            disabled={loading}
          />
          <p className="text-xs text-white/50 mt-1">
            Must have WhatsApp installed and active
          </p>
        </div>

        {message && (
          <div className="p-4 rounded-lg text-sm bg-green-50 text-green-800 border border-green-200">
            {message}
          </div>
        )}

        {error && (
          <div className="p-4 rounded-lg text-sm bg-red-50 text-red-800 border border-red-200">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full touch-feedback"
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              Sending to WhatsApp...
            </div>
          ) : (
            <>
              <span className="mr-2">💚</span>
              Send WhatsApp Code
            </>
          )}
        </button>

        <div className="text-center">
          <button
            type="button"
            onClick={onBack}
            className="text-white/70 hover:text-white text-sm transition-colors"
          >
            ← Try Different Method
          </button>
        </div>
      </form>

      {/* Benefits Section */}
      <div className="mt-8 p-4 bg-emerald-500/10 rounded-lg border border-emerald-400/30">
        <h3 className="text-emerald-300 font-medium mb-3">✨ WhatsApp Benefits</h3>
        <ul className="text-sm text-emerald-200 space-y-2">
          <li className="flex items-center">
            <span className="text-emerald-400 mr-2">💰</span>
            <span>50% cheaper than SMS</span>
          </li>
          <li className="flex items-center">
            <span className="text-emerald-400 mr-2">📱</span>
            <span>Everyone has WhatsApp</span>
          </li>
          <li className="flex items-center">
            <span className="text-emerald-400 mr-2">🔒</span>
            <span>End-to-end encrypted</span>
          </li>
          <li className="flex items-center">
            <span className="text-emerald-400 mr-2">⚡</span>
            <span>Instant delivery</span>
          </li>
          <li className="flex items-center">
            <span className="text-emerald-400 mr-2">🌍</span>
            <span>Works worldwide</span>
          </li>
        </ul>
      </div>
    </div>
  )
}