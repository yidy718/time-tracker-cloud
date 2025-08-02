// WhatsApp OTP sending API endpoint
// Supports multiple WhatsApp providers: Twilio, Meta WhatsApp Business API

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { phone, type = 'authentication' } = req.body

  if (!phone) {
    return res.status(400).json({ error: 'Phone number is required' })
  }

  try {
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    
    // Store OTP with expiration (5 minutes)
    const otpData = {
      code: otp,
      phone: phone,
      expires: Date.now() + 5 * 60 * 1000, // 5 minutes
      attempts: 0,
      created: Date.now()
    }

    // Store in memory/cache (in production, use Redis or database)
    global.whatsappOtpStore = global.whatsappOtpStore || new Map()
    global.whatsappOtpStore.set(phone, otpData)

    // Send WhatsApp message
    const success = await sendWhatsAppMessage(phone, otp, type)
    
    if (!success) {
      throw new Error('Failed to send WhatsApp message')
    }

    // Clean up expired OTPs
    cleanupExpiredOTPs()

    res.status(200).json({ 
      success: true, 
      message: 'WhatsApp OTP sent successfully',
      expires_in: 300 // 5 minutes
    })

  } catch (error) {
    console.error('WhatsApp OTP send error:', error)
    res.status(500).json({ 
      error: 'Failed to send WhatsApp OTP', 
      details: error.message 
    })
  }
}

async function sendWhatsAppMessage(phone, otp, type) {
  const message = createWhatsAppMessage(otp, type)
  
  // Try different WhatsApp providers in order of preference
  const providers = [
    () => sendViaTwilioWhatsApp(phone, message),
    () => sendViaMetaWhatsApp(phone, message),
    () => sendViaGenericWebhook(phone, message)
  ]

  for (const provider of providers) {
    try {
      const result = await provider()
      if (result) {
        console.log('✅ WhatsApp sent successfully via provider')
        return true
      }
    } catch (error) {
      console.log('⚠️ WhatsApp provider failed, trying next:', error.message)
    }
  }

  return false
}

function createWhatsAppMessage(otp, type) {
  const messages = {
    authentication: `🔐 Your login code is: *${otp}*

Use this code to complete your authentication. 

⏰ Valid for 5 minutes
🔒 Never share this code

Time Tracker App`,
    
    password_reset: `🔄 Your password reset code is: *${otp}*

Use this code to reset your password.

⏰ Valid for 5 minutes
🔒 Never share this code

Time Tracker App`
  }

  return messages[type] || messages.authentication
}

async function sendViaTwilioWhatsApp(phone, message) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER // e.g., "whatsapp:+14155238886"

  if (!accountSid || !authToken || !whatsappNumber) {
    console.log('Twilio WhatsApp credentials not configured')
    return false
  }

  try {
    const twilio = require('twilio')(accountSid, authToken)
    
    const result = await twilio.messages.create({
      from: whatsappNumber,
      to: `whatsapp:${phone}`,
      body: message
    })

    console.log('Twilio WhatsApp message sent:', result.sid)
    return true
  } catch (error) {
    console.error('Twilio WhatsApp error:', error)
    return false
  }
}

async function sendViaMetaWhatsApp(phone, message) {
  const accessToken = process.env.META_WHATSAPP_ACCESS_TOKEN
  const phoneNumberId = process.env.META_WHATSAPP_PHONE_NUMBER_ID

  if (!accessToken || !phoneNumberId) {
    console.log('Meta WhatsApp credentials not configured')
    return false
  }

  try {
    const response = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phone.replace('+', ''),
        type: 'text',
        text: {
          body: message
        }
      })
    })

    if (response.ok) {
      const result = await response.json()
      console.log('Meta WhatsApp message sent:', result.messages[0].id)
      return true
    } else {
      const error = await response.text()
      console.error('Meta WhatsApp error:', error)
      return false
    }
  } catch (error) {
    console.error('Meta WhatsApp error:', error)
    return false
  }
}

async function sendViaGenericWebhook(phone, message) {
  const webhookUrl = process.env.WHATSAPP_WEBHOOK_URL
  const apiKey = process.env.WHATSAPP_API_KEY

  if (!webhookUrl) {
    console.log('Generic WhatsApp webhook not configured')
    return false
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey && { 'Authorization': `Bearer ${apiKey}` })
      },
      body: JSON.stringify({
        phone: phone,
        message: message,
        type: 'authentication'
      })
    })

    if (response.ok) {
      console.log('Generic WhatsApp webhook sent successfully')
      return true
    } else {
      console.error('Generic WhatsApp webhook error:', response.status)
      return false
    }
  } catch (error) {
    console.error('Generic WhatsApp webhook error:', error)
    return false
  }
}

function cleanupExpiredOTPs() {
  if (!global.whatsappOtpStore) return

  const now = Date.now()
  for (const [phone, data] of global.whatsappOtpStore.entries()) {
    if (data.expires < now) {
      global.whatsappOtpStore.delete(phone)
    }
  }
}