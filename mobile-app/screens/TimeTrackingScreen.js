import React, { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { supabase } from '../lib/supabase'
import { SyncManager } from '../lib/syncManager'
import { OfflineStorage } from '../lib/offlineStorage'

export default function TimeTrackingScreen({ user }) {
  const [isClockIn, setIsClockIn] = useState(true)
  const [currentSession, setCurrentSession] = useState(null)
  const [isOnBreak, setIsOnBreak] = useState(false)
  const [isOnline, setIsOnline] = useState(true)
  const [pendingActions, setPendingActions] = useState(0)

  useEffect(() => {
    // Initialize sync manager
    SyncManager.initialize()
    
    // Add network listener
    SyncManager.addNetworkListener(handleNetworkChange)
    
    checkActiveSession()
    checkPendingActions()

    return () => {
      SyncManager.removeNetworkListener(handleNetworkChange)
    }
  }, [])

  const handleNetworkChange = (online) => {
    setIsOnline(online)
    if (online) {
      checkPendingActions()
    }
  }

  async function checkActiveSession() {
    try {
      if (SyncManager.isOnline) {
        const { data, error } = await supabase
          .from('time_sessions')
          .select('*')
          .eq('employee_id', user.id)
          .is('clock_out', null)
          .single()

        if (data) {
          setCurrentSession(data)
          setIsClockIn(false)
          setIsOnBreak(data.break_start && !data.break_end)
          await OfflineStorage.cacheCurrentSession(data)
        }
      } else {
        // Load from cache when offline
        const cached = await OfflineStorage.getCachedSession()
        if (cached) {
          setCurrentSession(cached)
          setIsClockIn(false)
          setIsOnBreak(cached.break_start && !cached.break_end)
        }
      }
    } catch (error) {
      // No active session found, try cache
      const cached = await OfflineStorage.getCachedSession()
      if (cached) {
        setCurrentSession(cached)
        setIsClockIn(false)
        setIsOnBreak(cached.break_start && !cached.break_end)
      }
    }
  }

  async function checkPendingActions() {
    const count = await OfflineStorage.getOfflineActionCount()
    setPendingActions(count)
  }

  async function handleClockIn() {
    try {
      const result = await SyncManager.executeAction('CLOCK_IN', {}, user)
      
      if (result) {
        setCurrentSession(result)
        setIsClockIn(false)
        checkPendingActions()
        
        const message = isOnline ? 'Clocked in successfully!' : 'Clocked in offline - will sync when connected'
        Alert.alert('Success', message)
      }
    } catch (error) {
      Alert.alert('Error', error.message)
    }
  }

  async function handleClockOut() {
    try {
      const result = await SyncManager.executeAction('CLOCK_OUT', {
        sessionId: currentSession.id,
        isOnBreak: isOnBreak
      }, user)

      if (result) {
        setCurrentSession(null)
        setIsClockIn(true)
        setIsOnBreak(false)
        checkPendingActions()
        
        const message = isOnline ? 'Clocked out successfully!' : 'Clocked out offline - will sync when connected'
        Alert.alert('Success', message)
      }
    } catch (error) {
      Alert.alert('Error', error.message)
    }
  }

  async function handleBreak() {
    try {
      const actionType = isOnBreak ? 'END_BREAK' : 'START_BREAK'
      const result = await SyncManager.executeAction(actionType, {
        sessionId: currentSession.id
      }, user)

      if (result) {
        setIsOnBreak(!isOnBreak)
        checkPendingActions()
        
        const status = isOnBreak ? 'Break ended!' : 'Break started!'
        const message = isOnline ? status : `${status} (offline - will sync when connected)`
        Alert.alert('Success', message)
      }
    } catch (error) {
      Alert.alert('Error', error.message)
    }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcome}>Welcome!</Text>
        <TouchableOpacity onPress={signOut} style={styles.signOutButton}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Network Status */}
      <View style={[styles.statusBar, isOnline ? styles.onlineBar : styles.offlineBar]}>
        <Text style={styles.statusBarText}>
          {isOnline ? '🟢 Online' : '🔴 Offline'}
          {pendingActions > 0 && ` • ${pendingActions} pending sync`}
        </Text>
      </View>

      <View style={styles.timeSection}>
        <Text style={styles.timeText}>
          {new Date().toLocaleTimeString()}
        </Text>
        <Text style={styles.dateText}>
          {new Date().toLocaleDateString()}
        </Text>
      </View>

      <View style={styles.actionSection}>
        {isClockIn ? (
          <TouchableOpacity style={styles.clockInButton} onPress={handleClockIn}>
            <Text style={styles.buttonText}>Clock In</Text>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity style={styles.clockOutButton} onPress={handleClockOut}>
              <Text style={styles.buttonText}>Clock Out</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.breakButton, isOnBreak && styles.breakActiveButton]} 
              onPress={handleBreak}
            >
              <Text style={styles.buttonText}>
                {isOnBreak ? 'End Break' : 'Start Break'}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {currentSession && (
        <View style={styles.statusSection}>
          <Text style={styles.statusText}>
            Status: {isOnBreak ? 'On Break' : 'Working'}
          </Text>
          <Text style={styles.statusText}>
            Clocked in at: {new Date(currentSession.clock_in).toLocaleTimeString()}
          </Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 40,
  },
  welcome: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  signOutButton: {
    padding: 10,
  },
  signOutText: {
    color: '#3b82f6',
    fontSize: 16,
  },
  timeSection: {
    alignItems: 'center',
    marginBottom: 60,
  },
  timeText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#333',
  },
  dateText: {
    fontSize: 18,
    color: '#666',
    marginTop: 10,
  },
  actionSection: {
    alignItems: 'center',
    gap: 20,
  },
  clockInButton: {
    backgroundColor: '#10b981',
    paddingVertical: 20,
    paddingHorizontal: 60,
    borderRadius: 12,
    minWidth: 200,
    alignItems: 'center',
  },
  clockOutButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 20,
    paddingHorizontal: 60,
    borderRadius: 12,
    minWidth: 200,
    alignItems: 'center',
  },
  breakButton: {
    backgroundColor: '#f59e0b',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 12,
    minWidth: 200,
    alignItems: 'center',
  },
  breakActiveButton: {
    backgroundColor: '#dc2626',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  statusSection: {
    marginTop: 40,
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 5,
  },
  statusBar: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 20,
    alignItems: 'center',
  },
  onlineBar: {
    backgroundColor: '#dcfce7',
    borderColor: '#16a34a',
    borderWidth: 1,
  },
  offlineBar: {
    backgroundColor: '#fef2f2',
    borderColor: '#dc2626',
    borderWidth: 1,
  },
  statusBarText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
})