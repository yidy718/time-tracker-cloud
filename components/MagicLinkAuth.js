import React, { useState } from 'react'
import { magicLinkAuth } from '../lib/auth-sms'
import { supabase } from '../lib/supabase'

export default function MagicLinkAuth({ onSuccess, onBack }) {
  const [step, setStep] = useState('email') // 'email', 'sent', 'verifying'
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleSendMagicLink = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      console.log('🔗 Starting Magic Link process...')
      console.log('📧 Email input:', email)

      // Validate email
      if (!email || !email.trim()) {
        throw new Error('Email is required')
      }

      if (!email.includes('@') || !email.includes('.')) {
        throw new Error('Please enter a valid email address')
      }

      const cleanEmail = email.trim().toLowerCase()
      console.log('📧 Clean email:', cleanEmail)

      // Check if employee exists with this email first
      console.log('🔍 Checking for employee with email:', cleanEmail)
      const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .select('id, first_name, last_name, email, phone, is_active, role, organization_id')
        .eq('email', cleanEmail)
        .eq('is_active', true)
        .maybeSingle()

      console.log('👤 Employee lookup result:', { employee, employeeError })

      if (employeeError) {
        throw new Error('Error checking employee: ' + employeeError.message)
      }

      if (!employee) {
        throw new Error('No active employee found with this email address. Please contact your administrator.')
      }
      console.log(`✅ Found employee: ${employee.first_name} ${employee.last_name}`)

      // Send magic link using our enhanced auth system
      console.log('🔗 Sending magic link to:', cleanEmail)
      const { data, error } = await magicLinkAuth.sendMagicLink(cleanEmail)
      console.log('🔗 Magic link result:', { data, error })

      if (error) throw error

      // Store employee data temporarily for when they return
      sessionStorage.setItem('magic_link_employee', JSON.stringify(employee))
      
      setStep('sent')
      setMessage(`Magic link sent to ${cleanEmail}! Check your email and click the link to login.`)
      
    } catch (err) {
      console.error('Magic Link Error:', err)
      setError(err.message)
    }

    setLoading(false)
  }

  const handleResendLink = () => {
    setStep('email')
    setMessage('')
    setError('')
  }

  // Check for magic link return (when user clicks the link)
  const checkMagicLinkReturn = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (session && session.user) {
        console.log('🎉 Magic link session detected:', session.user)
        
        // Get stored employee data
        const storedEmployee = sessionStorage.getItem('magic_link_employee')
        if (storedEmployee) {
          const employee = JSON.parse(storedEmployee)
          
          // Create custom employee session (similar to SMS auth)
          const customSession = {
            employee: {
              id: employee.id,
              employee_id: employee.employee_id,
              organization_id: employee.organization_id,
              first_name: employee.first_name,
              last_name: employee.last_name,
              email: employee.email,
              phone: employee.phone,
              role: employee.role,
              is_active: employee.is_active,
              can_expense: employee.can_expense
            },
            auth_method: 'magic_link',
            authenticated_at: new Date().toISOString()
          }

          // Store session and trigger success
          localStorage.setItem('employee_session', JSON.stringify(customSession))
          sessionStorage.removeItem('magic_link_employee')
          
          console.log('✅ Magic link authentication successful')
          onSuccess(customSession)
          return
        }
      }
    } catch (error) {
      console.error('Error checking magic link return:', error)
    }
  }

  // Check for existing session on component mount
  React.useEffect(() => {
    checkMagicLinkReturn()
  }, [])

  if (step === 'sent') {
    return (
      <div className="text-center">
        <div className="text-6xl mb-6 animate-bounce">📧</div>
        <h2 className="text-2xl font-bold text-white mb-4">Check Your Email!</h2>
        <div className="bg-green-500/10 border border-green-400/30 rounded-lg p-6 mb-6">
          <p className="text-green-300 mb-4">
            {message}
          </p>
          <div className="text-sm text-white/70">
            <p className="mb-2">📱 <strong>On mobile?</strong> The link will open this app automatically</p>
            <p className="mb-2">💻 <strong>On desktop?</strong> Click the link in your email</p>
            <p>⏰ Link expires in 60 minutes</p>
          </div>
        </div>

        <div className="space-y-4">
          <button
            onClick={handleResendLink}
            className="btn-secondary w-full"
          >
            Send Another Link
          </button>
          
          <button
            onClick={onBack}
            className="text-white/70 hover:text-white text-sm transition-colors"
          >
            ← Try Different Method
          </button>
        </div>

        {/* Auto-refresh instructions */}
        <div className="mt-6 p-4 bg-blue-500/10 rounded-lg border border-blue-400/30">
          <p className="text-blue-300 text-sm">
            💡 This page will automatically detect when you click the email link
          </p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="text-center mb-6">
        <div className="text-6xl mb-4">✉️</div>
        <h2 className="text-2xl font-bold text-white mb-2">Magic Link Login</h2>
        <p className="text-white/70">
          Get a secure login link sent to your email
        </p>
      </div>

      <form onSubmit={handleSendMagicLink} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Email Address
          </label>
          <input
            type="email"
            required
            className="input w-full"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your.email@company.com"
            autoComplete="email"
            disabled={loading}
          />
          <p className="text-xs text-white/50 mt-1">
            Must be registered with your employer
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
              Sending Magic Link...
            </div>
          ) : (
            <>
              <span className="mr-2">🔗</span>
              Send Magic Link
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
      <div className="mt-8 p-4 bg-green-500/10 rounded-lg border border-green-400/30">
        <h3 className="text-green-300 font-medium mb-3">✨ Magic Link Benefits</h3>
        <ul className="text-sm text-green-200 space-y-2">
          <li className="flex items-center">
            <span className="text-green-400 mr-2">💰</span>
            <span>Completely free - no SMS costs</span>
          </li>
          <li className="flex items-center">
            <span className="text-green-400 mr-2">🔒</span>
            <span>More secure than SMS</span>
          </li>
          <li className="flex items-center">
            <span className="text-green-400 mr-2">⚡</span>
            <span>Works on any device with email</span>
          </li>
          <li className="flex items-center">
            <span className="text-green-400 mr-2">📱</span>
            <span>One-click login from email</span>
          </li>
        </ul>
      </div>
    </div>
  )
}