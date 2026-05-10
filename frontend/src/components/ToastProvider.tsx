/**
 * Toast Notifications with Undo (Feature D3)
 * Built early to support A1 registration toasts.
 */
import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'

export interface ToastOptions {
  title: string
  body: string
  variant?: 'success' | 'error' | 'info'
  action?: {
    label: string
    onClick: () => void
  }
}

interface Toast extends ToastOptions {
  id: string
  createdAt: number
}

interface ToastContextType {
  success: (options: Omit<ToastOptions, 'variant'>) => string
  error: (options: Omit<ToastOptions, 'variant'>) => string
  info: (options: Omit<ToastOptions, 'variant'>) => string
  dismiss: (id: string) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

export const useToast = () => {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

const ToastItem: React.FC<{
  toast: Toast
  onDismiss: (id: string) => void
}> = ({ toast, onDismiss }) => {
  const [timeLeft, setTimeLeft] = useState(5000)
  const isPaused = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const startTimeRef = useRef(performance.now())

  useEffect(() => {
    const resume = () => {
      timerRef.current = setTimeout(() => {
        onDismiss(toast.id)
      }, timeLeft)
    }
    
    resume()
    
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [timeLeft, toast.id, onDismiss])

  const handleMouseEnter = () => {
    isPaused.current = true
    if (timerRef.current) clearTimeout(timerRef.current)
    const elapsed = performance.now() - startTimeRef.current
    setTimeLeft(prev => Math.max(0, prev - elapsed))
  }

  const handleMouseLeave = () => {
    isPaused.current = false
    startTimeRef.current = performance.now()
    // It will re-trigger useEffect because timeLeft changed, or we can just set a new timer
    // but useEffect has [timeLeft], so it works automatically.
  }

  const handleActionClick = () => {
    if (toast.action) {
      toast.action.onClick()
    }
    onDismiss(toast.id)
  }

  const getVariantStyles = () => {
    switch (toast.variant) {
      case 'success':
        return { cardBg: 'bg-[#ff66a3]', headText: 'Success' }
      case 'error':
        return { cardBg: 'bg-[#e53935]', headText: 'Error' }
      case 'info':
      default:
        return { cardBg: 'bg-[#1ac2ff]', headText: 'Notification' }
    }
  }

  const { cardBg, headText } = getVariantStyles()

  return (
    <li
      role="status"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
      className={`relative w-[320px] transition-all duration-300 pointer-events-auto border-[3px] border-black shadow-[5px_5px_0_#000000] overflow-hidden ${cardBg}`}
    >
      {/* Header / Window Bar */}
      <div className="w-full h-10 bg-white px-4 flex items-center justify-between border-b-[3px] border-black">
        <span className="text-sm font-black uppercase tracking-wider text-black">
          {headText}
        </span>
        <button 
          onClick={() => onDismiss(toast.id)}
          className="text-black hover:scale-125 transition-transform"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content Area */}
      <div className="p-4 text-black">
        <strong className="block text-base font-black mb-1 leading-tight">
          {toast.title}
        </strong>
        <p className="text-sm font-bold opacity-90 leading-snug">
          {toast.body}
        </p>

        {toast.action && (
          <button
            onClick={handleActionClick}
            className="inline-block px-4 py-1.5 mt-4 border-[3px] border-black shadow-[4px_4px_0_#000000] font-black text-sm bg-[#4ade80] transition-all duration-300 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#000000] hover:bg-white active:translate-x-[4px] active:translate-y-[4px] active:shadow-none"
          >
            {toast.action.label.toUpperCase()}
          </button>
        )}
      </div>

      {/* Progress Bar (Neobrutalist Style) */}
      <div className="absolute bottom-0 left-0 h-2 bg-black opacity-20" style={{ width: `${(timeLeft / 5000) * 100}%` }} />
    </li>
  )
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((options: ToastOptions) => {
    const id = Math.random().toString(36).substring(2, 9)
    setToasts((prev) => {
      const next = [...prev, { ...options, id, createdAt: Date.now() }]
      if (next.length > 3) {
        return next.slice(next.length - 3) // Keep only the latest 3 (FIFO eviction of oldest)
      }
      return next
    })
    return id
  }, [])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const api: ToastContextType = {
    success: (opts) => addToast({ ...opts, variant: 'success' }),
    error: (opts) => addToast({ ...opts, variant: 'error' }),
    info: (opts) => addToast({ ...opts, variant: 'info' }),
    dismiss,
  }

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        role="region"
        aria-label="Notifications"
        aria-live="polite"
        className="fixed bottom-4 right-4 max-sm:left-4 z-50 flex flex-col gap-2 pointer-events-none"
      >
        <ol className="flex flex-col gap-2 m-0 p-0 list-none">
          {toasts.map((toast) => (
            <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
          ))}
        </ol>
      </div>
    </ToastContext.Provider>
  )
}
