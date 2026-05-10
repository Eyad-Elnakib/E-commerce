import api from './client'
import type { Product } from './products'

export interface EventPayload {
  event_type: 'view' | 'click' | 'favourite' | 'cart_add' | 'cart_remove' | 'checkout'
  product_id?: number
  session_id?: string
  client_ts?: string
  payload?: any
}

export const telemetryApi = {
  ingestBatch: async (events: EventPayload[]) => {
    // We send to /events since our backend endpoint is configured there
    const response = await api.post('/events', { events })
    return response.data
  }
}

export interface RecommendationItem {
  product: Product
  match_percent: number
  explanation: string
}

export interface FeedGroup {
  method_name: string
  products: Product[]
}

export interface FeedResponse {
  groups: FeedGroup[]
  generated_at: string
  from_cache: boolean
}



export const recommendationsApi = {
  getFeed: async () => {
    const response = await api.get('/recommendations/feed')
    return response.data
  },

  getGift: async (data: any) => {
    const response = await api.post('/recommendations/gift', data)
    return response.data
  }
}
