
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
      <div className="flex justify-between items-center text-xl sm:text-2xl md:text-3xl text-white font-bold px-2 mb-6 tracking-wide">
        <span className="text-right text-cyan-200">{trait1}</span>
        <span className="text-left text-cyan-200">{trait2}</span>
      </div>
      
      <div className="relative pt-2 pb-6">
        <input
            type="range"
            min="1"
            max="6"
            step="1"
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-full h-4 sm:h-6 bg-gray-700 rounded-full appearance-none cursor-pointer accent-cyan-500 hover:accent-cyan-400 transition-colors"
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
      
      <div className="text-center text-gray-500 text-sm mt-2">
        {value <= 3 ? `נוטה יותר ל"${trait1}"` : `נוטה יותר ל"${trait2}"`}
      </div>
    </div>
  );
};
