import React, { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Switch } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase, database } from '../lib/supabase'

export default function LoginScreen({ onEmployeeLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [isAdminMode, setIsAdminMode] = useState(false)

  // Employee login (username/password)
  async function signInAsEmployee() {
    setLoading(true)
    try {
      console.log('🔍 Attempting employee login for:', username)
      
      // Use the database authentication function
      const { data: authResult, error: authError } = await database.authenticateEmployee(username, password)
      
      if (authError || !authResult) {
        throw new Error('Invalid username or password')
      }

      const employee = authResult
      console.log('✅ Employee authenticated:', employee.first_name, employee.last_name)

      // Create custom session
      const customSession = {
        employee: employee,
        auth_method: 'mobile_login',
        authenticated_at: new Date().toISOString()
      }

      // Store session locally
      await AsyncStorage.setItem('employee_session', JSON.stringify(customSession))
      
      // Notify parent component
      if (onEmployeeLogin) {
        onEmployeeLogin(employee)
      }
      
      Alert.alert('Success', `Welcome ${employee.first_name}!`)
    } catch (error) {
      console.error('Employee login error:', error)
      Alert.alert('Login Failed', error.message)
    }
    setLoading(false)
  }

  // Admin/Manager login (email/password via Supabase Auth)
  async function signInAsAdmin() {
    setLoading(true)
    try {
      console.log('🔍 Attempting admin login for:', username)
      
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: username, // Use username field as email for admins
        password: password,
      })

      if (error) throw error

      console.log('✅ Admin authenticated:', authData.user.email)
      Alert.alert('Success', 'Admin login successful!')
      
      // The App.js will handle Supabase auth state changes
    } catch (error) {
      console.error('Admin login error:', error)
      Alert.alert('Login Failed', error.message)
    }
    setLoading(false)
  }

  const handleLogin = () => {
    if (!username || !password) {
      Alert.alert('Error', 'Please enter username/email and password')
      return
    }

    if (isAdminMode) {
      signInAsAdmin()
    } else {
      signInAsEmployee()
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Text style={styles.emoji}>⏰</Text>
        <Text style={styles.title}>Time Tracker</Text>
        <Text style={styles.subtitle}>Track your hours with ease</Text>
      </View>

      {/* Login Mode Toggle */}
      <View style={styles.modeContainer}>
        <Text style={styles.modeLabel}>Employee</Text>
        <Switch
          value={isAdminMode}
          onValueChange={setIsAdminMode}
          trackColor={{ false: '#3b82f6', true: '#059669' }}
          thumbColor={isAdminMode ? '#ffffff' : '#ffffff'}
        />
        <Text style={styles.modeLabel}>Admin/Manager</Text>
      </View>

      <View style={styles.modeIndicator}>
        <Text style={styles.modeText}>
          {isAdminMode ? '👨‍💼 Admin/Manager Login' : '👷‍♂️ Employee Login'}
        </Text>
        <Text style={styles.modeDescription}>
          {isAdminMode 
            ? 'Use your email address and admin password' 
            : 'Use your employee username and password'
          }
        </Text>
      </View>
      
      <TextInput
        style={styles.input}
        placeholder={isAdminMode ? "Enter your email" : "Enter your username"}
        placeholderTextColor="#64748b"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        keyboardType={isAdminMode ? "email-address" : "default"}
        autoComplete={isAdminMode ? "email" : "username"}
        textContentType={isAdminMode ? "emailAddress" : "username"}
      />
      
      <TextInput
        style={styles.input}
        placeholder="Enter your password"
        placeholderTextColor="#64748b"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="password"
        textContentType="password"
      />
      
      <TouchableOpacity 
        style={[styles.button, isAdminMode ? styles.adminButton : styles.employeeButton]} 
        onPress={handleLogin}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Signing In...' : 'Sign In'}
        </Text>
      </TouchableOpacity>

      {/* Login Instructions */}
      <View style={styles.instructionsContainer}>
        <Text style={styles.instructionsTitle}>🔐 Login Help:</Text>
        <Text style={styles.instructionsText}>
          • <Text style={styles.bold}>Employees:</Text> Use your username (e.g., "john.doe") and employee password
        </Text>
        <Text style={styles.instructionsText}>
          • <Text style={styles.bold}>Admins/Managers:</Text> Use your email and admin password
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f8fafc',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 10,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#1e293b',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
  },
  modeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginHorizontal: 10,
  },
  modeIndicator: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 5,
  },
  modeDescription: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  input: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 20,
    fontSize: 16,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    color: '#1e293b',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  button: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
    marginTop: 10,
    marginBottom: 30,
  },
  employeeButton: {
    backgroundColor: '#3b82f6',
  },
  adminButton: {
    backgroundColor: '#059669',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  instructionsContainer: {
    backgroundColor: '#eff6ff',
    padding: 15,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 10,
  },
  instructionsText: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 5,
    lineHeight: 20,
  },
  bold: {
    fontWeight: 'bold',
    color: '#1e293b',
  },
})