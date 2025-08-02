import { useState } from 'react'
import { smsAuth, magicLinkAuth } from '../lib/auth-sms'
import { supabase } from '../lib/supabase'

export default function SMSAuth({ onSuccess, onBack }) {
  const [step, setStep] = useState('phone') // 'phone', 'otp', 'magic-link'
  const [loading, setLoading] = useState(false)
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleSendSMS = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      console.log('🔍 Starting SMS send process...')
      console.log('📱 Raw phone input:', phone)
      
      // Format phone number
      const formattedPhone = smsAuth.formatPhoneNumber(phone)
      console.log('📱 Formatted phone:', formattedPhone)
      
      if (!smsAuth.isValidPhoneNumber(formattedPhone)) {
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

      // Try to send SMS OTP using Supabase
      console.log('📲 Attempting to send SMS OTP to:', formattedPhone)
      const { data, error } = await smsAuth.sendSMSOTP(formattedPhone)
      console.log('📲 SMS result:', { data, error })
      
      if (error) {
        console.log('SMS failed, trying Magic Link fallback:', error.message)
        
        // Fallback: Send magic link to employee's email
        if (employee.email) {
          try {
            const { data: magicData, error: magicError } = await magicLinkAuth.sendMagicLink(employee.email)
            
            if (magicError) throw magicError
            
            setMessage(`SMS not available. Magic link sent to ${employee.email}! Check your email and click the link to login.`)
          } catch (magicErr) {
            throw new Error(`SMS failed: ${error.message}. Magic Link also failed: ${magicErr.message}`)
          }
        } else {
          throw new Error('SMS service not configured and no email available. Please contact your administrator.')
        }
      } else {
        setPhone(formattedPhone) // Save formatted version
        setStep('otp')
        setMessage(`SMS code sent to ${formattedPhone}! Check your phone.`)
      }
    } catch (err) {
      console.error('SMS Error:', err)
      setError(err.message)
    }

    setLoading(false)
  }

  const handleVerifySMS = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      console.log('🔐 Starting SMS verification with phone:', phone, 'otp:', otp)
      const { data, error } = await smsAuth.authenticateEmployeeBySMS(phone, otp)
      console.log('🔐 SMS auth result:', { data, error })
      
      if (error) throw error

      // Store session and trigger success
      console.log('🔐 Storing session in localStorage:', data)
      localStorage.setItem('employee_session', JSON.stringify(data))
      console.log('🔐 Calling onSuccess with data:', data)
      onSuccess(data)
    } catch (err) {
      console.error('🔐 SMS verification error:', err)
      setError(err.message)
    }

    setLoading(false)
  }

  const handleSendMagicLink = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      // Validate email
      if (!email || !email.trim()) {
        throw new Error('Email is required')
      }

      if (!email.includes('@') || !email.includes('.')) {
        throw new Error('Please enter a valid email address')
      }

      const { data, error } = await magicLinkAuth.sendMagicLink(email.trim())
      
      if (error) throw error

      setMessage('Magic link sent! Check your email and click the link to login.')
    } catch (err) {
      setError(err.message)
    }

    setLoading(false)
  }

  if (step === 'otp') {
    return (
      <div className="max-w-md mx-auto">
        <div className="text-center mb-6">
          <div className="text-4xl mb-4">📱</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Enter SMS Code</h2>
          <p className="text-gray-600">
            We sent a code to <strong>{phone}</strong>
          </p>
        </div>

        <form onSubmit={handleVerifySMS} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              6-Digit Code
            </label>
            <input
              type="text"
              required
              maxLength="6"
              className="input otp-input sm:text-2xl"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              autoComplete="one-time-code"
              inputMode="numeric"
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
            className="btn-primary btn-mobile w-full touch-feedback"
          >
            {loading ? 'Verifying...' : 'Verify Code'}
          </button>

          <div className="text-center space-y-2">
            <button
              type="button"
              onClick={() => setStep('phone')}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              ← Back to phone number
            </button>
            <button
              type="button"
              onClick={handleSendSMS}
              disabled={loading}
              className="block w-full text-sm text-gray-600 hover:text-gray-800"
            >
              Resend SMS code
            </button>
          </div>
        </form>
      </div>
    )
  }

  if (step === 'magic-link') {
    return (
      <div className="max-w-md mx-auto">
        <div className="text-center mb-6">
          <div className="text-4xl mb-4">✉️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Magic Link Login</h2>
          <p className="text-gray-600">
            Enter your email to receive a magic link
          </p>
        </div>

        <form onSubmit={handleSendMagicLink} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              required
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your.email@company.com"
              autoComplete="email"
            />
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
            className="btn-primary w-full"
          >
            {loading ? 'Sending...' : 'Send Magic Link'}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setStep('phone')}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              ← Back to SMS login
            </button>
          </div>
        </form>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-6">
        <div className="text-4xl mb-4">📲</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Employee Login</h2>
        <p className="text-gray-600">
          Login with SMS or Magic Link
        </p>
      </div>

      {/* Login Method Tabs */}
      <div className="flex space-x-2 p-1 bg-gray-100 rounded-lg mb-6">
        <button
          type="button"
          onClick={() => {
            setStep('phone')
            setError('')
            setMessage('')
          }}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
            step === 'phone'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          📱 SMS Login
        </button>
        <button
          type="button"
          onClick={() => {
            setStep('magic-link')
            setError('')
            setMessage('')
          }}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
            step === 'magic-link'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          ✉️ Magic Link
        </button>
      </div>

      {step === 'phone' && (
        <form onSubmit={handleSendSMS} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              required
              className="input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 000-0000"
              autoComplete="tel"
              inputMode="tel"
            />
            <p className="text-xs text-gray-500 mt-1">
              Include country code (e.g., +1 for US)
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
            className="btn-primary btn-mobile w-full touch-feedback"
          >
            {loading ? 'Sending SMS...' : 'Send SMS Code'}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={onBack}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              ← Back to login options
            </button>
          </div>
        </form>
      )}

      {step === 'magic-link' && (
        <form onSubmit={handleSendMagicLink} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              required
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your.email@company.com"
              autoComplete="email"
            />
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
            className="btn-primary btn-mobile w-full touch-feedback"
          >
            {loading ? 'Sending...' : 'Send Magic Link'}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setStep('phone')}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              ← Back to SMS login
            </button>
          </div>
        </form>
      )}

      {/* Help Section */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="text-sm font-medium text-blue-900 mb-2">Need Help?</h3>
        <ul className="text-xs text-blue-800 space-y-1">
          <li>• Make sure your phone number is registered with your employer</li>
          <li>• Check your phone for SMS messages</li>
          <li>• Try the Magic Link option if SMS isn&apos;t working</li>
        </ul>
      </div>
    </div>
  )
}