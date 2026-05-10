import React from 'react'
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter, MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import App from '../App'
import { RegisterPage } from '../pages/RegisterPage'
import { LoginPage } from '../pages/LoginPage'
import { ToastProvider } from '../components/ToastProvider'
import { useAuthStore } from '../store/authStore'
import api from '../api/client'

// Use fake timers for debounced inputs and countdowns
vi.useFakeTimers({ shouldAdvanceTime: true })

const renderWithProviders = (ui: React.ReactElement, route = '/') => {
  window.history.pushState({}, 'Test page', route)
  return render(
    <BrowserRouter>
      <ToastProvider>
        {ui}
      </ToastProvider>
    </BrowserRouter>
  )
}

describe('A1: User Registration', () => {
  beforeEach(() => {
    vi.clearAllTimers()
  })

  it('renders all fields with labels and correct tab order', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderWithProviders(<RegisterPage />)
    
    const fullNameInput = screen.getByLabelText(/Full Name/i)
    const usernameInput = screen.getByLabelText(/Username/i)
    const emailInput = screen.getByLabelText(/Email/i)
    const passwordInput = screen.getByLabelText(/Password/i)
    const submitBtn = screen.getByRole('button', { name: /Sign Up/i })

    expect(fullNameInput).toBeInTheDocument()
    expect(usernameInput).toBeInTheDocument()
    expect(emailInput).toBeInTheDocument()
    expect(passwordInput).toBeInTheDocument()

    // Tab order check
    expect(document.body).toHaveFocus()
    await user.tab()
    expect(fullNameInput).toHaveFocus()
    await user.tab()
    expect(usernameInput).toHaveFocus()
    await user.tab()
    expect(emailInput).toHaveFocus()
    await user.tab()
    expect(passwordInput).toHaveFocus()
    expect(passwordInput).toHaveFocus()
  })

  it('disables submit while invalid and shows inline errors', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderWithProviders(<RegisterPage />)
    
    const submitBtn = screen.getByRole('button', { name: /Sign Up/i })
    expect(submitBtn).toBeDisabled()

    const emailInput = screen.getByLabelText(/Email/i)
    await user.type(emailInput, 'invalid-email')
    
    // Trigger validation
    await user.tab()
    
    expect(await screen.findByText(/Invalid email address/i)).toBeInTheDocument()
    expect(submitBtn).toBeDisabled()
  })

  it('shows inline error on 409 and focuses field', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderWithProviders(<RegisterPage />)

    await user.type(screen.getByLabelText(/Full Name/i), 'Test User')
    await user.type(screen.getByLabelText(/Username/i), 'server_taken_user')
    await user.type(screen.getByLabelText(/Email/i), 'test@example.com')
    await user.type(screen.getByLabelText(/Password/i), 'securepass123')

    // Fast-forward debounce
    act(() => { vi.advanceTimersByTime(300) })

    const submitBtn = screen.getByRole('button', { name: /Sign Up/i })
    await waitFor(() => expect(submitBtn).not.toBeDisabled())
    
    await user.click(submitBtn)

    // MSW will return 409 for username 'taken'
    const errorMsg = await screen.findByText(/Username is already taken/i)
    expect(errorMsg).toBeInTheDocument()
    
    // Assert focus is back on username
    expect(screen.getByLabelText(/Username/i)).toHaveFocus()
  })

  it('triggers navigation to /login on 201 success', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    
    // Render full App to test routing
    renderWithProviders(<App />, '/register')

    await user.type(screen.getByLabelText(/Full Name/i), 'Test User')
    await user.type(screen.getByLabelText(/Username/i), 'newuser')
    await user.type(screen.getByLabelText(/Email/i), 'new@example.com')
    await user.type(screen.getByLabelText(/Password/i), 'securepass123')

    act(() => { vi.advanceTimersByTime(300) }) // debounce check-username

    const submitBtn = screen.getByRole('button', { name: /Sign Up/i })
    await waitFor(() => expect(submitBtn).not.toBeDisabled())

    await user.click(submitBtn)

    // Expect navigation to login and toast
    expect(await screen.findByRole('heading', { name: /Sign In/i })).toBeInTheDocument()
    expect(await screen.findByText(/Account created/i)).toBeInTheDocument()
  })
})

