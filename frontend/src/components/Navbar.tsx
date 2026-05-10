import React from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

export const Navbar: React.FC = () => {
  const { user, clearAuth } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const isAdminPage = location.pathname.startsWith('/admin')

  const handleLogout = () => {
    clearAuth()
    navigate('/login')
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex justify-center py-4 px-6 pointer-events-none font-['Outfit']">
      <div className="navbar-menu-container pointer-events-auto bg-white/80 backdrop-blur-md border border-black/5 shadow-lg rounded-2xl flex items-center p-2 gap-1">
        {/* Brand/Home */}
        <Link to="/" className="nav-expanding-link" style={{ color: 'var(--color-brand-maroon)' }} aria-label="Home">
          <span className="link-icon">home</span>
          <span className="link-title font-bold">RecSys</span>
        </Link>

        {/* Divider */}
        <div className="h-6 w-[1px] bg-black/10 mx-1" />

        {/* Navigation Links */}
        {!isAdminPage && (
          <>
            <Link to="/browse" className="nav-expanding-link" aria-label="Browse">
              <span className="link-icon">explore</span>
              <span className="link-title">Browse</span>
            </Link>
            {user && (
              <Link to="/feed" className="nav-expanding-link" aria-label="Feed">
                <span className="link-icon">dynamic_feed</span>
                <span className="link-title">Feed</span>
              </Link>
            )}
            <Link to="/gift" className="nav-expanding-link" aria-label="Gift Matcher">
              <span className="link-icon">featured_seasonal_and_gifts</span>
              <span className="link-title">Gift Matcher</span>
            </Link>
          </>
        )}

        {user && (
          <>
            {!isAdminPage && (
              <>
                <Link to="/favourites" className="nav-expanding-link" aria-label="Favourites">
                  <span className="link-icon">favorite</span>
                  <span className="link-title">Favourites</span>
                </Link>
                <Link to="/cart" className="nav-expanding-link" aria-label="Cart">
                  <span className="link-icon">shopping_cart</span>
                  <span className="link-title">Cart</span>
                </Link>
                <Link to="/orders" className="nav-expanding-link" aria-label="Orders">
                  <span className="link-icon">receipt_long</span>
                  <span className="link-title">Orders</span>
                </Link>
              </>
            )}
            {user.role === 'admin' && (
              <>
                <Link to="/admin/products" className="nav-expanding-link" aria-label="Products">
                  <span className="link-icon">inventory_2</span>
                  <span className="link-title">Products</span>
                </Link>
                <Link to="/admin/simulation" className="nav-expanding-link" aria-label="Simulation">
                  <span className="link-icon">model_training</span>
                  <span className="link-title">Simulation</span>
                </Link>
                <Link to="/admin/metrics" className="nav-expanding-link" aria-label="Global Metrics">
                  <span className="link-icon">analytics</span>
                  <span className="link-title">Global Metrics</span>
                </Link>
                <Link to="/admin/metrics/users" className="nav-expanding-link" aria-label="User Metrics">
                  <span className="link-icon">group</span>
                  <span className="link-title">User Metrics</span>
                </Link>
              </>
            )}
          </>
        )}

        {/* User / Auth section */}
        <div className="h-6 w-[1px] bg-black/10 mx-1" />
        
        {user ? (
          <>
            <div className="nav-expanding-link group/user" style={{ cursor: 'default' }}>
              <span className="link-icon">person</span>
              <span className="link-title font-medium">{user.username}</span>
            </div>
            <button
              onClick={handleLogout}
              className="nav-expanding-link"
              style={{ color: '#ef4444' }}
              aria-label="Logout"
            >
              <span className="link-icon">logout</span>
              <span className="link-title">Logout</span>
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="nav-expanding-link" aria-label="Login">
              <span className="link-icon">login</span>
              <span className="link-title">Sign In</span>
            </Link>
            <Link to="/register" className="nav-expanding-link" style={{ backgroundColor: 'var(--color-brand-maroon)', color: '#fff' }} aria-label="Register">
              <span className="link-icon">person_add</span>
              <span className="link-title">Sign Up</span>
            </Link>
          </>
        )}
      </div>
    </nav>
  )
}
