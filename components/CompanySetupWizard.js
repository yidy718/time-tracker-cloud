import { useState } from 'react'
import { database, auth } from '../lib/supabase'

export default function CompanySetupWizard({ onComplete }) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [companyData, setCompanyData] = useState({
    companyName: '',
    managerEmail: '',
    managerFirstName: '',
    managerLastName: '',
    locations: [{ name: '', address: '', clientName: '' }],
    clientProjects: [{ clientName: '', projectName: '', projectCode: '', billingRate: '' }]
  })

  const addLocation = () => {
    setCompanyData({
      ...companyData,
      locations: [...companyData.locations, { name: '', address: '', clientName: '' }]
    })
  }

  const updateLocation = (index, field, value) => {
    const newLocations = [...companyData.locations]
    newLocations[index][field] = value
    setCompanyData({ ...companyData, locations: newLocations })
  }

  const addProject = () => {
    setCompanyData({
      ...companyData,
      clientProjects: [...companyData.clientProjects, { clientName: '', projectName: '', projectCode: '', billingRate: '' }]
    })
  }

  const updateProject = (index, field, value) => {
    const newProjects = [...companyData.clientProjects]
    newProjects[index][field] = value
    setCompanyData({ ...companyData, clientProjects: newProjects })
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      // 1. Create organization
      const { data: org, error: orgError } = await database.createOrganization({
        name: companyData.companyName
      })
      if (orgError) throw orgError

      // 2. Create manager account
      const { data: authData, error: authError } = await auth.signUp(
        companyData.managerEmail,
        'TempManager123!' // Temporary password
      )
      if (authError) throw authError

      // 3. Create manager employee record
      const { error: managerError } = await database.createEmployee({
        id: authData.user.id,
        organization_id: org.id,
        first_name: companyData.managerFirstName,
        last_name: companyData.managerLastName,
        email: companyData.managerEmail,
        role: 'manager'
      })
      if (managerError) throw managerError

      // 4. Create locations
      for (const location of companyData.locations) {
        if (location.name) {
          await database.createLocation({
            organization_id: org.id,
            name: location.name,
            address: location.address,
            client_name: location.clientName
          })
        }
      }

      // 5. Create client projects
      for (const project of companyData.clientProjects) {
        if (project.projectName) {
          await database.createClientProject({
            organization_id: org.id,
            client_name: project.clientName,
            project_name: project.projectName,
            project_code: project.projectCode,
            billing_rate: parseFloat(project.billingRate) || null
          })
        }
      }

      alert(`✅ ${companyData.companyName} setup complete!\n\nManager Login:\nEmail: ${companyData.managerEmail}\nPassword: TempManager123!\n\nTell them to change the password after first login.`)
      onComplete()

    } catch (error) {
      console.error('Setup error:', error)
      alert('Error setting up company: ' + error.message)
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-white/20">
        
        {/* Header */}
        <div className="flex items-center space-x-3 mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center text-white text-xl shadow-lg">
            🏢
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Setup New Company</h2>
            <p className="text-gray-600">Step {step} of 4</p>
          </div>
        </div>

        {/* Step 1: Company Info */}
        {step === 1 && (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-gray-800">Company Information</h3>
            
            <div>
              <label className="block text-gray-700 font-medium mb-2">Company Name *</label>
              <input
                type="text"
                required
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={companyData.companyName}
                onChange={(e) => setCompanyData({...companyData, companyName: e.target.value})}
                placeholder="e.g., ABC Construction, Tech Solutions Inc"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 font-medium mb-2">Manager First Name *</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={companyData.managerFirstName}
                  onChange={(e) => setCompanyData({...companyData, managerFirstName: e.target.value})}
                  placeholder="John"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-medium mb-2">Manager Last Name *</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={companyData.managerLastName}
                  onChange={(e) => setCompanyData({...companyData, managerLastName: e.target.value})}
                  placeholder="Smith"
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-2">Manager Email *</label>
              <input
                type="email"
                required
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={companyData.managerEmail}
                onChange={(e) => setCompanyData({...companyData, managerEmail: e.target.value})}
                placeholder="manager@company.com"
              />
            </div>
          </div>
        )}

        {/* Step 2: Locations */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-800">Work Locations</h3>
              <button
                onClick={addLocation}
                className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
              >
                + Add Location
              </button>
            </div>

            {companyData.locations.map((location, index) => (
              <div key={index} className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-gray-700 font-medium mb-2">Location Name</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={location.name}
                      onChange={(e) => updateLocation(index, 'name', e.target.value)}
                      placeholder="Main Office, Site A, Warehouse"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-medium mb-2">Address</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={location.address}
                      onChange={(e) => updateLocation(index, 'address', e.target.value)}
                      placeholder="123 Main St, City, State"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-medium mb-2">Client/Project</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={location.clientName}
                      onChange={(e) => updateLocation(index, 'clientName', e.target.value)}
                      placeholder="Client ABC, Project XYZ"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Step 3: Client Projects */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-800">Client Projects</h3>
              <button
                onClick={addProject}
                className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition-colors"
              >
                + Add Project
              </button>
            </div>

            {companyData.clientProjects.map((project, index) => (
              <div key={index} className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-700 font-medium mb-2">Client Name</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      value={project.clientName}
                      onChange={(e) => updateProject(index, 'clientName', e.target.value)}
                      placeholder="ABC Corporation"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-medium mb-2">Project Name</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      value={project.projectName}
                      onChange={(e) => updateProject(index, 'projectName', e.target.value)}
                      placeholder="Website Redesign, Building Construction"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-medium mb-2">Project Code</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      value={project.projectCode}
                      onChange={(e) => updateProject(index, 'projectCode', e.target.value)}
                      placeholder="ABC-001, PROJ-2024-001"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-medium mb-2">Billing Rate ($/hour)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      value={project.billingRate}
                      onChange={(e) => updateProject(index, 'billingRate', e.target.value)}
                      placeholder="75.00"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Step 4: Review */}
        {step === 4 && (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-gray-800">Review & Confirm</h3>
            
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
              <h4 className="font-bold text-blue-800 mb-2">Company: {companyData.companyName}</h4>
              <p className="text-blue-700">Manager: {companyData.managerFirstName} {companyData.managerLastName}</p>
              <p className="text-blue-700">Email: {companyData.managerEmail}</p>
            </div>

            <div className="p-4 bg-green-50 rounded-xl border border-green-200">
              <h4 className="font-bold text-green-800 mb-2">Locations ({companyData.locations.filter(l => l.name).length})</h4>
              {companyData.locations.filter(l => l.name).map((loc, i) => (
                <p key={i} className="text-green-700">• {loc.name} - {loc.clientName}</p>
              ))}
            </div>

            <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
              <h4 className="font-bold text-purple-800 mb-2">Projects ({companyData.clientProjects.filter(p => p.projectName).length})</h4>
              {companyData.clientProjects.filter(p => p.projectName).map((proj, i) => (
                <p key={i} className="text-purple-700">• {proj.clientName} - {proj.projectName} ({proj.projectCode})</p>
              ))}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
          <button
            onClick={() => setStep(Math.max(1, step - 1))}
            disabled={step === 1}
            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Previous
          </button>

          {step < 4 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={
                (step === 1 && (!companyData.companyName || !companyData.managerEmail || !companyData.managerFirstName || !companyData.managerLastName))
              }
              className="px-6 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-6 py-3 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Creating Company...</span>
                </span>
              ) : (
                '✅ Create Company'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}