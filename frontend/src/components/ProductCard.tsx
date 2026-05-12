import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { Product } from '../api/products'
import { favouritesApi } from '../api/favourites'
import { useTelemetry } from '../hooks/useTelemetry'
import { useToast } from '../components/ToastProvider'
import { useAuthStore } from '../store/authStore'
import { cartApi } from '../api/cart' // Assuming cart API exists or we just call the prop
import { useQueryClient } from '@tanstack/react-query'
import { getImageSrc } from '../utils/image'

interface ProductCardProps {
  product: Product
  matchPercent?: number
  onFavouriteToggle?: (id: number) => void
  onAddToCart?: (id: number) => void
  compact?: boolean
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  matchPercent,
  onFavouriteToggle,
  onAddToCart
}) => {
  const navigate = useNavigate()
  const { track } = useTelemetry()
  const toast = useToast()
  const { isAuthenticated } = useAuthStore()
  const queryClient = useQueryClient()

  const [isFavourited, setIsFavourited] = useState(product.is_favourited)
  const [isToggling, setIsToggling] = useState(false)
  const [flipped, setFlipped] = useState(false)

  const [reducedMotion, setReducedMotion] = useState(() => {
    // Only access window.matchMedia on the client side
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches
    }
    return false
  })

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  const handleCardClick = () => {
    track('click', product.id)
  }


  const handleFavouriteClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (onFavouriteToggle) {
      onFavouriteToggle(product.id)
      return
    }

    if (!isAuthenticated()) {
      navigate('/login')
      return
    }

    if (isToggling) return

    setIsToggling(true)
    const newStatus = !isFavourited

    setIsFavourited(newStatus)
    track('favourite', product.id, { action: newStatus ? 'add' : 'remove' })

    try {
      if (newStatus) {
        await favouritesApi.addFavourite(product.id)
      } else {
        await favouritesApi.removeFavourite(product.id)
      }
      queryClient.invalidateQueries({ queryKey: ['feed'] })
    } catch {
      setIsFavourited(!newStatus)
      toast.error({ title: 'Error', body: 'Failed to update favourites.' })
    } finally {
      setIsToggling(false)
    }
  }

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (product.stock === 0) return

    if (onAddToCart) {
      onAddToCart(product.id)
      return
    }

    if (!isAuthenticated()) {
      navigate('/login')
      return
    }

    track('cart_add', product.id)
    try {
      await cartApi.addToCart(product.id, 1)
      toast.success({ title: 'Added', body: 'Added to cart' })
      queryClient.invalidateQueries({ queryKey: ['cart'] })
    } catch {
      toast.error({ title: 'Error', body: 'Failed to add to cart' })
    }
  }

  const isOutOfStock = product.stock === 0

  // Transition classes
  const flipContainerClass = reducedMotion ? 'crossfade' : 'rotate'

  return (
    <div
      data-testid={`product-card-${product.id}`}
      className={`relative w-36 sm:w-44 shrink-0 mx-auto aspect-[4/5] perspective-1000 group hover-flip ${flipped ? 'is-flipped' : ''}`}
      onMouseLeave={() => setFlipped(false)}
    >
      <div className={`flip-card-inner ${flipContainerClass}`}>

        {/* FRONT FACE */}
        <div className="flip-card-front flex flex-col overflow-hidden rounded-[3rem] border border-white/30 bg-gradient-to-br from-white/40 to-gray-400/[0.24] backdrop-blur-[100px] shadow-[inset_0_2px_8px_rgba(255,255,255,0.7),_0_8px_32px_rgba(0,0,0,0.06)] hover:shadow-[inset_0_3px_12px_rgba(255,255,255,0.9),_0_12px_40px_rgba(0,0,0,0.11)] transition-all duration-500">
          <Link
            to={`/product/${product.id}`}
            onClick={handleCardClick}
            className="block h-[46%] bg-transparent flex items-center justify-center relative overflow-hidden focus-visible:outline-none"
            tabIndex={flipped ? -1 : 0}
          >
            {product.image_file ? (
              <img
                src={getImageSrc(product.image_file)}
                alt={product.name}
                className="object-contain w-full h-full p-3 hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="text-[var(--text-color-muted)] text-sm">No Image</div>
            )}

            {/* Glassmorphism Tags */}
            <div className="absolute top-3 left-3 flex flex-col gap-2">
              {product.category && (
                <span className="bg-white/30 backdrop-blur-md text-[var(--text-color)] text-[10px] font-bold px-2 py-1 rounded-full border border-white/40 shadow-sm">
                  {product.category}
                </span>
              )}
            </div>

            {matchPercent !== undefined && (
              <span
                aria-label={`${matchPercent}% match`}
                className="absolute top-3 right-3 bg-[var(--color-brand-maroon)] text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-lg"
              >
                {matchPercent}%
              </span>
            )}
          </Link>

          <div className="p-4 flex flex-col flex-grow bg-transparent">
            <h3 className="font-bold text-base text-[var(--text-color)] truncate mb-1" title={product.name}>
              {product.name}
            </h3>
            <p className="text-[10px] text-[var(--text-color-secondary)] mb-3 font-medium">
              {product.brand || 'Generic'}
            </p>
            
            <div className="mt-auto flex items-center justify-between">
              <span className="font-black text-lg text-[var(--text-color)]">
                ${product.price.toFixed(2)}
              </span>
              <div className="flex items-center gap-1 bg-white/30 backdrop-blur-md px-1.5 py-0.5 rounded-full border border-white/40 shadow-sm">
                <span className="text-yellow-500 text-[10px]">★</span>
                <span className="text-[9px] font-bold text-[var(--text-color)]">
                  {product.avg_rating ? product.avg_rating.toFixed(1) : '—'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* BACK FACE */}
        <div className="flip-card-back flex flex-col items-center justify-center p-5 space-y-3 text-center rounded-[3rem] border border-white/30 bg-gradient-to-br from-white/40 to-gray-400/[0.24] backdrop-blur-[100px] shadow-[inset_0_2px_8px_rgba(255,255,255,0.7),_0_8px_32px_rgba(0,0,0,0.06)] hover:shadow-[inset_0_3px_12px_rgba(255,255,255,0.9),_0_12px_40px_rgba(0,0,0,0.11)] transition-all duration-500">
          <h3 className="text-lg font-bold text-[var(--text-color)] truncate w-full px-2" title={product.name}>
            {product.name}
          </h3>

          <div className="flex flex-col gap-3 w-full max-w-[200px]">
            <button
              onClick={handleFavouriteClick}
              disabled={isToggling}
              tabIndex={flipped ? 0 : -1}
              className="flex items-center justify-center gap-2 w-full py-2 px-4 rounded font-medium border border-[var(--color-brand-maroon)] text-[var(--color-brand-maroon)] hover:bg-[var(--bg-tertiary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-maroon)] transition-colors back-btn-favourite"
            >
              <svg className={`w-5 h-5 ${isFavourited ? 'fill-current' : 'fill-none'}`} stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={isFavourited ? 0 : 2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              {isFavourited ? 'Favourited' : 'Favourite'}
            </button>

            <button
              onClick={handleAddToCart}
              tabIndex={flipped ? 0 : -1}
              aria-disabled={isOutOfStock}
              disabled={isOutOfStock}
              title={isOutOfStock ? "Out of stock" : "Add to Cart"}
              className="flex items-center justify-center gap-2 w-full py-2 px-4 rounded font-medium bg-[var(--color-brand-maroon)] text-white hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-maroon)] focus-visible:ring-offset-2 transition-colors back-btn-cart"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Add to Cart
            </button>

            <Link
              to={`/product/${product.id}`}
              onClick={handleCardClick}
              tabIndex={flipped ? 0 : -1}
              className="mt-2 text-sm text-[var(--text-color-secondary)] hover:text-[var(--color-brand-maroon)] underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-maroon)]"
            >
              View Full Details
            </Link>

            <button
              onClick={(e) => { e.stopPropagation(); setFlipped(false); }}
              tabIndex={flipped ? 0 : -1}
              className="mt-2 text-sm text-gray-500 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-maroon)]"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
