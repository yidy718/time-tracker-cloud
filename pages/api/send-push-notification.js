import { supabase } from '../../lib/supabase'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { 
      employeeId, 
      title, 
      body, 
      data = {},
      type = 'general',
      priority = 'normal' 
    } = req.body

    // Validate required fields
    if (!employeeId || !title || !body) {
      return res.status(400).json({ 
        error: 'Missing required fields: employeeId, title, body' 
      })
    }

    // Get employee's push tokens
    const { data: tokens, error: tokenError } = await supabase
      .from('employee_push_tokens')
      .select('push_token, platform')
      .eq('employee_id', employeeId)
      .eq('is_active', true)

    if (tokenError) {
      console.error('Error fetching push tokens:', tokenError)
      return res.status(500).json({ error: 'Failed to fetch push tokens' })
    }

    if (!tokens || tokens.length === 0) {
      return res.status(404).json({ 
        error: 'No push tokens found for employee',
        employeeId 
      })
    }

    // Prepare notification payload
    const notification = {
      to: tokens.map(t => t.push_token),
      title,
      body,
      data: {
        type,
        ...data,
        timestamp: new Date().toISOString()
      },
      sound: 'default',
      priority: priority === 'high' ? 'high' : 'normal',
      channelId: getChannelId(type),
    }

    // Add platform-specific configurations
    notification.android = {
      channelId: getChannelId(type),
      priority: priority === 'high' ? 'max' : 'default',
      vibrate: type === 'auth_request' ? [0, 250, 250, 250] : [0, 250],
      color: getNotificationColor(type)
    }

    notification.ios = {
      sound: 'default',
      badge: 1,
      priority: priority === 'high' ? 10 : 5
    }

    // Send push notification using Expo Push API
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(notification),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(`Push notification failed: ${result.message || 'Unknown error'}`)
    }

    // Log notification in database
    try {
      await supabase
        .from('push_notification_logs')
        .insert({
          employee_id: employeeId,
          title,
          body,
          type,
          data,
          tokens_sent: tokens.length,
          expo_response: result,
          created_at: new Date().toISOString()
        })
    } catch (logError) {
      console.error('Error logging notification:', logError)
      // Don't fail the request if logging fails
    }

    res.status(200).json({
      success: true,
      message: 'Push notification sent successfully',
      tokensCount: tokens.length,
      expoResponse: result
    })

  } catch (error) {
    console.error('Push notification error:', error)
    res.status(500).json({ 
      error: 'Failed to send push notification',
      details: error.message 
    })
  }
}

// Get notification channel ID based on type
function getChannelId(type) {
  switch (type) {
    case 'auth_request':
      return 'auth'
    case 'task_assigned':
    case 'task_comment':
    case 'task_due':
    case 'task_updated':
      return 'tasks'
    default:
      return 'default'
  }
}

// Get notification color based on type
function getNotificationColor(type) {
  switch (type) {
    case 'auth_request':
      return '#dc2626' // Red for security
    case 'task_assigned':
      return '#1e40af' // Blue for new tasks
    case 'task_comment':
      return '#059669' // Green for comments
    case 'task_due':
      return '#ea580c' // Orange for due dates
    case 'task_updated':
      return '#7c3aed' // Purple for updates
    default:
      return '#1e40af' // Default blue
  }
}