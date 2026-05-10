import React, { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { adminSimulationApi } from '../../api/adminSimulation'
import type { SimulationRequest } from '../../api/adminSimulation'
import { useToast } from '../../components/ToastProvider'

const DEFAULT_JSON = `{
  "user_id": 1,
  "actions": [
    {
      "type": "rating",
      "product_id": 1,
      "value": 5
    },
    {
      "type": "purchase",
      "product_id": 2
    }
  ]
}`

export const AdminSimulationPage: React.FC = () => {
  const [jsonInput, setJsonInput] = useState(DEFAULT_JSON)
  const [parsedPayload, setParsedPayload] = useState<SimulationRequest | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const toast = useToast()

  const simulateMutation = useMutation({
    mutationFn: adminSimulationApi.simulate,
    onSuccess: (data) => {
      toast.success({ 
        title: 'Simulation Complete', 
        body: `Inserted ${data.inserted.ratings} ratings and ${data.inserted.orders} orders.` 
      })
      setShowConfirm(false)
    },
    onError: (err: any) => {
      toast.error({ 
        title: 'Simulation Failed', 
        body: err.response?.data?.detail || 'Failed to simulate actions.' 
      })
      setShowConfirm(false)
    }
  })

  const handleParse = () => {
    try {
      const parsed = JSON.parse(jsonInput)
      if (!parsed.user_id || !Array.isArray(parsed.actions)) {
        throw new Error('Invalid format: must have user_id and actions array')
      }
      setParsedPayload(parsed)
      setParseError(null)
    } catch (e: any) {
      setParseError(e.message)
      setParsedPayload(null)
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="flex justify-between items-center bg-[var(--bg-card)] p-4 rounded-lg shadow border border-[var(--border-color)]">
        <h1 className="text-2xl font-bold text-[var(--text-color)]">User Action Simulator</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Editor */}
        <div className="bg-[var(--bg-card)] p-4 rounded-lg shadow border border-[var(--border-color)] flex flex-col">
          <h2 className="text-lg font-semibold mb-4">JSON Editor</h2>
          <textarea
            className="flex-grow w-full font-mono text-sm p-4 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded mb-4"
            rows={15}
            value={jsonInput}
            onChange={(e) => {
              setJsonInput(e.target.value)
              setParsedPayload(null) // invalidate preview on change
            }}
          />
          <div className="flex justify-between items-center">
            {parseError ? <span className="text-red-500 text-sm">{parseError}</span> : <span />}
            <button 
              onClick={handleParse}
              className="bg-blue-600 text-white px-4 py-2 rounded font-medium hover:bg-blue-700 transition"
            >
              Parse & Preview
            </button>
          </div>
        </div>

        {/* Preview Panel */}
        <div className="bg-[var(--bg-card)] p-4 rounded-lg shadow border border-[var(--border-color)] flex flex-col">
          <h2 className="text-lg font-semibold mb-4">Preview</h2>
          
          {parsedPayload ? (
            <div className="flex-grow flex flex-col">
              <div className="mb-4">
                <strong>Target User ID:</strong> {parsedPayload.user_id}
              </div>
              <div className="mb-4">
                <strong>Total Actions:</strong> {parsedPayload.actions.length}
              </div>
              
              <div className="flex-grow overflow-auto border border-[var(--border-color)] rounded p-2 mb-4 bg-[var(--bg-primary)]">
                <pre className="text-sm">
                  {JSON.stringify(parsedPayload.actions, null, 2)}
                </pre>
              </div>

              <button 
                onClick={() => setShowConfirm(true)}
                className="w-full bg-[var(--color-brand-maroon)] text-white px-4 py-2 rounded font-medium hover:bg-opacity-90 transition"
              >
                Execute Simulation
              </button>
            </div>
          ) : (
            <div className="flex-grow flex items-center justify-center text-gray-500 border-2 border-dashed border-[var(--border-color)] rounded">
              Parse JSON to see preview
            </div>
          )}
        </div>
      </div>

      {/* Confirm Modal */}
      {showConfirm && parsedPayload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-[var(--bg-card)] p-6 rounded-lg shadow-xl max-w-sm w-full">
            <h3 className="text-lg font-bold mb-4 text-red-600">⚠️ Confirm Simulation</h3>
            <p className="mb-6 text-[var(--text-color)]">
              Insert <strong>{parsedPayload.actions.length}</strong> synthetic rows as user <strong>{parsedPayload.user_id}</strong>?
              This action will affect metrics if include_synthetic=true.
            </p>
            <div className="flex justify-end gap-4">
              <button 
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 border rounded font-medium hover:bg-[var(--bg-tertiary)]"
                disabled={simulateMutation.isPending}
              >
                Cancel
              </button>
              <button 
                onClick={() => simulateMutation.mutate(parsedPayload)}
                disabled={simulateMutation.isPending}
                className="px-4 py-2 bg-red-600 text-white rounded font-medium hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
              >
                {simulateMutation.isPending ? 'Inserting...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
