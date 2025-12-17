import React from 'react';
import { QuestionPair } from '../types';

interface QuestionSliderProps {
  question: QuestionPair;
  value: number;
  onChange: (value: number) => void;
}

export const QuestionSlider: React.FC<QuestionSliderProps> = ({ question, value, onChange }) => {
  const [trait1, trait2] = question.pair;
  const [desc1, desc2] = question.descriptions || ['', ''];

  // Logic: If value is 0 (unanswered), we visually put the slider in the middle (3.5)
  // but we hide the thumb until the user interacts.
  const visualValue = value === 0 ? 3.5 : value;
  const isUnanswered = value === 0;

  // Helper to handle direct click on numbers
  const handleNumberClick = (num: number) => {
      onChange(num);
  };

  return (
    <div className="w-full select-none">
      {/* Labels Row */}
      <div className="flex justify-between items-start text-white mb-8 tracking-wide">
        {/* Right Side (Trait 1) */}
        <div className="text-right w-1/2 pl-4 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => onChange(1)}>
            <div className="text-xl sm:text-2xl md:text-3xl font-bold text-cyan-200">{trait1}</div>
            <div className="text-sm sm:text-base text-gray-400 mt-1 leading-tight">{desc1}</div>
        </div>
        
        {/* Left Side (Trait 2) */}
        <div className="text-left w-1/2 pr-4 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => onChange(6)}>
            <div className="text-xl sm:text-2xl md:text-3xl font-bold text-cyan-200">{trait2}</div>
             <div className="text-sm sm:text-base text-gray-400 mt-1 leading-tight">{desc2}</div>
        </div>
      </div>
      
      {/* Slider Container */}
      <div className="relative h-16 flex items-center justify-center">
        <style>
          {`
            .slider-track-dots {
                background: linear-gradient(to right, 
                    rgba(75, 85, 99, 1) 0%, 
                    rgba(75, 85, 99, 1) 100%
                );
            }
            /* Styling the Range Input */
            input[type=range] {
                -webkit-appearance: none; 
                width: 100%; 
                background: transparent;
                z-index: 20;
                position: relative;
            }
            input[type=range]::-webkit-slider-thumb {
                -webkit-appearance: none;
                height: 32px;
                width: 32px;
                border-radius: 50%;
                background: #06b6d4;
                cursor: pointer;
                margin-top: -14px; 
                box-shadow: 0 0 15px rgba(6,182,212, 0.8);
                border: 3px solid white;
                transition: transform 0.1s ease;
            }
            input[type=range]::-webkit-slider-thumb:hover {
                transform: scale(1.1);
            }
            input[type=range]::-moz-range-thumb {
                height: 32px;
                width: 32px;
                border-radius: 50%;
                background: #06b6d4;
                cursor: pointer;
                border: 3px solid white;
                box-shadow: 0 0 15px rgba(6,182,212, 0.8);
            }
            /* Hide thumb if unanswered */
            .slider-unanswered::-webkit-slider-thumb { opacity: 0; }
            .slider-unanswered::-moz-range-thumb { opacity: 0; }
          `}
        </style>

        {/* Visual Track Line */}
        <div className="absolute left-0 right-0 h-1.5 bg-gray-700 rounded-full z-0 top-1/2 transform -translate-y-1/2"></div>

        {/* Visual Dots on Track */}
        <div className="absolute left-0 right-0 top-1/2 transform -translate-y-1/2 flex justify-between px-[12px] z-0 pointer-events-none">
            {[1, 2, 3, 4, 5, 6].map((num) => (
                <div key={num} className={`w-3.5 h-3.5 rounded-full transition-colors duration-300 border border-gray-600 ${value === num ? 'bg-cyan-400 scale-125 shadow-[0_0_8px_cyan]' : (value > 0 && Math.abs(value-num) < 1 ? 'bg-cyan-600/50' : 'bg-gray-800')}`}></div>
            ))}
        </div>

        {/* The Actual Input */}
        <input
            type="range"
            min="1"
            max="6"
            step="1"
            value={visualValue}
            onChange={(e) => onChange(Number(e.target.value))}
            className={`w-full h-2 rounded-lg appearance-none cursor-pointer ${isUnanswered ? 'slider-unanswered' : ''}`}
        />
        
      </div>
      
      {/* Clickable Numbers Below */}
      <div className="flex justify-between mt-4 px-1">
          {[1, 2, 3, 4, 5, 6].map((num) => (
              <button
                key={num}
                onClick={() => handleNumberClick(num)}
                className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center text-xl font-bold transition-all duration-200 
                    ${value === num 
                        ? 'bg-cyan-600 text-white scale-110 shadow-lg ring-2 ring-cyan-300' 
                        : 'bg-gray-800 text-gray-500 hover:bg-gray-700 hover:text-white border border-gray-700'
                    }`}
              >
                  {num}
              </button>
          ))}
      </div>
      
      <div className="text-center h-10 flex items-center justify-center mt-8">
        {!isUnanswered ? (
            <div className="animate-fade-in bg-cyan-900/30 px-6 py-2 rounded-full border border-cyan-500/30 text-cyan-300 font-medium text-lg">
                {value <= 3 ? `נוטה יותר ל"${trait1}"` : `נוטה יותר ל"${trait2}"`}
            </div>
        ) : (
            <div className="text-gray-500 text-sm animate-pulse">בחר מספר או הזז את הסליידר</div>
        )}
      </div>
    </div>
  );
};