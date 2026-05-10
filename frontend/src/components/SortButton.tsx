import React from 'react'
import './SortButton.css'

interface SortButtonProps {
  onSort: (type: 'cheapest' | 'expensive' | 'alphabetic') => void
}

export const SortButton: React.FC<SortButtonProps> = ({ onSort }) => {
  return (
    <div className="button-box">
      {/* Touch areas for interaction */}
      <div className="touch left" onClick={() => onSort('cheapest')} title="Sort by Cheapest"></div>
      <div className="touch middle" onClick={() => onSort('alphabetic')} title="Sort by Alphabetic"></div>
      <div className="touch right" onClick={() => onSort('expensive')} title="Sort by Expensive"></div>

      {/* Button 4: Cheapest (Orange - Left) -> Arrow Down */}
      <div className="button" aria-label="Sort by Cheapest">
        <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5v14M19 12l-7 7-7-7" />
        </svg>
      </div>

      {/* Button 5: Expensive (Gold - Right) -> Arrow Up */}
      <div className="button" aria-label="Sort by Expensive">
        <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 19V5M5 12l7-7 7 7" />
        </svg>
      </div>

      {/* Button 6: Alphabetic (Teal - Middle) -> Letter 'A' */}
      <div className="button" aria-label="Sort by Alphabetic">
        <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 20l8-16 8 16M6 16h12" />
        </svg>
      </div>
    </div>
  )
}
