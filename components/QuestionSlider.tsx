
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
                height: 28px;
                width: 28px;
                border-radius: 50%;
                background: #06b6d4;
                cursor: pointer;
                margin-top: -12px; 
                box-shadow: 0 0 10px rgba(6,182,212, 0.8);
                border: 2px solid white;
            }
            input[type=range]::-moz-range-thumb {
                height: 28px;
                width: 28px;
                border-radius: 50%;
                background: #06b6d4;
                cursor: pointer;
                border: 2px solid white;
                box-shadow: 0 0 10px rgba(6,182,212, 0.8);
            }
            /* Hide thumb if unanswered */
            .slider-unanswered::-webkit-slider-thumb { opacity: 0; }
            .slider-unanswered::-moz-range-thumb { opacity: 0; }
          `}
        </style>

        {/* Visual Track Line */}
        <div className="absolute left-0 right-0 h-1 bg-gray-600 rounded-full z-0 top-1/2 transform -translate-y-1/2"></div>

        {/* Visual Dots on Track */}
        <div className="absolute left-0 right-0 top-1/2 transform -translate-y-1/2 flex justify-between px-[10px] sm:px-[12px] z-0 pointer-events-none">
            {[1, 2, 3, 4, 5, 6].map((num) => (
                <div key={num} className={`w-3 h-3 rounded-full transition-colors duration-300 ${value >= num ? 'bg-cyan-500/50' : 'bg-gray-500'}`}></div>
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
      <div className="flex justify-between mt-2 px-1">
          {[1, 2, 3, 4, 5, 6].map((num) => (
              <button
                key={num}
                onClick={() => handleNumberClick(num)}
                className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-lg font-bold transition-all duration-200 
                    ${value === num 
                        ? 'bg-cyan-600 text-white scale-110 shadow-lg ring-2 ring-cyan-300' 
                        : 'bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white'
                    }`}
              >
                  {num}
              </button>
          ))}
      </div>
      
      <div className="text-center h-8 text-cyan-400 font-medium text-lg mt-6 transition-opacity duration-300">
        {!isUnanswered ? (
            <span className="bg-gray-900/50 px-4 py-1 rounded-full border border-cyan-900/30">
                {value <= 3 ? `נוטה יותר ל"${trait1}"` : `נוטה יותר ל"${trait2}"`}
            </span>
        ) : (
            <span className="text-gray-500 text-sm">בחר מספר או הזז את הסליידר</span>
        )}
      </div>
    </div>
  );
};
