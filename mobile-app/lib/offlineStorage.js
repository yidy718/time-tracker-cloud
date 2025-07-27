import AsyncStorage from '@react-native-async-storage/async-storage'

const OFFLINE_ACTIONS_KEY = 'offline_time_actions'
const CACHED_SESSIONS_KEY = 'cached_sessions'

export class OfflineStorage {
  // Store offline actions when no internet
  static async storeOfflineAction(action) {
    try {
      const existing = await AsyncStorage.getItem(OFFLINE_ACTIONS_KEY)
      const actions = existing ? JSON.parse(existing) : []
      
      const actionWithId = {
        ...action,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toISOString(),
        synced: false
      }
      
      actions.push(actionWithId)
      await AsyncStorage.setItem(OFFLINE_ACTIONS_KEY, JSON.stringify(actions))
      
      console.log('Stored offline action:', actionWithId)
      return actionWithId
    } catch (error) {
      console.error('Error storing offline action:', error)
    }
  }

  // Get all pending offline actions
  static async getOfflineActions() {
    try {
      const stored = await AsyncStorage.getItem(OFFLINE_ACTIONS_KEY)
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      console.error('Error getting offline actions:', error)
      return []
    }
  }

  // Mark action as synced
  static async markActionSynced(actionId) {
    try {
      const existing = await AsyncStorage.getItem(OFFLINE_ACTIONS_KEY)
      if (existing) {
        const actions = JSON.parse(existing)
        const updated = actions.filter(action => action.id !== actionId)
        await AsyncStorage.setItem(OFFLINE_ACTIONS_KEY, JSON.stringify(updated))
      }
    } catch (error) {
      console.error('Error marking action as synced:', error)
    }
  }

  // Cache current session data
  static async cacheCurrentSession(session) {
    try {
      await AsyncStorage.setItem(CACHED_SESSIONS_KEY, JSON.stringify(session))
    } catch (error) {
      console.error('Error caching session:', error)
    }
  }

  // Get cached session
  static async getCachedSession() {
    try {
      const cached = await AsyncStorage.getItem(CACHED_SESSIONS_KEY)
      return cached ? JSON.parse(cached) : null
    } catch (error) {
      console.error('Error getting cached session:', error)
      return null
    }
  }

  // Clear cached session
  static async clearCachedSession() {
    try {
      await AsyncStorage.removeItem(CACHED_SESSIONS_KEY)
    } catch (error) {
      console.error('Error clearing cached session:', error)
    }
  }

  // Get offline action count
  static async getOfflineActionCount() {
    try {
      const actions = await this.getOfflineActions()
      return actions.length
    } catch (error) {
      console.error('Error getting offline action count:', error)
      return 0
    }
  }
}