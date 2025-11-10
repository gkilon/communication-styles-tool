import React, { useMemo } from 'react';
import { Scores } from '../types';
import { ResultsChart } from './ResultsChart';
import { AiCoach } from './AiCoach';
import { CombinedAnalysis } from './CombinedAnalysis';
import { generateProfileAnalysis } from '../services/analysisService';

interface ResultsScreenProps {
  scores: Scores;
  onReset: () => void;
  onEdit: () => void;
}

export const ResultsScreen: React.FC<ResultsScreenProps> = ({ scores, onReset, onEdit }) => {
  const profileAnalysis = useMemo(() => generateProfileAnalysis(scores), [scores]);

  return (
    <div className="space-y-8 animate-fade-in-up">
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-none lg:w-1/3 bg-gray-800 p-4 sm:p-6 rounded-lg shadow-xl">
          <ResultsChart scores={scores} />
        </div>
        <div className="flex-1 bg-gray-800 p-4 sm:p-6 rounded-lg shadow-xl">
          <CombinedAnalysis analysis={profileAnalysis} />
        </div>
      </div>
      
      <div className="bg-gray-800 p-4 sm:p-6 rounded-lg shadow-xl">
        <AiCoach scores={scores} />
      </div>
      <div className="text-center mt-8 flex justify-center items-center gap-4">
        <button
          onClick={onEdit}
          className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-6 rounded-full text-lg transition-transform transform hover:scale-105 duration-300"
        >
          ערוך תשובות
        </button>
        <button
          onClick={onReset}
          className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded-full text-lg transition-transform transform hover:scale-105 duration-300"
        >
          התחל מחדש
        </button>
      </div>
    </div>
  );
};