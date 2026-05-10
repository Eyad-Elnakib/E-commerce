import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'

import App from '../App'
import { ToastProvider } from '../components/ToastProvider'

const renderWithProviders = (route = '/browse') => {
  window.history.pushState({}, 'Test page', route)
  return render(
    <BrowserRouter>
      <ToastProvider>
        <App />
      </ToastProvider>
    </BrowserRouter>
  )
}

describe('B2: Product Browsing', () => {
  it('renders product cards from page 1 and loads more on click', async () => {
    const user = userEvent.setup()
    renderWithProviders('/browse')

    // Expect loading state to clear and page 1 products to appear
    expect(await screen.findByText('Product 1')).toBeInTheDocument()
    expect(await screen.findByText('Product 2')).toBeInTheDocument()
    
    // Check price formatting
    expect(screen.getByText('$10.00')).toBeInTheDocument()
    expect(screen.getByText('$20.00')).toBeInTheDocument()

    // Click Load More
    const loadMoreBtn = screen.getByRole('button', { name: /Load More/i })
    await user.click(loadMoreBtn)

    // Expect page 2 product to appear
    expect(await screen.findByText('Product 3')).toBeInTheDocument()

    // Button should disappear because has_more becomes false
    expect(screen.queryByRole('button', { name: /Load More/i })).not.toBeInTheDocument()
  })
})

describe('B3: Product Details', () => {
  it('displays full details and stock status', async () => {
    renderWithProviders('/product/1')

    // Wait for data
    expect(await screen.findByText('Product Details Model')).toBeInTheDocument()
    
    expect(screen.getByText(/By TestBrand/i)).toBeInTheDocument()
    expect(screen.getByText('$15.50')).toBeInTheDocument()
    expect(screen.getByText(/A detailed description/i)).toBeInTheDocument()
    expect(screen.getByText(/In Stock \(12\)/i)).toBeInTheDocument()

    // Buttons
    expect(screen.getByRole('button', { name: /Add to Cart/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Add to favourites/i })).toBeInTheDocument()
  })

  it('handles 404 Product Not Found', async () => {
    renderWithProviders('/product/999')

    expect(await screen.findByText(/Product not found or has been removed/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Back to browsing/i })).toBeInTheDocument()
  })
})
