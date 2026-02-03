
import React from 'react';
import { Scores } from '../types';

interface ResultsChartProps {
  scores: Scores;
}

export const ResultsChart: React.FC<ResultsChartProps> = ({ scores }) => {
  const { a, b, c, d } = scores;

  // Avoid division by zero if scores are 0
  const horizontalTotal = (a + b) || 1;
  const verticalTotal = (c + d) || 1;

  // Calculate percentages for the grid dimensions
  const aPercent = (a / horizontalTotal) * 100;
  const bPercent = 100 - aPercent;
  const cPercent = (c / verticalTotal) * 100;
  const dPercent = 100 - cPercent;

  return (
    <div className="w-full">
      <h3 className="text-xl sm:text-2xl font-bold text-cyan-300 mb-6 text-center">מפת הפרופיל שלך</h3>
      <div className="relative w-full aspect-square max-w-[320px] mx-auto rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] border-4 border-slate-700 bg-slate-900">
        
        {/* Quadrant Areas - Using explicit hex colors for better consistency across devices */}
        {/* Blue Quadrant */}
        <div className="absolute top-0 left-0" style={{ width: `${bPercent}%`, height: `${cPercent}%`, backgroundColor: '#3b82f6' }}></div>
        {/* Red Quadrant */}
        <div className="absolute top-0 right-0" style={{ width: `${aPercent}%`, height: `${cPercent}%`, backgroundColor: '#f43f5e' }}></div>
        {/* Green Quadrant */}
        <div className="absolute bottom-0 left-0" style={{ width: `${bPercent}%`, height: `${dPercent}%`, backgroundColor: '#10b981' }}></div>
        {/* Yellow Quadrant */}
        <div className="absolute bottom-0 right-0" style={{ width: `${aPercent}%`, height: `${dPercent}%`, backgroundColor: '#fbbf24' }}></div>
        
        {/* Axes - White for maximum visibility */}
        <div className="absolute top-0 h-full w-0.5 bg-white/40 shadow-sm" style={{ left: `${bPercent}%` }}></div>
        <div className="absolute left-0 w-full h-0.5 bg-white/40 shadow-sm" style={{ top: `${cPercent}%` }}></div>

        {/* Quadrant Labels */}
        <div className="absolute top-3 left-3 text-white font-black text-shadow text-sm sm:text-base">כחול</div>
        <div className="absolute top-3 right-3 text-white font-black text-shadow text-sm sm:text-base">אדום</div>
        <div className="absolute bottom-3 left-3 text-white font-black text-shadow text-sm sm:text-base">ירוק</div>
        <div className="absolute bottom-3 right-3 text-white font-black text-shadow text-sm sm:text-base">צהוב</div>
        
        {/* Center Point Indicator */}
        <div className="absolute w-3 h-3 bg-white rounded-full border-2 border-slate-900 shadow-lg transform -translate-x-1/2 -translate-y-1/2 z-20" style={{ left: `${bPercent}%`, top: `${cPercent}%` }}></div>
      </div>
      
       <div className="mt-6 text-center bg-slate-800/50 p-4 rounded-xl border border-slate-700">
        <p className="text-gray-300 text-sm">
          הגרף מציג את החלוקה היחסית של סגנונות התקשורת שלך. 
          <br/>
          <strong>שטח הצבע</strong> מייצג את הדומיננטיות של הסגנון בחיי היומיום.
        </p>
      </div>
    </div>
  );
};
