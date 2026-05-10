import api from './client'

export interface OrderItem {
  id: number
  product_id: number
  quantity: number
  price_at_purchase: number
}

export interface Order {
  id: number
  status: string
  total: number
  payment_method: string
  items: OrderItem[]
  created_at: string
}

export const ordersApi = {
  createOrder: async (paymentMethod: string, idempotencyKey: string): Promise<Order> => {
    const response = await api.post('/orders', 
      { payment_method: paymentMethod },
      { headers: { 'Idempotency-Key': idempotencyKey } }
    )
    return response.data
  },

  getOrders: async (): Promise<Order[]> => {
    const response = await api.get('/orders')
    return response.data
  },

  getOrder: async (orderId: number): Promise<Order> => {
    const response = await api.get(`/orders/${orderId}`)
    return response.data
  }
}
