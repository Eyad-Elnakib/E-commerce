import api from './client'

export interface Product {
  id: number
  name: string
  category: string | null
  brand: string | null
  price: number
  description: string | null
  avg_rating: number | null
  stock: number
  image_file: string | null
  is_favourited: boolean
  is_in_cart: boolean
  user_rating?: number
  deleted_at?: string | null
}

export interface PaginationMeta {
  page: number
  page_size: number
  total: number
  has_more: boolean
}

export interface ProductListResponse {
  data: Product[]
  meta: PaginationMeta
}

export const productsApi = {
  getProducts: async (page = 1, category?: string, brand?: string): Promise<ProductListResponse> => {
    const params: any = { page, page_size: 20 }
    if (category) params.category = category
    if (brand) params.brand = brand
    const response = await api.get('/products', { params })
    return response.data
  },

  getProduct: async (id: number | string): Promise<Product> => {
    const response = await api.get(`/products/${id}`)
    return response.data
  },
  
  getCategories: async (): Promise<string[]> => {
    const response = await api.get('/products/categories')
    return response.data
  }
}
