import React, { useState, useEffect } from 'react'
import { View, Text } from 'react-native'
import { supabase } from './lib/supabase'
import LoginScreen from './screens/LoginScreen'
import TimeTrackingScreen from './screens/TimeTrackingScreen'

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
  }, [])

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Loading...</Text>
      </View>
    )
  }

  return (
    <View style={{ flex: 1 }}>
      {session && session.user ? (
        <TimeTrackingScreen user={session.user} />
      ) : (
        <LoginScreen />
      )}
    </View>
  )
}
