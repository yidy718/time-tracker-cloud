# Fix: Disable Email Confirmation for Employee Signups

## The Issue
When admins create employees, Supabase sends confirmation emails, but employees should be able to log in immediately with their temporary password.

## Solution
**In your Supabase Dashboard:**

1. Go to **Authentication > Settings**
2. Scroll down to **"Email Confirmations"**
3. **Turn OFF** "Enable email confirmations" 
4. Click **Save**

This will allow all new users (employees) to log in immediately without email confirmation.

## Alternative Solution (if you want to keep email confirmation for other signups)
Create a separate signup flow for employees that bypasses email confirmation by using a service role key, but this requires backend changes.

## After Making This Change
- Employees created by admins can log in immediately
- They'll see the TimeTracker interface (clock in/out) 
- No confirmation emails will be sent
- Password is: TempPass123\! (they should change it)
EOF < /dev/null