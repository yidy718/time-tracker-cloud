import { useState, useEffect } from 'react'

export default function WorkSummaryModal({ 
  employee, 
  session, 
  taskData,
  totalExpenses = 0,
  expensesEnabled = false,
  onClose 
}) {
  const [sessionDuration, setSessionDuration] = useState('0h 0m')

  useEffect(() => {
    if (session) {
      const startTime = new Date(session.clock_in)
      const endTime = session.clock_out ? new Date(session.clock_out) : new Date()
      const durationMs = endTime - startTime
      
      const hours = Math.floor(durationMs / (1000 * 60 * 60))
      const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60))
      
      setSessionDuration(`${hours}h ${minutes}m`)
    }
  }, [session])

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-8 max-w-md w-full shadow-2xl border border-white/20">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white text-2xl mx-auto mb-4 shadow-lg">
            ✓
          </div>
          <h3 className="text-2xl font-bold text-gray-800 mb-2">Work Session Complete!</h3>
          <p className="text-gray-600">Great job, {employee?.first_name}!</p>
        </div>

        <div className="space-y-4 mb-8">
          {/* Session Duration */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center text-white">
                  ⏱️
                </div>
                <div>
                  <p className="font-semibold text-gray-800">Session Duration</p>
                  <p className="text-gray-600 text-sm">Total time worked</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-blue-600">{sessionDuration}</p>
              </div>
            </div>
          </div>

          {/* Task Progress */}
          {taskData && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-xl border border-green-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center text-white">
                    📋
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">Task Progress</p>
                    <p className="text-gray-600 text-sm line-clamp-1">{taskData.title}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-green-600">{taskData.progress || 0}%</p>
                </div>
              </div>
            </div>
          )}

          {/* Expenses */}
          {totalExpenses > 0 && (
            <div className="bg-gradient-to-r from-orange-50 to-yellow-50 p-4 rounded-xl border border-orange-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center text-white">
                    💰
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">Expenses</p>
                    <p className="text-gray-600 text-sm">Business expenses logged</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-orange-600">{formatCurrency(totalExpenses)}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-3">
          {expensesEnabled && (
            <button
              onClick={() => {
                // Show expenses tab but go back to home afterwards
                window.location.hash = '#expenses'
                onClose()
              }}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 rounded-xl font-medium hover:from-green-600 hover:to-emerald-700 transition-all duration-300 hover:scale-105 shadow-lg"
            >
              💰 Add Expenses for This Session
            </button>
          )}
          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-4 rounded-xl font-medium hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 hover:scale-105 shadow-lg"
          >
            ✨ Great Work! Continue
          </button>
        </div>
      </div>
    </div>
  )
}