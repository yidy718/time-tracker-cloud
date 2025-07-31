# 🔐 Password Reset & Magic Link Guide for Admins

## Overview
The Time Tracker now provides multiple ways for admins to help users access their accounts without manually sharing passwords. This guide covers all available options and when to use each one.

## 🎯 Available Features

### 1. **SuperAdmin → Company Admin Reset** ✅ READY
- **Location**: SuperAdmin Dashboard → Company Management
- **How**: Click "📧 Send Password Reset" button for any company
- **What happens**: Company admin receives secure email link to set new password
- **When to use**: When company admin forgot their password or needs to change it

### 2. **Company Admin → Employee Reset** ✅ NEW!
- **Location**: Admin Dashboard → Employees Tab  
- **How**: Click "📧 Email Reset" button next to any employee
- **What happens**: Employee receives secure email link to set new password
- **When to use**: When employee forgot password or needs secure password change

### 3. **Manual Password Reset** ✅ EXISTING
- **Location**: Both SuperAdmin and Admin dashboards
- **How**: Click "🔄 Reset" button and enter new password
- **What happens**: Instantly sets new password, shows credentials to admin
- **When to use**: When email reset isn't working or employee has no email

### 4. **Magic Link API** ✅ NEW! (Advanced)
- **Location**: Custom API endpoint `/api/send-magic-link`
- **How**: Direct API calls for integration
- **What happens**: Generates one-time login links
- **When to use**: Custom integrations or bulk operations

## 🚀 How to Use Each Feature

### SuperAdmin Password Reset
```
1. Go to SuperAdmin Dashboard
2. Find the company with the admin who needs password reset
3. Click "📧 Send Password Reset" 
4. Admin receives email with secure link
5. They click link and set new password
6. Done! ✅
```

### Company Admin Employee Reset  
```
1. Go to Admin Dashboard → Employees tab
2. Find the employee who needs password reset
3. Click "📧 Email Reset" next to their name
4. Confirm sending email to their address
5. Employee receives email with secure link
6. They click link and set new password  
7. Done! ✅
```

### Manual Password Reset (Backup Option)
```
1. Find employee in dashboard
2. Click "🔄 Reset" button  
3. Enter new password (e.g., "temp123")
4. Share new password with employee securely
5. Tell them to change it after first login
6. Done! ✅
```

## 📧 What Users Receive

### Password Reset Email
- **Subject**: "Reset your password"
- **Contents**: Secure link valid for 1 hour
- **Action**: Click link → Set new password → Login automatically
- **Security**: Link expires after use or 1 hour

### Magic Link Email (if implemented)
- **Subject**: "Your login link"  
- **Contents**: One-time login link
- **Action**: Click link → Login directly (no password needed)
- **Security**: Link expires after single use or 1 hour

## ⚠️ Error Handling & Troubleshooting

### Common Error Messages

#### "Email address not found in authentication system"
- **Cause**: Employee doesn't have proper email authentication set up
- **Solution**: Use manual "🔄 Reset" button instead
- **Prevention**: Ensure new employees are created with valid email addresses

#### "Rate limit reached"
- **Cause**: Too many password reset emails sent too quickly
- **Solution**: Wait 5-10 minutes, then try again
- **Alternative**: Use manual "🔄 Reset" button

#### "Email address is not confirmed"  
- **Cause**: Employee hasn't confirmed their email address yet
- **Solution**: Use manual "🔄 Reset" button
- **Prevention**: Ensure employees confirm emails when first created

### Fallback Options
1. **Primary**: Email reset link (secure, professional)
2. **Backup**: Manual password reset (immediate, works always)
3. **Alternative**: Ask employee to use "Forgot Password" on login page

## 🛡️ Security Features

### Email Reset Links
- ✅ Expire after 1 hour
- ✅ Single-use only
- ✅ Encrypted and signed by Supabase
- ✅ Redirect to secure password reset page
- ✅ Require email confirmation

### Manual Resets  
- ✅ Admin-only access
- ✅ Logged in admin audit trail
- ✅ Encourage password change on first login
- ✅ No links or emails (for air-gapped environments)

## 📱 Best Practices

### For SuperAdmins
1. **Prefer email resets** for company admins (more professional)
2. **Use manual reset** only when email fails or is urgent
3. **Document password resets** in your admin notes
4. **Verify company admin email addresses** are current

### For Company Admins  
1. **Use email reset first** - it's more secure and professional
2. **Check spam folders** if employee doesn't receive email
3. **Keep employee email addresses updated** in their profiles
4. **Use manual reset for urgent situations** or employees without email

### For All Admins
1. **Always tell users to change passwords** after manual resets
2. **Verify email addresses** before sending reset links  
3. **Wait 10 minutes** if you hit rate limits
4. **Use manual reset as backup** when email fails

## 🔧 Technical Details

### Password Reset Flow
```
1. Admin clicks "📧 Email Reset"
2. System calls supabase.auth.resetPasswordForEmail()
3. Supabase sends branded email with secure link
4. User clicks link → redirected to /reset-password page
5. User enters new password → saved securely
6. User automatically logged in
```

### Security Standards
- **Encryption**: All links use Supabase's military-grade encryption
- **Expiration**: Links expire after 1 hour or single use
- **Audit Trail**: All password changes logged in Supabase
- **Rate Limiting**: Built-in protection against abuse

## 🎉 Benefits

### For Admins
- ✅ No more sharing passwords manually  
- ✅ More professional user experience
- ✅ Better security (encrypted links)
- ✅ Automatic audit trail
- ✅ Fallback options always available

### For Users
- ✅ Secure password reset process
- ✅ Professional branded emails  
- ✅ Easy-to-use reset interface
- ✅ Automatic login after reset
- ✅ No need to remember temporary passwords

## 📞 Support

If you encounter issues:
1. **Try manual reset first** (always works)
2. **Check error messages** for specific guidance
3. **Wait 10 minutes** if rate-limited
4. **Verify email addresses** are correct and confirmed
5. **Contact support** with specific error messages if needed

---

**Status**: ✅ READY TO USE
**Last Updated**: January 2025  
**Version**: 1.0

All password reset features are now live and ready for production use!