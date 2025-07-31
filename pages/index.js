import { useState, useEffect, useCallback } from 'react'
import { supabase, auth, database } from '../lib/supabase'
import Auth from '../components/Auth'
import TimeTracker from '../components/TimeTracker'
import AdminDashboard from '../components/AdminDashboard'
import SuperAdminDashboard from '../components/SuperAdminDashboard'
import ManagerDashboard from '../components/ManagerDashboard'
import NonClockWorkerDashboard from '../components/NonClockWorkerDashboard'
import CompanySelectionModal from '../components/CompanySelectionModal'

export default function Home({ session }) {
  const [employee, setEmployee] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentSession, setCurrentSession] = useState(null)
  const [organizations, setOrganizations] = useState([])
  const [showCompanySelection, setShowCompanySelection] = useState(false)
  const [selectedCompany, setSelectedCompany] = useState(null)
  const [organization, setOrganization] = useState(null)

  const fetchEmployee = useCallback(async () => {
    try {
      // First try to find employee by user ID
      let { data, error } = await database.getCurrentEmployee(session.user.id)
      
      // If not found by ID, try by email (for admin users)
      if (!data && !error && session.user.email) {
        const emailResult = await database.getCurrentEmployeeByEmail(session.user.email)
        data = emailResult.data
        error = emailResult.error
        
        console.log('Email lookup result:', { data, error, email: session.user.email })
        
        // If still no employee record but this is a known admin email, create virtual user
        if (!data && !error) {
          if (session.user.email === 'yidy.brier@gmail.com') {
            data = {
              id: 'e15d225d-7ff1-4663-8b1d-3e0878bddb2f',
              email: session.user.email,
              first_name: 'Yidy',
              last_name: 'Brier',
              role: 'admin', // Company admin, not manager
              is_active: true,
              organization_id: '59590af0-3c38-403e-b4c9-ef4ba8db2a0b',
              organization: { name: 'VasHours' }
            }
          }
        }
      }
      
      // Ensure organization object exists to prevent undefined errors
      if (data && !data.organization && data.organization_id) {
        // Load organization details if missing
        const { data: orgData } = await database.getOrganization(data.organization_id)
        if (orgData) {
          data.organization = orgData
        }
      }
      
      if (error) {
        console.error('Error fetching employee:', error)
        setEmployee(null)
      } else {
        setEmployee(data)
      }
    } catch (error) {
      console.error('Error:', error)
      setEmployee(null)
    }
    setLoading(false)
  }, [session])

  const checkSession = useCallback(async () => {
    // Check for Supabase Auth session (admins)
    if (session?.user) {
      setCurrentSession(session)
      fetchEmployee()
      return
    }
    
    // Check for employee localStorage session
    const employeeSessionData = localStorage.getItem('employee_session')
    if (employeeSessionData) {
      try {
        const employeeSession = JSON.parse(employeeSessionData)
        
        // Check if this is enhanced authentication data with organizations
        if (employeeSession.employee && employeeSession.employee.organizations) {
          const orgs = employeeSession.employee.organizations
          setOrganizations(orgs)
          
          // Check for existing company selection
          const selectedCompanyData = localStorage.getItem('selected_company')
          if (selectedCompanyData) {
            const companySession = JSON.parse(selectedCompanyData)
            setSelectedCompany(companySession)
            setEmployee(companySession.employee)
            
            // Load organization details
            const { data: orgData } = await database.getOrganization(companySession.organization_id)
            setOrganization(orgData)
            
            setCurrentSession(employeeSession)
            setLoading(false)
            return
          }
          
          // If multiple companies, show selection modal
          if (orgs.length > 1) {
            setShowCompanySelection(true)
            setCurrentSession(employeeSession)
            setLoading(false)
            return
          }
          
          // If single company, auto-select
          if (orgs.length === 1) {
            const autoSelected = {
              organization_id: orgs[0].organization_id,
              organization_name: orgs[0].organization_name,
              role: orgs[0].role,
              employee: {
                ...employeeSession.employee,
                organization_id: orgs[0].organization_id,
                role: orgs[0].role
              }
            }
            
            localStorage.setItem('selected_company', JSON.stringify(autoSelected))
            setSelectedCompany(autoSelected)
            setEmployee(autoSelected.employee)
            
            // Load organization details
            const { data: orgData } = await database.getOrganization(orgs[0].organization_id)
            setOrganization(orgData)
          }
        } else {
          // Legacy employee session format - backwards compatibility
          setEmployee(employeeSession.employee)
          if (employeeSession.employee?.organization_id) {
            const { data: orgData } = await database.getOrganization(employeeSession.employee.organization_id)
            setOrganization(orgData)
          }
        }
        
        setCurrentSession(employeeSession)
        setLoading(false)
        return
      } catch (error) {
        console.error('Invalid employee session:', error)
        localStorage.removeItem('employee_session')
        localStorage.removeItem('selected_company')
      }
    }
    
    setLoading(false)
  }, [session, fetchEmployee])

  const handleCompanySelection = async (companySession) => {
    setSelectedCompany(companySession)
    setEmployee(companySession.employee)
    setShowCompanySelection(false)
    
    // Load organization details
    const { data: orgData } = await database.getOrganization(companySession.organization_id)
    setOrganization(orgData)
  }

  useEffect(() => {
    checkSession()
  }, [checkSession])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading...</p>
        </div>
      </div>
    )
  }

  if (!currentSession) {
    return <Auth />
  }

  // Show company selection modal if needed
  if (showCompanySelection && organizations.length > 1) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <CompanySelectionModal
          organizations={organizations}
          onSelect={handleCompanySelection}
          employee={currentSession.employee}
        />
      </div>
    )
  }

  if (!employee) {
    // If no employee record exists, show error message instead of signup form
    // All employees should be created by admins now
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="card-glass max-w-md w-full text-center">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-white mb-4">Access Not Found</h1>
          <p className="text-white/80 mb-6">
            Your account is not set up in our system. Please contact your administrator to create your employee account.
          </p>
          <button
            onClick={() => auth.signOut()}
            className="btn-primary w-full"
          >
            Sign Out
          </button>
        </div>
      </div>
    )
  }

  // Route based on user role and organization
  // Add safety check for employee data
  if (!employee || !employee.role) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="card-glass max-w-md w-full text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-white mb-4">Invalid Employee Data</h1>
          <p className="text-white/80 mb-6">
            There&apos;s an issue with your employee data. Please contact your administrator.
          </p>
          <button
            onClick={() => {
              localStorage.removeItem('employee_session')
              window.location.reload()
            }}
            className="btn-primary w-full"
          >
            Sign Out & Refresh
          </button>
        </div>
      </div>
    )
  }

  // Route based on user role with safety checks
  if (!employee || !employee.role) {
    console.error('Employee or role is missing:', employee)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Error: Invalid employee data</p>
          <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded">
            Reload
          </button>
        </div>
      </div>
    )
  }

  // Ensure organization exists or create default
  const safeOrganization = organization || employee.organization || { name: 'Default Organization' }

  if (employee.role === 'admin') {
    // Check if this is the PLATFORM super admin (yidy@pm.me - manages all companies)
    if (employee.id === '882247fb-71f2-4d1d-8cfd-f33d8c5a3b0f' || employee.email === 'yidy@pm.me') {
      return <SuperAdminDashboard session={currentSession} employee={employee} />
    }
    // Otherwise this is a COMPANY admin (manages their specific company only)
    return <AdminDashboard session={currentSession} employee={employee} organization={safeOrganization} />
  }
  
  if (employee.role === 'manager' || employee.role === 'secretary') {
    // Both manager and secretary get the same limited dashboard (reports + basic project view)
    return <ManagerDashboard session={currentSession} employee={employee} organization={safeOrganization} />
  }

  if (employee.role === 'non_clock_worker') {
    return <NonClockWorkerDashboard session={currentSession} employee={employee} organization={safeOrganization} />
  }

  // Default to TimeTracker for regular employees
  return <TimeTracker session={currentSession} employee={employee} organization={safeOrganization} />
}

