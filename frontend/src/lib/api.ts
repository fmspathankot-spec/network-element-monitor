import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const fetchElements = async (status?: string) => {
  const params = status ? { status } : {}
  const response = await api.get('/api/elements', { params })
  return response.data
}

export const fetchElement = async (id: string) => {
  const response = await api.get(`/api/elements/${id}`)
  return response.data
}

export const createElement = async (data: any) => {
  const response = await api.post('/api/elements', data)
  return response.data
}

export const updateElement = async (id: string, data: any) => {
  const response = await api.put(`/api/elements/${id}`, data)
  return response.data
}

export const deleteElement = async (id: string) => {
  const response = await api.delete(`/api/elements/${id}`)
  return response.data
}

export const fetchMetrics = async (elementId: string, limit = 100) => {
  const response = await api.get(`/api/metrics/${elementId}`, { params: { limit } })
  return response.data
}

export const createMetric = async (data: any) => {
  const response = await api.post('/api/metrics', data)
  return response.data
}

export const fetchAlerts = async (resolved?: boolean) => {
  const params = resolved !== undefined ? { resolved } : {}
  const response = await api.get('/api/alerts', { params })
  return response.data
}

export const createAlert = async (data: any) => {
  const response = await api.post('/api/alerts', data)
  return response.data
}

export const resolveAlert = async (id: string) => {
  const response = await api.put(`/api/alerts/${id}/resolve`)
  return response.data
}

export default api
