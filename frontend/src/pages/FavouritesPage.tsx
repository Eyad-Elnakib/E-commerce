import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { favouritesApi } from '../api/favourites'
import type { Product } from '../api/products'
import { ProductCard } from '../components/ProductCard'
import { useToast } from '../components/ToastProvider'
import { SortButton } from '../components/SortButton'
import { ScrollingMessage } from '../components/ScrollingMessage'

export const FavouritesPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const toast = useToast()

  const handleSort = (type: 'cheapest' | 'expensive' | 'alphabetic') => {
    const sorted = [...products]
    if (type === 'cheapest') {
      sorted.sort((a, b) => a.price - b.price)
    } else if (type === 'expensive') {
      sorted.sort((a, b) => b.price - a.price)
    } else if (type === 'alphabetic') {
      sorted.sort((a, b) => a.name.localeCompare(b.name))
    }
    setProducts(sorted)
  }

  const fetchFavourites = async () => {
    try {
      const data = await favouritesApi.getFavourites()
      setProducts(data)
    } catch (err: any) {
      setError('Failed to load your favourites.')
      toast.error({ title: 'Error', body: 'Failed to load favourites.' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFavourites()
  }, [])

  // Callback to instantly remove product from the view if un-favourited on this page
  const handleFavouriteToggle = async (productId: number) => {
    try {
      await favouritesApi.removeFavourite(productId)
      setProducts(prev => prev.filter(p => p.id !== productId))
      toast.success({ title: 'Removed', body: 'Product removed from favourites.' })
    } catch {
      toast.error({ title: 'Error', body: 'Failed to remove favourite.' })
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-2 sm:p-4 lg:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-color)]">Your Favourites</h1>
          <p className="text-[var(--text-color-secondary)] mt-1">
            Products you have saved for later.
          </p>
        </div>
      </div>

      {error && (
        <div className="flex justify-center items-center py-24 text-[var(--text-color)] w-full">
          <ScrollingMessage text={error} />
        </div>
      )}

      {loading ? (
        <div className="text-[var(--text-color-secondary)]">Loading your favourites...</div>
      ) : (
        <>
          {products.length === 0 && !error ? (
            <div className="text-center py-16 bg-[var(--bg-tertiary)] rounded-[var(--radius-lg)] border border-[var(--border-color)]">
              <svg className="w-16 h-16 mx-auto mb-4 text-[var(--text-color-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <h3 className="text-xl font-bold text-[var(--text-color)] mb-2">No favourites yet</h3>
              <p className="text-[var(--text-color-secondary)] mb-6">
                You haven't saved any products to your favourites.
              </p>
              <Link 
                to="/browse" 
                className="bg-[var(--color-brand-maroon)] text-white px-6 py-2 rounded font-medium hover:bg-opacity-90 transition-colors"
              >
                Browse Products
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-1.5">
              {products.map(p => (
                <ProductCard 
                  key={p.id} 
                  product={p} 
                  onFavouriteToggle={() => handleFavouriteToggle(p.id)}
                />
              ))}
            </div>
          )}
          <SortButton onSort={handleSort} />
        </>
      )}
    </div>
  )
}
