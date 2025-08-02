import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { Platform } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import Constants from 'expo-constants'
import { supabase } from './supabase'

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

export class PushNotificationService {
  static pushToken = null
  static notificationListener = null
  static responseListener = null

  // Initialize push notifications
  static async initialize(employeeId) {
    try {
      // Check if device supports push notifications
      if (!Device.isDevice) {
        console.log('Push notifications only work on physical devices')
        return { success: false, error: 'Simulator not supported' }
      }

      // Get existing permission status
      const { status: existingStatus } = await Notifications.getPermissionsAsync()
      let finalStatus = existingStatus

      // Request permissions if not granted
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync()
        finalStatus = status
      }

      if (finalStatus !== 'granted') {
        return { success: false, error: 'Permission denied' }
      }

      // Get push token
      const projectId = Constants.expoConfig?.extra?.eas?.projectId
      if (!projectId) {
        return { success: false, error: 'Missing Expo project ID' }
      }

      const pushTokenData = await Notifications.getExpoPushTokenAsync({ projectId })
      this.pushToken = pushTokenData.data

      console.log('📱 Push token generated:', this.pushToken)

      // Store token in database
      await this.storePushToken(employeeId, this.pushToken)

      // Set up notification listeners
      this.setupListeners()

      // Configure notification channel for Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Time Tracker Notifications',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#1e40af',
          sound: 'default',
        })

        // Create specific channels for different notification types
        await Notifications.setNotificationChannelAsync('auth', {
          name: 'Authentication Requests',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#dc2626',
          sound: 'default',
        })

        await Notifications.setNotificationChannelAsync('tasks', {
          name: 'Task Notifications',
          importance: Notifications.AndroidImportance.DEFAULT,
          vibrationPattern: [0, 250],
          lightColor: '#059669',
          sound: 'default',
        })
      }

      return { success: true, token: this.pushToken }
    } catch (error) {
      console.error('Error initializing push notifications:', error)
      return { success: false, error: error.message }
    }
  }

  // Store push token in database
  static async storePushToken(employeeId, pushToken) {
    try {
      const { error } = await supabase
        .from('employee_push_tokens')
        .upsert({
          employee_id: employeeId,
          push_token: pushToken,
          platform: Platform.OS,
          device_info: {
            brand: Device.brand,
            model: Device.modelName,
            osVersion: Device.osVersion,
          },
          updated_at: new Date().toISOString()
        }, { 
          onConflict: 'employee_id' 
        })

      if (error) {
        // If table doesn't exist, store locally for now
        console.log('Storing push token locally (table not found)')
        await AsyncStorage.setItem(`push_token_${employeeId}`, JSON.stringify({
          token: pushToken,
          platform: Platform.OS,
          timestamp: Date.now()
        }))
      }
    } catch (error) {
      console.error('Error storing push token:', error)
    }
  }

  // Set up notification listeners
  static setupListeners() {
    // Listener for notifications received while app is in foreground
    this.notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('📱 Notification received:', notification)
      
      // Handle different notification types
      const { type, data } = notification.request.content.data || {}
      
      switch (type) {
        case 'auth_request':
          this.handleAuthRequest(data)
          break
        case 'task_assigned':
        case 'task_comment':
        case 'task_due':
          this.handleTaskNotification(data)
          break
        default:
          console.log('Unknown notification type:', type)
      }
    })

    // Listener for when user taps on notification
    this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('📱 Notification tapped:', response)
      
      const { type, data } = response.notification.request.content.data || {}
      
      switch (type) {
        case 'auth_request':
          // Navigate to authentication approval screen
          this.navigateToAuthApproval(data)
          break
        case 'task_assigned':
        case 'task_comment':
          // Navigate to task details
          this.navigateToTask(data)
          break
        default:
          console.log('Unknown notification response:', type)
      }
    })
  }

  // Handle authentication request notifications
  static handleAuthRequest(data) {
    console.log('🔐 Authentication request received:', data)
    // Show authentication approval modal
    // This will be implemented in the UI layer
  }

  // Handle task-related notifications
  static handleTaskNotification(data) {
    console.log('📋 Task notification received:', data)
    // Update task badge count or show task alert
  }

  // Navigate to authentication approval
  static navigateToAuthApproval(data) {
    console.log('🔐 Navigating to auth approval:', data)
    // This will be implemented with navigation
  }

  // Navigate to task details
  static navigateToTask(data) {
    console.log('📋 Navigating to task:', data)
    // This will be implemented with navigation
  }

  // Send local notification (for testing)
  static async sendLocalNotification(title, body, data = {}) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: 'default',
        },
        trigger: null, // Send immediately
      })
    } catch (error) {
      console.error('Error sending local notification:', error)
    }
  }

  // Clean up listeners
  static cleanup() {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener)
    }
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener)
    }
  }

  // Get current badge count
  static async getBadgeCount() {
    try {
      return await Notifications.getBadgeCountAsync()
    } catch (error) {
      console.error('Error getting badge count:', error)
      return 0
    }
  }

  // Set badge count
  static async setBadgeCount(count) {
    try {
      await Notifications.setBadgeCountAsync(count)
    } catch (error) {
      console.error('Error setting badge count:', error)
    }
  }

  // Clear all notifications
  static async clearAllNotifications() {
    try {
      await Notifications.dismissAllNotificationsAsync()
      await this.setBadgeCount(0)
    } catch (error) {
      console.error('Error clearing notifications:', error)
    }
  }
}

export default PushNotificationService