import NetInfo from '@react-native-community/netinfo'
import { supabase } from './supabase'
import { OfflineStorage } from './offlineStorage'

export class SyncManager {
  static isOnline = true
  static listeners = []
  static isSyncing = false // RACE CONDITION FIX: Add sync lock

  // Initialize network monitoring
  static initialize() {
    NetInfo.addEventListener(state => {
      const wasOffline = !this.isOnline
      this.isOnline = state.isConnected
      
      console.log('Network status:', state.isConnected ? 'Online' : 'Offline')
      
      // If we just came back online, sync pending actions
      if (wasOffline && this.isOnline) {
        this.syncOfflineActions()
      }
      
      // Notify listeners
      this.listeners.forEach(listener => listener(this.isOnline))
    })
  }

  // Add network status listener
  static addNetworkListener(callback) {
    this.listeners.push(callback)
  }

  // Remove network status listener
  static removeNetworkListener(callback) {
    this.listeners = this.listeners.filter(listener => listener !== callback)
  }

  // Sync all pending offline actions
  static async syncOfflineActions() {
    if (!this.isOnline) return

    // RACE CONDITION FIX: Prevent concurrent sync operations
    if (this.isSyncing) {
      console.log('Sync already in progress, skipping')
      return
    }

    this.isSyncing = true
    try {
      const offlineActions = await OfflineStorage.getOfflineActions()
      console.log(`Syncing ${offlineActions.length} offline actions`)

      for (const action of offlineActions) {
        try {
          await this.syncSingleAction(action)
          await OfflineStorage.markActionSynced(action.id)
          console.log('Synced action:', action.type)
        } catch (error) {
          console.error('Failed to sync action:', action, error)
          // Continue with next action even if one fails
        }
      }
    } catch (error) {
      console.error('Error syncing offline actions:', error)
    } finally {
      this.isSyncing = false // RACE CONDITION FIX: Always release lock
    }
  }

  // Sync a single action
  static async syncSingleAction(action) {
    switch (action.type) {
      case 'CLOCK_IN':
        return await this.syncClockIn(action)
      case 'CLOCK_OUT':
        return await this.syncClockOut(action)
      case 'START_BREAK':
        return await this.syncStartBreak(action)
      case 'END_BREAK':
        return await this.syncEndBreak(action)
      default:
        throw new Error(`Unknown action type: ${action.type}`)
    }
  }

  // Sync clock in action
  static async syncClockIn(action) {
    const { data, error } = await supabase
      .from('time_sessions')
      .insert([{
        employee_id: action.employee_id,
        clock_in: action.timestamp,
      }])
      .select()
      .single()

    if (error) throw error
    return data
  }

  // Sync clock out action
  static async syncClockOut(action) {
    const { error } = await supabase
      .from('time_sessions')
      .update({ 
        clock_out: action.timestamp,
        break_end: action.break_end
      })
      .eq('id', action.session_id)

    if (error) throw error
  }

  // Sync start break action
  static async syncStartBreak(action) {
    const { error } = await supabase
      .from('time_sessions')
      .update({ break_start: action.timestamp })
      .eq('id', action.session_id)

    if (error) throw error
  }

  // Sync end break action
  static async syncEndBreak(action) {
    const { error } = await supabase
      .from('time_sessions')
      .update({ break_end: action.timestamp })
      .eq('id', action.session_id)

    if (error) throw error
  }

  // Execute action (online or offline)
  static async executeAction(actionType, actionData, user) {
    if (this.isOnline) {
      // Try to execute online first
      try {
        return await this.executeOnlineAction(actionType, actionData, user)
      } catch (error) {
        console.log('Online action failed, storing offline:', error)
        // Fall back to offline storage
        return await this.executeOfflineAction(actionType, actionData, user)
      }
    } else {
      // Store offline
      return await this.executeOfflineAction(actionType, actionData, user)
    }
  }

  // Execute action online
  static async executeOnlineAction(actionType, actionData, user) {
    switch (actionType) {
      case 'CLOCK_IN':
        const { data, error } = await supabase
          .from('time_sessions')
          .insert([{
            employee_id: user.id,
            clock_in: new Date().toISOString(),
          }])
          .select()
          .single()

        if (error) throw error
        await OfflineStorage.cacheCurrentSession(data)
        return data

      case 'CLOCK_OUT':
        const { error: clockOutError } = await supabase
          .from('time_sessions')
          .update({ 
            clock_out: new Date().toISOString(),
            break_end: actionData.isOnBreak ? new Date().toISOString() : null
          })
          .eq('id', actionData.sessionId)

        if (clockOutError) throw clockOutError
        await OfflineStorage.clearCachedSession()
        return true

      case 'START_BREAK':
        const { error: startBreakError } = await supabase
          .from('time_sessions')
          .update({ break_start: new Date().toISOString() })
          .eq('id', actionData.sessionId)

        if (startBreakError) throw startBreakError
        return true

      case 'END_BREAK':
        const { error: endBreakError } = await supabase
          .from('time_sessions')
          .update({ break_end: new Date().toISOString() })
          .eq('id', actionData.sessionId)

        if (endBreakError) throw endBreakError
        return true

      default:
        throw new Error(`Unknown action type: ${actionType}`)
    }
  }

  // Execute action offline
  static async executeOfflineAction(actionType, actionData, user) {
    const action = {
      type: actionType,
      employee_id: user.id,
      ...actionData
    }

    return await OfflineStorage.storeOfflineAction(action)
  }
}