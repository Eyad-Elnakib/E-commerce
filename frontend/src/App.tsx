import React, { useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { Navbar } from './components/Navbar'
import { AuthPage } from './pages/AuthPage'
import { FeedPage } from './pages/FeedPage'
import { BrowsePage } from './pages/BrowsePage'
import { ProductDetailPage } from './pages/ProductDetailPage'
import { GiftPage } from './pages/GiftPage'
import { CartPage } from './pages/CartPage'
import { OrdersPage } from './pages/OrdersPage'
import { MetricsDashboardPage } from './pages/admin/MetricsDashboardPage'
import { UserMetricsPage } from './pages/admin/UserMetricsPage'
import { AdminProductsPage } from './pages/admin/AdminProductsPage'
import { AdminSimulationPage } from './pages/admin/AdminSimulationPage'
import { FavouritesPage } from './pages/FavouritesPage'
import { LandingPage } from './pages/LandingPage'
import { CreditCardPage } from './pages/CreditCardPage'
import { useAuthStore } from './store/authStore'
import { useToast } from './components/ToastProvider'

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated())
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />
  }

  return <>{children}</>
}

const RoleRoute: React.FC<{ role: string, children: React.ReactNode }> = ({ role, children }) => {
  const user = useAuthStore((state) => state.user)
  const navigate = useNavigate()
  const toast = useToast()
  
  useEffect(() => {
    if (user && user.role !== role) {
      toast.error({ title: 'Access Denied', body: "You don't have access to that page" })
      navigate('/', { replace: true })
    }
  }, [user, role, navigate, toast])

  if (!user || user.role !== role) {
    return null
  }

  return <>{children}</>
}

function App() {
  const { isAuthenticated } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()

  // Redirect authenticated users away from auth pages
  useEffect(() => {
    if (isAuthenticated() && (location.pathname === '/login' || location.pathname === '/register')) {
      navigate('/browse', { replace: true })
    }
  }, [isAuthenticated, location, navigate])

  return (
    <div className="min-h-screen text-[var(--text-color)]">
      <Navbar />
      <main className="pt-20">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/register" element={<AuthPage />} />
          <Route path="/login" element={<AuthPage />} />
          <Route path="/browse" element={<BrowsePage />} />
          <Route path="/product/:id" element={<ProductDetailPage />} />
          <Route path="/gift" element={<GiftPage />} />
          <Route 
            path="/feed" 
            element={
              <ProtectedRoute>
                <FeedPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/cart" 
            element={
              <ProtectedRoute>
                <CartPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/checkout/credit" 
            element={
              <ProtectedRoute>
                <CreditCardPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/orders" 
            element={
              <ProtectedRoute>
                <OrdersPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/favourites" 
            element={
              <ProtectedRoute>
                <FavouritesPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/metrics" 
            element={
              <ProtectedRoute>
                <RoleRoute role="admin">
                  <MetricsDashboardPage />
                </RoleRoute>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/metrics/users" 
            element={
              <ProtectedRoute>
                <RoleRoute role="admin">
                  <UserMetricsPage />
                </RoleRoute>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/products" 
            element={
              <ProtectedRoute>
                <RoleRoute role="admin">
                  <AdminProductsPage />
                </RoleRoute>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/simulation" 
            element={
              <ProtectedRoute>
                <RoleRoute role="admin">
                  <AdminSimulationPage />
                </RoleRoute>
              </ProtectedRoute>
            } 
          />
        </Routes>
      </main>
    </div>
  )
}

export default App
