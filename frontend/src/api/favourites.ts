import api from './client'

import type { Product } from './products'

export const favouritesApi = {
  getFavourites: async (): Promise<Product[]> => {
    const response = await api.get('/favourites')
    return response.data
  },

  addFavourite: async (productId: number) => {
    const response = await api.post(`/favourites/${productId}`)
    return response.data
  },

  removeFavourite: async (productId: number) => {
    const response = await api.delete(`/favourites/${productId}`)
    return response.data
  }
}
