import api from './client'
import type { Product } from './products'

export interface MethodMetrics {
  method: string
  precision_at_10: number
  recall_at_10: number
  ndcg_at_10: number
  accuracy: number
  rmse: number | null
}

export interface GlobalMetricsResponse {
  generated_at: string
  methods: MethodMetrics[]
}

export interface UserMethodMetrics {
  method: string
  precision_at_10: number
  list: Product[]
}

export interface UserMetricsResponse {
  user: {
    id: number
    username: string
    email: string
    full_name: string
    role: string
  }
  methods: UserMethodMetrics[]
}

export interface UserSearchResult {
  id: number
  username: string
  email: string
}

export interface UserStats {
  user: {
    id: number
    username: string
    email: string
    full_name: string
    role: string
    created_at: string
  }
  total_ratings: number
  total_favourites: number
  total_orders: number
  avg_rating: number
  rating_distribution: Record<string, number>
  top_categories: { category: string; count: number }[]
  overlap_matrix: Record<string, any>[]
}

export const metricsApi = {
  getGlobalMetrics: async (includeSynthetic: boolean = false): Promise<GlobalMetricsResponse> => {
    const res = await api.get(`/admin/metrics/global?include_synthetic=${includeSynthetic}`)
    return res.data
  },

  recomputeMetrics: async (): Promise<{ status: string, snapshot_id: number }> => {
    const res = await api.post('/admin/metrics/recompute')
    return res.data
  },

  searchUsers: async (query: string): Promise<UserSearchResult[]> => {
    const res = await api.get(`/admin/users?q=${encodeURIComponent(query)}`)
    return res.data
  },

  getUserMetrics: async (userId: number): Promise<UserMetricsResponse> => {
    const res = await api.get(`/admin/metrics/user/${userId}`)
    return res.data
  },

  getUserStats: async (userId: number): Promise<UserStats> => {
    const res = await api.get(`/admin/metrics/user/${userId}/stats`)
    return res.data
  },
}
