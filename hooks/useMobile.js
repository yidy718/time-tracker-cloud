import { useState, useEffect } from 'react'

export function useMobile(breakpoint = 640) {
  const [isMobile, setIsMobile] = useState(false)
  const [isTablet, setIsTablet] = useState(false)
  const [screenSize, setScreenSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const checkDeviceType = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      
      setScreenSize({ width, height })
      setIsMobile(width < breakpoint)
      setIsTablet(width >= breakpoint && width < 1024)
    }

    // Check on mount
    checkDeviceType()

    // Add event listener
    window.addEventListener('resize', checkDeviceType)
    
    // Cleanup
    return () => window.removeEventListener('resize', checkDeviceType)
  }, [breakpoint])

  return {
    isMobile,
    isTablet,
    isDesktop: !isMobile && !isTablet,
    screenSize,
    orientation: screenSize.width > screenSize.height ? 'landscape' : 'portrait'
  }
}

export function useTouch() {
  const [isTouch, setIsTouch] = useState(false)

  useEffect(() => {
    // Check if device supports touch
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
    setIsTouch(hasTouch)
  }, [])

  return isTouch
}

export function useSafeArea() {
  const [safeArea, setSafeArea] = useState({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0
  })

  useEffect(() => {
    const updateSafeArea = () => {
      // Get CSS environment variables for safe areas
      const computedStyle = getComputedStyle(document.documentElement)
      
      setSafeArea({
        top: parseInt(computedStyle.getPropertyValue('--safe-area-inset-top') || '0'),
        bottom: parseInt(computedStyle.getPropertyValue('--safe-area-inset-bottom') || '0'), 
        left: parseInt(computedStyle.getPropertyValue('--safe-area-inset-left') || '0'),
        right: parseInt(computedStyle.getPropertyValue('--safe-area-inset-right') || '0')
      })
    }

    updateSafeArea()
    window.addEventListener('resize', updateSafeArea)
    window.addEventListener('orientationchange', updateSafeArea)
    
    return () => {
      window.removeEventListener('resize', updateSafeArea)
      window.removeEventListener('orientationchange', updateSafeArea)
    }
  }, [])

  return safeArea
}

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true)
  const [networkType, setNetworkType] = useState('unknown')

  useEffect(() => {
    const updateNetworkStatus = () => {
      setIsOnline(navigator.onLine)
      
      // Get network type if available
      if ('connection' in navigator) {
        setNetworkType(navigator.connection.effectiveType || 'unknown')
      }
    }

    updateNetworkStatus()
    
    window.addEventListener('online', updateNetworkStatus)
    window.addEventListener('offline', updateNetworkStatus)
    
    if ('connection' in navigator) {
      navigator.connection.addEventListener('change', updateNetworkStatus)
    }

    return () => {
      window.removeEventListener('online', updateNetworkStatus)
      window.removeEventListener('offline', updateNetworkStatus)
      
      if ('connection' in navigator) {
        navigator.connection.removeEventListener('change', updateNetworkStatus)
      }
    }
  }, [])

  return { isOnline, networkType }
}

// Custom hook for handling mobile-specific behaviors
export function useMobileBehavior() {
  const { isMobile } = useMobile()
  const isTouch = useTouch()
  const { isOnline } = useNetworkStatus()

  // Prevent zoom on input focus (mobile Safari)
  useEffect(() => {
    if (isMobile) {
      const viewport = document.querySelector('meta[name="viewport"]')
      if (viewport) {
        const content = viewport.getAttribute('content')
        if (!content.includes('user-scalable=no')) {
          viewport.setAttribute('content', content + ', user-scalable=no')
        }
      }
    }
  }, [isMobile])

  // Handle mobile-specific touch behaviors
  useEffect(() => {
    if (isTouch) {
      // Disable pull-to-refresh on mobile
      document.body.style.overscrollBehavior = 'none'
      
      // Prevent context menu on long press
      document.addEventListener('contextmenu', (e) => {
        if (isTouch) {
          e.preventDefault()
        }
      })
    }

    return () => {
      document.body.style.overscrollBehavior = 'auto'
    }
  }, [isTouch])

  return {
    isMobile,
    isTouch,
    isOnline,
    // Helper functions
    scrollToTop: () => window.scrollTo({ top: 0, behavior: 'smooth' }),
    vibrate: (pattern = 100) => {
      if ('vibrate' in navigator) {
        navigator.vibrate(pattern)
      }
    },
    hapticFeedback: (type = 'light') => {
      if ('vibrate' in navigator) {
        const patterns = {
          light: 50,
          medium: 100,
          heavy: 200
        }
        navigator.vibrate(patterns[type] || 50)
      }
    }
  }
}