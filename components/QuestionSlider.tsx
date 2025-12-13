
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

  return (
    <div className="w-full">
      {/* Labels Row */}
      <div className="flex justify-between items-start text-white mb-6 tracking-wide">
        {/* Right Side (Trait 1) */}
        <div className="text-right w-1/2 pl-2">
            <div className="text-xl sm:text-2xl md:text-3xl font-bold text-cyan-200">{trait1}</div>
            <div className="text-sm sm:text-base text-gray-400 mt-1 leading-tight">{desc1}</div>
        </div>
        
        {/* Left Side (Trait 2) */}
        <div className="text-left w-1/2 pr-2">
            <div className="text-xl sm:text-2xl md:text-3xl font-bold text-cyan-200">{trait2}</div>
             <div className="text-sm sm:text-base text-gray-400 mt-1 leading-tight">{desc2}</div>
        </div>
      </div>
      
      {/* Slider Container */}
      <div className="relative pt-6 pb-6">
        <style>
          {`
            /* CSS hack to hide the thumb if unanswered */
            .slider-unanswered::-webkit-slider-thumb {
              visibility: hidden;
            }
            .slider-unanswered::-moz-range-thumb {
              visibility: hidden;
            }
          `}
        </style>
        <input
            type="range"
            min="1"
            max="6"
            step="1"
            value={visualValue}
            // On mouse/touch down, if it was 0, we treat it as an interaction. 
            // We use standard onChange to actually set the value.
            onChange={(e) => onChange(Number(e.target.value))}
            className={`w-full h-4 sm:h-6 bg-gray-700 rounded-full appearance-none cursor-pointer accent-cyan-500 hover:accent-cyan-400 transition-colors ${isUnanswered ? 'slider-unanswered opacity-60' : ''}`}
        />
        
        {/* Custom Ticks */}
        <div className="flex justify-between text-sm sm:text-lg text-gray-500 mt-3 px-1 font-mono">
            <span>1</span>
            <span>2</span>
            <span>3</span>
            <span>4</span>
            <span>5</span>
            <span>6</span>
        </div>
      </div>
      
      <div className="text-center h-6 text-cyan-400 font-medium text-sm sm:text-base mt-2 transition-opacity duration-300">
        {!isUnanswered ? (
            value <= 3 ? `נוטה יותר ל"${trait1}" (${value})` : `נוטה יותר ל"${trait2}" (${value})`
        ) : (
            <span className="text-gray-500">הזז את הסליידר לבחירת תשובה</span>
        )}
      </div>
    </div>
  );
};
