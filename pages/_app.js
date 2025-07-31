import '../styles/globals.css'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

function MyApp({ Component, pageProps }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Force cache refresh for critical bug fixes
    const buildVersion = '20250731-002'
    const currentVersion = localStorage.getItem('build_version')
    if (currentVersion !== buildVersion) {
      localStorage.setItem('build_version', buildVersion)
      // Force reload once to clear any cached components
      if (currentVersion !== null && currentVersion !== buildVersion) {
        console.log('🔄 Forcing refresh for critical bug fixes...')
        window.location.reload(true)
        return
      }
    }

    // Get initial session
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)
      setLoading(false)
    }

    getSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        setLoading(false)
      }
    )

    return () => subscription?.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-500 to-secondary-500">
      <Component {...pageProps} session={session} />
    </div>
  )
}

export default MyApp