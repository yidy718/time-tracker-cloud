import { useState, useEffect, useCallback } from 'react'
import { database } from '../lib/supabase'

export default function ExpenseEntry({ employee, organizationId, timeSessionId = null, onExpenseAdded, onClose = null }) {
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)
  const [recentExpenses, setRecentExpenses] = useState([])
  const [showRecentExpenses, setShowRecentExpenses] = useState(true)

  const loadRecentExpenses = useCallback(async () => {
    try {
      const { data } = await database.getEmployeeExpenses(employee.id, organizationId, 30) // last 30 days
      setRecentExpenses(data || [])
    } catch (error) {
      console.error('Error loading recent expenses:', error)
    }
  }, [employee.id, organizationId])

  useEffect(() => {
    if (showRecentExpenses) {
      loadRecentExpenses()
    }
  }, [showRecentExpenses, loadRecentExpenses])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!amount || !description.trim()) return

    setLoading(true)
    try {
      const expense = {
        employee_id: employee.id,
        organization_id: organizationId,
        time_session_id: timeSessionId,
        amount: parseFloat(amount),
        description: description.trim(),
        date: date
      }

      const { error } = await database.addExpense(expense)
      if (error) throw error

      // Reset form
      setAmount('')
      setDescription('')
      setDate(new Date().toISOString().split('T')[0])

      // Reload recent expenses
      await loadRecentExpenses()
      
      // Notify parent component
      if (onExpenseAdded) {
        onExpenseAdded()
      }

      // Close modal if this is a modal
      if (onClose) {
        onClose()
      }

    } catch (error) {
      console.error('Error adding expense:', error)
      alert('Failed to add expense. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  return (
    <div className="space-y-6">
      {/* Expense Entry Form */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {timeSessionId ? 'Add Expense for This Session' : 'Add New Expense'}
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
                Amount ($)
              </label>
              <input
                type="number"
                id="amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="0"
                step="0.01"
                placeholder="0.00"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            
            <div>
              <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
                Date
              </label>
              <input
                type="date"
                id="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
          </div>
          
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Describe the expense (e.g., Gas for client visit, Office supplies, etc.)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              required
            />
          </div>
          
          <div className="flex justify-end space-x-3">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                disabled={loading}
              >
                🚪 Clock Out
              </button>
            )}
            <button
              type="submit"
              disabled={loading || !amount || !description.trim()}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                loading || !amount || !description.trim()
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {loading ? (
                <span className="flex items-center">
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                  Adding...
                </span>
              ) : (
                'Add Expense'
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Recent Expenses */}
      {showRecentExpenses && recentExpenses.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Expenses</h3>
            <button
              onClick={() => setShowRecentExpenses(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
          
          <div className="space-y-3">
            {recentExpenses.slice(0, 5).map((expense) => (
              <div key={expense.id} className="flex justify-between items-start p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{expense.description}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(expense.date).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">
                    {formatCurrency(expense.amount)}
                  </p>
                </div>
              </div>
            ))}
          </div>
          
          {recentExpenses.length > 5 && (
            <div className="mt-3 text-center">
              <p className="text-sm text-gray-500">
                Showing 5 of {recentExpenses.length} recent expenses
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}