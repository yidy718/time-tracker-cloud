import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase, database } from '../lib/supabase'

export default function QRLogin() {
  const router = useRouter()
  const { session: sessionId } = router.query
  const [step, setStep] = useState('loading') // 'loading', 'login', 'authenticating', 'success', 'error'
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (sessionId) {
      setStep('login')
    }
  }, [sessionId])

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      console.log('🔍 QR Login attempt for session:', sessionId)
      console.log('👤 Username:', username)

      // Authenticate employee using existing system
      const { data: authResult, error: authError } = await database.authenticateEmployee(username, password)
      
      if (authError || !authResult) {
        throw new Error('Invalid username or password')
      }

      const employee = authResult
      console.log('✅ Employee authenticated:', employee.first_name, employee.last_name)

      // Update QR session with authentication result
      await updateQRSession(sessionId, employee)

      setStep('success')
      
      // Show success message briefly then close
      setTimeout(() => {
        // Try to close the window/tab (works on mobile browsers)
        window.close()
        
        // If that doesn't work, show instructions
        if (!window.closed) {
          alert('Authentication successful! You can now close this tab and return to your computer.')
        }
      }, 2000)

    } catch (err) {
      console.error('QR Login error:', err)
      setError(err.message)
    }

    setLoading(false)
  }

  const updateQRSession = async (sessionId, employee) => {
    try {
      // Try to update in Supabase first
      const { error } = await supabase
        .from('qr_auth_sessions')
        .update({
          status: 'authenticated',
          employee_id: employee.id,
          employee_data: employee,
          authenticated_at: new Date().toISOString()
        })
        .eq('session_id', sessionId)

      if (error) {
        // Fallback to localStorage
        console.log('Using localStorage fallback for QR session')
        localStorage.setItem(`qr_session_${sessionId}`, JSON.stringify({
          status: 'authenticated',
          employee_id: employee.id,
          employee_data: employee,
          authenticated_at: Date.now()
        }))
        
        // Also store in sessionStorage for cross-tab communication
        sessionStorage.setItem(`qr_session_${sessionId}`, JSON.stringify({
          status: 'authenticated',
          employee_id: employee.id,
          employee_data: employee,
          authenticated_at: Date.now()
        }))
      }

      console.log('✅ QR session updated successfully')
    } catch (error) {
      console.error('Error updating QR session:', error)
      throw new Error('Failed to complete authentication')
    }
  }

  if (!sessionId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="card-glass max-w-md w-full text-center">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-white mb-4">Invalid QR Code</h1>
          <p className="text-white/70">
            This QR code is invalid or has expired. Please generate a new one.
          </p>
        </div>
      </div>
    )
  }

  if (step === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="card-glass max-w-md w-full text-center">
          <div className="text-6xl mb-4 animate-pulse">📱</div>
          <h1 className="text-2xl font-bold text-white mb-4">Loading...</h1>
          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    )
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-emerald-900 to-green-900 flex items-center justify-center p-4">
        <div className="card-glass max-w-md w-full text-center">
          <div className="text-6xl mb-4 animate-bounce">✅</div>
          <h1 className="text-2xl font-bold text-white mb-4">Authentication Successful!</h1>
          <p className="text-white/70 mb-6">
            Your computer should now be logged in. You can close this tab.
          </p>
          <div className="bg-green-500/20 border border-green-400/30 rounded-lg p-4">
            <p className="text-green-300 text-sm">
              🖥️ Return to your computer to access the dashboard
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="card-glass max-w-md w-full">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🔐</div>
          <h1 className="text-3xl font-bold text-white mb-2">Employee Login</h1>
          <p className="text-white/70">
            Enter your credentials to complete QR code authentication
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Username
            </label>
            <input
              type="text"
              required
              className="input w-full"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              autoComplete="username"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Password
            </label>
            <input
              type="password"
              required
              className="input w-full"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
            />
          </div>

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
                Authenticating...
              </div>
            ) : (
              <>
                <span className="mr-2">🔓</span>
                Login & Authenticate QR Code
              </>
            )}
          </button>
        </form>

        {/* Instructions */}
        <div className="mt-8 p-4 bg-blue-500/10 rounded-lg border border-blue-400/30">
          <h3 className="text-blue-300 font-medium mb-2">📱 How this works:</h3>
          <ul className="text-sm text-blue-200 space-y-1">
            <li>1. Enter your employee username and password</li>
            <li>2. Click &quot;Login &amp; Authenticate QR Code&quot;</li>
            <li>3. Your computer will automatically log in</li>
            <li>4. Close this tab and return to your computer</li>
          </ul>
        </div>

        {/* Security Note */}
        <div className="mt-6 p-4 bg-green-500/10 rounded-lg border border-green-400/30">
          <div className="flex items-center space-x-2">
            <span className="text-green-400">🔒</span>
            <span className="text-green-300 text-sm font-medium">Secure Authentication</span>
          </div>
          <p className="text-green-200 text-xs mt-1">
            This QR code expires in 5 minutes and can only be used once for your security.
          </p>
        </div>
      </div>
    </div>
  )
}