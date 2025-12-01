'use client'

import { resolveAlert } from '@/lib/api'

interface AlertPanelProps {
  alerts: any[]
  onRefresh: () => void
}

export default function AlertPanel({ alerts, onRefresh }: AlertPanelProps) {
  const handleResolve = async (alertId: string) => {
    try {
      await resolveAlert(alertId)
      onRefresh()
    } catch (error) {
      console.error('Error resolving alert:', error)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 border-red-500 text-red-800'
      case 'high': return 'bg-orange-100 border-orange-500 text-orange-800'
      case 'medium': return 'bg-yellow-100 border-yellow-500 text-yellow-800'
      case 'low': return 'bg-blue-100 border-blue-500 text-blue-800'
      default: return 'bg-gray-100 border-gray-500 text-gray-800'
    }
  }

  const unresolvedAlerts = alerts.filter(a => !a.resolved)

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">
          Active Alerts ({unresolvedAlerts.length})
        </h2>
      </div>
      <div className="p-6 space-y-4 max-h-96 overflow-y-auto">
        {unresolvedAlerts.map((alert) => (
          <div
            key={alert._id}
            className={`p-4 border-l-4 rounded ${getSeverityColor(alert.severity)}`}
          >
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-semibold uppercase">{alert.severity}</span>
              <button
                onClick={() => handleResolve(alert._id)}
                className="text-xs text-gray-600 hover:text-gray-900"
              >
                Resolve
              </button>
            </div>
            <p className="text-sm font-medium">{alert.message}</p>
            <p className="text-xs text-gray-500 mt-2">
              Element ID: {alert.element_id}
            </p>
          </div>
        ))}
        {unresolvedAlerts.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No active alerts
          </div>
        )}
      </div>
    </div>
  )
}
