// API endpoint for sending WhatsApp messages via WhatsApp Business API

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { to, type, text } = req.body

  if (!to || !text) {
    return res.status(400).json({ error: 'Missing required fields: to, text' })
  }

  // Check if WhatsApp is configured
  if (!process.env.WHATSAPP_ACCESS_TOKEN || !process.env.WHATSAPP_PHONE_NUMBER_ID) {
    return res.status(500).json({ 
      error: 'WhatsApp not configured. Please set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID in environment variables.' 
    })
  }

  try {
    // Format phone number (remove + and any spaces/dashes)
    const formattedTo = to.replace(/[^\d]/g, '')

    // Send WhatsApp message via Facebook Graph API
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: formattedTo,
          type: type || 'text',
          text: {
            body: text.body || text
          }
        }),
      }
    )

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to send WhatsApp message')
    }

    return res.status(200).json({ 
      success: true, 
      provider: 'whatsapp',
      messageId: data.messages?.[0]?.id,
      status: data.messages?.[0]?.message_status
    })

  } catch (error) {
    console.error('WhatsApp sending error:', error)
    return res.status(500).json({ 
      error: 'Failed to send WhatsApp message', 
      details: error.message 
    })
  }
}