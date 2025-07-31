// Notification system for sending login credentials
// Supports Email, SMS, and WhatsApp

import { supabase } from './supabase'

// Email notification via Supabase Auth
export const sendEmailCredentials = async (email, credentials, type = 'employee') => {
  try {
    const subject = type === 'admin' 
      ? '🏢 Welcome! Your Company Admin Access Created'
      : '👋 Welcome to the Team! Your Employee Access Created'
    
    const htmlContent = generateEmailTemplate(credentials, type)
    
    // Use Supabase's email functionality
    // Note: This requires custom email templates to be set up in Supabase
    const { error } = await supabase.auth.admin.generateLink({
      type: 'invite',
      email: email,
      options: {
        data: {
          welcome_email: true,
          credentials: credentials,
          user_type: type
        }
      }
    })

    if (error) {
      console.error('Email sending failed:', error)
      return { success: false, error: error.message }
    }

    return { success: true, method: 'email' }
  } catch (error) {
    console.error('Email notification error:', error)
    return { success: false, error: error.message }
  }
}

// Alternative: Direct email via a service (if Supabase email is not configured)
export const sendEmailViaService = async (email, credentials, type = 'employee') => {
  try {
    // This would integrate with services like:
    // - SendGrid
    // - Mailgun  
    // - AWS SES
    // - Resend
    
    const emailData = {
      to: email,
      subject: type === 'admin' 
        ? '🏢 Welcome! Your Company Admin Access Created'
        : '👋 Welcome to the Team! Your Employee Access Created',
      html: generateEmailTemplate(credentials, type),
      from: process.env.FROM_EMAIL || 'noreply@timetracker.com'
    }

    // Example with fetch to external service
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(emailData)
    })

    const result = await response.json()
    return { success: response.ok, method: 'email', data: result }
    
  } catch (error) {
    console.error('Email service error:', error)
    return { success: false, error: error.message }
  }
}

// SMS notification via Twilio
export const sendSMSCredentials = async (phoneNumber, credentials, type = 'employee') => {
  try {
    const message = generateSMSMessage(credentials, type)
    
    const smsData = {
      to: phoneNumber,
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER
    }

    const response = await fetch('/api/send-sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(smsData)
    })

    const result = await response.json()
    return { success: response.ok, method: 'sms', data: result }
    
  } catch (error) {
    console.error('SMS notification error:', error)
    return { success: false, error: error.message }
  }
}

