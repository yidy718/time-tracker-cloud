import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, Platform } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from './lib/supabase'
import { PushNotificationService } from './lib/pushNotifications'

export default function App() {
  const [employee, setEmployee] = useState(null)
  const [loading, setLoading] = useState(true)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)

  useEffect(() => {
    checkEmployeeSession()
  }, [])

  useEffect(() => {
    if (employee) {
      initializePushNotifications()
    }
  }, [employee])

  const checkEmployeeSession = async () => {
    try {
      const employeeSession = await AsyncStorage.getItem('employee_session')
      if (employeeSession) {
        const parsedSession = JSON.parse(employeeSession)
        setEmployee(parsedSession.employee)
      }
    } catch (error) {
      console.error('Error checking employee session:', error)
    }
    setLoading(false)
  }

  const initializePushNotifications = async () => {
    if (!employee) return

    try {
      const result = await PushNotificationService.initialize(employee.id)
      if (result.success) {
        console.log('📱 Push notifications initialized successfully')
        Alert.alert('Success', 'Push notifications enabled! You can now receive login requests and task notifications.')
      } else {
        console.log('📱 Push notifications failed:', result.error)
      }
    } catch (error) {
      console.error('Push notification initialization error:', error)
    }
  }

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Please enter username and password')
      return
    }

    setLoginLoading(true)
    try {
      // Simple employee authentication
      const { data: employees, error } = await supabase
        .from('employees')
        .select('*')
        .eq('username', username)
        .eq('is_active', true)

      if (error || !employees || employees.length === 0) {
        throw new Error('Employee not found')
      }

      const employee = employees[0]
      
      // In production, you'd verify the password here
      // For demo, we'll just check if password is not empty
      if (password.length < 3) {
        throw new Error('Invalid password')
      }

      // Create session
      const session = {
        employee,
        auth_method: 'mobile_login',
        authenticated_at: new Date().toISOString()
      }

      await AsyncStorage.setItem('employee_session', JSON.stringify(session))
      setEmployee(employee)

      Alert.alert('Success', `Welcome ${employee.first_name}!`)
    } catch (error) {
      Alert.alert('Login Failed', error.message)
    }
    setLoginLoading(false)
  }

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('employee_session')
      setEmployee(null)
      setUsername('')
      setPassword('')
      PushNotificationService.cleanup()
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading Time Tracker...</Text>
      </View>
    )
  }

  if (!employee) {
    return (
      <View style={styles.container}>
        <View style={styles.loginContainer}>
          <Text style={styles.title}>Time Tracker</Text>
          <Text style={styles.subtitle}>Employee Login</Text>
          
          <TextInput
            style={styles.input}
            placeholder="Username"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
          />
          
          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />
          
          <TouchableOpacity
            style={styles.loginButton}
            onPress={handleLogin}
            disabled={loginLoading}
          >
            <Text style={styles.loginButtonText}>
              {loginLoading ? 'Logging in...' : 'Login'}
            </Text>
          </TouchableOpacity>
          
          <Text style={styles.infoText}>
            This app supports push notifications for authentication and task updates.
          </Text>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.dashboardContainer}>
        <Text style={styles.welcomeText}>
          Welcome, {employee.first_name} {employee.last_name}!
        </Text>
        
        <Text style={styles.infoText}>
          📱 Push notifications are enabled
        </Text>
        
        <Text style={styles.infoText}>
          ✅ You'll receive notifications for:
          {'\n'}• Authentication requests
          {'\n'}• New task assignments  
          {'\n'}• Admin comments on tasks
          {'\n'}• Task due date reminders
        </Text>
        
        <TouchableOpacity
          style={styles.testButton}
          onPress={() => {
            PushNotificationService.sendLocalNotification(
              'Test Notification',
              'This is a test push notification!'
            )
          }}
        >
          <Text style={styles.testButtonText}>Test Push Notification</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    textAlign: 'center',
    fontSize: 18,
    color: '#64748b',
  },
  loginContainer: {
    backgroundColor: 'white',
    padding: 30,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#1e40af',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#64748b',
    marginBottom: 30,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    marginBottom: 15,
    backgroundColor: '#f8fafc',
  },
  loginButton: {
    backgroundColor: '#1e40af',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginBottom: 20,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  dashboardContainer: {
    backgroundColor: 'white',
    padding: 30,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#1e40af',
    marginBottom: 20,
  },
  infoText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  testButton: {
    backgroundColor: '#059669',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginBottom: 15,
  },
  testButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  logoutButton: {
    backgroundColor: '#dc2626',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
})