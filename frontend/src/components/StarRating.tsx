import React, { useState } from 'react'

interface StarRatingProps {
  initialRating?: number
  onRating: (rating: number) => void
  disabled?: boolean
}

export const StarRating: React.FC<StarRatingProps> = ({ 
  initialRating = 0, 
  onRating,
  disabled = false
}) => {
  const [hoverRating, setHoverRating] = useState(0)
  const [rating, setRating] = useState(initialRating)

  const handleMouseEnter = (index: number) => {
    if (!disabled) setHoverRating(index)
  }

  const handleMouseLeave = () => {
    if (!disabled) setHoverRating(0)
  }

  const handleClick = (index: number) => {
    if (!disabled) {
      setRating(index)
      onRating(index)
    }
  }

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((index) => {
        const isFilled = hoverRating ? index <= hoverRating : index <= rating
        return (
          <button
            key={index}
            type="button"
            disabled={disabled}
            onMouseEnter={() => handleMouseEnter(index)}
            onMouseLeave={handleMouseLeave}
            onClick={() => handleClick(index)}
            className={`p-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-maroon)] rounded transition-colors ${
              disabled ? 'cursor-default opacity-70' : 'cursor-pointer hover:scale-110'
            }`}
            aria-label={`Rate ${index} out of 5 stars`}
          >
            <svg
              className={`w-8 h-8 ${
                isFilled ? 'text-yellow-500 fill-current' : 'text-gray-300 fill-none stroke-current'
              } transition-colors duration-200`}
              viewBox="0 0 24 24"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </button>
        )
      })}
    </div>
  )
}
