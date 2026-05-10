import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import { ToastProvider, useToast } from '../components/ToastProvider'
import React from 'react'

expect.extend(toHaveNoViolations)

const TestComponent = () => {
  const toast = useToast()
  
  return (
    <div>
      <button onClick={() => toast.success({ title: 'Success', body: 'Added' })}>
        Add Success
      </button>
      <button onClick={() => toast.error({ title: 'Error', body: 'Failed' })}>
        Add Error
      </button>
      <button 
        onClick={() => toast.info({ 
          title: 'Action', 
          body: 'Do it',
          action: { label: 'Undo', onClick: () => window.dispatchEvent(new Event('undo-clicked')) }
        })}
      >
        Add Action
      </button>
    </div>
  )
}

describe('Toast System', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  
  afterEach(() => {
    vi.useRealTimers()
  })

  const renderWithProvider = () => {
    return render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )
  }

  it('Renders toasts and auto-dismisses after 5000ms', () => {
    renderWithProvider()
    const user = userEvent.setup({ delay: null })
    
    act(() => {
      screen.getByText('Add Success').click()
    })
    
    expect(screen.getByText('Success')).toBeInTheDocument()
    
    act(() => {
      vi.advanceTimersByTime(4999)
    })
    expect(screen.queryByText('Success')).toBeInTheDocument()
    
    act(() => {
      vi.advanceTimersByTime(2)
    })
    expect(screen.queryByText('Success')).not.toBeInTheDocument()
  })

  it('Mouse enter pauses the timer, mouse leave resumes it', () => {
    renderWithProvider()
    
    act(() => {
      screen.getByText('Add Error').click()
    })
    
    const toastItem = screen.getByText('Error').closest('li')!
    
    act(() => {
      vi.advanceTimersByTime(2500)
    })
    
    // Mouse enter pauses
    act(() => {
      toastItem.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))
    })
    
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(screen.getByText('Error')).toBeInTheDocument()
    
    // Mouse leave resumes
    act(() => {
      toastItem.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }))
    })
    
    act(() => {
      vi.advanceTimersByTime(2500)
    })
    expect(screen.queryByText('Error')).not.toBeInTheDocument()
  })

  it('Action button calls onClick and dismisses toast', () => {
    renderWithProvider()
    
    let clicked = false
    window.addEventListener('undo-clicked', () => { clicked = true })
    
    act(() => {
      screen.getByText('Add Action').click()
    })
    
    const undoBtn = screen.getByRole('button', { name: 'Undo' })
    act(() => {
      undoBtn.click()
    })
    
    expect(clicked).toBe(true)
    expect(screen.queryByText('Action')).not.toBeInTheDocument()
  })

  it('Max 3 toasts visible; older toasts evict when >3', () => {
    renderWithProvider()
    
    act(() => {
      screen.getByText('Add Success').click()
      screen.getByText('Add Error').click()
      screen.getByText('Add Action').click()
    })
    
    expect(screen.getByText('Success')).toBeInTheDocument()
    expect(screen.getByText('Error')).toBeInTheDocument()
    expect(screen.getByText('Action')).toBeInTheDocument()
    
    // Add 4th
    act(() => {
      screen.getByText('Add Error').click()
    })
    
    expect(screen.queryByText('Success')).not.toBeInTheDocument()
    expect(screen.getAllByText('Error').length).toBe(2)
  })

  it('Accessibility: axe-core passes', async () => {
    vi.useRealTimers() // axe-core needs real timers
    const { container } = renderWithProvider()
    
    await act(async () => {
      screen.getByText('Add Success').click()
    })
    
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})
