import { useState } from 'react'
import { auth, database, supabase } from '../lib/supabase'
import SMSAuth from './SMSAuth'

export default function Auth() {
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [message, setMessage] = useState('')
  const [loginType, setLoginType] = useState('admin') // 'admin', 'employee', or 'sms'

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      if (loginType === 'employee') {
        // Employee login with username/password using secure authentication function
        console.log('Attempting employee login with username:', username)
        
        const { data: authResult, error: authError } = await database.authenticateEmployee(username, password)
        
        console.log('Authentication result:', { authResult, authError })

        if (authError || !authResult) {
          throw new Error('Invalid username or password')
        }

        const employee = authResult
        
        // Create enhanced session for employee with organization data
        localStorage.setItem('employee_session', JSON.stringify({
          user: { id: employee.id, email: employee.email },
          employee: {
            id: employee.id,
            organization_id: employee.organization_id,
            first_name: employee.first_name,
            last_name: employee.last_name,
            email: employee.email,
            role: employee.role,
            is_active: employee.is_active,
            can_expense: employee.can_expense, // ✅ Added missing can_expense field!
            organizations: employee.organizations
          }
        }))
        
        // Trigger page refresh to load employee interface
        window.location.reload()
      } else {
        // Admin login with email/password (Supabase Auth)
        let result
        if (isSignUp) {
          result = await auth.signUp(email, password)
          if (result.error) throw result.error
          setMessage('Check your email for the confirmation link!')
        } else {
          result = await auth.signIn(email, password)
          if (result.error) throw result.error
        }
      }
    } catch (error) {
      setMessage(error.message)
    }

    setLoading(false)
  }

  const handleSMSSuccess = async (sessionData) => {
    // SMS authentication successful, session is already stored in localStorage
    console.log('🎉 SMS authentication successful, clearing Supabase auth and reloading')
    
    // Important: Sign out any temporary Supabase auth user created during SMS verification
    // This prevents the main app from trying to use the temporary Supabase user
    try {
      await supabase.auth.signOut()
      console.log('✅ Cleared temporary Supabase auth user')
    } catch (error) {
      console.log('⚠️ Error clearing Supabase auth (may not have been signed in):', error)
    }
    
    // Small delay then reload to trigger employee session check
    setTimeout(() => window.location.reload(), 200)
  }

  const handleBackToLogin = () => {
    setLoginType('admin')
    setMessage('')
  }

  // Show SMS auth interface
  if (loginType === 'sms') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="card-glass max-w-md w-full">
          <SMSAuth 
            onSuccess={handleSMSSuccess}
            onBack={handleBackToLogin}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card-glass max-w-md w-full">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4 animate-pulse-slow">⏰</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Time Tracker</h1>
          <p className="text-gray-600">Cloud-based time tracking for teams</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-6">
          {/* Login Type Selector */}
          <div className="grid grid-cols-3 gap-1 p-1 bg-gray-100 rounded-lg">
            <button
              type="button"
              onClick={() => setLoginType('admin')}
              className={`py-2 px-3 rounded-md text-xs font-medium transition-all ${
                loginType === 'admin'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              👤 Admin
            </button>
            <button
              type="button"
              onClick={() => setLoginType('employee')}
              className={`py-2 px-3 rounded-md text-xs font-medium transition-all ${
                loginType === 'employee'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              👷 Employee
            </button>
            <button
              type="button"
              onClick={() => setLoginType('sms')}
              className={`py-2 px-3 rounded-md text-xs font-medium transition-all ${
                loginType === 'sms'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              📱 SMS/Link
            </button>
          </div>

          {loginType === 'admin' ? (
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
                placeholder="Enter your email"
                autoComplete="email"
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Username
              </label>
              <input
                type="text"
                required
                className="input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                autoComplete="username"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              required
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              minLength="6"
            />
          </div>

          {message && (
            <div className={`p-4 rounded-lg text-sm ${
              message.includes('Check your email') 
                ? 'bg-green-50 text-green-800 border border-green-200' 
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading 
              ? (isSignUp ? 'Creating Account...' : 'Signing In...') 
              : (isSignUp ? 'Create Account' : 'Sign In')
            }
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            {loginType === 'admin' 
              ? 'Employee? Switch to Employee login above' 
              : 'Admin? Switch to Admin login above'
            }
          </p>
        </div>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p className="mb-2">✨ Features included:</p>
          <ul className="space-y-1">
            <li>👥 Team time tracking</li>
            <li>📊 Real-time dashboard</li>
            <li>📈 Analytics & reports</li>
            <li>🔐 Secure cloud storage</li>
          </ul>
        </div>

        <footer className="mt-8 text-center">
          <div className="text-sm text-gray-500">
            Made with ❤️ by yidy
          </div>
        </footer>
      </div>
    </div>
  )
}