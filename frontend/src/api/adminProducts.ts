import api from './client'
import type { Product } from './products'

export const adminProductsApi = {
  getProducts: async (includeDeleted: boolean = false): Promise<Product[]> => {
    const res = await api.get(`/admin/products?include_deleted=${includeDeleted}`)
    return res.data
  },

  createProduct: async (data: Partial<Product>): Promise<Product> => {
    const res = await api.post('/admin/products', data)
    return res.data
  },

  updateProduct: async (id: number, data: Partial<Product>): Promise<Product> => {
    const res = await api.patch(`/admin/products/${id}`, data)
    return res.data
  },

  deleteProduct: async (id: number): Promise<void> => {
    await api.delete(`/admin/products/${id}`)
  },

  restoreProduct: async (id: number): Promise<Product> => {
    const res = await api.post(`/admin/products/${id}/restore`)
    return res.data
  },

  uploadImage: async (id: number, file: File): Promise<Product> => {
    const formData = new FormData()
    formData.append('file', file)
    
    const res = await api.post(`/admin/products/${id}/image`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return res.data
  },
}
