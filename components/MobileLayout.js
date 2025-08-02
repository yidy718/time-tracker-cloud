import { useState, useEffect } from 'react'

export default function MobileLayout({ children, title, showBack = false, onBack, showMenu = false, menuItems = [] }) {
  const [isMobile, setIsMobile] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  if (!isMobile) {
    return children
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-500 to-secondary-500">
      {/* Mobile Header */}
      <div className="mobile-header safe-area-top px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {showBack && (
              <button
                onClick={onBack}
                className="p-2 rounded-lg hover:bg-gray-100 touch-feedback"
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <h1 className="text-lg font-bold text-gray-900 truncate">{title}</h1>
          </div>
          
          {showMenu && (
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="p-2 rounded-lg hover:bg-gray-100 touch-feedback"
            >
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {showMobileMenu && (
        <div className="absolute top-16 right-4 z-50 bg-white rounded-xl shadow-xl border border-gray-200 py-2 min-w-48">
          {menuItems.map((item, index) => (
            <button
              key={index}
              onClick={() => {
                item.onClick()
                setShowMobileMenu(false)
              }}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center space-x-3 touch-feedback"
            >
              <span className="text-lg">{item.icon}</span>
              <span className="text-gray-700">{item.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-auto safe-area-bottom">
        {children}
      </div>
    </div>
  )
}

// Mobile-specific utility components
export function MobileCard({ children, className = '', ...props }) {
  return (
    <div className={`card-glass mx-4 mb-4 ${className}`} {...props}>
      {children}
    </div>
  )
}

export function MobileButton({ children, variant = 'primary', className = '', ...props }) {
  const baseClasses = 'btn-mobile w-full touch-feedback'
  const variantClasses = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    success: 'btn-success',
    warning: 'btn-warning',
    danger: 'btn-danger'
  }
  
  return (
    <button 
      className={`${baseClasses} ${variantClasses[variant]} ${className}`} 
      {...props}
    > 
      {children}
    </button>
  )
}

export function MobileInput({ className = '', ...props }) {
  return (
    <input 
      className={`input ${className}`}
      {...props}
    />
  )
}

export function MobileGrid({ children, cols = 1, className = '' }) {
  const gridClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-2', 
    3: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3'
  }
  
  return (
    <div className={`grid ${gridClasses[cols]} gap-4 px-4 ${className}`}>
      {children}
    </div>
  )
}

// Mobile bottom navigation component
export function MobileBottomNav({ items = [], activeTab, onTabChange }) {
  return (
    <div className="mobile-nav safe-area-bottom">
      <div className="grid grid-cols-5 gap-1">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`mobile-tab touch-feedback ${
              activeTab === item.id
                ? 'bg-blue-100 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="text-lg mb-1">{item.icon}</div>
            <div className="text-xs font-medium truncate">{item.label}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

// Mobile modal component
export function MobileModal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 bg-white mobile-modal sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 touch-feedback"
          >
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Content */}
        <div className="p-4">
          {children}
        </div>
      </div>
    </div>
  )
}

// Loading spinner component
export function MobileSpinner({ size = 'md', color = 'blue' }) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  }
  
  const colorClasses = {
    blue: 'border-blue-600',
    white: 'border-white',
    gray: 'border-gray-600'
  }
  
  return (
    <div className={`${sizeClasses[size]} border-2 ${colorClasses[color]} border-t-transparent rounded-full animate-spin`}></div>
  )
}

// Status indicator component
export function MobileStatus({ status, children }) {
  const statusColors = {
    success: 'bg-green-100 text-green-800 border-green-200',
    warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    error: 'bg-red-100 text-red-800 border-red-200',
    info: 'bg-blue-100 text-blue-800 border-blue-200'
  }
  
  return (
    <div className={`p-3 rounded-lg border text-sm ${statusColors[status]}`}>
      {children}
    </div>
  )
}