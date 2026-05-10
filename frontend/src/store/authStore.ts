/**
 * Zustand auth store — holds JWT token and user data in memory.
 * Token is persisted in localStorage for convenience at localhost scope.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface UserData {
  id: number
  username: string
  email: string
  full_name: string
  role: string
  created_at: string
}

interface AuthState {
  token: string | null
  user: UserData | null
  setAuth: (token: string, user: UserData) => void
  clearAuth: () => void
  isAuthenticated: () => boolean
  isAdmin: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,

      setAuth: (token: string, user: UserData) => {
        set({ token, user })
      },

      clearAuth: () => {
        set({ token: null, user: null })
      },

      isAuthenticated: () => get().token !== null,

      isAdmin: () => get().user?.role === 'admin',
    }),
    {
      name: 'auth-storage', // localStorage key
    }
  )
)
