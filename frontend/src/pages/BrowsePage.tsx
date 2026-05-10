import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { productsApi } from '../api/products'
import type { Product } from '../api/products'
import { ProductCard } from '../components/ProductCard'
import { CategoryCard } from '../components/CategoryCard'
import { SortButton } from '../components/SortButton'
import { ScrollingMessage } from '../components/ScrollingMessage'

export const BrowsePage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const categoryFilter = searchParams.get('category')

  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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

  const loadCategories = async () => {
    try {
      setLoading(true)
        const cats = await productsApi.getCategories()
        // Swap Music and Garden if they both exist
        const musicIdx = cats.indexOf('Music')
        const gardenIdx = cats.indexOf('Garden')
        if (musicIdx !== -1 && gardenIdx !== -1) {
          [cats[musicIdx], cats[gardenIdx]] = [cats[gardenIdx], cats[musicIdx]]
        }

        // Swap Sports & Outdoors and Food & Beverages
        const sportsIdx = cats.indexOf('Sports & Outdoors')
        const foodIdx = cats.indexOf('Food & Beverages')
        if (sportsIdx !== -1 && foodIdx !== -1) {
          [cats[sportsIdx], cats[foodIdx]] = [cats[foodIdx], cats[sportsIdx]]
        }
        setCategories(cats)
    } catch (err: any) {
      setError('Failed to load categories.')
    } finally {
      setLoading(false)
    }
  }

  const loadProducts = async (pageToLoad: number, category?: string) => {
    try {
      setLoading(true)
      const res = await productsApi.getProducts(pageToLoad, category)
      setProducts(prev => pageToLoad === 1 ? res.data : [...prev, ...res.data])
      setHasMore(res.meta.has_more)
    } catch (err: any) {
      setError('Failed to load products.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (categoryFilter) {
      setProducts([])
      setPage(1)
      loadProducts(1, categoryFilter)
    } else {
      loadCategories()
    }
  }, [categoryFilter])

  useEffect(() => {
    if (!categoryFilter) {
      document.body.classList.add('category-page-bg')
    } else {
      document.body.classList.remove('category-page-bg')
    }

    return () => {
      document.body.classList.remove('category-page-bg')
    }
  }, [categoryFilter])

  const handleLoadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    loadProducts(nextPage, categoryFilter || undefined)
  }

  const getGridClass = (category: string, index: number) => {
    // Special case for Toys & Games to make it huge horizontally
    if (category === 'Toys & Games') {
      return 'col-span-full row-span-2 min-h-[450px]'
    }

    // Categories that need extra vertical space
    if (category === 'Music' || category === 'Electronics' || category === 'Health & Wellness') {
      return 'col-span-3 row-span-2 min-h-[450px]'
    }

    // Patterns optimized for a 6-column grid to ensure minimal gaps
    const patterns = [
      'col-span-3 row-span-2 min-h-[450px]', // 1/2 width
      'col-span-2 row-span-1 min-h-[220px]', // 1/3 width
      'col-span-1 row-span-1 min-h-[220px]', // 1/6 width
      'col-span-4 row-span-2 min-h-[450px]', // 2/3 width
      'col-span-2 row-span-2 min-h-[450px]', // 1/3 width tall
      'col-span-2 row-span-1 min-h-[220px]', // 1/3 width
      'col-span-3 row-span-1 min-h-[220px]', // 1/2 width thin
      'col-span-1 row-span-2 min-h-[450px]', // 1/6 width tall
    ]
    return patterns[index % patterns.length]
  }

  if (loading && categories.length === 0 && products.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-2xl font-medium text-[var(--text-color-secondary)]">
          Loading Collections...
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-10 space-y-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl sm:text-5xl font-bold text-[var(--text-color)] tracking-tight text-center sm:text-left">
          {categoryFilter ? categoryFilter : 'Browse Collections'}
        </h1>
        <p className="text-[var(--text-color-secondary)] text-lg text-center sm:text-left">
          Explore our curated selections of premium products.
        </p>
      </div>

      {error && (
        <div className="flex justify-center items-center py-24 text-[var(--text-color)] w-full">
          <ScrollingMessage text={error} />
        </div>
      )}

      {!categoryFilter ? (
        /* CATEGORY VIEW - BENTO GRID */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 auto-rows-min gap-8 grid-flow-dense">
          {categories.map((cat, index) => (
            <CategoryCard key={cat} category={cat} className={getGridClass(cat, index)} />
          ))}
        </div>
      ) : (
        /* PRODUCTS VIEW */
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-6">
            {products.map(p => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>

          {products.length === 0 && !loading && (
            <div className="text-center text-[var(--text-color-secondary)] py-20 bg-white/20 backdrop-blur-md rounded-[3rem] border border-white/30">
              No products found in this category.
            </div>
          )}

          {hasMore && (
            <div className="mt-12 flex justify-center">
              <button
                onClick={handleLoadMore}
                disabled={loading}
                className="bg-white/40 backdrop-blur-md border border-white/50 text-[var(--text-color)] hover:bg-white/60 font-bold py-4 px-10 rounded-full shadow-lg transition-all active:scale-95 disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'View More Items'}
              </button>
            </div>
          )}

          <SortButton onSort={handleSort} />
        </>
      )}
    </div>
  )
}
