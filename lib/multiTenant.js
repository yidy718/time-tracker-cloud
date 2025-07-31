// Multi-tenant helper functions
export const multiTenant = {
  // Extract organization from subdomain
  getOrgFromSubdomain: () => {
    if (typeof window === 'undefined') return null
    
    const hostname = window.location.hostname
    const parts = hostname.split('.')
    
    // If subdomain exists (e.g., company-a.vashours.com)
    if (parts.length > 2) {
      return parts[0] // Returns "company-a"
    }
    
    return null // Main domain
  },

  // Organization-specific configuration
  getOrgConfig: (orgSlug) => {
    const configs = {
      'company-a': {
        name: 'Company A',
        theme: 'blue',
        logo: '/logos/company-a.png',
        features: ['timeTracking', 'reports', 'payroll']
      },
      'company-b': {
        name: 'Company B', 
        theme: 'green',
        logo: '/logos/company-b.png',
        features: ['timeTracking', 'reports']
      },
      'default': {
        name: 'VAS Hours',
        theme: 'purple',
        logo: '/logo.png',
        features: ['timeTracking', 'reports', 'payroll', 'admin']
      }
    }

    return configs[orgSlug] || configs.default
  },

  // Check if feature is enabled for organization
  hasFeature: (orgSlug, feature) => {
    const config = multiTenant.getOrgConfig(orgSlug)
    return config.features.includes(feature)
  }
}