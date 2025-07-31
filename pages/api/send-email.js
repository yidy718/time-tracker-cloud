// API endpoint for sending emails
// Supports multiple email services: Resend, SendGrid, Mailgun

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { to, subject, html, from } = req.body

  if (!to || !subject || !html) {
    return res.status(400).json({ error: 'Missing required fields: to, subject, html' })
  }

  try {
    // Option 1: Resend (Recommended - great for startups)
    if (process.env.RESEND_API_KEY) {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: from || process.env.FROM_EMAIL || 'Time Tracker <noreply@timetracker.com>',
          to: [to],
          subject: subject,
          html: html,
        }),
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to send email via Resend')
      }

      return res.status(200).json({ 
        success: true, 
        provider: 'resend',
        messageId: data.id 
      })
    }

    // Option 2: SendGrid
    if (process.env.SENDGRID_API_KEY) {
      const sgMail = require('@sendgrid/mail')
      sgMail.setApiKey(process.env.SENDGRID_API_KEY)

      const msg = {
        to: to,
        from: from || process.env.FROM_EMAIL || 'noreply@timetracker.com',
        subject: subject,
        html: html,
      }

      const result = await sgMail.send(msg)
      
      return res.status(200).json({ 
        success: true, 
        provider: 'sendgrid',
        messageId: result[0].headers['x-message-id']
      })
    }

    // Option 3: Mailgun
    if (process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN) {
      const formData = new FormData()
      formData.append('from', from || process.env.FROM_EMAIL || 'Time Tracker <noreply@timetracker.com>')
      formData.append('to', to)
      formData.append('subject', subject)
      formData.append('html', html)

      const response = await fetch(
        `https://api.mailgun.net/v3/${process.env.MAILGUN_DOMAIN}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${Buffer.from(`api:${process.env.MAILGUN_API_KEY}`).toString('base64')}`,
          },
          body: formData,
        }
      )

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to send email via Mailgun')
      }

      return res.status(200).json({ 
        success: true, 
        provider: 'mailgun',
        messageId: data.id 
      })
    }

    // No email service configured
    return res.status(500).json({ 
      error: 'No email service configured. Please set up RESEND_API_KEY, SENDGRID_API_KEY, or MAILGUN_API_KEY in environment variables.' 
    })

  } catch (error) {
    console.error('Email sending error:', error)
    return res.status(500).json({ 
      error: 'Failed to send email', 
      details: error.message 
    })
  }
}