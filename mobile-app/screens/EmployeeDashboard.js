import React, { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '../lib/supabase'

export default function EmployeeDashboard({ employee, onLogout }) {
  const [currentSession, setCurrentSession] = useState(null)
  const [isClockIn, setIsClockIn] = useState(true)
  const [isOnBreak, setIsOnBreak] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    checkActiveSession()
  }, [])

  async function checkActiveSession() {
    try {
      const { data, error } = await supabase
        .from('time_sessions')
        .select('*')
        .eq('employee_id', employee.id)
        .is('clock_out', null)
        .single()

      if (data && !error) {
        setCurrentSession(data)
        setIsClockIn(false)
        setIsOnBreak(data.break_start && !data.break_end)
      }
    } catch (error) {
      // No active session found
      console.log('No active session')
    }
  }

  async function handleClockIn() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('time_sessions')
        .insert([
          {
            employee_id: employee.id,
            organization_id: employee.organization_id,
            clock_in: new Date().toISOString(),
            location: 'Mobile App',
            notes: 'Clocked in via mobile app'
          }
        ])
        .select()
        .single()

      if (error) throw error

      setCurrentSession(data)
      setIsClockIn(false)
      Alert.alert('Success', 'Clocked in successfully!')
    } catch (error) {
      Alert.alert('Error', error.message)
    }
    setLoading(false)
  }

  async function handleClockOut() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('time_sessions')
        .update({
          clock_out: new Date().toISOString(),
          break_end: isOnBreak ? new Date().toISOString() : null
        })
        .eq('id', currentSession.id)
        .select()
        .single()

      if (error) throw error

      setCurrentSession(null)
      setIsClockIn(true)
      setIsOnBreak(false)
      Alert.alert('Success', 'Clocked out successfully!')
    } catch (error) {
      Alert.alert('Error', error.message)
    }
    setLoading(false)
  }

  async function handleBreak() {
    setLoading(true)
    try {
      const updateData = isOnBreak
        ? { break_end: new Date().toISOString() }
        : { break_start: new Date().toISOString() }

      const { data, error } = await supabase
        .from('time_sessions')
        .update(updateData)
        .eq('id', currentSession.id)
        .select()
        .single()

      if (error) throw error

      setCurrentSession(data)
      setIsOnBreak(!isOnBreak)
      Alert.alert('Success', isOnBreak ? 'Break ended!' : 'Break started!')
    } catch (error) {
      Alert.alert('Error', error.message)
    }
    setLoading(false)
  }

  async function handleLogout() {
    try {
      await AsyncStorage.removeItem('employee_session')
      onLogout()
    } catch (error) {
      Alert.alert('Error', 'Failed to logout')
    }
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcome}>Welcome back!</Text>
          <Text style={styles.name}>{employee.first_name} {employee.last_name}</Text>
          <Text style={styles.role}>{employee.role} • {employee.organization?.name || 'Organization'}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Current Time */}
      <View style={styles.timeSection}>
        <Text style={styles.timeText}>
          {new Date().toLocaleTimeString()}
        </Text>
        <Text style={styles.dateText}>
          {new Date().toLocaleDateString()}
        </Text>
      </View>

      {/* Clock Status */}
      {currentSession && (
        <View style={styles.statusSection}>
          <Text style={styles.statusTitle}>Current Session</Text>
          <Text style={styles.statusText}>
            Status: {isOnBreak ? '🟡 On Break' : '🟢 Working'}
          </Text>
          <Text style={styles.statusText}>
            Clocked in: {new Date(currentSession.clock_in).toLocaleTimeString()}
          </Text>
          {currentSession.break_start && (
            <Text style={styles.statusText}>
              Break started: {new Date(currentSession.break_start).toLocaleTimeString()}
            </Text>
          )}
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionSection}>
        {isClockIn ? (
          <TouchableOpacity 
            style={styles.clockInButton} 
            onPress={handleClockIn}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Clocking In...' : '🟢 Clock In'}
            </Text>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity 
              style={styles.clockOutButton} 
              onPress={handleClockOut}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Clocking Out...' : '🔴 Clock Out'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.breakButton, isOnBreak && styles.breakActiveButton]} 
              onPress={handleBreak}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Processing...' : (isOnBreak ? '🟢 End Break' : '🟡 Start Break')}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Features Section */}
      <View style={styles.featuresSection}>
        <Text style={styles.featuresTitle}>📱 Mobile Features Available:</Text>
        <Text style={styles.featureText}>✅ Time tracking with clock in/out</Text>
        <Text style={styles.featureText}>✅ Break management</Text>
        <Text style={styles.featureText}>✅ Push notifications for tasks</Text>
        <Text style={styles.featureText}>✅ Push authentication for desktop login</Text>
        <Text style={styles.featureText}>✅ Task assignments and updates</Text>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 40,
    marginBottom: 30,
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  welcome: {
    fontSize: 16,
    color: '#64748b',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginVertical: 5,
  },
  role: {
    fontSize: 14,
    color: '#64748b',
  },
  logoutButton: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  logoutText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  timeSection: {
    alignItems: 'center',
    marginBottom: 30,
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  timeText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  dateText: {
    fontSize: 18,
    color: '#64748b',
    marginTop: 10,
  },
  statusSection: {
    marginBottom: 30,
    padding: 20,
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 10,
  },
  statusText: {
    fontSize: 16,
    color: '#1e293b',
    marginBottom: 5,
  },
  actionSection: {
    marginBottom: 30,
  },
  clockInButton: {
    backgroundColor: '#059669',
    paddingVertical: 20,
    paddingHorizontal: 40,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  clockOutButton: {
    backgroundColor: '#dc2626',
    paddingVertical: 20,
    paddingHorizontal: 40,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  breakButton: {
    backgroundColor: '#f59e0b',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  breakActiveButton: {
    backgroundColor: '#059669',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  featuresSection: {
    padding: 20,
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#059669',
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 10,
  },
  featureText: {
    fontSize: 14,
    color: '#166534',
    marginBottom: 5,
    lineHeight: 20,
  },
})