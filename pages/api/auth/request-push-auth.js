import { supabase } from '../../../lib/supabase'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { 
      username, 
      deviceInfo = {}, 
      ipAddress,
      userAgent 
    } = req.body

    // Validate required fields
    if (!username) {
      return res.status(400).json({ error: 'Username is required' })
    }

    // Find employee by username
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('id, first_name, last_name, username, is_active')
      .eq('username', username)
      .eq('is_active', true)
      .single()

    if (employeeError || !employee) {
      return res.status(404).json({ error: 'Employee not found or inactive' })
    }

    // Check if employee has push tokens
    const { data: pushTokens, error: tokenError } = await supabase
      .from('employee_push_tokens')
      .select('push_token')
      .eq('employee_id', employee.id)
      .eq('is_active', true)

    if (tokenError || !pushTokens || pushTokens.length === 0) {
      return res.status(400).json({ 
        error: 'Employee does not have push notifications enabled',
        suggestion: 'Please log in to the mobile app first to enable push notifications'
      })
    }

    // Create authentication request
    const authRequestId = `auth_${Date.now()}_${Math.random().toString(36).substring(2)}`
    
    const { data: authRequest, error: createError } = await supabase
      .from('auth_requests')
      .insert({
        id: authRequestId,
        employee_id: employee.id,
        username: username,
        status: 'pending',
        device_info: deviceInfo,
        ip_address: ipAddress,
        user_agent: userAgent,
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (createError) {
      throw createError
    }

    // Send push notification to employee's devices
    const pushResponse = await fetch(`${req.headers.origin}/api/send-push-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        employeeId: employee.id,
        title: '🔐 Authentication Request',
        body: `Login request from ${deviceInfo.browser || 'web browser'} on ${deviceInfo.os || 'desktop'}`,
        type: 'auth_request',
        priority: 'high',
        data: {
          authRequestId,
          deviceInfo,
          username: employee.username,
          fullName: `${employee.first_name} ${employee.last_name}`
        }
      })
    })

    if (!pushResponse.ok) {
      const pushError = await pushResponse.json()
      throw new Error(`Failed to send push notification: ${pushError.error}`)
    }

    res.status(200).json({
      success: true,
      message: 'Authentication request sent to mobile device',
      authRequestId,
      expiresAt: authRequest.expires_at,
      employeeName: `${employee.first_name} ${employee.last_name}`
    })

  } catch (error) {
    console.error('Push auth request error:', error)
    res.status(500).json({ 
      error: 'Failed to send authentication request',
      details: error.message 
    })
  }
}