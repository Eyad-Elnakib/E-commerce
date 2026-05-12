import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import App from '../App'
import { ToastProvider } from '../components/ToastProvider'
import { useAuthStore } from '../store/authStore'
import { telemetry } from '../services/telemetry'

// Spy on telemetry api

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

describe('Group C: Features (Favourites, Telemetry, Recommendations)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    useAuthStore.getState().setAuth('fake-jwt-token', {
      id: 1, username: 'testuser', email: 't@t.com', full_name: 't', role: 'user', created_at: '', onboarding_completed: true
    })
    // @ts-ignore (private property access for testing reset)
    telemetry.buffer = []
    vi.clearAllMocks()
  })

  it('C1: Toggles favourite on product card optimally', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderWithProviders('/browse')

    // Wait for products
    const favBtn = await screen.findAllByRole('button', { name: /Add to favourites/i })
    expect(favBtn[0]).toBeInTheDocument()

    await user.click(favBtn[0])

    // Should optimistically change aria-label
    expect(await screen.findAllByRole('button', { name: /Remove from favourites/i })).toHaveLength(1)
  })

  it('C2: Tracks product views on mount', async () => {
    const trackSpy = vi.spyOn(telemetry, 'track')
    renderWithProviders('/product/1')

    // Wait for product details to load
    expect(await screen.findByText('Product Details Model')).toBeInTheDocument()

    await waitFor(() => {
      expect(trackSpy).toHaveBeenCalledWith('view', 1)
    })
  })

  it('C2: Tracks product clicks', async () => {
    const trackSpy = vi.spyOn(telemetry, 'track')
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    
    renderWithProviders('/browse')
    
    const productLinks = await screen.findAllByRole('link', { name: /Product/i })
    await user.click(productLinks[0])

    expect(trackSpy).toHaveBeenCalledWith('click', expect.any(Number))
  })

  it('C3: Renders recommendation feed page correctly', async () => {
    renderWithProviders('/feed')
    
    expect(await screen.findByText('Rec Product 1')).toBeInTheDocument()
    expect(screen.getByText('Personalised Feed')).toBeInTheDocument()
  })

  it('C3: Submits gift recommendation form and displays result', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderWithProviders('/gift')

    await user.type(screen.getByLabelText(/Recipient/i), 'Mom')
    await user.type(screen.getByLabelText(/Occasion/i), 'Birthday')
    await user.type(screen.getByLabelText(/Personality/i), 'Gardening')
    await user.selectOptions(screen.getByLabelText(/Budget/i), 'under50')
    await user.selectOptions(screen.getByLabelText(/Age Group/i), 'seniors')

    await user.click(screen.getByRole('button', { name: /Find Gift/i }))

    expect(await screen.findByText(/Perfect match for testing/i)).toBeInTheDocument()
    expect(screen.getByText('Gift Product')).toBeInTheDocument()
  })
})
