'use client'

import { useMemo } from 'react'

interface DashboardProps {
  elements: any[]
}

export default function Dashboard({ elements }: DashboardProps) {
  const stats = useMemo(() => {
    const total = elements.length
    const active = elements.filter(e => e.status === 'active').length
    const inactive = elements.filter(e => e.status === 'inactive').length
    const warning = elements.filter(e => e.status === 'warning').length
    
    return { total, active, inactive, warning }
  }, [elements])

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <StatCard
        title="Total Elements"
        value={stats.total}
        color="bg-blue-500"
      />
      <StatCard
        title="Active"
        value={stats.active}
        color="bg-green-500"
      />
      <StatCard
        title="Warning"
        value={stats.warning}
        color="bg-yellow-500"
      />
      <StatCard
        title="Inactive"
        value={stats.inactive}
        color="bg-red-500"
      />
    </div>
  )
}

function StatCard({ title, value, color }: { title: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className={`w-12 h-12 ${color} rounded-lg mb-4 flex items-center justify-center`}>
        <span className="text-white text-2xl font-bold">{value}</span>
      </div>
      <h3 className="text-gray-600 text-sm font-medium">{title}</h3>
    </div>
  )
}
