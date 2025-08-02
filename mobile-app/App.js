import React, { useState, useEffect, useRef } from 'react'
import { View, Text, Alert, Platform } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { NavigationContainer } from '@react-navigation/native'
import { createStackNavigator } from '@react-navigation/stack'
import { supabase } from './lib/supabase'
import { PushNotificationService } from './lib/pushNotifications'
import LoginScreen from './screens/LoginScreen'
import TimeTrackingScreen from './screens/TimeTrackingScreen'
import EmployeeDashboard from './screens/EmployeeDashboard'
import AuthApprovalScreen from './screens/AuthApprovalScreen'

const Stack = createStackNavigator()

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [employee, setEmployee] = useState(null)
  const navigationRef = useRef()

  useEffect(() => {
    // Check for existing employee session
    checkEmployeeSession()
    
    // Initialize push notifications if employee is logged in
    if (employee) {
      initializePushNotifications()
    }
  }, [employee])

  const checkEmployeeSession = async () => {
    try {
      // Check for custom employee session (not Supabase auth)
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
      } else {
        console.log('📱 Push notifications failed:', result.error)
      }
    } catch (error) {
      console.error('Push notification initialization error:', error)
    }
  }

  const handleEmployeeLogin = (employeeData) => {
    setEmployee(employeeData)
    // Initialize push notifications for the logged-in employee
    setTimeout(() => initializePushNotifications(), 1000)
  }

  const handleEmployeeLogout = () => {
    setEmployee(null)
    PushNotificationService.cleanup()
  }

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' }}>
        <Text style={{ fontSize: 18, color: '#64748b' }}>Loading Time Tracker...</Text>
      </View>
    )
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: '#1e40af',
          },
          headerTintColor: '#ffffff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        {employee ? (
          <>
            <Stack.Screen 
              name="Dashboard" 
              options={{ title: 'Time Tracker' }}
            >
              {(props) => (
                <EmployeeDashboard 
                  {...props} 
                  employee={employee} 
                  onLogout={handleEmployeeLogout}
                />
              )}
            </Stack.Screen>
            <Stack.Screen 
              name="AuthApproval" 
              component={AuthApprovalScreen}
              options={{ 
                title: 'Authentication Request',
                presentation: 'modal'
              }}
            />
          </>
        ) : (
          <Stack.Screen 
            name="Login" 
            options={{ headerShown: false }}
          >
            {(props) => (
              <LoginScreen 
                {...props} 
                onEmployeeLogin={handleEmployeeLogin}
              />
            )}
          </Stack.Screen>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  )
}
