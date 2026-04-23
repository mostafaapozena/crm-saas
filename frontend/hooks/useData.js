import { useState, useEffect, useCallback } from 'react'
import api from '../lib/api'

export function useLeads(params = {}) {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({})
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.get('/leads', { params })
      setLeads(data.leads)
      setPagination(data.pagination)
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to load leads')
    } finally {
      setLoading(false)
    }
  }, [JSON.stringify(params)])

  useEffect(() => { fetch() }, [fetch])

  return { leads, loading, pagination, error, refetch: fetch }
}

export function useClients(params = {}) {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({})

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/clients', { params })
      setClients(data.clients)
      setPagination(data.pagination)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [JSON.stringify(params)])

  useEffect(() => { fetch() }, [fetch])

  return { clients, loading, pagination, refetch: fetch }
}

export function useDeals(params = {}) {
  const [deals, setDeals] = useState([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({})

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/deals', { params })
      setDeals(data.deals)
      setPagination(data.pagination)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [JSON.stringify(params)])

  useEffect(() => { fetch() }, [fetch])

  return { deals, loading, pagination, refetch: fetch }
}

export function useDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/dashboard/summary')
      .then(r => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return { data, loading }
}
