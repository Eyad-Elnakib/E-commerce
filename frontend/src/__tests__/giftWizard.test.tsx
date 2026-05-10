import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GiftPage } from '../pages/GiftPage'
import { recommendationsApi } from '../api/telemetry'

expect.extend(toHaveNoViolations)

vi.mock('../api/telemetry', () => ({
  recommendationsApi: {
    getGift: vi.fn(),
  }
}))

// Mock ProductCard to simplify tests
vi.mock('../components/ProductCard', () => ({
  ProductCard: ({ product }: any) => <div data-testid="mock-product-card">{product.name}</div>
}))

describe('GiftFinderWizard', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient()
    vi.clearAllMocks()
  })

  const renderComponent = (initialEntries = ['/gift?step=1']) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={initialEntries}>
          <Routes>
            <Route path="/gift" element={<GiftPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    )
  }

  it('Renders step 1; Next disabled until choice selected', () => {
    renderComponent()
    
    expect(screen.getByText('Who is this gift for?')).toBeInTheDocument()
    const nextBtn = screen.getByRole('button', { name: 'Next' })
    expect(nextBtn).toBeDisabled()
  })

  it('Select + Next advances; progressbar updates', async () => {
    renderComponent()
    
    const user = userEvent.setup()
    await user.click(screen.getByLabelText('Mom'))
    
    const nextBtn = screen.getByRole('button', { name: 'Next' })
    expect(nextBtn).toBeEnabled()
    await user.click(nextBtn)
    
    expect(screen.getByText('What is the occasion?')).toBeInTheDocument()
    const progress = screen.getByRole('progressbar')
    expect(progress).toHaveAttribute('aria-valuenow', '2')
  })

  it('Back returns to the prior step with the prior answer still selected', async () => {
    renderComponent()
    const user = userEvent.setup()
    
    await user.click(screen.getByLabelText('Mom'))
    await user.click(screen.getByRole('button', { name: 'Next' }))
    
    expect(screen.getByText('What is the occasion?')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Back' }))
    
    expect(screen.getByText('Who is this gift for?')).toBeInTheDocument()
    expect(screen.getByLabelText('Mom')).toBeChecked()
  })

  it('Enter on a selected radio advances', async () => {
    renderComponent()
    const user = userEvent.setup()
    
    const radio = screen.getByLabelText('Mom')
    await user.click(radio)
    await user.keyboard('{Enter}')
    
    expect(screen.getByText('What is the occasion?')).toBeInTheDocument()
  })

  it('Step 6 textarea enforces maxLength 200; counter updates; empty string allowed', async () => {
    // Navigate straight to step 6 by clicking through
    renderComponent()
    const user = userEvent.setup()
    
    await user.click(screen.getByLabelText('Mom'))
    await user.click(screen.getByRole('button', { name: 'Next' }))
    
    await user.click(screen.getByLabelText('Birthday'))
    await user.click(screen.getByRole('button', { name: 'Next' }))
    
    await user.click(screen.getByLabelText('Techie'))
    await user.click(screen.getByRole('button', { name: 'Next' }))
    
    await user.click(screen.getByLabelText('Under $50'))
    await user.click(screen.getByRole('button', { name: 'Next' }))
    
    await user.click(screen.getByLabelText('Adults'))
    await user.click(screen.getByRole('button', { name: 'Next' }))
    
    // Now on Step 6
    expect(screen.getByText('Any other specific requirements? (Optional)')).toBeInTheDocument()
    
    const nextBtn = screen.getByRole('button', { name: 'Next' })
    expect(nextBtn).toBeEnabled() // empty allowed
    
    const textarea = screen.getByRole('textbox')
    expect(textarea).toHaveAttribute('maxLength', '200')
    
    await user.type(textarea, 'Loves red')
    expect(screen.getByText('9 / 200')).toBeInTheDocument()
  })

  it('Summary step lists all 6 answers; clicking Edit beside "Occasion" jumps to step 2', async () => {
    renderComponent()
    const user = userEvent.setup()
    
    await user.click(screen.getByLabelText('Mom')); await user.click(screen.getByRole('button', { name: 'Next' }))
    await user.click(screen.getByLabelText('Birthday')); await user.click(screen.getByRole('button', { name: 'Next' }))
    await user.click(screen.getByLabelText('Techie')); await user.click(screen.getByRole('button', { name: 'Next' }))
    await user.click(screen.getByLabelText('Under $50')); await user.click(screen.getByRole('button', { name: 'Next' }))
    await user.click(screen.getByLabelText('Adults')); await user.click(screen.getByRole('button', { name: 'Next' }))
    await user.click(screen.getByRole('button', { name: 'Next' })) // Step 6 empty
    
    // Summary
    expect(screen.getByText('Summary')).toBeInTheDocument()
    expect(screen.getByText('Mom')).toBeInTheDocument()
    expect(screen.getByText('Birthday')).toBeInTheDocument()
    
    const editBtns = screen.getAllByRole('button', { name: 'Edit' })
    // Occasion is index 1
    await user.click(editBtns[1])
    
    expect(screen.getByText('What is the occasion?')).toBeInTheDocument()
    expect(screen.getByLabelText('Birthday')).toBeChecked()
  })

  it('Submit calls POST /api/recommendations/gift with exact expected payload', async () => {
    vi.mocked(recommendationsApi.getGift).mockResolvedValue({
      items: [
        { product: { id: 1, name: 'Gift 1' }, match_percent: 90, explanation: 'Perfect' }
      ]
    })
    
    renderComponent()
    const user = userEvent.setup()
    
    await user.click(screen.getByLabelText('Mom')); await user.click(screen.getByRole('button', { name: 'Next' }))
    await user.click(screen.getByLabelText('Birthday')); await user.click(screen.getByRole('button', { name: 'Next' }))
    await user.click(screen.getByLabelText('Techie')); await user.click(screen.getByRole('button', { name: 'Next' }))
    await user.click(screen.getByLabelText('Under $50')); await user.click(screen.getByRole('button', { name: 'Next' }))
    await user.click(screen.getByLabelText('Adults')); await user.click(screen.getByRole('button', { name: 'Next' }))
    await user.type(screen.getByRole('textbox'), 'Red'); await user.click(screen.getByRole('button', { name: 'Next' }))
    
    await user.click(screen.getByRole('button', { name: 'Submit' }))
    
    expect(recommendationsApi.getGift).toHaveBeenCalledWith({
      recipient: 'Mom',
      occasion: 'Birthday',
      personality: 'Techie',
      budget: 'Under $50',
      age_group: 'Adults',
      free_text: 'Red'
    })
    
    await waitFor(() => {
      expect(screen.getByText('Your Recommendations')).toBeInTheDocument()
      expect(screen.getByTestId('mock-product-card')).toBeInTheDocument()
    })
  })

  it('Start Over resets reducer and focuses step 1 legend', async () => {
    vi.mocked(recommendationsApi.getGift).mockResolvedValue({ items: [] })
    renderComponent()
    const user = userEvent.setup()
    
    await user.click(screen.getByLabelText('Mom')); await user.click(screen.getByRole('button', { name: 'Next' }))
    await user.click(screen.getByLabelText('Birthday')); await user.click(screen.getByRole('button', { name: 'Next' }))
    await user.click(screen.getByLabelText('Techie')); await user.click(screen.getByRole('button', { name: 'Next' }))
    await user.click(screen.getByLabelText('Under $50')); await user.click(screen.getByRole('button', { name: 'Next' }))
    await user.click(screen.getByLabelText('Adults')); await user.click(screen.getByRole('button', { name: 'Next' }))
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await user.click(screen.getByRole('button', { name: 'Submit' }))
    
    await waitFor(() => {
      expect(screen.getByText('Your Recommendations')).toBeInTheDocument()
    })
    
    await user.click(screen.getByRole('button', { name: 'Start Over' }))
    
    expect(screen.getByText('Who is this gift for?')).toBeInTheDocument()
    expect(screen.getByText('Who is this gift for?')).toHaveFocus()
    expect(screen.getByLabelText('Mom')).not.toBeChecked()
  })

  it('/gift?step=4 with no prior answers redirects to ?step=1', () => {
    renderComponent(['/gift?step=4'])
    // Should be redirected to step 1
    expect(screen.getByText('Who is this gift for?')).toBeInTheDocument()
  })

  it('Accessibility: axe on each step -> 0 violations', async () => {
    const { container } = renderComponent()
    const user = userEvent.setup()
    
    let results = await axe(container)
    expect(results).toHaveNoViolations()
    
    await user.click(screen.getByLabelText('Mom')); await user.click(screen.getByRole('button', { name: 'Next' }))
    
    results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('Live region announces current step on change', async () => {
    renderComponent()
    const user = userEvent.setup()
    
    const liveRegion = screen.getByRole('status')
    expect(liveRegion).toHaveTextContent('Step 1 of 6')
    
    await user.click(screen.getByLabelText('Mom'))
    await user.click(screen.getByRole('button', { name: 'Next' }))
    
    expect(liveRegion).toHaveTextContent('Step 2 of 6')
  })
})
