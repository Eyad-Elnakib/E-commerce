import React from 'react';
import './ScrollingMessage.css';

interface ScrollingMessageProps {
  text: string;
}

export const ScrollingMessage: React.FC<ScrollingMessageProps> = ({ text }) => {
  const characters = text.split('');
  const duration = 3.5; // seconds
  const totalChars = characters.length;

  // Generate the exact CSS the user provided, dynamically scaled for the text length
  const dynamicStyles = characters.map((_, index) => {
    const num = index + 1;
    // Formula matching the CSS: calc(3.5s / 24 * (24 - i) * -1)
    const delay = `calc(${duration}s / ${totalChars} * (${totalChars} - ${num}) * -1)`;
    return `.letter${num} { animation-delay: ${delay}; }`;
  }).join('\n');

  return (
    <>
      <style>{dynamicStyles}</style>
      <div className="wrapper">
        <div className="wrapper">
          {characters.map((char, index) => {
            const num = index + 1;
            return (
              <span 
                key={index} 
                className={`letter letter${num}`}
              >
                {char === ' ' ? '\u00A0' : char}
              </span>
            );
          })}
        </div>
      </div>
    </>
  );
};

