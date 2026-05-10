import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { ToastProvider } from '../components/ToastProvider'
import { MetricsDashboardPage } from '../pages/admin/MetricsDashboardPage'
import { UserMetricsPage } from '../pages/admin/UserMetricsPage'
import { metricsApi } from '../api/metrics'

// Mock the API calls
vi.mock('../api/metrics', () => ({
  metricsApi: {
    getGlobalMetrics: vi.fn(),
    recomputeMetrics: vi.fn(),
    searchUsers: vi.fn(),
    getUserMetrics: vi.fn()
  }
}))

// Mock Recharts to avoid DOM/SVG issues in JSDOM
vi.mock('recharts', async () => {
  const OriginalRecharts = await vi.importActual('recharts')
  return {
    ...OriginalRecharts,
    ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
    BarChart: ({ children }: any) => <div data-testid="barchart">{children}</div>,
    Bar: () => <div />,
    XAxis: () => <div />,
    YAxis: () => <div />,
    CartesianGrid: () => <div />,
    Tooltip: () => <div />,
    Legend: () => <div />,
  }
})

describe('MetricsDashboardPage', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    })
    
    vi.clearAllMocks()
    vi.mocked(metricsApi.getGlobalMetrics).mockResolvedValue({
      generated_at: new Date().toISOString(),
      methods: [
        { method: 'Method A', precision_at_10: 0.1, recall_at_10: 0.2, ndcg_at_10: 0.3, accuracy: 0.5, rmse: 1.5 },
        { method: 'Method B', precision_at_10: 0.9, recall_at_10: 0.8, ndcg_at_10: 0.8, accuracy: 0.9, rmse: 0.5 }, // Best
        { method: 'Method C', precision_at_10: 0.5, recall_at_10: 0.5, ndcg_at_10: 0.5, accuracy: 0.7, rmse: 1.0 },
      ]
    })
  })

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <BrowserRouter>
            <MetricsDashboardPage />
          </BrowserRouter>
        </ToastProvider>
      </QueryClientProvider>
    )
  }

  it('renders one row per method', async () => {
    renderComponent()
    
    await waitFor(() => {
      expect(screen.getByText('Method A')).toBeInTheDocument()
      expect(screen.getByText('Method B')).toBeInTheDocument()
      expect(screen.getByText('Method C')).toBeInTheDocument()
    })
  })

  it('sorts by RMSE asc putting lowest first by default', async () => {
    renderComponent()
    
    await waitFor(() => {
      const rows = screen.getAllByRole('row')
      // Row 0 is header. Row 1 should be Method B (RMSE 0.5)
      expect(rows[1]).toHaveTextContent('Method B')
      expect(rows[2]).toHaveTextContent('Method C')
      expect(rows[3]).toHaveTextContent('Method A')
    })
  })

  it('highlights the best method per metric with a trophy', async () => {
    renderComponent()
    
    await waitFor(() => {
      const trophies = screen.getAllByLabelText(/best/i)
      expect(trophies.length).toBeGreaterThan(0)
    })
  })

  it('toggles include_synthetic and triggers refetch', async () => {
    renderComponent()
    
    await waitFor(() => {
      expect(metricsApi.getGlobalMetrics).toHaveBeenCalledWith(false)
    })
    
    const toggle = await waitFor(() => screen.getByRole('checkbox', { name: /exclude synthetic data/i }))
    fireEvent.click(toggle)
    
    await waitFor(() => {
      expect(metricsApi.getGlobalMetrics).toHaveBeenCalledWith(true)
    })
  })

  it('disables recompute button while in flight', async () => {
    let resolvePromise: any
    const promise = new Promise(resolve => { resolvePromise = resolve })
    vi.mocked(metricsApi.recomputeMetrics).mockImplementation(() => promise as any)
    
    renderComponent()
    
    const button = await waitFor(() => screen.getByRole('button', { name: /recompute/i }))
    fireEvent.click(button)
    
    await waitFor(() => {
      expect(button).toBeDisabled()
      expect(button).toHaveTextContent(/computing/i)
    })
    
    resolvePromise()
    
    await waitFor(() => {
      expect(button).not.toBeDisabled()
    })
  })
})

