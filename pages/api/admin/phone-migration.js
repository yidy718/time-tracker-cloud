import { adminDatabase } from '../../../lib/supabase-admin-simple'

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { action, employeeId, phone } = req.body

    switch (action) {
      case 'analyze':
        const analysisResult = await adminDatabase.getAllEmployeesWithPhoneAnalysis()
        return res.status(200).json(analysisResult)

      case 'migrate':
        const migrationResult = await adminDatabase.migratePhoneNumbers()
        return res.status(200).json(migrationResult)

      case 'clean':
        const cleanResult = await adminDatabase.cleanPhoneNumbers()
        return res.status(200).json(cleanResult)

      case 'update-phone':
        if (!employeeId || !phone) {
          return res.status(400).json({ error: 'Missing employeeId or phone' })
        }
        const updateResult = await adminDatabase.updateEmployeePhone(employeeId, phone)
        return res.status(200).json(updateResult)

      default:
        return res.status(400).json({ error: 'Invalid action' })
    }
  } catch (error) {
    console.error('Phone migration API error:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    })
  }
}