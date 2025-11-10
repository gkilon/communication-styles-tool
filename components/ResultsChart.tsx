import React from 'react';
import { Scores } from '../types';

interface ResultsChartProps {
  scores: Scores;
}

export const ResultsChart: React.FC<ResultsChartProps> = ({ scores }) => {
  const { a, b, c, d } = scores;

  // Avoid division by zero if scores are 0
  const horizontalTotal = a + b || 1;
  const verticalTotal = c + d || 1;

  // Calculate percentages for the grid dimensions
  const aPercent = (a / horizontalTotal) * 100;
  const bPercent = 100 - aPercent;
  const cPercent = (c / verticalTotal) * 100;
  const dPercent = 100 - cPercent;

  return (
    <div>
      <h3 className="text-xl sm:text-2xl font-bold text-cyan-300 mb-4 text-center">מפת הפרופיל שלך</h3>
      <div className="relative w-full aspect-square max-w-sm mx-auto rounded-lg overflow-hidden shadow-inner">
        {/* Quadrant Areas - with updated colors and no opacity */}
        <div className="absolute top-0 left-0 bg-indigo-500" style={{ width: `${bPercent}%`, height: `${cPercent}%` }}></div>
        <div className="absolute top-0 right-0 bg-rose-500" style={{ width: `${aPercent}%`, height: `${cPercent}%` }}></div>
        <div className="absolute bottom-0 left-0 bg-green-400" style={{ width: `${bPercent}%`, height: `${dPercent}%` }}></div>
        <div className="absolute bottom-0 right-0 bg-yellow-300" style={{ width: `${aPercent}%`, height: `${dPercent}%` }}></div>
        
        {/* Axes */}
        <div className="absolute top-0 h-full w-px bg-gray-400/50" style={{ left: `${bPercent}%` }}></div>
        <div className="absolute left-0 w-full h-px bg-gray-400/50" style={{ top: `${cPercent}%` }}></div>

        {/* Quadrant Labels */}
        <div className="absolute top-2 left-2 text-white font-bold text-shadow">כחול</div>
        <div className="absolute top-2 right-2 text-white font-bold text-shadow">אדום</div>
        <div className="absolute bottom-2 left-2 text-white font-bold text-shadow">ירוק</div>
        <div className="absolute bottom-2 right-2 text-white font-bold text-shadow">צהוב</div>
      </div>
       <div className="mt-4 text-center text-gray-400 text-sm px-2">
        <p>שטח כל צבע מייצג את המינון היחסי של אותו סגנון בפרופיל התקשורת שלך.</p>
      </div>
    </div>
  );
};