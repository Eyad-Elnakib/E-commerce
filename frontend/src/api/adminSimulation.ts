import api from './client'

export interface SimulationAction {
  type: 'rating' | 'purchase'
  product_id: number
  value?: number
}

export interface SimulationRequest {
  user_id: number
  actions: SimulationAction[]
}

export interface SimulationResponse {
  inserted: {
    ratings: number
    orders: number
  }
}

export const adminSimulationApi = {
  simulate: async (req: SimulationRequest): Promise<SimulationResponse> => {
    const res = await api.post('/admin/simulate', req)
    return res.data
  }
}
