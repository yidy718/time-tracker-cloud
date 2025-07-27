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
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card-glass max-w-md w-full">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4 animate-pulse-slow">⏰</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Time Tracker</h1>
          <p className="text-gray-600">Cloud-based time tracking for teams</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-6">
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
            Employee? Contact your administrator for login credentials
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