describe('UserMetricsPage', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    })
    
    vi.clearAllMocks()
    vi.mocked(metricsApi.searchUsers).mockResolvedValue([
      { id: 1, username: 'testuser', email: 'test@test.com' }
    ])
    
    vi.mocked(metricsApi.getUserMetrics).mockResolvedValue({
      user: { id: 1, username: 'testuser', email: 'test@test.com', full_name: 'Test', role: 'user' },
      methods: [
        { method: 'Method A', precision_at_10: 0.9, list: [{ id: 1, name: 'P1', price: 10, category: 'cat', description: 'd', stock: 10 }] as any },
        { method: 'Method B', precision_at_10: 0.5, list: [{ id: 2, name: 'P2', price: 20, category: 'cat', description: 'd', stock: 10 }] as any },
      ]
    })
  })

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <BrowserRouter>
            <UserMetricsPage />
          </BrowserRouter>
        </ToastProvider>
      </QueryClientProvider>
    )
  }

  it('debounces search by 300ms', async () => {
    renderComponent()
    
    const input = screen.getByRole('combobox')
    fireEvent.change(input, { target: { value: 'test' } })
    
    expect(metricsApi.searchUsers).not.toHaveBeenCalled()
    
    await waitFor(() => {
      expect(metricsApi.searchUsers).toHaveBeenCalledWith('test')
    })
  })

  it('fetches metrics when a user is selected', async () => {
    renderComponent()
    
    const input = screen.getByRole('combobox')
    fireEvent.change(input, { target: { value: 'test' } })
    
    await waitFor(() => {
      expect(screen.getByText('testuser')).toBeInTheDocument()
    })
    
    fireEvent.click(screen.getByText('testuser'))
    
    await waitFor(() => {
      expect(metricsApi.getUserMetrics).toHaveBeenCalledWith(1)
      expect(screen.getByText('Metrics for testuser')).toBeInTheDocument()
    })
  })

  it('highlights the best column', async () => {
    renderComponent()
    
    // Select user
    const input = screen.getByRole('combobox')
    fireEvent.change(input, { target: { value: 'test' } })
    await waitFor(() => screen.getByText('testuser'))
    fireEvent.click(screen.getByText('testuser'))
    
    await waitFor(() => {
      expect(screen.getByText('Method A')).toBeInTheDocument()
    })
    
    // Method A has precision 0.9, B has 0.5
    // Method A should have the trophy
    const trophy = screen.getByTitle('Best precision')
    expect(trophy).toBeInTheDocument()
    expect(trophy.closest('div')?.textContent).toContain('Method A')
  })

  it('CSV export produces a blob', async () => {
    const createObjectURLMock = vi.fn()
    global.URL.createObjectURL = createObjectURLMock
    
    renderComponent()
    
    const appendChildMock = vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node as any)
    const removeChildMock = vi.spyOn(document.body, 'removeChild').mockImplementation(() => null as any)
    
    const input = screen.getByRole('combobox')
    fireEvent.change(input, { target: { value: 'test' } })
    await waitFor(() => screen.getByText('testuser'))
    fireEvent.click(screen.getByText('testuser'))
    
    await waitFor(() => {
      expect(screen.getByText('Export to CSV')).toBeInTheDocument()
    })
    
    fireEvent.click(screen.getByText('Export to CSV'))
    
    expect(createObjectURLMock).toHaveBeenCalled()
    expect(appendChildMock).toHaveBeenCalled()
    expect(removeChildMock).toHaveBeenCalled()
    
    appendChildMock.mockRestore()
    removeChildMock.mockRestore()
  })
})
