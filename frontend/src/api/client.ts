/**
 * Axios instance with Bearer token interceptor.
 * All API calls go through this instance.
 */
import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor: attach Authorization header from Zustand store
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor: handle 401 by clearing auth
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Only clear auth if we had a token (don't clear during login/register)
      const token = useAuthStore.getState().token
      if (token && !error.config?.url?.includes('/auth/login') && !error.config?.url?.includes('/auth/register')) {
        useAuthStore.getState().clearAuth()
      }
    }
    return Promise.reject(error)
  }
)

export default api
