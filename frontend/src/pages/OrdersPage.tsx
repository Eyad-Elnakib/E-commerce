import React, { useEffect, useState } from 'react'
import { ordersApi } from '../api/orders'
import type { Order } from '../api/orders'
import { useAuthStore } from '../store/authStore'
import { useNavigate } from 'react-router-dom'
import { ScrollingMessage } from '../components/ScrollingMessage'

export const OrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { isAuthenticated } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login')
      return
    }
    const fetchOrders = async () => {
      try {
        const data = await ordersApi.getOrders()
        setOrders(data)
      } catch (err) {
        setError('Failed to load orders')
      } finally {
        setLoading(false)
      }
    }
    fetchOrders()
  }, [isAuthenticated, navigate])

  if (loading) return <div className="p-8 text-center text-[var(--text-color-secondary)]">Loading orders...</div>

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
      <h1 className="text-3xl font-bold mb-8 text-[var(--text-color)]">Order History</h1>
      
      {error && (
        <div className="flex justify-center items-center py-24 text-[var(--text-color)] w-full">
          <ScrollingMessage text={error} />
        </div>
      )}

      {orders.length === 0 ? null : (
        <div className="space-y-6">
          {orders.map(order => (
            <div key={order.id} className="bg-[var(--bg-card)] rounded-[var(--radius-lg)] border border-[var(--border-color)] overflow-hidden">
              <div className="bg-[var(--bg-secondary)] px-6 py-4 border-b border-[var(--border-color)] flex flex-wrap justify-between gap-4">
                <div>
                  <div className="text-sm text-[var(--text-color-secondary)]">Order Placed</div>
                  <div className="font-medium">{new Date(order.created_at).toLocaleDateString()}</div>
                </div>
                <div>
                  <div className="text-sm text-[var(--text-color-secondary)]">Total</div>
                  <div className="font-medium">${order.total.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-sm text-[var(--text-color-secondary)]">Status</div>
                  <div className={`font-medium ${order.status === 'confirmed' ? 'text-[var(--color-success)]' : ''}`}>
                    {order.status.toUpperCase()}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-[var(--text-color-secondary)]">Order #</div>
                  <div className="font-medium">{order.id}</div>
                </div>
              </div>
              <div className="p-6">
                <h4 className="font-semibold mb-4">Items</h4>
                <div className="space-y-3">
                  {order.items.map(item => (
                    <div key={item.id} className="flex justify-between items-center text-sm">
                      <div>Product #{item.product_id} x {item.quantity}</div>
                      <div>${(item.price_at_purchase * item.quantity).toFixed(2)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
