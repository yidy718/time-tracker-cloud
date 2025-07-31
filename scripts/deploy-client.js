#!/usr/bin/env node

// Script to deploy customized versions for different clients
const fs = require('fs')
const path = require('path')

const clients = {
  'company-a': {
    name: 'Acme Corporation',
    supabaseUrl: 'https://client-a-project.supabase.co',
    supabaseKey: 'client-a-anon-key',
    colors: {
      primary: '#1e40af',
      secondary: '#3b82f6'
    },
    features: {
      payroll: true,
      multiLocation: true,
      reports: true,
      mobileApp: true
    },
    vercelProject: 'acme-time-tracker'
  },
  'company-b': {
    name: 'Tech Startup Inc',
    supabaseUrl: 'https://client-b-project.supabase.co', 
    supabaseKey: 'client-b-anon-key',
    colors: {
      primary: '#059669',
      secondary: '#10b981'
    },
    features: {
      payroll: false,
      multiLocation: false,
      reports: true,
      mobileApp: true
    },
    vercelProject: 'techstartup-timetracker'
  }
}

function generateEnvFile(clientId) {
  const client = clients[clientId]
  if (!client) {
    console.error(`Client ${clientId} not found`)
    return
  }

  const envContent = `# ${client.name} - Time Tracker Configuration
NEXT_PUBLIC_SUPABASE_URL=${client.supabaseUrl}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${client.supabaseKey}

# Branding
NEXT_PUBLIC_COMPANY_NAME="${client.name}"
NEXT_PUBLIC_PRIMARY_COLOR=${client.colors.primary}
NEXT_PUBLIC_SECONDARY_COLOR=${client.colors.secondary}

# Features  
NEXT_PUBLIC_ENABLE_PAYROLL=${client.features.payroll}
NEXT_PUBLIC_ENABLE_MULTI_LOCATION=${client.features.multiLocation}
NEXT_PUBLIC_ENABLE_REPORTS=${client.features.reports}
NEXT_PUBLIC_ENABLE_MOBILE_APP=${client.features.mobileApp}

# Deployment
NEXT_PUBLIC_CLIENT_ID=${clientId}
NEXT_PUBLIC_DEPLOYMENT_NAME=${client.vercelProject}
`

  fs.writeFileSync(`.env.${clientId}`, envContent)
  console.log(`✅ Generated .env.${clientId}`)
}

function deployToVercel(clientId) {
  const client = clients[clientId]
  const { spawn } = require('child_process')
  
  console.log(`🚀 Deploying ${client.name} to Vercel...`)
  
  const deploy = spawn('vercel', [
    '--prod',
    '--env-file', `.env.${clientId}`,
    '--name', client.vercelProject
  ], { stdio: 'inherit' })
  
  deploy.on('close', (code) => {
    if (code === 0) {
      console.log(`✅ ${client.name} deployed successfully!`)
    } else {
      console.error(`❌ Deployment failed for ${client.name}`)
    }
  })
}

// CLI Usage
const [,, command, clientId] = process.argv

if (command === 'generate-env' && clientId) {
  generateEnvFile(clientId)
} else if (command === 'deploy' && clientId) {
  generateEnvFile(clientId)
  deployToVercel(clientId)
} else if (command === 'list') {
  console.log('Available clients:')
  Object.keys(clients).forEach(id => {
    console.log(`  ${id}: ${clients[id].name}`)
  })
} else {
  console.log(`
Usage:
  node scripts/deploy-client.js generate-env <client-id>
  node scripts/deploy-client.js deploy <client-id>  
  node scripts/deploy-client.js list

Examples:
  node scripts/deploy-client.js generate-env company-a
  node scripts/deploy-client.js deploy company-b
  `)
}