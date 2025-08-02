import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Image,
  Dimensions,
  SafeAreaView,
  Platform,
} from 'react-native'
import { supabase } from '../lib/supabase'

const { width, height } = Dimensions.get('window')

export default function AuthApprovalScreen({ route, navigation }) {
  const { authRequestId, deviceInfo, location } = route?.params || {}
  const [loading, setLoading] = useState(false)
  const [requestData, setRequestData] = useState(null)

  useEffect(() => {
    loadAuthRequest()
  }, [authRequestId])

  const loadAuthRequest = async () => {
    try {
      if (!authRequestId) return

      // Load auth request details from database
      const { data, error } = await supabase
        .from('auth_requests')
        .select('*')
        .eq('id', authRequestId)
        .single()

      if (error) throw error
      
      setRequestData(data)
    } catch (error) {
      console.error('Error loading auth request:', error)
      Alert.alert('Error', 'Could not load authentication request')
    }
  }

  const handleApprove = async () => {
    setLoading(true)
    try {
      // Update auth request status to approved
      const { error } = await supabase
        .from('auth_requests')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          device_info: {
            platform: Platform.OS,
            version: Platform.Version,
            timestamp: Date.now()
          }
        })
        .eq('id', authRequestId)

      if (error) throw error

      Alert.alert(
        '✅ Authentication Approved',
        'The login request has been approved. You can now access your account on the other device.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      )
    } catch (error) {
      console.error('Error approving auth request:', error)
      Alert.alert('Error', 'Could not approve authentication request')
    }
    setLoading(false)
  }

  const handleDeny = async () => {
    Alert.alert(
      '🚫 Deny Authentication',
      'Are you sure you want to deny this login request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deny',
          style: 'destructive',
          onPress: async () => {
            setLoading(true)
            try {
              const { error } = await supabase
                .from('auth_requests')
                .update({
                  status: 'denied',
                  denied_at: new Date().toISOString()
                })
                .eq('id', authRequestId)

              if (error) throw error

              Alert.alert(
                '🚫 Authentication Denied',
                'The login request has been denied.',
                [
                  {
                    text: 'OK',
                    onPress: () => navigation.goBack()
                  }
                ]
              )
            } catch (error) {
              console.error('Error denying auth request:', error)
              Alert.alert('Error', 'Could not deny authentication request')
            }
            setLoading(false)
          }
        }
      ]
    )
  }

  if (!requestData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading authentication request...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Text style={styles.iconText}>🔐</Text>
          </View>
          <Text style={styles.title}>Authentication Request</Text>
          <Text style={styles.subtitle}>
            Someone is trying to access your account
          </Text>
        </View>

        {/* Request Details */}
        <View style={styles.detailsContainer}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Device:</Text>
            <Text style={styles.detailValue}>
              {deviceInfo?.browser || 'Web Browser'} on {deviceInfo?.os || 'Desktop'}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Time:</Text>
            <Text style={styles.detailValue}>
              {new Date(requestData.created_at).toLocaleString()}
            </Text>
          </View>

          {location && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Location:</Text>
              <Text style={styles.detailValue}>
                {location.city || 'Unknown'}, {location.country || 'Unknown'}
              </Text>
            </View>
          )}

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>IP Address:</Text>
            <Text style={styles.detailValue}>
              {requestData.ip_address || 'Unknown'}
            </Text>
          </View>
        </View>

        {/* Security Notice */}
        <View style={styles.securityNotice}>
          <Text style={styles.securityTitle}>🔒 Security Notice</Text>
          <Text style={styles.securityText}>
            Only approve this request if you recognize this login attempt. 
            If you didn't initiate this login, please deny it immediately.
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.approveButton]}
            onPress={handleApprove}
            disabled={loading}
          >
            <Text style={styles.approveButtonText}>
              {loading ? 'Approving...' : '✅ Approve Login'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.denyButton]}
            onPress={handleDeny}
            disabled={loading}
          >
            <Text style={styles.denyButtonText}>
              🚫 Deny Login
            </Text>
          </TouchableOpacity>
        </View>

        {/* Help Text */}
        <View style={styles.helpContainer}>
          <Text style={styles.helpText}>
            This request will expire in 5 minutes for your security.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1e40af',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconText: {
    fontSize: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
  },
  detailsContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: '#1e293b',
    flex: 2,
    textAlign: 'right',
  },
  securityNotice: {
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  securityTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#92400e',
    marginBottom: 8,
  },
  securityText: {
    fontSize: 14,
    color: '#92400e',
    lineHeight: 20,
  },
  buttonContainer: {
    gap: 12,
  },
  button: {
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  approveButton: {
    backgroundColor: '#059669',
  },
  approveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  denyButton: {
    backgroundColor: '#dc2626',
  },
  denyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  helpContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
  helpText: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
  },
})