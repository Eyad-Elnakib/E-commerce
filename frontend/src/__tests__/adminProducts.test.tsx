import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { ToastProvider } from '../components/ToastProvider'
import { AdminProductsPage } from '../pages/admin/AdminProductsPage'
import { adminProductsApi } from '../api/adminProducts'

vi.mock('../api/adminProducts', () => ({
  adminProductsApi: {
    getProducts: vi.fn(),
    createProduct: vi.fn(),
    updateProduct: vi.fn(),
    deleteProduct: vi.fn(),
    restoreProduct: vi.fn(),
    uploadImage: vi.fn()
  }
}))

describe('AdminProductsPage', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    })
    
    vi.clearAllMocks()
    vi.mocked(adminProductsApi.getProducts).mockResolvedValue([
      { id: 1, name: 'Product A', category: 'Cat', brand: 'Brand', price: 10, description: 'desc', stock: 5, avg_rating: null, image_file: null, is_favourited: false, is_in_cart: false, deleted_at: null },
      { id: 2, name: 'Product B', category: 'Cat', brand: 'Brand', price: 20, description: 'desc', stock: 10, avg_rating: null, image_file: null, is_favourited: false, is_in_cart: false, deleted_at: null }
    ] as any[])
  })

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <BrowserRouter>
            <AdminProductsPage />
          </BrowserRouter>
        </ToastProvider>
      </QueryClientProvider>
    )
  }

  it('renders table rows', async () => {
    renderComponent()
    
    await waitFor(() => {
      expect(screen.getByText('Product A')).toBeInTheDocument()
      expect(screen.getByText('Product B')).toBeInTheDocument()
    })
  })

  it('edit submits PATCH', async () => {
    vi.mocked(adminProductsApi.updateProduct).mockResolvedValue({ id: 1, name: 'Product A Edited', category: 'Cat', brand: 'Brand', price: 10, description: 'desc', stock: 5, avg_rating: null, image_file: null, is_favourited: false, is_in_cart: false } as any)
    renderComponent()
    
    await waitFor(() => {
      expect(screen.getByText('Product A')).toBeInTheDocument()
    })
    
    const editBtns = screen.getAllByText('Edit')
    fireEvent.click(editBtns[0])
    
    // Drawer should open
    await waitFor(() => {
      expect(screen.getByDisplayValue('Product A')).toBeInTheDocument()
    })
    
    // Change value
    fireEvent.change(screen.getByDisplayValue('Product A'), { target: { value: 'Product A Edited' } })
    
    // Submit
    fireEvent.click(screen.getByText('Save'))
    
    await waitFor(() => {
      expect(adminProductsApi.updateProduct).toHaveBeenCalled()
      expect(adminProductsApi.getProducts).toHaveBeenCalledTimes(2) // Refetches on invalidate
    })
  })

  it('delete shows confirm dialog and soft deletes', async () => {
    vi.spyOn(window, 'confirm').mockImplementation(() => true)
    renderComponent()
    
    await waitFor(() => {
      expect(screen.getByText('Product A')).toBeInTheDocument()
    })
    
    const deleteBtns = screen.getAllByText('Delete')
    fireEvent.click(deleteBtns[0])
    
    expect(window.confirm).toHaveBeenCalled()
    
    await waitFor(() => {
      expect(adminProductsApi.deleteProduct).toHaveBeenCalledWith(1)
      expect(adminProductsApi.getProducts).toHaveBeenCalledTimes(2)
    })
  })
})
