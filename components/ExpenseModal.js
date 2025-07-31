import { useState } from 'react'
import ExpenseEntry from './ExpenseEntry'

export default function ExpenseModal({ employee, organizationId, timeSessionId, onClose, onExpenseAdded }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Add Expense</h2>
              <p className="text-gray-600 text-sm">
                Did you have any expenses during this work session?
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>
          
          <ExpenseEntry
            employee={employee}
            organizationId={organizationId}
            timeSessionId={timeSessionId}
            onExpenseAdded={onExpenseAdded}
            onClose={onClose}
          />
        </div>
      </div>
    </div>
  )
}