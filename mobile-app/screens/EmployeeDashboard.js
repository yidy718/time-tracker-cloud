import React, { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView, Modal, FlatList, StatusBar } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { LinearGradient } from 'expo-linear-gradient'
import { supabase } from '../lib/supabase'

export default function EmployeeDashboard({ employee, onLogout }) {
  const [currentSession, setCurrentSession] = useState(null)
  const [isClockIn, setIsClockIn] = useState(true)
  const [isOnBreak, setIsOnBreak] = useState(false)
  const [loading, setLoading] = useState(false)
  const [projects, setProjects] = useState([])
  const [selectedProject, setSelectedProject] = useState(null)
  const [showProjectModal, setShowProjectModal] = useState(false)

  useEffect(() => {
    checkActiveSession()
    loadProjects()
  }, [])

  async function loadProjects() {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, project_name, client_name, is_active')
        .eq('organization_id', employee.organization_id)
        .eq('is_active', true)
        .order('project_name')

      if (error) throw error
      setProjects(data || [])
      
      // Auto-select first project if only one available
      if (data && data.length === 1) {
        setSelectedProject(data[0])
      }
    } catch (error) {
      console.error('Error loading projects:', error)
      // Continue without projects - allow basic clock in
    }
  }

  async function checkActiveSession() {
    try {
      const { data, error } = await supabase
        .from('time_sessions')
        .select('*')
        .eq('employee_id', employee.id)
        .is('clock_out', null)
        .single()

      if (data && !error) {
        setCurrentSession(data)
        setIsClockIn(false)
        setIsOnBreak(data.break_start && !data.break_end)
      }
    } catch (error) {
      // No active session found
      console.log('No active session')
    }
  }

  async function handleClockIn() {
    // Show project selection if multiple projects available
    if (projects.length > 1 && !selectedProject) {
      setShowProjectModal(true)
      return
    }

    setLoading(true)
    try {
      const sessionData = {
        employee_id: employee.id,
        clock_in: new Date().toISOString(),
        notes: 'Clocked in via mobile app'
      }

      // Add project_id if a project is selected
      if (selectedProject) {
        sessionData.project_id = selectedProject.id
      }

      const { data, error } = await supabase
        .from('time_sessions')
        .insert([sessionData])
        .select()
        .single()

      if (error) throw error

      setCurrentSession(data)
      setIsClockIn(false)
      const projectMsg = selectedProject ? ` on ${selectedProject.project_name}` : ''
      Alert.alert('Success', `Clocked in successfully${projectMsg}!`)
    } catch (error) {
      console.error('Clock in error:', error)
      Alert.alert('Error', error.message || 'Failed to clock in')
    }
    setLoading(false)
  }

  async function handleClockOut() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('time_sessions')
        .update({
          clock_out: new Date().toISOString(),
          break_end: isOnBreak ? new Date().toISOString() : null
        })
        .eq('id', currentSession.id)
        .select()
        .single()

      if (error) throw error

      setCurrentSession(null)
      setIsClockIn(true)
      setIsOnBreak(false)
      Alert.alert('Success', 'Clocked out successfully!')
    } catch (error) {
      Alert.alert('Error', error.message)
    }
    setLoading(false)
  }

  async function handleBreak() {
    setLoading(true)
    try {
      const updateData = isOnBreak
        ? { break_end: new Date().toISOString() }
        : { break_start: new Date().toISOString() }

      const { data, error } = await supabase
        .from('time_sessions')
        .update(updateData)
        .eq('id', currentSession.id)
        .select()
        .single()

      if (error) throw error

      setCurrentSession(data)
      setIsOnBreak(!isOnBreak)
      Alert.alert('Success', isOnBreak ? 'Break ended!' : 'Break started!')
    } catch (error) {
      Alert.alert('Error', error.message)
    }
    setLoading(false)
  }

  async function handleLogout() {
    try {
      await AsyncStorage.removeItem('employee_session')
      onLogout()
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
              <Text style={styles.welcome}>⏰ Welcome back!</Text>
              <Text style={styles.name}>{employee.first_name} {employee.last_name}</Text>
              <Text style={styles.role}>
                {employee.role} • {employee.organization?.name || 'Organization'}
              </Text>
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

        {/* Current Time */}
        <LinearGradient
          colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.05)']}
          style={styles.timeSection}
        >
          <Text style={styles.timeText}>
            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
          <Text style={styles.dateText}>
            {new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
          </Text>
        </LinearGradient>

        {/* Clock Status */}
        {currentSession && (
          <LinearGradient
            colors={isOnBreak ? ['rgba(251, 191, 36, 0.2)', 'rgba(245, 158, 11, 0.1)'] : ['rgba(34, 197, 94, 0.2)', 'rgba(22, 163, 74, 0.1)']}
            style={styles.statusSection}
          >
            <View style={styles.statusHeader}>
              <Text style={styles.statusTitle}>
                {isOnBreak ? '🟡 On Break' : '🟢 Active Session'}
              </Text>
            </View>
            <Text style={styles.statusText}>
              Clocked in: {new Date(currentSession.clock_in).toLocaleTimeString()}
            </Text>
            {currentSession.break_start && (
              <Text style={styles.statusText}>
                Break started: {new Date(currentSession.break_start).toLocaleTimeString()}
              </Text>
            )}
            {selectedProject && (
              <Text style={styles.statusText}>
                Project: {selectedProject.project_name}
              </Text>
            )}
          </LinearGradient>
        )}

        {/* Project Selection */}
        {isClockIn && projects.length > 0 && (
          <LinearGradient
            colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
            style={styles.projectSection}
          >
            <Text style={styles.projectTitle}>📁 Select Project</Text>
            <TouchableOpacity 
              style={styles.projectSelector}
              onPress={() => setShowProjectModal(true)}
            >
              <LinearGradient
                colors={['rgba(59, 130, 246, 0.3)', 'rgba(37, 99, 235, 0.2)']}
                style={styles.projectSelectorGradient}
              >
                <Text style={styles.projectSelectorText}>
                  {selectedProject ? 
                    `${selectedProject.project_name} • ${selectedProject.client_name}` : 
                    'Tap to select a project...'
                  }
                </Text>
                <Text style={styles.projectArrow}>▼</Text>
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        )}

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          {isClockIn ? (
            <TouchableOpacity 
              style={styles.actionButton} 
              onPress={handleClockIn}
              disabled={loading}
            >
              <LinearGradient
                colors={['#10b981', '#059669']}
                style={styles.buttonGradient}
              >
                <Text style={styles.buttonText}>
                  {loading ? '⏳ Clocking In...' : '🟢 Clock In'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity 
                style={styles.actionButton} 
                onPress={handleClockOut}
                disabled={loading}
              >
                <LinearGradient
                  colors={['#ef4444', '#dc2626']}
                  style={styles.buttonGradient}
                >
                  <Text style={styles.buttonText}>
                    {loading ? '⏳ Clocking Out...' : '🔴 Clock Out'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.actionButton} 
                onPress={handleBreak}
                disabled={loading}
              >
                <LinearGradient
                  colors={isOnBreak ? ['#10b981', '#059669'] : ['#f59e0b', '#d97706']}
                  style={styles.buttonGradient}
                >
                  <Text style={styles.buttonText}>
                    {loading ? '⏳ Processing...' : (isOnBreak ? '🟢 End Break' : '🟡 Start Break')}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Features Section */}
        <LinearGradient
          colors={['rgba(34, 197, 94, 0.15)', 'rgba(22, 163, 74, 0.1)']}
          style={styles.featuresSection}
        >
          <Text style={styles.featuresTitle}>📱 Mobile Features</Text>
          <Text style={styles.featureText}>✅ Smart time tracking with project selection</Text>
          <Text style={styles.featureText}>✅ Break management and session monitoring</Text>
          <Text style={styles.featureText}>✅ Push notifications for tasks & updates</Text>
          <Text style={styles.featureText}>✅ Secure mobile authentication</Text>
          <Text style={styles.featureText}>✅ Real-time sync with web dashboard</Text>
        </LinearGradient>
      </ScrollView>

      {/* Project Selection Modal */}
      <Modal
        visible={showProjectModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowProjectModal(false)}
      >
        <View style={styles.modalOverlay}>
          <LinearGradient
            colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.9)']}
            style={styles.modalContent}
          >
            <Text style={styles.modalTitle}>📁 Select Project</Text>
            <FlatList
              data={projects}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.projectItem}
                  onPress={() => {
                    setSelectedProject(item)
                    setShowProjectModal(false)
                  }}
                >
                  <LinearGradient
                    colors={['rgba(59, 130, 246, 0.1)', 'rgba(37, 99, 235, 0.05)']}
                    style={styles.projectItemGradient}
                  >
                    <Text style={styles.projectItemName}>{item.project_name}</Text>
                    <Text style={styles.projectItemClient}>{item.client_name}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowProjectModal(false)}
            >
              <LinearGradient
                colors={['#64748b', '#475569']}
                style={styles.modalCloseGradient}
              >
                <Text style={styles.modalCloseText}>Cancel</Text>
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </Modal>
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
    marginBottom: 20,
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
    fontSize: 16,
    color: '#e2e8f0',
    fontWeight: '500',
  },
  name: {
    fontSize: 26,
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
  timeSection: {
    alignItems: 'center',
    marginBottom: 24,
    padding: 32,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  timeText: {
    fontSize: 56,
    fontWeight: 'bold',
    color: '#ffffff',
    fontFamily: 'System',
    letterSpacing: 2,
  },
  dateText: {
    fontSize: 18,
    color: '#e2e8f0',
    marginTop: 8,
    fontWeight: '500',
  },
  statusSection: {
    marginBottom: 24,
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  statusHeader: {
    marginBottom: 12,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  statusText: {
    fontSize: 16,
    color: '#e2e8f0',
    marginBottom: 6,
    lineHeight: 22,
  },
  actionSection: {
    marginBottom: 24,
    gap: 16,
  },
  actionButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  buttonGradient: {
    paddingVertical: 20,
    paddingHorizontal: 32,
    alignItems: 'center',
    borderRadius: 16,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  featuresSection: {
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
  featuresTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
  },
  featureText: {
    fontSize: 16,
    color: '#e2e8f0',
    marginBottom: 8,
    lineHeight: 24,
  },
  projectSection: {
    marginBottom: 24,
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  projectTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
  },
  projectSelector: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  projectSelectorGradient: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    borderRadius: 12,
  },
  projectSelectorText: {
    fontSize: 16,
    color: '#ffffff',
    flex: 1,
    fontWeight: '500',
  },
  projectArrow: {
    fontSize: 16,
    color: '#e2e8f0',
    marginLeft: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 24,
    padding: 32,
    maxHeight: '80%',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 24,
    textAlign: 'center',
  },
  projectItem: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  projectItemGradient: {
    padding: 20,
    borderRadius: 12,
  },
  projectItemName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 6,
  },
  projectItemClient: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },
  modalCloseButton: {
    marginTop: 24,
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalCloseGradient: {
    padding: 18,
    alignItems: 'center',
    borderRadius: 12,
  },
  modalCloseText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
})