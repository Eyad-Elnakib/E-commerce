import React, { useEffect, useState, useRef } from 'react'
import { recommendationsApi } from '../api/telemetry'
import type { FeedGroup } from '../api/telemetry'
import { ProductCard } from '../components/ProductCard'
import { SortButton } from '../components/SortButton'
import { ScrollingMessage } from '../components/ScrollingMessage'

const FeedRow: React.FC<{ group: FeedGroup }> = ({ group }) => {
  const scrollRef = useRef<HTMLDivElement>(null)
  const speedRef = useRef(0)
  const animationFrameRef = useRef<number>(0)

  useEffect(() => {
    const scroll = () => {
      if (scrollRef.current && speedRef.current !== 0) {
        scrollRef.current.scrollLeft += speedRef.current
      }
      animationFrameRef.current = requestAnimationFrame(scroll)
    }
    animationFrameRef.current = requestAnimationFrame(scroll)
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
    }
  }, [])

  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold mb-4 text-[var(--text-color)] px-6">
        {group.method_name}
      </h2>
      
      <div className="flex items-center gap-2 group/row">
        {/* Left Button (Next to row) */}
        <div 
          className="w-12 h-24 shrink-0 bg-white/50 backdrop-blur-md rounded-xl shadow-sm border border-white/60 flex items-center justify-center text-gray-700 cursor-ew-resize opacity-0 group-hover/row:opacity-100 transition-opacity duration-300"
          onMouseEnter={() => speedRef.current = -15}
          onMouseLeave={() => speedRef.current = 0}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
        </div>

        {/* Scroll Container */}
        <div 
          ref={scrollRef}
          className="flex-1 flex gap-1.5 overflow-x-auto py-12 px-2 -my-12 no-scrollbar select-none"
        >
          {group.products.map(p => (
            <div key={p.id} className="shrink-0">
              <ProductCard product={p} />
            </div>
          ))}
        </div>

        {/* Right Button (Next to row) */}
        <div 
          className="w-12 h-24 shrink-0 bg-white/50 backdrop-blur-md rounded-xl shadow-sm border border-white/60 flex items-center justify-center text-gray-700 cursor-ew-resize opacity-0 group-hover/row:opacity-100 transition-opacity duration-300"
          onMouseEnter={() => speedRef.current = 15}
          onMouseLeave={() => speedRef.current = 0}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
        </div>
      </div>
    </div>
  )
}

export const FeedPage: React.FC = () => {
  const [groups, setGroups] = useState<FeedGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  const handleSort = (type: 'cheapest' | 'expensive' | 'alphabetic') => {
    setGroups(prev => prev.map(group => {
      const sorted = [...group.products]
      if (type === 'cheapest') sorted.sort((a, b) => a.price - b.price)
      else if (type === 'expensive') sorted.sort((a, b) => b.price - a.price)
      else if (type === 'alphabetic') sorted.sort((a, b) => a.name.localeCompare(b.name))
      return { ...group, products: sorted }
    }))
  }

  useEffect(() => {
    const fetchFeed = async () => {
      try {
        const res = await recommendationsApi.getFeed()
        setGroups(res.groups || [])
      } catch (err) {
        setError('Failed to load your personalised feed.')
      } finally {
        setLoading(false)
      }
    }
    fetchFeed()
  }, [])

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      <h1 className="text-3xl font-bold mb-2 text-[var(--text-color)]">Personalised Feed</h1>
      <p className="text-[var(--text-color-secondary)] mb-8">
        Recommended products powered by our AI engines.
      </p>

      {error && (
        <div className="flex justify-center items-center py-24 text-[var(--text-color)] w-full">
          <ScrollingMessage text={error} />
        </div>
      )}

      {loading ? (
        <div className="text-[var(--text-color-secondary)]">Loading recommendations...</div>
      ) : (
        <div className="space-y-12">
          {groups.map((group, idx) => (
            <FeedRow key={idx} group={group} />
          ))}
        </div>
      )}

      {groups.length === 0 && !loading && !error && (
        <div className="text-center text-[var(--text-color-secondary)] py-12">
          No recommendations available.
        </div>
      )}
      <SortButton onSort={handleSort} />
    </div>
  )
}
