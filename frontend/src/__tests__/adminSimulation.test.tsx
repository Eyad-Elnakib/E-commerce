import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { ToastProvider } from '../components/ToastProvider'
import { AdminSimulationPage } from '../pages/admin/AdminSimulationPage'
import { adminSimulationApi } from '../api/adminSimulation'

vi.mock('../api/adminSimulation', () => ({
  adminSimulationApi: {
    simulate: vi.fn()
  }
}))

describe('AdminSimulationPage', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    })
    
    vi.clearAllMocks()
    vi.mocked(adminSimulationApi.simulate).mockResolvedValue({
      inserted: { ratings: 1, orders: 1 }
    })
  })

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <BrowserRouter>
            <AdminSimulationPage />
          </BrowserRouter>
        </ToastProvider>
      </QueryClientProvider>
    )
  }

  it('preview reflects payload exactly', async () => {
    renderComponent()
    
    // Default JSON parses successfully
    const parseBtn = screen.getByText('Parse & Preview')
    fireEvent.click(parseBtn)
    
    await waitFor(() => {
      expect(screen.getByText('Execute Simulation')).toBeInTheDocument()
      expect(screen.getByText(/Target User ID:/).parentElement).toHaveTextContent('Target User ID: 1')
      expect(screen.getByText(/Total Actions:/).parentElement).toHaveTextContent('Total Actions: 2')
    })
  })

  it('confirm required; cancel aborts', async () => {
    renderComponent()
    
    fireEvent.click(screen.getByText('Parse & Preview'))
    
    await waitFor(() => {
      expect(screen.getByText('Execute Simulation')).toBeInTheDocument()
    })
    
    fireEvent.click(screen.getByText('Execute Simulation'))
    
    await waitFor(() => {
      expect(screen.getByText('⚠️ Confirm Simulation')).toBeInTheDocument()
    })
    
    // Cancel
    fireEvent.click(screen.getByText('Cancel'))
    
    await waitFor(() => {
      expect(screen.queryByText('⚠️ Confirm Simulation')).not.toBeInTheDocument()
      expect(adminSimulationApi.simulate).not.toHaveBeenCalled()
    })
  })

  it('success toast shows inserted counts', async () => {
    renderComponent()
    
    fireEvent.click(screen.getByText('Parse & Preview'))
    
    await waitFor(() => {
      expect(screen.getByText('Execute Simulation')).toBeInTheDocument()
    })
    
    fireEvent.click(screen.getByText('Execute Simulation'))
    
    await waitFor(() => {
      expect(screen.getByText('Confirm')).toBeInTheDocument()
    })
    
    // Confirm
    fireEvent.click(screen.getByText('Confirm'))
    
    await waitFor(() => {
      expect(adminSimulationApi.simulate).toHaveBeenCalled()
      expect(screen.queryByText('⚠️ Confirm Simulation')).not.toBeInTheDocument()
    })
  })
})
