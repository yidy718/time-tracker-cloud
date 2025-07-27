import { useState } from 'react'
import { auth } from '../lib/supabase'

export default function Auth() {
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      let result
      if (isSignUp) {
        result = await auth.signUp(email, password)
        if (result.error) throw result.error
        setMessage('Check your email for the confirmation link!')
      } else {
        result = await auth.signIn(email, password)
        if (result.error) throw result.error
      }
    } catch (error) {
      setMessage(error.message)
    }

    setLoading(false)
  }

  return (
    <div className="container-app">
      <div className="min-h-screen flex items-center justify-center">
        <div className="card-glass fade-in">
          <div className="text-center mb-8">
            <div className="text-8xl mb-6 animate-pulse">⏰</div>
            <h1 className="text-4xl font-bold text-gray-900 mb-3">Time Tracker Cloud</h1>
            <p className="text-xl text-gray-600">Professional time tracking for modern teams</p>
          </div>

        <form onSubmit={handleAuth} className="space-y-6">
          <div>
            <label className="form-label-admin">
              📧 Email Address
            </label>
            <input
              type="email"
              required
              className="input-admin"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              autoComplete="email"
            />
          </div>

          <div>
            <label className="form-label-admin">
              🔐 Password
            </label>
            <input
              type="password"
              required
              className="input-admin"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              minLength="6"
            />
          </div>

          {message && (
            <div className={`p-4 rounded-2xl text-sm font-medium ${
              message.includes('Check your email') 
                ? 'bg-green-50 text-green-800 border border-green-200' 
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {message.includes('Check your email') ? '✅ ' : '❌ '}
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full text-xl py-4"
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                {isSignUp ? 'Creating Account...' : 'Signing In...'}
              </>
            ) : (
              <>
                {isSignUp ? '🚀 Create Account' : '🔑 Sign In'}
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Employee? Contact your administrator for login credentials
          </p>
        </div>

        <div className="mt-8 text-center text-gray-500">
          <p className="mb-4 text-lg font-semibold">✨ Features included:</p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center justify-center">
              <span>👥 Team Tracking</span>
            </div>
            <div className="flex items-center justify-center">
              <span>📊 Live Dashboard</span>
            </div>
            <div className="flex items-center justify-center">
              <span>📈 Analytics</span>
            </div>
            <div className="flex items-center justify-center">
              <span>🔐 Secure Cloud</span>
            </div>
          </div>
        </div>

        <footer className="mt-8 text-center">
          <div className="text-gray-500 text-lg">
            Made with ❤️ by <span className="font-semibold">yidy</span>
          </div>
        </footer>
        </div>
      </div>
    </div>
  )
}