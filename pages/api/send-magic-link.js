// API endpoint for sending magic links (one-time login links) to users
// This is an alternative to password reset emails - users can log in directly without setting a password

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { email, redirectTo, linkType = 'magic_link' } = req.body

  if (!email) {
    return res.status(400).json({ error: 'Email is required' })
  }

  try {
    // Import Supabase
    const { createClient } = await import('@supabase/supabase-js')
    
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase configuration missing')
    }

    // Create Supabase client with service role key for admin operations
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    let result

    if (linkType === 'magic_link') {
      // Send magic link (one-time login link)
      result = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: email,
        options: {
          redirectTo: redirectTo || `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/`
        }
      })
    } else if (linkType === 'password_reset') {
      // Send password reset link
      result = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectTo || `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/reset-password`
      })
    } else {
      throw new Error('Invalid linkType. Use "magic_link" or "password_reset"')
    }

    if (result.error) {
      throw result.error
    }

    // For magic links, we get the actual link in the response
    const responseData = {
      success: true,
      message: linkType === 'magic_link' 
        ? 'Magic link generated successfully' 
        : 'Password reset email sent successfully',
      email: email,
      linkType: linkType
    }

    // If this is a magic link generation, include the link (for admin use)
    if (linkType === 'magic_link' && result.data?.properties?.action_link) {
      responseData.magicLink = result.data.properties.action_link
    }

    return res.status(200).json(responseData)

  } catch (error) {
    console.error('Magic link/password reset error:', error)
    
    // Provide specific error messages
    let errorMessage = 'Failed to send link'
    
    if (error.message.includes('rate limit') || error.message.includes('too many requests')) {
      errorMessage = 'Rate limit reached. Please wait a few minutes before trying again.'
    } else if (error.message.includes('user not found') || error.message.includes('email not found')) {
      errorMessage = 'Email address not found in the system.'
    } else if (error.message.includes('email not confirmed')) {
      errorMessage = 'Email address is not confirmed.'
    }
    
    return res.status(500).json({ 
      error: errorMessage,
      details: error.message 
    })
  }
}

/* 
Usage Examples:

// Send magic link (one-time login)
POST /api/send-magic-link
{
  "email": "user@example.com",
  "linkType": "magic_link",
  "redirectTo": "https://yourapp.com/dashboard"
}

// Send password reset link
POST /api/send-magic-link  
{
  "email": "user@example.com", 
  "linkType": "password_reset",
  "redirectTo": "https://yourapp.com/reset-password"
}

Response:
{
  "success": true,
  "message": "Magic link generated successfully",
  "email": "user@example.com", 
  "linkType": "magic_link",
  "magicLink": "https://..." // Only for magic_link type
}
*/