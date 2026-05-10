import api from './client'
import type { Product } from './products'

export interface CartItem {
  id: number
  product_id: number
  quantity: number
  price_at_add: number
  product?: Product
  created_at: string
}

export const cartApi = {
  getCart: async (): Promise<CartItem[]> => {
    const response = await api.get('/cart')
    return response.data
  },

  addToCart: async (productId: number, quantity: number = 1): Promise<CartItem> => {
    const response = await api.post('/cart', { product_id: productId, quantity })
    return response.data
  },

  updateQuantity: async (itemId: number, quantity: number): Promise<CartItem | null> => {
    const response = await api.put(`/cart/${itemId}`, { quantity })
    return response.status === 204 ? null : response.data
  },

  removeFromCart: async (itemId: number): Promise<void> => {
    await api.delete(`/cart/${itemId}`)
  }
}
