'use client'

import { useEffect, useState } from 'react'
import Dashboard from '@/components/Dashboard'
import ElementList from '@/components/ElementList'
import AlertPanel from '@/components/AlertPanel'
import { fetchElements, fetchAlerts } from '@/lib/api'

export default function Home() {
  const [elements, setElements] = useState([])
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 30000) // Refresh every 30s
    return () => clearInterval(interval)
  }, [])

  const loadData = async () => {
    try {
      const [elementsData, alertsData] = await Promise.all([
        fetchElements(),
        fetchAlerts()
      ])
      setElements(elementsData.data || [])
      setAlerts(alertsData.data || [])
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Network Element Monitor</h1>
          <p className="text-gray-600 mt-2">Real-time monitoring dashboard</p>
        </header>

        <Dashboard elements={elements} />
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          <div className="lg:col-span-2">
            <ElementList elements={elements} onRefresh={loadData} />
          </div>
          <div>
            <AlertPanel alerts={alerts} onRefresh={loadData} />
          </div>
        </div>
      </div>
    </main>
  )
}
