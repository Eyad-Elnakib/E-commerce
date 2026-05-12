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
  onboarding_completed: boolean
  created_at: string
}

interface AuthState {
  token: string | null
  user: UserData | null
  setAuth: (token: string, user: UserData) => void
  clearAuth: () => void
  updateUser: (user: UserData) => void
  isAuthenticated: () => boolean
  isAdmin: () => boolean
  needsOnboarding: () => boolean
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

      updateUser: (user: UserData) => {
        set({ user })
      },

      isAuthenticated: () => get().token !== null,

      isAdmin: () => get().user?.role === 'admin',

      needsOnboarding: () => {
        const user = get().user
        return user !== null && !user.onboarding_completed && user.role !== 'admin'
      },
    }),
    {
      name: 'auth-storage', // localStorage key
    }
  )
)