describe('A2: Login', () => {
  beforeEach(() => {
    useAuthStore.getState().clearAuth()
    vi.clearAllTimers()
  })

  it('stashes token on happy path and navigates to /feed', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderWithProviders(<App />, '/login')

    await user.type(screen.getByLabelText(/Username/i), 'testuser')
    await user.type(screen.getByLabelText(/Password/i), 'securepass')

    await user.click(screen.getByRole('button', { name: /Sign In/i }))

    // Expect navigation to feed
    expect(await screen.findByRole('heading', { name: /Personalised Feed/i })).toBeInTheDocument()
    
    // Assert Zustand store
    expect(useAuthStore.getState().token).toBe('fake-jwt-token')
  })

  it('shows generic error on wrong password and preserves input', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderWithProviders(<LoginPage />)

    const passwordInput = screen.getByLabelText(/Password/i)
    await user.type(screen.getByLabelText(/Username/i), 'wrong')
    await user.type(passwordInput, 'wrongpass')

    await user.click(screen.getByRole('button', { name: /Sign In/i }))

    expect(await screen.findByText(/Incorrect username or password/i)).toBeInTheDocument()
    
    // Password value preserved
    expect(passwordInput).toHaveValue('wrongpass')
  })

  it('shows countdown on 429 and disables submit', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderWithProviders(<LoginPage />)

    await user.type(screen.getByLabelText(/Username/i), 'ratelimited')
    await user.type(screen.getByLabelText(/Password/i), 'any')

    const submitBtn = screen.getByRole('button', { name: /Sign In/i })
    await user.click(submitBtn)

    // MSW returns Retry-After: 5
    expect(await screen.findByText(/Too many attempts — try again in 5s/i)).toBeInTheDocument()
    expect(submitBtn).toBeDisabled()

    // Advance 2 seconds
    act(() => { vi.advanceTimersByTime(2000) })
    expect(await screen.findByText(/Too many attempts — try again in 3s/i)).toBeInTheDocument()
    expect(submitBtn).toBeDisabled()

    // Advance 3 more seconds
    act(() => { vi.advanceTimersByTime(3000) })
    
    // Countdown should disappear, button should re-enable
    await waitFor(() => {
      expect(screen.queryByText(/Too many attempts/i)).not.toBeInTheDocument()
      expect(submitBtn).not.toBeDisabled()
    })
  })

  it('toggles password visibility and aria-pressed', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderWithProviders(<LoginPage />)

    const passwordInput = screen.getByLabelText(/Password/i)
    const toggleBtn = screen.getByRole('button', { name: /Show/i })

    expect(passwordInput).toHaveAttribute('type', 'password')
    expect(toggleBtn).toHaveAttribute('aria-pressed', 'false')

    await user.click(toggleBtn)

    expect(passwordInput).toHaveAttribute('type', 'text')
    expect(toggleBtn).toHaveAttribute('aria-pressed', 'true')
    expect(toggleBtn).toHaveTextContent(/Hide/i)
  })

  it('attaches token to subsequent API calls (MSW asserts)', async () => {
    useAuthStore.getState().setAuth('fake-jwt-token', {
      id: 1, username: 'testuser', email: 'test@test.com', full_name: 'Test', role: 'user', created_at: ''
    })

    // Calling /api/auth/me directly with Axios instance
    const response = await api.get('/auth/me')
    expect(response.data.username).toBe('testuser')
  })
})

describe('A3: Logout', () => {
  beforeEach(() => {
    useAuthStore.getState().clearAuth()
  })

  it('clears zustand store and navigates to login on click', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    
    // Setup authenticated state
    useAuthStore.getState().setAuth('fake-jwt-token', {
      id: 1, username: 'testuser', email: 'test@test.com', full_name: 'Test', role: 'user', created_at: ''
    })

    renderWithProviders(<App />, '/feed')

    // Assert we are on feed page
    expect(screen.getByRole('heading', { name: /Personalised Feed/i })).toBeInTheDocument()

    // Click logout in navbar
    const logoutBtn = screen.getByRole('button', { name: /Logout/i })
    await user.click(logoutBtn)

    // Assert Zustand cleared
    expect(useAuthStore.getState().token).toBeNull()

    // Assert redirected to login
    expect(await screen.findByRole('heading', { name: /Sign In/i })).toBeInTheDocument()
  })

  it('redirects to /login if navigating to /feed after logout', () => {
    // Render while unauthenticated
    renderWithProviders(<App />, '/feed')

    // Should immediately redirect to login
    expect(screen.getByRole('heading', { name: /Sign In/i })).toBeInTheDocument()
  })

  it('does not send Authorization header after logout', async () => {
    useAuthStore.getState().clearAuth()
    
    // Calling /api/auth/me without token should return 401 (handled by MSW)
    await expect(api.get('/auth/me')).rejects.toThrow(/401/)
  })
})
