import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { productsApi } from '../api/products'
import { authApi } from '../api/auth'
import { getImageSrc } from '../utils/image'
import { useToast } from '../components/ToastProvider'
import { useAuthStore } from '../store/authStore'
import type { Product } from '../api/products'

export const OnboardingPage: React.FC = () => {
  const navigate = useNavigate()
  const toast = useToast()
  const { updateUser } = useAuthStore()

  // Steps: 1 = Pick categories, 2 = Pick products from chosen categories
  const [step, setStep] = useState(1)
  const [categories, setCategories] = useState<string[]>([])
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set())
  const [categoryProducts, setCategoryProducts] = useState<Record<string, Product[]>>({})
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Fetch categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const cats = await productsApi.getCategories()
        setCategories(cats)
      } catch {
        toast.error({ title: 'Error', body: 'Failed to load categories' })
      } finally {
        setLoading(false)
      }
    }
    fetchCategories()
  }, [])

  // Fetch products when moving to step 2
  useEffect(() => {
    if (step !== 2) return
    const fetchProducts = async () => {
      setLoading(true)
      const results: Record<string, Product[]> = {}
      for (const cat of selectedCategories) {
        try {
          const products = await productsApi.getProductsByCategory(cat, 12)
          results[cat] = products
        } catch {
          results[cat] = []
        }
      }
      setCategoryProducts(results)
      setLoading(false)
    }
    fetchProducts()
  }, [step])

  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  const toggleProduct = (id: number) => {
    setSelectedProducts(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const updatedUser = await authApi.completeOnboarding({
        favourite_categories: Array.from(selectedCategories),
        liked_product_ids: Array.from(selectedProducts),
      })
      updateUser(updatedUser)
      toast.success({ title: 'Welcome!', body: 'Your preferences have been saved. Enjoy your personalized feed!' })
      navigate('/feed')
    } catch {
      toast.error({ title: 'Error', body: 'Failed to save preferences. You can skip for now.' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleSkip = () => {
    navigate('/feed')
  }

  // Category icon mapping
  const categoryEmojis: Record<string, string> = {
    'Electronics': '📱', 'Beauty': '💄', 'Fashion': '👗', 'Home': '🏠',
    'Sports': '⚽', 'Books': '📚', 'Food': '🍕', 'Toys': '🧸',
    'Garden': '🌿', 'Groceries': '🛒', 'Health': '💊', 'Automotive': '🚗',
    'Music': '🎵', 'Art': '🎨', 'Pets': '🐾', 'Office': '📎',
  }

  if (loading && step === 1) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="text-[var(--text-color-secondary)] text-lg">Loading your preferences quiz...</div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold text-[var(--text-color)] mb-3">
          {step === 1 ? '🎯 What do you love?' : '❤️ Pick your favorites!'}
        </h1>
        <p className="text-[var(--text-color-secondary)] text-lg">
          {step === 1
            ? 'Select the categories you\'re interested in so we can personalize your experience.'
            : 'Choose products you like from your selected categories. The more you pick, the better your recommendations!'}
        </p>
        {/* Progress */}
        <div className="flex items-center justify-center gap-3 mt-6">
          <div className={`h-2 w-24 rounded-full transition-colors ${step >= 1 ? 'bg-[var(--color-brand-maroon)]' : 'bg-gray-300'}`} />
          <div className={`h-2 w-24 rounded-full transition-colors ${step >= 2 ? 'bg-[var(--color-brand-maroon)]' : 'bg-gray-300'}`} />
        </div>
      </div>

      {/* Step 1: Category Selection */}
      {step === 1 && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-8">
            {categories.map(cat => {
              const isSelected = selectedCategories.has(cat)
              return (
                <button
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  className={`relative p-6 rounded-xl border-2 transition-all duration-200 text-center hover:scale-105 ${
                    isSelected
                      ? 'border-[var(--color-brand-maroon)] bg-[var(--color-brand-maroon)]/10 shadow-lg'
                      : 'border-[var(--border-color)] bg-[var(--bg-card)] hover:border-[var(--color-brand-maroon)]/50'
                  }`}
                >
                  <div className="text-3xl mb-2">{categoryEmojis[cat] || '🏷️'}</div>
                  <div className={`font-semibold ${isSelected ? 'text-[var(--color-brand-maroon)]' : 'text-[var(--text-color)]'}`}>
                    {cat}
                  </div>
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-6 h-6 bg-[var(--color-brand-maroon)] text-white rounded-full flex items-center justify-center text-sm">
                      ✓
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          <div className="flex justify-between items-center">
            <button
              onClick={handleSkip}
              className="text-[var(--text-color-secondary)] hover:text-[var(--text-color)] transition-colors underline"
            >
              Skip for now
            </button>
            <button
              onClick={() => setStep(2)}
              disabled={selectedCategories.size === 0}
              className="px-8 py-3 bg-[var(--color-brand-maroon)] text-white font-semibold rounded-lg hover:bg-[var(--color-brand-maroon-light)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next → Pick Products ({selectedCategories.size} selected)
            </button>
          </div>
        </>
      )}

      {/* Step 2: Product Selection */}
      {step === 2 && (
        <>
          {loading ? (
            <div className="text-center py-12 text-[var(--text-color-secondary)]">Loading products...</div>
          ) : (
            <div className="space-y-10 mb-8">
              {Array.from(selectedCategories).map(cat => (
                <div key={cat}>
                  <h2 className="text-xl font-bold text-[var(--text-color)] mb-4 flex items-center gap-2">
                    <span>{categoryEmojis[cat] || '🏷️'}</span>
                    {cat}
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {(categoryProducts[cat] || []).map(product => {
                      const isSelected = selectedProducts.has(product.id)
                      return (
                        <button
                          key={product.id}
                          onClick={() => toggleProduct(product.id)}
                          className={`relative rounded-xl border-2 overflow-hidden transition-all duration-200 hover:scale-105 text-left ${
                            isSelected
                              ? 'border-[var(--color-brand-maroon)] shadow-lg ring-2 ring-[var(--color-brand-maroon)]/30'
                              : 'border-[var(--border-color)] bg-[var(--bg-card)] hover:border-[var(--color-brand-maroon)]/50'
                          }`}
                        >
                          <div className="aspect-square bg-[var(--bg-tertiary)] flex items-center justify-center">
                            {product.image_file ? (
                              <img src={getImageSrc(product.image_file)} alt={product.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-4xl opacity-30">📦</span>
                            )}
                          </div>
                          <div className="p-3">
                            <div className="font-medium text-sm text-[var(--text-color)] line-clamp-2">{product.name}</div>
                            <div className="text-xs text-[var(--text-color-secondary)] mt-1">${product.price.toFixed(2)}</div>
                          </div>
                          {isSelected && (
                            <div className="absolute top-2 right-2 w-7 h-7 bg-[var(--color-brand-maroon)] text-white rounded-full flex items-center justify-center text-sm shadow-md">
                              ❤️
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-between items-center">
            <button
              onClick={() => setStep(1)}
              className="text-[var(--text-color-secondary)] hover:text-[var(--text-color)] transition-colors"
            >
              ← Back to Categories
            </button>
            <div className="flex items-center gap-4">
              <button
                onClick={handleSkip}
                className="text-[var(--text-color-secondary)] hover:text-[var(--text-color)] transition-colors underline"
              >
                Skip
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-8 py-3 bg-[var(--color-brand-maroon)] text-white font-semibold rounded-lg hover:bg-[var(--color-brand-maroon-light)] transition-colors disabled:opacity-50"
              >
                {submitting ? 'Saving...' : `Finish Setup (${selectedProducts.size} liked)`}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
