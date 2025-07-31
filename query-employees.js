#!/usr/bin/env node

// Query all employees and their company assignments
// Run with: node query-employees.js

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing environment variables. Please set:')
  console.error('- NEXT_PUBLIC_SUPABASE_URL')
  console.error('- SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function queryEmployees() {
  console.log('🔍 Querying all employees and their company assignments...\n')
  
  try {
    // Query all employees with their organization details
    const { data: employees, error } = await supabase
      .from('employees')
      .select(`
        id,
        employee_id,
        first_name,
        last_name,
        email,
        username,
        role,
        is_active,
        hourly_rate,
        phone,
        hire_date,
        organizations!inner(
          id,
          name
        )
      `)
      .order('first_name')

    if (error) {
      console.error('❌ Error querying employees:', error)
      return
    }

    console.log(`📊 Found ${employees.length} employees across all companies:\n`)
    
    // Group employees by organization
    const employeesByOrg = employees.reduce((acc, emp) => {
      const orgName = emp.organizations.name
      if (!acc[orgName]) {
        acc[orgName] = []
      }
      acc[orgName].push(emp)
      return acc
    }, {})

    // Display results organized by company
    Object.entries(employeesByOrg).forEach(([orgName, orgEmployees]) => {
      console.log(`🏢 ${orgName} (${orgEmployees.length} employees):`)
      orgEmployees.forEach(emp => {
        const status = emp.is_active ? '✅' : '❌'
        const rate = emp.hourly_rate ? `$${emp.hourly_rate}/hr` : 'No rate'
        console.log(`   ${status} ${emp.first_name} ${emp.last_name} (${emp.role})`)
        console.log(`      Username: ${emp.username || 'N/A'} | Email: ${emp.email || 'N/A'}`)
        console.log(`      Rate: ${rate} | ID: ${emp.employee_id || emp.id}`)
        console.log('')
      })
      console.log('')
    })

    // Summary statistics
    const activeCount = employees.filter(emp => emp.is_active).length
    const inactiveCount = employees.length - activeCount
    const roles = employees.reduce((acc, emp) => {
      acc[emp.role] = (acc[emp.role] || 0) + 1
      return acc
    }, {})

    console.log('📈 Summary Statistics:')
    console.log(`   Total Employees: ${employees.length}`)
    console.log(`   Active: ${activeCount}`)
    console.log(`   Inactive: ${inactiveCount}`)
    console.log(`   Companies: ${Object.keys(employeesByOrg).length}`)
    console.log('\n👥 Role Distribution:')
    Object.entries(roles).forEach(([role, count]) => {
      console.log(`   ${role}: ${count}`)
    })

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

// Run the query
queryEmployees()