// WhatsApp notification via WhatsApp Business API
export const sendWhatsAppCredentials = async (phoneNumber, credentials, type = 'employee') => {
  try {
    const message = generateWhatsAppMessage(credentials, type)
    
    const whatsappData = {
      to: phoneNumber,
      type: 'text',
      text: { body: message }
    }

    const response = await fetch('/api/send-whatsapp', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`
      },
      body: JSON.stringify(whatsappData)
    })

    const result = await response.json()
    return { success: response.ok, method: 'whatsapp', data: result }
    
  } catch (error) {
    console.error('WhatsApp notification error:', error)
    return { success: false, error: error.message }
  }
}

// Multi-channel notification (try multiple methods)
export const sendCredentialsNotification = async (contact, credentials, type = 'employee', methods = ['email']) => {
  const results = []
  
  for (const method of methods) {
    let result
    
    switch (method) {
      case 'email':
        result = await sendEmailCredentials(contact.email, credentials, type)
        break
      case 'sms':
        if (contact.phone) {
          result = await sendSMSCredentials(contact.phone, credentials, type)
        } else {
          result = { success: false, error: 'No phone number provided' }
        }
        break
      case 'whatsapp':
        if (contact.phone) {
          result = await sendWhatsAppCredentials(contact.phone, credentials, type)
        } else {
          result = { success: false, error: 'No phone number provided' }
        }
        break
      default:
        result = { success: false, error: `Unknown method: ${method}` }
    }
    
    results.push({ method, ...result })
    
    // If one method succeeds, we can stop (or continue for backup)
    if (result.success) {
      break // Remove this line if you want to send via all methods
    }
  }
  
  return results
}

// Email template generator
const generateEmailTemplate = (credentials, type) => {
  const isAdmin = type === 'admin'
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Time Tracker</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
    .container { max-width: 600px; margin: 0 auto; background: white; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center; }
    .content { padding: 40px 30px; }
    .credentials-box { background: #f1f5f9; border-left: 4px solid #3b82f6; padding: 20px; margin: 20px 0; border-radius: 8px; }
    .credential-item { margin: 10px 0; font-family: monospace; font-size: 16px; }
    .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
    .footer { background: #f8fafc; padding: 30px; text-align: center; color: #64748b; font-size: 14px; }
    .important { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 8px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${isAdmin ? '🏢 Welcome, Company Admin!' : '👋 Welcome to the Team!'}</h1>
      <p>Your ${isAdmin ? 'company admin' : 'employee'} account has been created</p>
    </div>
    
    <div class="content">
      <h2>Your Login Credentials</h2>
      <p>You can now access the Time Tracker system with the following credentials:</p>
      
      <div class="credentials-box">
        <div class="credential-item"><strong>Email:</strong> ${credentials.email}</div>
        <div class="credential-item"><strong>Password:</strong> ${credentials.password}</div>
        <div class="credential-item"><strong>Company:</strong> ${credentials.companyName}</div>
      </div>
      
      <div class="important">
        <strong>⚠️ Important Security Notice:</strong><br>
        Please change your password after your first login for security purposes.
      </div>
      
      <div style="text-align: center;">
        <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://timetracker.vercel.app'}" class="button">
          🚀 Login Now
        </a>
      </div>
      
      ${isAdmin ? `
      <h3>🎯 What You Can Do as Admin:</h3>
      <ul>
        <li>✅ Add and manage employees</li>
        <li>✅ Create and assign tasks</li>
        <li>✅ View time tracking reports</li>
        <li>✅ Manage company projects</li>
        <li>✅ Review and approve expenses</li>
      </ul>
      ` : `
      <h3>🎯 Getting Started:</h3>
      <ul>
        <li>✅ Clock in/out to track your time</li>
        <li>✅ View and update your assigned tasks</li>
        <li>✅ Submit expenses for reimbursement</li>
        <li>✅ Log work activities and progress</li>
      </ul>
      `}
      
      <p>If you have any questions or need assistance, please contact your ${isAdmin ? 'platform administrator' : 'company admin'}.</p>
    </div>
    
    <div class="footer">
      <p>This email was sent by Time Tracker System</p>
      <p>Please do not reply to this email</p>
    </div>
  </div>
</body>
</html>
  `
}

// SMS message generator
const generateSMSMessage = (credentials, type) => {
  const isAdmin = type === 'admin'
  
  return `
🎉 Welcome to Time Tracker!

Your ${isAdmin ? 'Company Admin' : 'Employee'} account is ready:

📧 Email: ${credentials.email}
🔑 Password: ${credentials.password}
🏢 Company: ${credentials.companyName}

⚠️ Please change your password after first login.

Login: ${process.env.NEXT_PUBLIC_SITE_URL || 'https://timetracker.vercel.app'}

Questions? Contact your admin.
  `.trim()
}

// WhatsApp message generator
const generateWhatsAppMessage = (credentials, type) => {
  const isAdmin = type === 'admin'
  
  return `
🎉 *Welcome to Time Tracker!*

Your ${isAdmin ? '*Company Admin*' : '*Employee*'} account is ready:

📧 *Email:* ${credentials.email}
🔑 *Password:* ${credentials.password}
🏢 *Company:* ${credentials.companyName}

⚠️ *Important:* Please change your password after first login for security.

🚀 *Login here:* ${process.env.NEXT_PUBLIC_SITE_URL || 'https://timetracker.vercel.app'}

${isAdmin ? `
🎯 *As Admin, you can:*
✅ Add and manage employees
✅ Create and assign tasks  
✅ View time tracking reports
✅ Manage company projects
✅ Review and approve expenses
` : `
🎯 *Getting Started:*
✅ Clock in/out to track time
✅ View and update assigned tasks
✅ Submit expenses for reimbursement
✅ Log work activities and progress
`}

Questions? Contact your ${isAdmin ? 'platform administrator' : 'company admin'}.
  `.trim()
}