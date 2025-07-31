import { useState } from 'react'

export default function CompanySelectionModal({ organizations, onSelect, employee }) {
  const [selectedOrgId, setSelectedOrgId] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSelection = async () => {
    if (!selectedOrgId) return
    
    setLoading(true)
    const selectedOrg = organizations.find(org => org.organization_id === selectedOrgId)
    
    // Store selected company in session storage
    const companySession = {
      organization_id: selectedOrgId,
      organization_name: selectedOrg.organization_name,
      role: selectedOrg.role,
      employee: {
        ...employee,
        organization_id: selectedOrgId,
        role: selectedOrg.role
      }
    }
    
    localStorage.setItem('selected_company', JSON.stringify(companySession))
    
    onSelect(companySession)
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">🏢</div>
          <h2 className="text-2xl font-bold text-gray-900">Select Company</h2>
          <p className="text-gray-600 mt-2">
            You have access to multiple companies. Please select which one to work with.
          </p>
        </div>

        <div className="space-y-3 mb-6">
          {organizations.map((org) => (
            <label
              key={org.organization_id}
              className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${
                selectedOrgId === org.organization_id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="organization"
                value={org.organization_id}
                checked={selectedOrgId === org.organization_id}
                onChange={(e) => setSelectedOrgId(e.target.value)}
                className="sr-only"
              />
              <div className="flex-1">
                <div className="font-semibold text-gray-900">
                  {org.organization_name}
                </div>
                <div className="text-sm text-gray-500 capitalize">
                  Role: {org.role.replace('_', ' ')}
                </div>
              </div>
              <div className={`w-4 h-4 border-2 rounded-full flex items-center justify-center ${
                selectedOrgId === org.organization_id
                  ? 'border-blue-500'
                  : 'border-gray-300'
              }`}>
                {selectedOrgId === org.organization_id && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                )}
              </div>
            </label>
          ))}
        </div>

        <div className="flex space-x-3">
          <button
            onClick={handleSelection}
            disabled={!selectedOrgId || loading}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
              selectedOrgId && !loading
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                Selecting...
              </span>
            ) : (
              'Continue'
            )}
          </button>
        </div>

        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500">
            You can switch companies later from your dashboard menu
          </p>
        </div>
      </div>
    </div>
  )
}