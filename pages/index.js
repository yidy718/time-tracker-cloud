import { useState, useEffect, useCallback } from 'react'
import { supabase, auth, database } from '../lib/supabase'
import Auth from '../components/Auth'
import TimeTracker from '../components/TimeTracker'
import AdminDashboard from '../components/AdminDashboard'
import SuperAdminDashboard from '../components/SuperAdminDashboard'

export default function Home({ session }) {
  const [employee, setEmployee] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentSession, setCurrentSession] = useState(null)

  const fetchEmployee = useCallback(async () => {
    try {
      const { data, error } = await database.getCurrentEmployee(session.user.id)
      
      if (error) {
        console.error('Error fetching employee:', error)
        setEmployee(null) // User needs setup
      } else {
        setEmployee(data) // Employee found
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
        setCurrentSession(employeeSession)
        setEmployee(employeeSession.employee)
        setLoading(false)
        return
      } catch (error) {
        console.error('Invalid employee session:', error)
        localStorage.removeItem('employee_session')
      }
    }
    
    setLoading(false)
  }, [session, fetchEmployee])

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
  if (employee.role === 'admin') {
    // Check if this is the super admin (specific user ID or super admin org)
    if (employee.id === '882247fb-71f2-4d1d-8cfd-f33d8c5a3b0f' || 
        (employee.organization && employee.organization.name && 
         employee.organization.name.toLowerCase().includes('super admin'))) {
      return <SuperAdminDashboard session={currentSession} employee={employee} />
    }
    return <AdminDashboard session={currentSession} employee={employee} />
  }
  
  if (employee.role === 'manager') {
    return <AdminDashboard session={currentSession} employee={employee} />
  }

  return <TimeTracker session={currentSession} employee={employee} />
}

