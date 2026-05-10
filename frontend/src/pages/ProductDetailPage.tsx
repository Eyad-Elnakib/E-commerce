import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { productsApi } from '../api/products'
import type { Product } from '../api/products'
import { favouritesApi } from '../api/favourites'
import { cartApi } from '../api/cart'
import { getImageSrc } from '../utils/image'
import { useToast } from '../components/ToastProvider'
import { useAuthStore } from '../store/authStore'
import { useTrackView, useTelemetry } from '../hooks/useTelemetry'
import { ratingsApi } from '../api/ratings'
import { StarRating } from '../components/StarRating'
import { ScrollingMessage } from '../components/ScrollingMessage'

export const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const toast = useToast()
  const { isAuthenticated } = useAuthStore()
  const { track } = useTelemetry()

  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isTogglingFav, setIsTogglingFav] = useState(false)
  const [isAddingToCart, setIsAddingToCart] = useState(false)
  const [isRating, setIsRating] = useState(false)

  // Telemetry: Track view on mount if product exists
  useTrackView(product?.id)

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        if (!id) return
        const data = await productsApi.getProduct(id)
        setProduct(data)
      } catch (err: any) {
        if (err.response?.status === 404) {
          setError('Product not found or has been removed.')
        } else {
          setError('Failed to load product details.')
        }
      } finally {
        setLoading(false)
      }
    }
    fetchProduct()
  }, [id])

  const handleAddToCart = async () => {
    if (!product) return
    if (!isAuthenticated()) {
      navigate('/login')
      return
    }

    setIsAddingToCart(true)
    track('cart_add', product.id)
    try {
      await cartApi.addToCart(product.id, 1)
      toast.success({ title: 'Success', body: 'Added to cart!' })
    } catch (err: any) {
      toast.error({ title: 'Error', body: err.response?.data?.detail || 'Failed to add to cart' })
    } finally {
      setIsAddingToCart(false)
    }
  }

  const handleFavouriteToggle = async () => {
    if (!product) return
    if (!isAuthenticated()) {
      navigate('/login')
      return
    }

    if (isTogglingFav) return
    setIsTogglingFav(true)

    const newStatus = !product.is_favourited
    
    // Optimistic UI update
    setProduct({ ...product, is_favourited: newStatus })
    track('favourite', product.id, { action: newStatus ? 'add' : 'remove' })

    try {
      if (newStatus) {
        await favouritesApi.addFavourite(product.id)
      } else {
        await favouritesApi.removeFavourite(product.id)
      }
    } catch (error) {
      // Revert optimistic update
      setProduct({ ...product, is_favourited: !newStatus })
      toast.error({ title: 'Error', body: 'Failed to update favourites.' })
    } finally {
      setIsTogglingFav(false)
    }
  }

  const handleRatingSubmit = async (ratingValue: number) => {
    if (!product) return
    if (!isAuthenticated()) {
      navigate('/login')
      return
    }

    setIsRating(true)
    try {
      const res = await ratingsApi.addRating(product.id, ratingValue)
      // Optimistically update
      setProduct({ 
        ...product, 
        user_rating: res.user_rating,
        avg_rating: res.avg_rating
      })
      toast.success({ title: 'Rated', body: `You rated this ${ratingValue} stars.` })
    } catch (error) {
      toast.error({ title: 'Error', body: 'Failed to submit rating.' })
    } finally {
      setIsRating(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-8 flex justify-center">
        <div className="text-[var(--text-color-secondary)]">Loading product...</div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="max-w-7xl mx-auto p-8">
        <div className="flex justify-center items-center py-24 text-[var(--text-color)] w-full">
          <ScrollingMessage text={error || 'Product not found'} />
        </div>
        <button 
          onClick={() => navigate('/browse')}
          className="text-[var(--color-brand-maroon)] underline"
        >
          &larr; Back to browsing
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      <button 
        onClick={() => navigate('/browse')}
        className="text-[var(--text-color-secondary)] hover:text-[var(--color-brand-maroon)] mb-6 inline-flex items-center gap-1 transition-colors"
      >
        <span>&larr;</span> Back to browsing
      </button>

      <div className="bg-[var(--bg-card)] rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] border border-[var(--border-color)] overflow-hidden flex flex-col md:flex-row">
        
        {/* Image Section */}
        <div className="md:w-1/2 bg-[var(--bg-tertiary)] flex items-center justify-center p-8 aspect-square md:aspect-auto">
          {product.image_file ? (
            <img 
              src={getImageSrc(product.image_file)} 
              alt={product.name}
              className="max-w-full max-h-[500px] object-contain"
            />
          ) : (
            <div className="w-full h-64 md:h-full min-h-[300px] border-2 border-dashed border-[var(--border-color)] rounded-[var(--radius-md)] flex flex-col items-center justify-center text-[var(--text-color-muted)]">
              <svg className="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              <span>No Image Available</span>
            </div>
          )}
        </div>

        {/* Details Section */}
        <div className="md:w-1/2 p-6 md:p-10 flex flex-col">
          <div className="mb-2 flex items-center justify-between">
            <span className="bg-[var(--color-accent-sage)] text-[var(--text-color)] text-sm font-semibold px-2.5 py-1 rounded">
              {product.category || 'Uncategorised'}
            </span>
            <div className="flex items-center gap-1 text-[var(--text-color-secondary)]">
              <span className="text-yellow-500">★</span>
              <span>{product.avg_rating ? product.avg_rating.toFixed(1) : 'No ratings yet'}</span>
            </div>
          </div>

          <h1 className="text-3xl font-bold text-[var(--text-color)] mb-2">
            {product.name}
          </h1>
          <p className="text-[var(--text-color-secondary)] text-lg mb-6">
            By {product.brand || 'Generic'}
          </p>

          <div className="text-3xl font-bold text-[var(--text-color)] mb-8">
            ${product.price.toFixed(2)}
          </div>

          <div className="prose prose-sm text-[var(--text-color)] mb-8 flex-grow">
            <h3 className="text-lg font-semibold mb-2">Description</h3>
            <p className="whitespace-pre-line leading-relaxed">
              {product.description || 'No description available for this product.'}
            </p>
          </div>

          <div className="mb-8 p-4 bg-[var(--bg-tertiary)] rounded-[var(--radius-md)] border border-[var(--border-color)]">
            <h3 className="text-sm font-semibold text-[var(--text-color)] mb-2 uppercase tracking-wider">
              Rate this product
            </h3>
            {isAuthenticated() ? (
              <div className="flex items-center gap-4">
                <StarRating 
                  initialRating={product.user_rating || 0} 
                  onRating={handleRatingSubmit} 
                  disabled={isRating}
                />
                {product.user_rating && (
                  <span className="text-sm text-[var(--text-color-secondary)]">
                    You rated this {product.user_rating} stars.
                  </span>
                )}
              </div>
            ) : (
              <p className="text-sm text-[var(--text-color-secondary)]">
                Please <button onClick={() => navigate('/login')} className="text-[var(--color-brand-maroon)] underline">log in</button> to rate products.
              </p>
            )}
          </div>

          <div className="border-t border-[var(--border-color)] pt-6 mt-auto">
            <div className="flex items-center gap-4 mb-4">
              <span className="text-sm font-medium text-[var(--text-color-secondary)]">Availability:</span>
              {product.stock > 0 ? (
                <span className="text-[var(--color-success)] font-medium bg-[var(--bg-secondary)] px-2 py-1 rounded text-sm">
                  In Stock ({product.stock})
                </span>
              ) : (
                <span className="text-[var(--color-error)] font-medium bg-[#fef2f2] px-2 py-1 rounded text-sm">
                  Out of Stock
                </span>
              )}
            </div>

            <div className="flex gap-4">
              <button 
                disabled={product.stock === 0 || isAddingToCart}
                onClick={handleAddToCart}
                className="flex-1 bg-[var(--color-brand-maroon)] hover:bg-[var(--color-brand-maroon-light)] text-white font-medium py-3 px-6 rounded-[var(--radius-md)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-maroon)] focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAddingToCart ? 'Adding...' : 'Add to Cart'}
              </button>
              
              <button 
                onClick={handleFavouriteToggle}
                disabled={isTogglingFav}
                className={`p-3 border rounded-[var(--radius-md)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-maroon)] ${
                  product.is_favourited 
                    ? 'border-[var(--color-brand-maroon)] text-[var(--color-brand-maroon)] bg-[var(--color-brand-maroon)]/10' 
                    : 'border-[var(--border-color)] text-[var(--text-color-secondary)] hover:text-[var(--color-brand-maroon)] hover:border-[var(--color-brand-maroon)]'
                }`}
                aria-label={product.is_favourited ? 'Remove from favourites' : 'Add to favourites'}
              >
                <svg className={`w-6 h-6 ${product.is_favourited ? 'fill-current' : 'fill-none'}`} stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={product.is_favourited ? 0 : 2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
