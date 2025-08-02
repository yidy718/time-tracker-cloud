import { useState } from 'react'
import SMSAuth from './SMSAuth'
import MagicLinkAuth from './MagicLinkAuth'
import QRCodeAuth from './QRCodeAuth'
import WhatsAppAuth from './WhatsAppAuth'

export default function AuthMethodSelector({ onSuccess, onBack }) {
  const [selectedMethod, setSelectedMethod] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  // Helper function for method styles to avoid dynamic class names
  const getMethodStyles = (color) => {
    const styles = {
      blue: 'border-blue-400 bg-blue-500/10 hover:bg-blue-500/20 hover:scale-105',
      green: 'border-green-400 bg-green-500/10 hover:bg-green-500/20 hover:scale-105',
      emerald: 'border-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 hover:scale-105',
      purple: 'border-purple-400 bg-purple-500/10 hover:bg-purple-500/20 hover:scale-105',
      orange: 'border-orange-400 bg-orange-500/10 hover:bg-orange-500/20 hover:scale-105',
      gray: 'border-gray-400 bg-gray-500/10 hover:bg-gray-500/20 hover:scale-105'
    }
    return styles[color] || styles.blue
  }

  // Authentication methods configuration
  const authMethods = [
    {
      id: 'sms',
      name: 'SMS Code',
      icon: '📱',
      description: 'Get a 6-digit code via text message',
      cost: 'Standard SMS rates',
      status: 'active',
      color: 'blue'
    },
    {
      id: 'email',
      name: 'Magic Link',
      icon: '✉️',
      description: 'Get a login link in your email',
      cost: 'Free',
      status: 'active',
      color: 'green'
    },
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      icon: '💚',
      description: 'Get a code via WhatsApp message',
      cost: '50% cheaper than SMS',
      status: 'active',
      color: 'emerald'
    },
    {
      id: 'qr',
      name: 'QR Code',
      icon: '📷',
      description: 'Scan QR code with your phone',
      cost: 'Free',
      status: 'active',
      color: 'purple'
    },
    {
      id: 'push',
      name: 'Push Notification',
      icon: '🔔',
      description: 'Approve login on your mobile app',
      cost: 'Free',
      status: 'coming_soon',
      color: 'orange'
    },
    {
      id: 'totp',
      name: 'Authenticator',
      icon: '🔐',
      description: 'Use Google Authenticator or similar',
      cost: 'Free',
      status: 'coming_soon',
      color: 'gray'
    }
  ]

  const activeMethod = authMethods.find(method => method.id === selectedMethod)

  // Handle method selection
  const handleMethodSelect = (methodId) => {
    const method = authMethods.find(m => m.id === methodId)
    if (method.status === 'coming_soon') {
      alert(`${method.name} authentication is coming soon! 🚀`)
      return
    }
    setSelectedMethod(methodId)
  }

  // Handle back navigation
  const handleBackToMethods = () => {
    setSelectedMethod(null)
  }

  // Handle authentication success
  const handleAuthSuccess = (sessionData) => {
    onSuccess(sessionData)
  }

  // If a method is selected, show its interface
  if (selectedMethod) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="card-glass max-w-md w-full">
          {/* Header with back button */}
          <div className="flex items-center mb-6">
            <button
              onClick={handleBackToMethods}
              className="mr-3 p-2 rounded-full hover:bg-white/10 transition-colors"
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center">
                {activeMethod?.icon} {activeMethod?.name}
              </h2>
              <p className="text-white/70 text-sm">{activeMethod?.description}</p>
            </div>
          </div>

          {/* Render specific auth method component */}
          {selectedMethod === 'sms' && (
            <SMSAuth onSuccess={handleAuthSuccess} onBack={handleBackToMethods} />
          )}
          
          {selectedMethod === 'email' && (
            <MagicLinkAuth onSuccess={handleAuthSuccess} onBack={handleBackToMethods} />
          )}
          
          {selectedMethod === 'qr' && (
            <QRCodeAuth onSuccess={handleAuthSuccess} onBack={handleBackToMethods} />
          )}
          
          {selectedMethod === 'whatsapp' && (
            <WhatsAppAuth onSuccess={handleAuthSuccess} onBack={handleBackToMethods} />
          )}

          {/* Add other method components here as they're implemented */}
        </div>
      </div>
    )
  }

  // Main method selection screen
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card-glass max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4 animate-pulse-slow">🔐</div>
          <h1 className="text-3xl font-bold text-white mb-2">Choose Login Method</h1>
          <p className="text-white/70">
            Select your preferred way to authenticate
          </p>
        </div>

        {/* Method Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {authMethods.map((method) => (
            <button
              key={method.id}
              onClick={() => handleMethodSelect(method.id)}
              disabled={method.status === 'coming_soon'}
              className={`
                relative p-6 rounded-xl border transition-all duration-200
                ${method.status === 'active' 
                  ? getMethodStyles(method.color)
                  : 'border-gray-600 bg-gray-800/50 opacity-60 cursor-not-allowed'
                }
              `}
            >
              {/* Coming Soon Badge */}
              {method.status === 'coming_soon' && (
                <div className="absolute -top-2 -right-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-black text-xs font-bold px-2 py-1 rounded-full">
                  Coming Soon
                </div>
              )}

              <div className="text-center">
                <div className="text-4xl mb-3">{method.icon}</div>
                <h3 className="text-lg font-semibold text-white mb-2">{method.name}</h3>
                <p className="text-white/70 text-sm mb-3">{method.description}</p>
                <div className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                  method.cost === 'Free' 
                    ? 'bg-green-500/20 text-green-300' 
                    : method.cost.includes('cheaper')
                    ? 'bg-blue-500/20 text-blue-300'
                    : 'bg-gray-500/20 text-gray-300'
                }`}>
                  {method.cost}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Back to main login */}
        <div className="text-center">
          <button
            onClick={onBack}
            className="text-white/70 hover:text-white text-sm transition-colors"
          >
            ← Back to Admin Login
          </button>
        </div>

        {/* Quick Stats */}
        <div className="mt-8 p-4 bg-blue-500/10 rounded-lg border border-blue-400/30">
          <h3 className="text-blue-300 font-medium mb-2">🚀 Authentication Methods</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-green-400 font-bold text-lg">
                {authMethods.filter(m => m.status === 'active').length}
              </div>
              <div className="text-white/60 text-xs">Active</div>
            </div>
            <div>
              <div className="text-yellow-400 font-bold text-lg">
                {authMethods.filter(m => m.status === 'coming_soon').length}
              </div>
              <div className="text-white/60 text-xs">Coming Soon</div>
            </div>
            <div>
              <div className="text-blue-400 font-bold text-lg">
                {authMethods.filter(m => m.cost === 'Free').length}
              </div>
              <div className="text-white/60 text-xs">Free Methods</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}