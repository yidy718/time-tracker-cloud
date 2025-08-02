// WhatsApp OTP verification API endpoint

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { phone, code } = req.body

  if (!phone || !code) {
    return res.status(400).json({ error: 'Phone number and code are required' })
  }

  try {
    // Check if we have OTP store
    if (!global.whatsappOtpStore) {
      return res.status(400).json({ error: 'No OTP found. Please request a new code.' })
    }

    const otpData = global.whatsappOtpStore.get(phone)

    if (!otpData) {
      return res.status(400).json({ error: 'No OTP found for this phone number. Please request a new code.' })
    }

    // Check if OTP is expired
    if (Date.now() > otpData.expires) {
      global.whatsappOtpStore.delete(phone)
      return res.status(400).json({ error: 'OTP has expired. Please request a new code.' })
    }

    // Check attempt limit (max 3 attempts)
    if (otpData.attempts >= 3) {
      global.whatsappOtpStore.delete(phone)
      return res.status(400).json({ error: 'Too many incorrect attempts. Please request a new code.' })
    }

    // Increment attempt counter
    otpData.attempts++

    // Verify the code
    if (otpData.code !== code) {
      // Don't delete yet, allow more attempts
      global.whatsappOtpStore.set(phone, otpData)
      
      const attemptsLeft = 3 - otpData.attempts
      return res.status(400).json({ 
        error: `Invalid code. ${attemptsLeft} attempts remaining.`,
        attempts_left: attemptsLeft
      })
    }

    // Code is correct! Clean up and return success
    global.whatsappOtpStore.delete(phone)

    // Log successful verification
    console.log('✅ WhatsApp OTP verified successfully for:', phone)

    res.status(200).json({ 
      success: true, 
      message: 'WhatsApp OTP verified successfully',
      verified_at: new Date().toISOString()
    })

  } catch (error) {
    console.error('WhatsApp OTP verification error:', error)
    res.status(500).json({ 
      error: 'Failed to verify WhatsApp OTP', 
      details: error.message 
    })
  }
}

// Cleanup function (called periodically)
function cleanupExpiredOTPs() {
  if (!global.whatsappOtpStore) return

  const now = Date.now()
  let cleaned = 0
  
  for (const [phone, data] of global.whatsappOtpStore.entries()) {
    if (data.expires < now) {
      global.whatsappOtpStore.delete(phone)
      cleaned++
    }
  }

  if (cleaned > 0) {
    console.log(`🧹 Cleaned up ${cleaned} expired WhatsApp OTPs`)
  }
}

// Run cleanup when this module loads
cleanupExpiredOTPs()