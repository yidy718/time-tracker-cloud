import React, { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView, StatusBar } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { supabase } from '../lib/supabase'

export default function AdminDashboard({ user, onLogout }) {
  const [stats, setStats] = useState({
    totalEmployees: 0,
    activeEmployees: 0,
    todayHours: 0,
    pendingTasks: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardStats()
  }, [])

  async function loadDashboardStats() {
    try {
      // Get admin's organization
      const { data: adminEmployee } = await supabase
        .from('employees')
        .select('organization_id, organization:organizations(name)')
        .eq('email', user.email)
        .single()

      if (adminEmployee) {
        const orgId = adminEmployee.organization_id

        // Get employee stats
        const { data: employees } = await supabase
          .from('employees')
          .select('id, is_active')
          .eq('organization_id', orgId)

        // Get today's time sessions
        const today = new Date().toISOString().split('T')[0]
        const { data: todaySessions } = await supabase
          .from('time_sessions')
          .select('clock_in, clock_out, employee:employees!inner(organization_id)')
          .eq('employee.organization_id', orgId)
          .gte('clock_in', today)
          .lt('clock_in', today + 'T23:59:59')

        // Calculate total hours
        let totalMinutes = 0
        todaySessions?.forEach(session => {
          if (session.clock_out) {
            const start = new Date(session.clock_in)
            const end = new Date(session.clock_out)
            totalMinutes += (end - start) / (1000 * 60)
          }
        })

        // Get pending tasks
        const { data: tasks } = await supabase
          .from('tasks')
          .select('id')
          .eq('organization_id', orgId)
          .in('status', ['not_started', 'in_progress'])

        setStats({
          totalEmployees: employees?.length || 0,
          activeEmployees: employees?.filter(e => e.is_active).length || 0,
          todayHours: Math.round(totalMinutes / 60 * 10) / 10,
          pendingTasks: tasks?.length || 0
        })
      }
    } catch (error) {
      console.error('Error loading dashboard stats:', error)
    }
    setLoading(false)
  }

  async function handleLogout() {
    try {
      await onLogout()
      Alert.alert('Success', 'Logged out successfully')
    } catch (error) {
      Alert.alert('Error', 'Failed to logout')
    }
  }

  return (
    <LinearGradient
      colors={['#0f172a', '#1e293b', '#0f172a']}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <LinearGradient
          colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.welcome}>👨‍💼 Admin Dashboard</Text>
              <Text style={styles.email}>{user.email}</Text>
              <Text style={styles.role}>Administrator</Text>
            </View>
            <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
              <LinearGradient
                colors={['#ef4444', '#dc2626']}
                style={styles.logoutGradient}
              >
                <Text style={styles.logoutText}>Logout</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <LinearGradient
            colors={['rgba(59, 130, 246, 0.2)', 'rgba(37, 99, 235, 0.1)']}
            style={styles.statCard}
          >
            <Text style={styles.statNumber}>{stats.totalEmployees}</Text>
            <Text style={styles.statLabel}>Total Employees</Text>
          </LinearGradient>

          <LinearGradient
            colors={['rgba(34, 197, 94, 0.2)', 'rgba(22, 163, 74, 0.1)']}
            style={styles.statCard}
          >
            <Text style={styles.statNumber}>{stats.activeEmployees}</Text>
            <Text style={styles.statLabel}>Active Today</Text>
          </LinearGradient>

          <LinearGradient
            colors={['rgba(168, 85, 247, 0.2)', 'rgba(147, 51, 234, 0.1)']}
            style={styles.statCard}
          >
            <Text style={styles.statNumber}>{stats.todayHours}h</Text>
            <Text style={styles.statLabel}>Hours Today</Text>
          </LinearGradient>

          <LinearGradient
            colors={['rgba(251, 191, 36, 0.2)', 'rgba(245, 158, 11, 0.1)']}
            style={styles.statCard}
          >
            <Text style={styles.statNumber}>{stats.pendingTasks}</Text>
            <Text style={styles.statLabel}>Pending Tasks</Text>
          </LinearGradient>
        </View>

        {/* Quick Actions */}
        <LinearGradient
          colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
          style={styles.actionsSection}
        >
          <Text style={styles.sectionTitle}>📋 Quick Actions</Text>
          
          <TouchableOpacity style={styles.actionButton}>
            <LinearGradient
              colors={['#3b82f6', '#2563eb']}
              style={styles.actionGradient}
            >
              <Text style={styles.actionText}>👥 Manage Employees</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <LinearGradient
              colors={['#10b981', '#059669']}
              style={styles.actionGradient}
            >
              <Text style={styles.actionText}>📊 View Reports</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <LinearGradient
              colors={['#8b5cf6', '#7c3aed']}
              style={styles.actionGradient}
            >
              <Text style={styles.actionText}>✅ Manage Tasks</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <LinearGradient
              colors={['#f59e0b', '#d97706']}
              style={styles.actionGradient}
            >
              <Text style={styles.actionText}>⚙️ Settings</Text>
            </LinearGradient>
          </TouchableOpacity>
        </LinearGradient>

        {/* Mobile Note */}
        <LinearGradient
          colors={['rgba(59, 130, 246, 0.15)', 'rgba(37, 99, 235, 0.1)']}
          style={styles.noteSection}
        >
          <Text style={styles.noteTitle}>📱 Mobile Admin View</Text>
          <Text style={styles.noteText}>This is a simplified admin dashboard for mobile. For full admin features, please use the web dashboard on your computer.</Text>
          <Text style={styles.noteText}>✅ View organization stats and employee activity</Text>
          <Text style={styles.noteText}>✅ Monitor real-time time tracking</Text>
          <Text style={styles.noteText}>✅ Quick access to essential admin functions</Text>
        </LinearGradient>
      </ScrollView>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  header: {
    marginTop: 50,
    marginBottom: 24,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 24,
  },
  welcome: {
    fontSize: 18,
    color: '#e2e8f0',
    fontWeight: '600',
  },
  email: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
    marginVertical: 4,
  },
  role: {
    fontSize: 14,
    color: '#cbd5e1',
    opacity: 0.9,
  },
  logoutButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  logoutGradient: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  logoutText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    width: '48%',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#e2e8f0',
    textAlign: 'center',
    fontWeight: '500',
  },
  actionsSection: {
    padding: 24,
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 20,
  },
  actionButton: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  actionGradient: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  noteSection: {
    padding: 24,
    borderRadius: 16,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  noteTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
  },
  noteText: {
    fontSize: 14,
    color: '#e2e8f0',
    marginBottom: 8,
    lineHeight: 20,
  },
})