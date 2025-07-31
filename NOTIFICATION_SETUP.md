# 📧 Notification System Setup Guide

The Time Tracker now supports automated credential delivery via Email, SMS, and WhatsApp!

## 🚀 Quick Start (Email Only - Recommended)

### Option 1: Resend (Easiest - Recommended)
1. Sign up at [resend.com](https://resend.com) (free tier: 3,000 emails/month)
2. Get your API key from the dashboard
3. Add to Vercel environment variables:
   ```
   RESEND_API_KEY=re_xxxxxxxxxx
   FROM_EMAIL=noreply@yourdomain.com
   ```

### Option 2: SendGrid
1. Sign up at [sendgrid.com](https://sendgrid.com)
2. Create API key with Mail Send permissions
3. Add to environment variables:
   ```
   SENDGRID_API_KEY=SG.xxxxxxxxxx
   FROM_EMAIL=noreply@yourdomain.com
   ```

## 📱 SMS Setup (Optional)

### Twilio SMS
1. Sign up at [twilio.com](https://twilio.com)
2. Get phone number and credentials
3. Add to environment variables:
   ```
   TWILIO_ACCOUNT_SID=ACxxxxxxxxxx
   TWILIO_AUTH_TOKEN=xxxxxxxxxx
   TWILIO_PHONE_NUMBER=+1234567890
   ```
4. Install dependency: `npm install twilio`

## 💬 WhatsApp Setup (Optional - Advanced)

### WhatsApp Business API
1. Set up WhatsApp Business API account
2. Get access token and phone number ID
3. Add to environment variables:
   ```
   WHATSAPP_ACCESS_TOKEN=xxxxxxxxxx
   WHATSAPP_PHONE_NUMBER_ID=xxxxxxxxxx
   ```

## 🛠 Installation

### For Email only (Resend):
```bash
# No additional dependencies needed
```

### For Email only (SendGrid):
```bash
npm install @sendgrid/mail
```

### For SMS support:
```bash
npm install twilio
```

## 🔧 Environment Variables

Add these to your Vercel project settings or `.env.local`:

```env
# Email (choose one)
RESEND_API_KEY=re_xxxxxxxxxx
# OR
SENDGRID_API_KEY=SG.xxxxxxxxxx

# Required for email
FROM_EMAIL=noreply@yourdomain.com

# SMS (optional)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxx
TWILIO_PHONE_NUMBER=+1234567890

# WhatsApp (optional)
WHATSAPP_ACCESS_TOKEN=xxxxxxxxxx
WHATSAPP_PHONE_NUMBER_ID=xxxxxxxxxx

# Site URL for login links
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
```

## ✨ How It Works

### Company Admin Creation
When SuperAdmin creates a new company:
1. **Email**: Professional welcome email with login credentials
2. **SMS**: Text message with credentials (if phone provided)
3. **WhatsApp**: WhatsApp message with credentials (if phone provided)

### Employee Creation  
When Company Admin adds employees:
1. **Email**: Welcome email with login instructions
2. **SMS**: Text with credentials (if phone provided)
3. **Fallback**: Manual credential display if notifications fail

## 🎨 Email Template Features

- **Professional Design**: Gradient headers, clean layout
- **Mobile Responsive**: Looks great on all devices
- **Security Notices**: Reminds users to change passwords
- **Role-Specific Content**: Different content for admins vs employees
- **Login Button**: Direct link to login page

## 🔒 Security Features

- **Temporary Passwords**: Auto-generated secure passwords
- **Change Password Reminders**: Built into email templates
- **Fallback Messages**: Manual display if automated delivery fails
- **Multiple Delivery Methods**: Try email first, fallback to SMS

## 🚨 Troubleshooting

### Build Warnings
- Missing dependencies are normal if you don't use all features
- Only install dependencies for services you'll actually use

### Email Not Sending
1. Check API key is correct
2. Verify FROM_EMAIL is authorized in your email service
3. Check Vercel function logs for errors

### SMS Not Sending
1. Verify Twilio credentials
2. Check phone number format (+1234567890)
3. Ensure Twilio account has sufficient balance

## 📞 Recommended Setup

**For most users**: Start with **Resend** for email only
- Free tier is generous (3,000 emails/month)
- Easy setup, reliable delivery
- Professional appearance
- Add SMS later if needed

## 🎯 Testing

1. Create test company with your own email/phone
2. Check email delivery and formatting
3. Test SMS if configured
4. Verify fallback behavior if services are down