import api from './client'
import type { UserData } from '../store/authStore'

export interface LoginResponse {
  access_token: string
  token_type: string
  expires_in: number
  user: UserData
}

export const authApi = {
  register: async (data: any): Promise<UserData> => {
    const response = await api.post('/auth/register', data)
    return response.data
  },

  checkUsername: async (value: string): Promise<{ available: boolean }> => {
    const response = await api.get('/auth/check-username', { params: { value } })
    return response.data
  },

  login: async (data: any): Promise<LoginResponse> => {
    const response = await api.post('/auth/login', data)
    return response.data
  },

  logout: async (): Promise<void> => {
    await api.post('/auth/logout')
  },

  completeOnboarding: async (data: { favourite_categories: string[], liked_product_ids: number[] }): Promise<UserData> => {
    const response = await api.post('/auth/onboarding', data)
    return response.data
  },
}
