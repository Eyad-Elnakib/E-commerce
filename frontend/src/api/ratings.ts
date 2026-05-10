import api from './client'

export const ratingsApi = {
  addRating: async (productId: number, value: number) => {
    const response = await api.post(`/ratings/${productId}`, { value })
    return response.data
  }
}
