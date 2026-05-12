import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ToastProvider } from '../components/ToastProvider'
import { ProductCard } from '../components/ProductCard'


const mockProduct = {
  id: 1,
  name: 'Test Product',
  category: 'Test',
  brand: 'Brand',
  price: 10,
  description: 'desc',
  stock: 5,
  avg_rating: 4.5,
  image_file: null,
  is_favourited: false,
  is_in_cart: false
}

describe('ProductCard 3D Flip', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient()
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })
  })

  const renderComponent = (props: any = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ToastProvider>
            <ProductCard {...props} product={{ ...mockProduct, ...props.product }} />
          </ToastProvider>
        </BrowserRouter>
      </QueryClientProvider>
    )
  }

  it('toggles aria-expanded on click', async () => {
    renderComponent()
    const btn = screen.getByLabelText('Toggle actions')
    
    expect(btn).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(btn)
    expect(btn).toHaveAttribute('aria-expanded', 'true')
  })

  it('Enter and Space on focused front button toggles', async () => {
    renderComponent()
    const btn = screen.getByLabelText('Toggle actions')
    
    btn.focus()
    await userEvent.keyboard('{Enter}')
    expect(btn).toHaveAttribute('aria-expanded', 'true')
    
    await userEvent.keyboard(' ') // Space
    expect(btn).toHaveAttribute('aria-expanded', 'false')
  })

  it('After flip, Tab goes to the first back-face button (Favourite)', async () => {
    renderComponent()
    const btn = screen.getByLabelText('Toggle actions')
    
    btn.focus()
    await userEvent.keyboard('{Enter}')
    
    await userEvent.tab()
    const favBtn = screen.getByRole('button', { name: /Favourite/i })
    expect(favBtn).toHaveFocus()
  })

  it('Click Favourite calls onFavouriteToggle(product.id) exactly once', async () => {
    const onFavouriteToggle = vi.fn()
    renderComponent({ onFavouriteToggle })
    
    const favBtn = screen.getByRole('button', { name: /Favourite/i })
    await userEvent.click(favBtn)
    
    expect(onFavouriteToggle).toHaveBeenCalledTimes(1)
    expect(onFavouriteToggle).toHaveBeenCalledWith(1)
  })

  it('Stock=0: Add to Cart has aria-disabled="true", click does not call onAddToCart', async () => {
    const onAddToCart = vi.fn()
    renderComponent({ product: { stock: 0 }, onAddToCart })
    
    const cartBtn = screen.getByRole('button', { name: /Add to Cart/i })
    expect(cartBtn).toHaveAttribute('aria-disabled', 'true')
    expect(cartBtn).toBeDisabled()
    
    await userEvent.click(cartBtn)
    expect(onAddToCart).not.toHaveBeenCalled()
  })

  it('matchPercent=73 renders badge with accessible name "73% match"', () => {
    renderComponent({ matchPercent: 73 })
    expect(screen.getByLabelText('73% match')).toBeInTheDocument()
  })

  it('axe-core on flipped and unflipped states -> 0 violations', async () => {
    const { container } = renderComponent()
    
    // Unflipped
    let results = await axe(container)
    expect(results).toHaveNoViolations()
    
    // Flipped
    const btn = screen.getByLabelText('Toggle actions')
    await userEvent.click(btn)
    results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('With matchMedia(prefers-reduced-motion: reduce) mocked true, the element has the crossfade class and NOT the rotate class', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })
    
    const { container } = renderComponent()
    const inner = container.querySelector('.flip-card-inner')
    expect(inner).toHaveClass('crossfade')
    expect(inner).not.toHaveClass('rotate')
  })
})
