// API endpoint for sending SMS via Twilio

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { to, body, from } = req.body

  if (!to || !body) {
    return res.status(400).json({ error: 'Missing required fields: to, body' })
  }

  // Check if Twilio is configured
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
    return res.status(500).json({ 
      error: 'Twilio not configured. Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER in environment variables.' 
    })
  }

  try {
    // Initialize Twilio client
    const twilio = require('twilio')
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)

    // Send SMS
    const message = await client.messages.create({
      body: body,
      from: from || process.env.TWILIO_PHONE_NUMBER,
      to: to
    })

    return res.status(200).json({ 
      success: true, 
      provider: 'twilio',
      messageId: message.sid,
      status: message.status
    })

  } catch (error) {
    console.error('SMS sending error:', error)
    return res.status(500).json({ 
      error: 'Failed to send SMS', 
      details: error.message 
    })
  }
}