
import React from 'react';
import { Scores } from '../types';

interface ResultsChartProps {
  scores: Scores;
}

export const ResultsChart: React.FC<ResultsChartProps> = ({ scores }) => {
  const { a, b, c, d } = scores;

  const horizontalTotal = (a + b) || 1;
  const verticalTotal = (c + d) || 1;

  const aPercent = (a / horizontalTotal) * 100;
  const bPercent = 100 - aPercent;
  const cPercent = (c / verticalTotal) * 100;
  const dPercent = 100 - cPercent;

  return (
    <div className="w-full">
      <h3 className="text-xl sm:text-2xl font-bold text-cyan-300 mb-6 text-center">מפת הפרופיל שלך</h3>
      <div className="relative w-full aspect-square max-w-[320px] mx-auto rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.7)] border-4 border-slate-700 bg-[#000000]">
        
        {/* Quadrant Areas - Using solid bright colors to prevent 'muddy' look on mobile */}
        {/* Blue Quadrant */}
        <div className="absolute top-0 left-0 chart-quadrant" style={{ width: `${bPercent}%`, height: `${cPercent}%`, backgroundColor: '#0066FF' }}></div>
        {/* Red Quadrant */}
        <div className="absolute top-0 right-0 chart-quadrant" style={{ width: `${aPercent}%`, height: `${cPercent}%`, backgroundColor: '#FF0033' }}></div>
        {/* Green Quadrant */}
        <div className="absolute bottom-0 left-0 chart-quadrant" style={{ width: `${bPercent}%`, height: `${dPercent}%`, backgroundColor: '#00CC66' }}></div>
        {/* Yellow Quadrant */}
        <div className="absolute bottom-0 right-0 chart-quadrant" style={{ width: `${aPercent}%`, height: `${dPercent}%`, backgroundColor: '#FFCC00' }}></div>
        
        {/* Axes - Bold white lines for maximum contrast */}
        <div className="absolute top-0 h-full w-1 bg-white/60 z-10" style={{ left: `${bPercent}%` }}></div>
        <div className="absolute left-0 w-full h-1 bg-white/60 z-10" style={{ top: `${cPercent}%` }}></div>

        {/* Quadrant Labels with heavy shadow for readability */}
        <div className="absolute top-3 left-3 text-white font-black text-shadow text-base z-20">כחול</div>
        <div className="absolute top-3 right-3 text-white font-black text-shadow text-base z-20">אדום</div>
        <div className="absolute bottom-3 left-3 text-white font-black text-shadow text-base z-20">ירוק</div>
        <div className="absolute bottom-3 right-3 text-white font-black text-shadow text-base z-20">צהוב</div>
        
        {/* Center Point Indicator */}
        <div className="absolute w-4 h-4 bg-white rounded-full border-2 border-black shadow-[0_0_10px_white] transform -translate-x-1/2 -translate-y-1/2 z-30" style={{ left: `${bPercent}%`, top: `${cPercent}%` }}></div>
      </div>
      
       <div className="mt-6 text-center bg-slate-800/80 p-4 rounded-xl border border-slate-600 shadow-md">
        <p className="text-gray-100 text-sm font-medium">
          הגרף מציג את החלוקה היחסית של סגנונות התקשורת שלך. 
          <br/>
          <span className="text-cyan-400 font-bold">שטח הצבע</span> מייצג את הדומיננטיות של הסגנון.
        </p>
      </div>
    </div>
  );
};
