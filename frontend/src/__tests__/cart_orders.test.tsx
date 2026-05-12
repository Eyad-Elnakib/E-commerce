import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import App from '../App'
import { ToastProvider } from '../components/ToastProvider'
import { useAuthStore } from '../store/authStore'

const renderWithProviders = (route = '/') => {
  window.history.pushState({}, 'Test page', route)
  return render(
    <BrowserRouter>
      <ToastProvider>
        <App />
      </ToastProvider>
    </BrowserRouter>
  )
}

describe('Group C: Cart & Orders', () => {
  beforeEach(() => {
    useAuthStore.getState().setAuth('fake-jwt-token', {
      id: 1, username: 'testuser', email: 't@t.com', full_name: 't', role: 'user', created_at: '', onboarding_completed: true
    })
    vi.clearAllMocks()
  })

  it('renders cart page with items', async () => {
    renderWithProviders('/cart')

    // Wait for mock data
    expect(await screen.findByText('Product 1')).toBeInTheDocument()
    expect(screen.getByText('Order Summary')).toBeInTheDocument()
    expect(screen.getAllByText('$20.00').length).toBeGreaterThan(0)
  })

  it('handles updating quantity and removing items', async () => {
    const user = userEvent.setup()
    renderWithProviders('/cart')

    expect(await screen.findByText('Product 1')).toBeInTheDocument()
    
    // Update quantity
    const addBtn = screen.getByRole('button', { name: '+' })
    await user.click(addBtn)
    
    // Mock handler returns what was sent, we test the UI optimistic or API response reflection
    // Wait for quantity to update to 3 (since mock handler echoes back the data.quantity)
    expect(await screen.findByText('3')).toBeInTheDocument()

    // Remove item
    const removeBtn = screen.getByRole('button', { name: /Remove/i })
    await user.click(removeBtn)

    expect(await screen.findByText(/Your cart is empty/i)).toBeInTheDocument()
  })

  it('handles checkout and navigates to orders', async () => {
    const user = userEvent.setup()
    renderWithProviders('/cart')

    expect(await screen.findByText('Product 1')).toBeInTheDocument()
    
    const checkoutBtn = screen.getByRole('button', { name: /Checkout/i })
    await user.click(checkoutBtn)

    // Should place order and redirect to /orders
    expect(await screen.findByText('Order History')).toBeInTheDocument()
    expect(await screen.findAllByText(/Order Placed/i)).toHaveLength(2) // Toast + Order Card
  })

  it('renders order history', async () => {
    renderWithProviders('/orders')

    expect(await screen.findByText('Order History')).toBeInTheDocument()
    expect(await screen.findByText(/Product #1 x 2/i)).toBeInTheDocument()
  })
})
