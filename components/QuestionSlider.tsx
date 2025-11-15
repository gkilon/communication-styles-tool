import React from 'react';
import { QuestionPair } from '../types';

interface QuestionSliderProps {
  question: QuestionPair;
  value: number;
  onChange: (value: number) => void;
}

export const QuestionSlider: React.FC<QuestionSliderProps> = ({ question, value, onChange }) => {
  const [trait1, trait2] = question.pair;
  return (
    <div className="w-full">
      <div className="flex justify-between items-center text-md sm:text-lg text-gray-200 font-semibold px-1 mb-3">
        <span className="text-right">{trait1}</span>
        <span className="text-left">{trait2}</span>
      </div>
      <input
        type="range"
        min="1"
        max="6"
        step="1"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-3 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
        style={{
          // Custom styling for slider thumb for better visibility
          // Note: This is a common way to suggest styling, but full cross-browser support requires vendor prefixes in CSS.
          // Tailwind's `accent-color` handles this well for modern browsers.
        }}
      />
       <div className="flex justify-between text-xs text-gray-400 mt-1 px-1">
        <span>1</span>
        <span>2</span>
        <span>3</span>
        <span>4</span>
        <span>5</span>
        <span>6</span>
      </div>
    </div>
  );
};