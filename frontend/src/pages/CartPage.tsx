import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { cartApi } from '../api/cart'
import type { CartItem } from '../api/cart'
import { ordersApi } from '../api/orders'
import { useToast } from '../components/ToastProvider'
import { useAuthStore } from '../store/authStore'
import { useTelemetry } from '../hooks/useTelemetry'
import { getImageSrc } from '../utils/image'
import { SortButton } from '../components/SortButton'
import { ScrollingMessage } from '../components/ScrollingMessage'

export const CartPage: React.FC = () => {
  const [items, setItems] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [showPaymentOptions, setShowPaymentOptions] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const toast = useToast()

  const handleSort = (type: 'cheapest' | 'expensive' | 'alphabetic') => {
    const sorted = [...items]
    if (type === 'cheapest') {
      sorted.sort((a, b) => (a.product?.price || 0) - (b.product?.price || 0))
    } else if (type === 'expensive') {
      sorted.sort((a, b) => (b.product?.price || 0) - (a.product?.price || 0))
    } else if (type === 'alphabetic') {
      sorted.sort((a, b) => (a.product?.name || '').localeCompare(b.product?.name || ''))
    }
    setItems(sorted)
  }
  const { track } = useTelemetry()
  const { isAuthenticated } = useAuthStore()

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login')
      return
    }
    loadCart()
  }, [])

  const loadCart = async () => {
    try {
      const data = await cartApi.getCart()
      setItems(data)
    } catch (err) {
      setError('Failed to load cart')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateQuantity = async (item: CartItem, newQty: number) => {
    if (newQty < 0) return
    try {
      if (newQty === 0) {
        await cartApi.updateQuantity(item.id, 0)
        setItems(items.filter(i => i.id !== item.id))
        track('cart_remove', item.product_id)
      } else {
        const updated = await cartApi.updateQuantity(item.id, newQty)
        if (updated) {
          setItems(items.map(i => i.id === updated.id ? updated : i))
        }
      }
    } catch (err: any) {
      toast.error({ title: 'Error', body: err.response?.data?.detail || 'Failed to update cart' })
    }
  }

  const processCheckout = async (method: 'cash' | 'card') => {
    if (items.length === 0) return
    setCheckoutLoading(true)
    const idempotencyKey = `order-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    track('checkout', undefined, { method })

    try {
      await ordersApi.createOrder(method, idempotencyKey)
      toast.success({ title: 'Success', body: `Order placed successfully using ${method}!` })
      navigate('/orders')
    } catch (err: any) {
      toast.error({ title: 'Checkout Failed', body: err.response?.data?.detail || 'An error occurred' })
    } finally {
      setCheckoutLoading(false)
      setShowPaymentOptions(false)
    }
  }

  const total = items.reduce((sum, item) => sum + (item.product?.price || 0) * item.quantity, 0)

  if (loading) return <div className="p-8 text-center text-[var(--text-color-secondary)]">Loading cart...</div>

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
      <h1 className="text-3xl font-bold mb-8 text-[var(--text-color)]">Your Cart</h1>

      {error && (
        <div className="flex justify-center items-center py-24 text-[var(--text-color)] w-full">
          <ScrollingMessage text={error} />
        </div>
      )}

      {items.length === 0 ? null : (
        <div className="flex flex-col md:flex-row gap-8">
          <div className="md:w-2/3 space-y-4">
            {items.map(item => (
              <div key={item.id} className="flex gap-4 p-4 bg-[var(--bg-card)] rounded-[var(--radius-lg)] border border-[var(--border-color)]">
                <div className="w-24 h-24 bg-[var(--bg-tertiary)] rounded overflow-hidden flex-shrink-0">
                  {item.product?.image_file ? (
                    <img src={getImageSrc(item.product.image_file)} alt={item.product.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-[var(--text-color-muted)]">No img</div>
                  )}
                </div>
                <div className="flex-grow flex flex-col justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">{item.product?.name}</h3>
                    <p className="text-sm text-[var(--text-color-secondary)]">${item.product?.price.toFixed(2)} each</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center border border-[var(--border-color)] rounded">
                      <button onClick={() => handleUpdateQuantity(item, item.quantity - 1)} className="px-3 py-1 hover:bg-[var(--bg-secondary)]">-</button>
                      <span className="px-3 py-1 border-x border-[var(--border-color)]">{item.quantity}</span>
                      <button onClick={() => handleUpdateQuantity(item, item.quantity + 1)} className="px-3 py-1 hover:bg-[var(--bg-secondary)]">+</button>
                    </div>
                    <button onClick={() => handleUpdateQuantity(item, 0)} className="text-sm text-[var(--color-error)] hover:underline">
                      Remove
                    </button>
                  </div>
                </div>
                <div className="font-bold text-lg">
                  ${((item.product?.price || 0) * item.quantity).toFixed(2)}
                </div>
              </div>
            ))}
          </div>

          <div className="md:w-1/3">
            <div className="bg-[var(--bg-card)] p-6 rounded-[var(--radius-lg)] border border-[var(--border-color)] sticky top-4">
              <h2 className="text-xl font-bold mb-4">Order Summary</h2>
              <div className="flex justify-between mb-4">
                <span>Subtotal ({items.reduce((s, i) => s + i.quantity, 0)} items)</span>
                <span className="font-bold">${total.toFixed(2)}</span>
              </div>
              <div className={`overflow-hidden transition-all duration-300 ${showPaymentOptions ? 'max-h-32' : 'max-h-14'}`}>
                {!showPaymentOptions ? (
                  <button
                    onClick={() => setShowPaymentOptions(true)}
                    disabled={checkoutLoading}
                    className="w-full h-14 bg-[var(--color-brand-maroon)] text-white rounded font-bold hover:bg-[var(--color-brand-maroon-light)] transition-colors disabled:opacity-50"
                  >
                    Checkout
                  </button>
                ) : (
                  <div className="flex gap-2 h-full flex-col">
                    <p className="text-sm text-center text-[var(--text-color-secondary)] mb-1">Select Payment Method</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => processCheckout('cash')}
                        disabled={checkoutLoading}
                        className="flex-1 h-12 bg-green-600 text-white rounded font-bold hover:bg-green-500 transition-colors disabled:opacity-50"
                      >
                        {checkoutLoading ? 'Processing...' : 'Cash'}
                      </button>
                      <button
                        onClick={() => navigate('/checkout/credit')}
                        disabled={checkoutLoading}
                        className="flex-1 h-12 bg-blue-600 text-white rounded font-bold hover:bg-blue-500 transition-colors disabled:opacity-50"
                      >
                        Credit
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      <SortButton onSort={handleSort} />
    </div>
  )
}
