# SMS Authentication Setup Guide

This guide will help you configure SMS authentication for your Time Tracker application using Supabase and Twilio.

## Prerequisites

1. Supabase project (you already have this)
2. Twilio account with SMS capabilities
3. Admin access to Supabase dashboard

## Step 1: Database Setup

1. **Run the database migration**:
   - Open Supabase dashboard → SQL Editor
   - Copy and paste the content from `add-phone-to-employees.sql`
   - Execute the query

2. **Verify the migration**:
   ```sql
   -- Check if phone column was added
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'employees' AND column_name = 'phone';
   
   -- Check employees without phone numbers
   SELECT * FROM employees_without_phone;
   ```

## Step 2: Configure Supabase Phone Authentication

1. **Enable Phone Authentication**:
   - Go to Supabase Dashboard → Authentication → Settings
   - Enable "Enable phone auth"
   - Save changes

2. **Configure SMS Provider (Twilio)**:
   
   ### Option A: Twilio (Recommended)
   - Go to Authentication → Settings → SMS Auth Settings
   - Choose "Twilio" as SMS provider
   - Add your Twilio credentials:
     - **Account SID**: Your Twilio Account SID
     - **Auth Token**: Your Twilio Auth Token  
     - **From Number**: Your Twilio phone number (e.g., +15551234567)
   
   ### Option B: Twilio Verify (More Advanced)
   - Use Twilio Verify service ID instead of basic SMS
   - Better for production with advanced verification features

3. **Configure SMS Template**:
   ```
   Your verification code is: {{ .Code }}
   Valid for 5 minutes.
   ```

## Step 3: Environment Variables

Add these to your `.env.local` file:

```bash
# Existing Supabase variables
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Optional: For direct Twilio integration (if needed)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number
```

## Step 4: Add Employee Phone Numbers

1. **Using the Admin Dashboard**:
   - Login as admin
   - Go to "SMS Setup" tab
   - Add phone numbers for each employee
   - Phone numbers must be in E.164 format (e.g., +15551234567)

2. **Using SQL (Bulk Update)**:
   ```sql
   -- Update individual employees
   UPDATE employees 
   SET phone = '+15551234567' 
   WHERE email = 'employee@company.com';
   
   -- Or use the helper function
   SELECT admin_update_employee_phone(
     'employee-uuid-here'::uuid, 
     '555-123-4567'
   );
   ```

## Step 5: Test SMS Authentication

1. **Test the SMS flow**:
   - Go to login page
   - Click "SMS/Link" tab
   - Enter a phone number that exists in employees table
   - Check that SMS is received
   - Enter the 6-digit code
   - Verify successful login

2. **Test Magic Link flow**:
   - Click "Magic Link" option
   - Enter email address
   - Check email for magic link
   - Click link to login

## Step 6: Production Configuration

### Twilio Setup for Production

1. **Twilio Account**:
   - Upgrade to paid account for production use
   - Purchase a dedicated phone number
   - Configure webhooks if needed

2. **Rate Limiting**:
   - Supabase includes built-in rate limiting
   - Consider additional rate limiting at application level

3. **Monitoring**:
   - Monitor SMS delivery rates
   - Set up alerts for failed SMS deliveries
   - Track authentication metrics

### Security Considerations

1. **Phone Number Validation**:
   - Validate phone numbers server-side
   - Use E.164 format consistently
   - Consider phone number verification before adding to employee records

2. **Rate Limiting**:
   - Limit SMS requests per phone number
   - Implement exponential backoff for failed attempts
   - Monitor for abuse patterns

3. **Error Handling**:
   - Graceful fallback to email/username authentication
   - Clear error messages for users
   - Logging for troubleshooting

## Troubleshooting

### Common Issues

1. **SMS not received**:
   - Check phone number format (must include country code)
   - Verify Twilio credentials
   - Check Twilio console for delivery status
   - Ensure phone number is not blocked

2. **Invalid phone number error**:
   - Phone numbers must be in E.164 format (+15551234567)
   - Use the `format_phone_number()` helper function
   - Remove any spaces, dashes, or parentheses

3. **Employee not found error**:
   - Ensure employee record exists with correct phone number
   - Check that employee is active (`is_active = true`)
   - Verify organization_id matches

4. **Supabase Auth errors**:
   - Check Supabase project settings
   - Verify phone auth is enabled
   - Check SMS provider configuration

### Testing Commands

```sql
-- Check SMS setup status
SELECT 
  COUNT(*) as total_employees,
  COUNT(phone) as employees_with_phone,
  COUNT(*) - COUNT(phone) as missing_phone_numbers
FROM employees 
WHERE is_active = true;

-- Test phone number formatting
SELECT format_phone_number('555-123-4567', '+1');

-- View employees needing phone numbers
SELECT first_name, last_name, email, phone 
FROM employees 
WHERE phone IS NULL AND is_active = true;
```

## Features Included

### SMS Authentication
- ✅ Send SMS OTP to employee phone numbers
- ✅ Verify 6-digit codes
- ✅ Link SMS auth to existing employee records
- ✅ Phone number formatting and validation
- ✅ Integration with existing employee authentication

### Magic Link Authentication  
- ✅ Send magic links to employee email addresses
- ✅ Email-based passwordless authentication
- ✅ Integration with existing employee records
- ✅ Fallback option when SMS fails

### Admin Management
- ✅ Phone number management interface
- ✅ Bulk phone number updates
- ✅ Employee SMS status tracking
- ✅ Helper functions for phone formatting

### Mobile Optimization
- ✅ Mobile-friendly SMS input
- ✅ Touch-optimized OTP entry
- ✅ Responsive design for all screen sizes
- ✅ Progressive Web App compatible

## Next Steps

1. **Run database migration**: Execute `add-phone-to-employees.sql`
2. **Configure Supabase**: Enable phone auth and add Twilio credentials
3. **Add phone numbers**: Use admin dashboard to add employee phone numbers
4. **Test authentication**: Try SMS and magic link flows
5. **Deploy to production**: Update environment variables and test

## Support

- **Supabase Docs**: https://supabase.com/docs/guides/auth/phone-login
- **Twilio Docs**: https://www.twilio.com/docs/verify/api
- **E.164 Format**: https://en.wikipedia.org/wiki/E.164

For issues specific to this implementation, check the console logs and Supabase dashboard for detailed error messages.