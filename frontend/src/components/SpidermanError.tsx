import React from 'react';
import './SpidermanError.css';

interface SpidermanErrorProps {
  message?: string;
}

export const SpidermanError: React.FC<SpidermanErrorProps> = ({ message }) => {
  return (
    <div className="fixed top-0 left-8 z-[100] pointer-events-none flex flex-col items-center">
      <div className="transform scale-[1.2] origin-top">
        <div className="spidey-container spidey-center relative">
          <div className="spidey-rope spidey-center">
            <div className="spidey-legs spidey-center">
              <div className="spidey-boot-l"></div>
              <div className="spidey-boot-r"></div>
            </div>
            <div className="spidey-costume spidey-center">
              <div className="spidey-spider">
                <div className="spidey-s1 spidey-center"></div>
                <div className="spidey-s2 spidey-center"></div>
                <div className="spidey-s3"></div>
                <div className="spidey-s4"></div>
              </div>
              <div className="spidey-belt spidey-center"></div>
              <div className="spidey-hand-r"></div>
              <div className="spidey-hand-l"></div>
              <div className="spidey-neck spidey-center"></div>
              <div className="spidey-mask spidey-center">
                <div className="spidey-eye-l"></div>
                <div className="spidey-eye-r"></div>
              </div>
              <div className="spidey-cover spidey-center"></div>
            </div>
          </div>
        </div>
      </div>
      {message && (
        <div className="relative mt-2 w-[320px] border-[3px] border-black shadow-[5px_5px_0_#000000] overflow-hidden bg-[#e53935] animate-bounce z-[200]">
          <div className="w-full h-10 bg-white px-4 flex items-center justify-start border-b-[3px] border-black">
            <span className="text-sm font-black uppercase tracking-wider text-black">
              Spidey Alert
            </span>
          </div>
          <div className="p-4 text-black">
            <p className="text-sm font-bold opacity-90 leading-snug">
              {message}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
