import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

export default function QRCodeAuth({ onSuccess, onBack }) {
  const [step, setStep] = useState('generating') // 'generating', 'waiting', 'scanning', 'success', 'expired'
  const [qrCode, setQrCode] = useState('')
  const [sessionId, setSessionId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [timeLeft, setTimeLeft] = useState(300) // 5 minutes
  const intervalRef = useRef(null)
  const pollRef = useRef(null)

  // Generate unique session ID for this QR code
  const generateSessionId = () => {
    return 'qr_' + Date.now() + '_' + Math.random().toString(36).substring(2)
  }

  // Generate QR Code data URL
  const generateQRCode = async (data) => {
    try {
      // We'll use a simple QR code generation approach
      // In production, you might want to use a proper QR library like 'qrcode'
      const qrText = encodeURIComponent(data)
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${qrText}&bgcolor=1e293b&color=ffffff&qzone=2`
      return qrUrl
    } catch (error) {
      console.error('QR Code generation failed:', error)
      throw new Error('Failed to generate QR code')
    }
  }

  // Store QR session in database/memory
  const storeQRSession = async (sessionId) => {
    try {
      // Store in Supabase for cross-device authentication
      const { error } = await supabase
        .from('qr_auth_sessions')
        .insert([{
          session_id: sessionId,
          status: 'waiting',
          expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes
          created_at: new Date().toISOString()
        }])

      if (error) {
        // If table doesn't exist, we'll use localStorage as fallback
        console.log('QR sessions table not found, using localStorage fallback')
        localStorage.setItem(`qr_session_${sessionId}`, JSON.stringify({
          status: 'waiting',
          expires_at: Date.now() + 5 * 60 * 1000,
          created_at: Date.now()
        }))
      }
    } catch (error) {
      console.error('Error storing QR session:', error)
      // Fallback to localStorage
      localStorage.setItem(`qr_session_${sessionId}`, JSON.stringify({
        status: 'waiting',
        expires_at: Date.now() + 5 * 60 * 1000,
        created_at: Date.now()
      }))
    }
  }

  // Poll for QR code scan result
  const pollForScan = async (sessionId) => {
    try {
      // Try to get from Supabase first
      const { data, error } = await supabase
        .from('qr_auth_sessions')
        .select('status, employee_id, employee_data')
        .eq('session_id', sessionId)
        .single()

      if (!error && data) {
        if (data.status === 'authenticated' && data.employee_data) {
          // QR was scanned and employee authenticated
          const employeeData = typeof data.employee_data === 'string' 
            ? JSON.parse(data.employee_data) 
            : data.employee_data

          // Create custom session
          const customSession = {
            employee: employeeData,
            auth_method: 'qr_code',
            authenticated_at: new Date().toISOString()
          }

          // Store session and trigger success
          localStorage.setItem('employee_session', JSON.stringify(customSession))
          
          // Clean up QR session
          await supabase.from('qr_auth_sessions').delete().eq('session_id', sessionId)
          
          setStep('success')
          setTimeout(() => onSuccess(customSession), 1000)
          return true
        }
      } else {
        // Fallback to localStorage
        const stored = localStorage.getItem(`qr_session_${sessionId}`)
        if (stored) {
          const session = JSON.parse(stored)
          if (session.status === 'authenticated' && session.employee_data) {
            const customSession = {
              employee: session.employee_data,
              auth_method: 'qr_code',
              authenticated_at: new Date().toISOString()
            }

            localStorage.setItem('employee_session', JSON.stringify(customSession))
            localStorage.removeItem(`qr_session_${sessionId}`)
            
            setStep('success')
            setTimeout(() => onSuccess(customSession), 1000)
            return true
          }
        }
      }
    } catch (error) {
      console.error('Error polling for scan:', error)
    }
    return false
  }

  // Initialize QR code
  const initializeQR = async () => {
    try {
      setLoading(true)
      setError('')
      
      const newSessionId = generateSessionId()
      setSessionId(newSessionId)
      
      // Create QR data - this will be the URL that mobile devices scan
      const qrData = `${window.location.origin}/qr-login?session=${newSessionId}`
      
      // Generate QR code image
      const qrImageUrl = await generateQRCode(qrData)
      setQrCode(qrImageUrl)
      
      // Store session
      await storeQRSession(newSessionId)
      
      setStep('waiting')
      setLoading(false)
      
      // Start polling for scan
      pollRef.current = setInterval(async () => {
        const success = await pollForScan(newSessionId)
        if (success) {
          clearInterval(pollRef.current)
        }
      }, 2000) // Poll every 2 seconds
      
    } catch (err) {
      console.error('QR initialization error:', err)
      setError(err.message)
      setLoading(false)
    }
  }

  // Countdown timer
  useEffect(() => {
    if (step === 'waiting') {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setStep('expired')
            clearInterval(intervalRef.current)
            clearInterval(pollRef.current)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [step])

  // Initialize on mount
  useEffect(() => {
    initializeQR()
    
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  // Format time display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleRefresh = () => {
    setTimeLeft(300)
    initializeQR()
  }

  if (loading) {
    return (
      <div className="text-center">
        <div className="text-6xl mb-6 animate-pulse">📷</div>
        <h2 className="text-2xl font-bold text-white mb-4">Generating QR Code...</h2>
        <div className="w-64 h-64 mx-auto bg-gray-700/50 rounded-xl flex items-center justify-center mb-4">
          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p className="text-white/70">Please wait while we prepare your secure QR code</p>
      </div>
    )
  }

  if (step === 'expired') {
    return (
      <div className="text-center">
        <div className="text-6xl mb-6">⏰</div>
        <h2 className="text-2xl font-bold text-white mb-4">QR Code Expired</h2>
        <p className="text-white/70 mb-6">The QR code has expired for security reasons.</p>
        
        <div className="space-y-4">
          <button
            onClick={handleRefresh}
            className="btn-primary w-full"
          >
            Generate New QR Code
          </button>
          
          <button
            onClick={onBack}
            className="text-white/70 hover:text-white text-sm transition-colors"
          >
            ← Try Different Method
          </button>
        </div>
      </div>
    )
  }

  if (step === 'success') {
    return (
      <div className="text-center">
        <div className="text-6xl mb-6 animate-bounce">✅</div>
        <h2 className="text-2xl font-bold text-white mb-4">Login Successful!</h2>
        <p className="text-white/70">Redirecting to your dashboard...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center">
        <div className="text-6xl mb-6">❌</div>
        <h2 className="text-2xl font-bold text-white mb-4">QR Code Error</h2>
        <p className="text-red-300 mb-6">{error}</p>
        
        <div className="space-y-4">
          <button
            onClick={handleRefresh}
            className="btn-primary w-full"
          >
            Try Again
          </button>
          
          <button
            onClick={onBack}
            className="text-white/70 hover:text-white text-sm transition-colors"
          >
            ← Try Different Method
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="text-center">
      <div className="text-6xl mb-6">📱</div>
      <h2 className="text-2xl font-bold text-white mb-2">Scan QR Code</h2>
      <p className="text-white/70 mb-6">
        Use your phone camera or our mobile app to scan
      </p>

      {/* QR Code Display */}
      <div className="bg-white p-6 rounded-2xl mx-auto mb-6 max-w-sm">
        <img 
          src={qrCode} 
          alt="Login QR Code" 
          className="w-full h-auto rounded-lg"
          style={{ imageRendering: 'pixelated' }}
        />
      </div>

      {/* Timer and Instructions */}
      <div className="bg-blue-500/10 border border-blue-400/30 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-center space-x-2 mb-3">
          <span className="text-blue-300">⏱️</span>
          <span className="text-blue-300 font-mono text-lg">{formatTime(timeLeft)}</span>
        </div>
        <p className="text-blue-200 text-sm">QR code expires in {formatTime(timeLeft)}</p>
      </div>

      {/* Instructions */}
      <div className="space-y-4 mb-6">
        <div className="bg-gray-800/50 rounded-lg p-4">
          <h3 className="text-white font-medium mb-2">📱 How to Scan:</h3>
          <ul className="text-sm text-white/70 space-y-1 text-left">
            <li>1. Open your phone camera app</li>
            <li>2. Point camera at the QR code above</li>
            <li>3. Tap the notification that appears</li>
            <li>4. Enter your employee credentials</li>
            <li>5. Your desktop will login automatically!</li>
          </ul>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-4">
        <button
          onClick={handleRefresh}
          className="btn-secondary w-full"
        >
          🔄 Generate New QR Code
        </button>
        
        <button
          onClick={onBack}
          className="text-white/70 hover:text-white text-sm transition-colors"
        >
          ← Try Different Method
        </button>
      </div>

      {/* Benefits */}
      <div className="mt-8 p-4 bg-green-500/10 rounded-lg border border-green-400/30">
        <h3 className="text-green-300 font-medium mb-3">✨ QR Code Benefits</h3>
        <ul className="text-sm text-green-200 space-y-2">
          <li className="flex items-center">
            <span className="text-green-400 mr-2">💰</span>
            <span>Completely free - no SMS or email needed</span>
          </li>
          <li className="flex items-center">
            <span className="text-green-400 mr-2">⚡</span>
            <span>Instant login - just scan and go</span>
          </li>
          <li className="flex items-center">
            <span className="text-green-400 mr-2">🔒</span>
            <span>Secure - expires automatically</span>
          </li>
          <li className="flex items-center">
            <span className="text-green-400 mr-2">📱</span>
            <span>Works with any phone camera</span>
          </li>
        </ul>
      </div>
    </div>
  )
}