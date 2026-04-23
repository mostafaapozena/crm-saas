import axios from 'axios'
import { getToken, removeToken } from './auth'

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      removeToken()
      if (typeof window !== 'undefined') window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api
